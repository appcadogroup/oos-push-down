import {
  REDIS_MODE, REDIS_HOST, REDIS_PORT,
  REDIS_SENTINELS, REDIS_SENTINEL_NAME, REDIS_CLUSTER_NODES,
  COMMON, BULL_PROFILE
} from "./config.js";

export function buildStandaloneOpts(extra = {}) {
  // if (REDIS_URL) {
  //   return (REDIS_URL, { ...COMMON, ...extra });
  // }
  return { ...COMMON, ...extra, host: REDIS_HOST, port: REDIS_PORT };
}

export function buildSentinelOpts(extra = {}) {
  if (!REDIS_SENTINELS.length) {
    throw new Error("REDIS_SENTINELS is required for sentinel mode");
  }
  return {
    ...COMMON,
    ...extra,
    sentinels: REDIS_SENTINELS,
    name: REDIS_SENTINEL_NAME
  };
}

export function buildClusterNodes() {
  if (!REDIS_CLUSTER_NODES.length) {
    throw new Error("REDIS_CLUSTER_NODES is required for cluster mode");
  }
  return REDIS_CLUSTER_NODES;
}

// BullMQ-safe connection options (standalone/sentinel).
// For cluster, prefer a non-blocking use-case; BullMQ workers with blocking
// ops are best on standalone/sentinel.
export function buildBullConnectionOptions() {
  if (REDIS_MODE === "standalone") return { ...buildStandaloneOpts(BULL_PROFILE) };
  if (REDIS_MODE === "sentinel")   return { ...buildSentinelOpts(BULL_PROFILE) };
  if (REDIS_MODE === "cluster") {
    // You *can* run producers on cluster; workers with blocking ops are limited.
    // Throw here to avoid subtle runtime surprises.
    throw new Error("BullMQ workers are not supported with REDIS_MODE=cluster in this package.");
  }
  throw new Error(`Unknown REDIS_MODE: ${REDIS_MODE}`);
}
