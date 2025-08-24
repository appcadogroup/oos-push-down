const asBool = (v) => String(v || "").toLowerCase() === "true";
const parseHostPort = (s) => {
  const [host, port] = String(s).trim().split(":");
  return { host, port: Number(port || 26379) };
};

export const REDIS_MODE = (process.env.REDIS_MODE || "standalone")
  .toLowerCase(); // standalone | sentinel | cluster

export const REDIS_URL = process.env.REDIS_URL || ""; // if provided, takes precedence (standalone)
export const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
export const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
export const REDIS_USERNAME = process.env.REDIS_USERNAME || undefined;
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
export const REDIS_DB = Number(process.env.REDIS_DB || 0);
export const REDIS_TLS = asBool(process.env.REDIS_TLS);

export const REDIS_SENTINELS = (process.env.REDIS_SENTINELS || "")
  .split(",").map(s => s.trim()).filter(Boolean).map(parseHostPort);
export const REDIS_SENTINEL_NAME = process.env.REDIS_SENTINEL_NAME || "mymaster";

export const REDIS_CLUSTER_NODES = (process.env.REDIS_CLUSTER_NODES || "")
  .split(",").map(s => s.trim()).filter(Boolean).map(parseHostPort);

export const KEY_PREFIX = process.env.REDIS_KEY_PREFIX || "acme";
export const NODE_ENV = process.env.NODE_ENV || "development";

// General defaults tuned for server apps
export const COMMON = {
  lazyConnect: true,
  enableOfflineQueue: false,   // never buffer indefinitely
  enableAutoPipelining: true,  // throughput
  keepAlive: 1,
  enableReadyCheck: true,
  username: REDIS_USERNAME,
  password: REDIS_PASSWORD,
  tls: true, 
};

// BullMQ needs this to avoid command queue stalls for blocking ops
export const BULL_PROFILE = {
  maxRetriesPerRequest: null,
  enableTLSForSentinelMode: false
};
