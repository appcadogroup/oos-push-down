import IORedis from "ioredis";
import { REG } from "./registry.js";
import {
  REDIS_MODE, NODE_ENV,
} from "./config.js";
import {
  buildStandaloneOpts, buildSentinelOpts, buildClusterNodes
} from "./build-options.js";

// internal create + attach minimal listeners
function wireClient(role, client) {
  client.on("error", (e) => console.error(`[redis:${role}]`, e?.message || e));
  // Don't spam listeners; ioredis handles reconnects internally.
  return client;
}

function makeClient(role) {
  if (REDIS_MODE === "standalone") {
    console.log(buildStandaloneOpts());
    return wireClient(role, new IORedis(buildStandaloneOpts()));
  }
  if (REDIS_MODE === "sentinel") {
    return wireClient(role, new IORedis(buildSentinelOpts()));
  }
  if (REDIS_MODE === "cluster") {
    const nodes = buildClusterNodes();
    return wireClient(role, new IORedis.Cluster(nodes, {
      redisOptions: buildStandaloneOpts() // base options (auth/tls/prefix/etc.)
    }));
  }
  throw new Error(`Unknown REDIS_MODE: ${REDIS_MODE}`);
}

export function getClient(role = "default") {
  if (REG.clients.has(role)) {
    console.log(`Using global definition for Redis client: ${role}`);
    return REG.clients.get(role);
  }
  const c = makeClient(role);
  REG.clients.set(role, c);
  return c;
}

// Duplicate a client (same options) for pub/sub or blocking ops.
// Tracked for graceful shutdown.
export async function duplicateClient(role = "dup") {
  const base = getClient("default");
  // Cluster duplicate returns a standard connection per node internally; ioredis abstracts it.
  const dup = base.duplicate();
  wireClient(role, dup);
  await dup.connect();
  REG.clients.set(`${role}:${Date.now()}:${Math.random().toString(16).slice(2)}`, dup);
  return dup;
}

// Close everything
export async function closeAll() {
  const closes = [];
  for (const [, c] of REG.clients) {
    // Cluster has quit() on its connections; quit() on cluster closes gracefully too.
    const quit = (client) => client.quit().catch(() => client.disconnect());
    closes.push(quit(c));
  }
  await Promise.allSettled(closes);
  REG.clients.clear();
}

// Ready probe
export async function ping() {
  try {
    const c = getClient("default");
    const res = await c.ping();
    return res === "PONG";
  } catch { return false; }
}

// Install idempotent shutdown hooks
export function installShutdownHooks() {
  if (REG.shutdownHookInstalled) return;
  REG.shutdownHookInstalled = true;
  const shutdown = async (sig) => {
    if (REG.shuttingDown) return;
    REG.shuttingDown = true;
    if (NODE_ENV !== "test") console.log(`[redis] shutting down (${sig})…`);
    try { await closeAll(); } finally { process.exit(0); }
  };
  process.once("SIGINT",  () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}
