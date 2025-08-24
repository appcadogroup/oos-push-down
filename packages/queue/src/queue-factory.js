import { Queue } from "bullmq";
import { REG } from "./registry.js";
import { DEFAULT_REMOVE } from "./config.js";
import { connectionOptions, getProducerRedis, queuePrefix } from "./connection.js";

export function getQueue(name, opts = {}) {
  if (REG.queues.has(name)) {
    console.log(`Using global queue for ${name}`);
    return REG.queues.get(name);
  }

  const q = new Queue(name, {
    connection: getProducerRedis(), // share single producer conn
    prefix: queuePrefix(),
    defaultJobOptions: {
      ...DEFAULT_REMOVE,
      attempts: opts.attempts ?? 2,
      backoff: { type: "exponential", delay: 1000 },
      ...opts.defaultJobOptions
    },
    ...opts.queueOptions
  });

  REG.queues.set(name, q);
  return q;
}

export async function closeQueues() {
  const closes = [];
  for (const [, q] of REG.queues) closes.push(q.close().catch(() => {}));
  await Promise.all(closes);
  REG.queues.clear();
}
