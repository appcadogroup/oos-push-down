// packages/queue/src/connection.js (updated)
import { getClient, buildBullConnectionOptions } from "@acme/redis";
import { QUEUE_PREFIX } from "./config.js";

// Single Redis connection used for producers (Queue). Workers will create their own
// blocking and normal connections internally, but we ensure exactly one Worker per queue.
let producerRedis;
export function getProducerRedis() {
  if (!producerRedis) producerRedis = getClient("producer"); // shared singleton
  return producerRedis;
}

export function connectionOptions() {
  // BullMQ will create the minimal required connections internally
  return buildBullConnectionOptions();
}

// ADD this back:
export function queuePrefix() {
  return QUEUE_PREFIX;
}


export async function closeProducerRedis() {
  if (producerRedis) {
    const p = producerRedis;
    producerRedis = undefined;
    try { await p.quit(); } catch { try { p.disconnect(); } catch {} }
  }
}
