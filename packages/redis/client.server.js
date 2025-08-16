BigInt.prototype.toJSON = function () {
  const int = Number.parseInt(this.toString());
  return int ?? this.toString();
};

import dotenv from "dotenv";
dotenv.config();
import Redis from "ioredis";
// import { getLogger } from "@acme/core/server";

// const logger = getLogger('redis');

const urlFromEnv = process.env.REDIS_URL;
const host = process.env.REDIS_HOST || "localhost";
const port = Number(process.env.REDIS_PORT || 6379);
const username = process.env.REDIS_USERNAME;           // optional
const password = process.env.REDIS_PASSWORD;           // if using --requirepass

// DigitalOcean Managed Redis connection details (from your dashboard)
const redisConfig = {
  host: process.env.REDIS_HOST || "redis_cache",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null, // 🔥 required for BullMQ
  password: process.env.REDIS_PASSWORD || 'redis_password',
  tls: process.env.REDIS_URL?.includes('rediss://') ? {} : undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000); // Retry with increasing delay, max 2s
    logger.debug(`Retrying Redis connection (${times}) after ${delay}ms`);
    return delay;
  },
  reconnectOnError(err) {
    logger.error('Redis reconnect on error:', err.message);
    return true; // Reconnect on any error
  },
};

// Single Redis client shared across the app
export const redis = urlFromEnv ? new Redis(urlFromEnv, { maxRetriesPerRequest: null, enableReadyCheck: true }) : new Redis(redisConfig);


redis.on('connect', () => {
  console.log('Redis client connected to', redis.options.host || redis.options.url);
});

redis.on('error', (err) => {
  console.error('Redis client error:', err);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

redis.on('reconnecting', (delay) => {
  console.log(`Redis reconnecting in ${delay}ms`);
});
