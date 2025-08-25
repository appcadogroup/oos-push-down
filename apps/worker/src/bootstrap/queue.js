import {
  enqueue,
  startWorker,
  queueHealthRouter,
  installShutdownHooks,
  JOB_NAMES,
  QUEUES
} from "@acme/queue";

import { autoSortingProcessor } from "./processors/autoSortingProcessor.js";
import { hideProductProcessor } from "./processors/hideProductProcessor.js";
import { pushDownProcessor } from "./processors/pushDownProcessor.js";


// Start workers ONCE at process boot.
// Do not create workers inside request handlers.
export function initWorkers(app) {
  // Health endpoints (optional)
  app.use("/health/queue", queueHealthRouter({ queues: Object.values(QUEUES) }));

  // Install process signal hooks (idempotent)
  installShutdownHooks();

  // Workers
  startWorker(QUEUES.AUTO_SORTING, autoSortingProcessor, {
    // concurrency: 16,                // tune per queue
    lockDuration: 30_000
  });

  startWorker(QUEUES.HIDE_PRODUCT, hideProductProcessor, {
    // concurrency: 16,                 // CPU-heavy
    lockDuration: 60_000
  });

  startWorker(QUEUES.BULK_OPERATION, pushDownProcessor, {
    concurrency: 2,                 // CPU-heavy
    lockDuration: 60_000
  });
}

