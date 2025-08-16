import { QueueEvents, Queue, Worker, Job } from "bullmq";
import {
    // getLogger, 
    ProductService 
} from "@acme/core/server";
import { redis } from "@acme/redis";
import { hideProductProcessor } from "../processors/hideProductProcessor.js";

// const logger = getLogger('jobs/hideProduct');

const worker = new Worker(
    "hide-product",
    hideProductProcessor,
    {
        connection: redis,
    }
);

worker.on('error', err => {
    // log the error
    console.error('[HideProductWorker] error:', err);
});

const queue = new Queue('hide-product', { connection: redis })
const queueEvents = new QueueEvents('hide-product', { connection: redis });

// Handle errors, etc.
queueEvents.on('completed', async ({jobId, returnvalue}) => {
    console.log(`Job ${jobId} -  Hide product completed`);
    // const { shop, productID } = returnvalue;
    // if (!shop || !productID) {
    //     logger.error(`Job ${jobId} - Missing shop or productID`);
    //     return;
    // }
  
});

queueEvents.on('failed', async ({jobId, failedReason}) => {
    console.error(`Job ${jobId} failed`, failedReason);
    const job = await Job.fromId(queue, jobId);
    const { shop, productID } = job.data;

    if (!shop || !productID) {
        console.error(`Job ${jobId} - Missing shop or productID`);
        return;
    }
    const productService = new ProductService();
    
    await productService.updateProduct(
        productID,
        { 
            hiddenAt: null,
            scheduledHidden: null 
        }
    )
});

