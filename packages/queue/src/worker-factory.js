import { Worker } from "bullmq";
import { REG } from "./registry.js";
import { DEFAULT_CONCURRENCY, DEFAULT_LOCK_DURATION_MS } from "./config.js";
import { connectionOptions, queuePrefix } from "./connection.js";

// Start or return a singleton Worker for a queue.
// `processor` can be a function or a path to a file exporting default processor.
export function startWorker(queueName, processor, {
  concurrency = DEFAULT_CONCURRENCY,
  lockDuration = DEFAULT_LOCK_DURATION_MS,
  limiter,    // optional rate limiter
  settings    // advanced BullMQ settings
} = {}) {
  if (REG.workers.has(queueName)) return REG.workers.get(queueName);

  const w = new Worker(queueName, processor, {
    connection: connectionOptions(),
    // prefix: queuePrefix(),
    concurrency,
    lockDuration,
    limiter,
    settings
  });

  // Minimal listeners; do not attach per-request loggers
  w.on("error", (err) => console.error(`[Worker:${queueName}]`, err?.message || err));
  w.on("failed", (job, err) => {
    console.error(`[Worker:${queueName}] job ${job?.id} failed`, err?.message || err);
  });

  REG.workers.set(queueName, w);
  return w;
}

export async function closeWorkers() {
  const closes = [];
  for (const [, w] of REG.workers) closes.push(w.close().catch(() => {}));
  await Promise.all(closes);
  REG.workers.clear();
}
