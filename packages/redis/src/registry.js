const g = globalThis;
if (!g.__ACME_REDIS_REG__) {
  g.__ACME_REDIS_REG__ = {
    clients: new Map(),  // role -> IORedis/Cluster
    shutdownHookInstalled: false,
    shuttingDown: false
  };
}
export const REG = g.__ACME_REDIS_REG__;
