import { JOB_NAMES, QUEUES } from "./constant.js";
import { getQueue } from "./queue-factory.js";

/**
 * Enqueue a job in a queue with safe defaults and dedup by jobId if provided.
 * @param {string} queueName
 * @param {string} name  job name (processor name)
 * @param {object} data  payload
 * @param {object} opts  BullMQ add options
 */
export async function enqueue(queueName, name, data = {}, opts = {}) {
  const q = getQueue(queueName);
  
//   // OPTIONAL backpressure: reject if queue too long
//   if (opts.maxWaiting) {
//     const counts = await q.getJobCounts("waiting", "delayed", "paused");
//     if ((counts.waiting + counts.delayed + counts.paused) > opts.maxWaiting) {
//       const err = new Error(`Backpressure: ${queueName} length exceeded`);
//       err.code = "QUEUE_BACKPRESSURE";
//       throw err;
//     }
//   }

  const jobId = opts.jobId; // pass your deterministic id (eg orderId) to dedupe
  const job = await q.add(name, data, {
    // Defaults from queue-factory defaultJobOptions already apply; you can override here
    jobId,
    ...opts
  });
  return job;
}


// Convenience enqueue wrappers
export async function enqueueAutoSorting(shop, collectionID, {
  delayMs = 0
} = {}) {
  const queueName = QUEUES.AUTO_SORTING;
  const name = JOB_NAMES.AUTO_SORTING;

  return enqueue(queueName, name, { shop, collectionID }, {
    delay: delayMs,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function enqueueBulkOperationForPushDown(payload, {
  ttl = 30000
 } = {}) {
  const { collectionID } = payload;
  return enqueue(QUEUES.BULK_OPERATION, JOB_NAMES.PUSH_DOWN, payload, {
    deduplication: { id: `BO:${collectionID}`, ttl: ttl },
    delay: ttl,
  });
}

/** Bulk helper with safe concurrency (avoids event-loop spikes) */
export async function enqueueBulkOperationForPushDownMany(shop, collectionIDs, {
  ttl = 30000
} = {}) {
  const results = [];
  const concurrency = Math.min(32, Number(process.env.ENQUEUE_CONCURRENCY || 16));
  let i = 0;

  async function worker() {
    while (i < collectionIDs.length) {
      const idx = i++;
      const id = collectionIDs[idx];
      const r = await enqueueBulkOperationForPushDown({shop, collectionID: id}, { ttl });
      results[idx] = r;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

/** ------------------------------
 * 3) Hide product (one job per product)
 * ------------------------------ */
  export async function enqueueHideProduct(shop, productId, {
    delayMs = 0
 } = {}) {
  const queueName = QUEUES.HIDE_PRODUCT;
  const name = JOB_NAMES.HIDE_PRODUCT;

  return enqueue(queueName, name, { shop, productId }, {
    // deduplication: { id: `HP:${shop}:${productId}`, ttl: windowMs },
    delay: delayMs,
    backoff: { type: "exponential", delay: 5000 },
  });
}
