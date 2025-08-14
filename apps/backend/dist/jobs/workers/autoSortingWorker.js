import { QueueEvents, Worker } from "bullmq";
import { getLogger } from "@acme/core/server";
import { redis } from "@acme/redis";
import { autoSortingProcessor } from "../processors/autoSortingProcessor.js";
const logger = getLogger('jobs/autoSorting');
const worker = new Worker("auto-sorting", autoSortingProcessor, {
  connection: redis,
  limiter: {
    max: 1,
    duration: 1000,
    groupKey: 'shop'
  }
});
worker.on('error', err => {
  // log the error
  logger.error('Error:', err);
});
const queueEvents = new QueueEvents('auto-sorting', {
  connection: redis
});

// Handle errors, etc.
queueEvents.on('completed', async ({
  jobId,
  returnvalue
}) => {
  logger.debug(`Completed: ${jobId} -  auto sorting completed`, returnvalue);
});
queueEvents.on('duplicated', async ({
  jobId
}) => {
  logger.debug(`Job ${jobId} -  create bulk operation duplicated`);
});
queueEvents.on('failed', async ({
  jobId,
  failedReason
}) => {
  logger.error(`Job ${jobId} failed`, failedReason);
});