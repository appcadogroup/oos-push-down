// Global registry prevents multiple instances if module is imported multiple times
const g = globalThis;
if (!g.__BULL_REGISTRY__) {
  g.__BULL_REGISTRY__ = {
    queues: new Map(),        // name -> Queue
    events: new Map(),        // name -> QueueEvents
    workers: new Map(),       // name -> Worker
    shutdownHookInstalled: false,
    shuttingDown: false
  };
}
export const REG = g.__BULL_REGISTRY__;
