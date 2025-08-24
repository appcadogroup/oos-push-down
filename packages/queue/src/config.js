// Centralized config – no secrets in code
export const QUEUE_PREFIX = process.env.BULLMQ_PREFIX || "app";
export const NODE_ENV = process.env.NODE_ENV || "development";

export const REDIS_OPTS = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB || 0),
  // Hard production picks that avoid subtle stalls/memory churn in BullMQ
  lazyConnect: true,                // connect only on first use
  maxRetriesPerRequest: null,       // required by BullMQ to avoid pipeline stalls
  enableOfflineQueue: false,        // do not buffer commands indefinitely
  keepAlive: 1,
  enableReadyCheck: true
};

export const DEFAULT_REMOVE = {
  removeOnComplete: { age: 3600, count: 1000 }, // 1h or 1000 jobs, whichever first
  removeOnFail: { age: 24 * 3600, count: 5000 } // keep failed for 24h (ops)
};

export const DEFAULT_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 8);
export const DEFAULT_LOCK_DURATION_MS = Number(process.env.WORKER_LOCK_MS || 30000);

