import { QueueEvents, Queue, Worker } from "bullmq";
import { getLogger } from "@acme/core/server";
import { redis } from "@acme/redis";
import { JOB_NAMES } from "@acme/core";
import { pushDownProcessor } from "../processors/pushDownProcessor.js";
const logger = getLogger('jobs/bulkOp');
const worker = new Worker("bulk-operation", async job => {
  logger.debug(`Processing job: ${job.name}`, {
    jobData: job.data
  });
  switch (job.name) {
    case JOB_NAMES.PUSH_DOWN:
      return await pushDownProcessor(job);
    default:
      logger.debug(`Unknown job name: ${job.name}`);
      return new Response();
  }
}, {
  connection: redis,
  limiter: {
    max: 1,
    duration: 1000,
    groupKey: "shop"
  }
});
worker.on("error", err => {
  // log the error
  logger.error("Error:", err);
});
const queueEvents = new QueueEvents("bulk-operation", {
  connection: redis
});

// Handle errors, etc.
queueEvents.on("completed", async ({
  jobId,
  returnvalue
}) => {
  logger.debug(`Job ${jobId} -  create bulk operation completed`, returnvalue);
  const {
    shop,
    collectionID,
    operationID
  } = returnvalue;
  if (!shop || !collectionID || !operationID) {
    logger.error(`Job ${jobId} - Missing shop or collectionID or operationID`);
    return;
  }
  try {} catch (error) {
    logger.error(`Error saving bulk operation to database: ${error}`);
    return;
  }
});
queueEvents.on("duplicated", async ({
  jobId
}) => {
  logger.debug(`Job ${jobId} -  create bulk operation duplicated`);
});
queueEvents.on("failed", async ({
  jobId,
  failedReason
}) => {
  logger.error(`Job ${jobId} failed ${failedReason}`, failedReason);
  // const job = await Job.fromId(queue, jobId);
});