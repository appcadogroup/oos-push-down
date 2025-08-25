import { REG } from "./registry.js";
import { closeProducerRedis } from "./connection.js";
import { closeQueues } from "./queue-factory.js";
import { closeEvents } from "./queue-events.js";
import { closeWorkers } from "./worker-factory.js";

export { getQueue } from "./queue-factory.js";
export { getQueueEvents } from "./queue-events.js";
export { startWorker } from "./worker-factory.js";
export * from "./schedulers.js";
export { enqueue, enqueueBulkOperationForPushDown, enqueueHideProduct, enqueueBulkOperationForPushDownMany} from "./enqueue.js";
export { queueHealthRouter } from "./health-router.js";
export * from "./constant.js";
export { queueDashboardRouter } from "./dashboard.js";


// Graceful shutdown – idempotent, single process hooks
export function installShutdownHooks() {
  if (REG.shutdownHookInstalled) return;
  REG.shutdownHookInstalled = true;

  const shutdown = async (signal) => {
    if (REG.shuttingDown) return;
    REG.shuttingDown = true;
    console.log(`[queue] shutting down (${signal})…`);
    try {
      await Promise.allSettled([closeWorkers(), closeQueues(), closeEvents(), closeProducerRedis()]);
    } finally {
      process.exit(0);
    }
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

// Programmatic close without exiting (eg in tests)
export async function closeQueuesAndWorkers() {
  await closeWorkers();
  await closeQueues();
  await closeEvents();
  await closeProducerRedis();
}
