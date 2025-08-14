import { Queue } from "bullmq";
import { redis } from "@acme/redis";

// This queue is responsible for hiding products in Shopify collections
// based on the bulk operation results.
export const hideProductQueue = new Queue('hide-product', {
    connection: redis,
    defaultJobOptions: { 
      removeOnComplete: {
        age: 1800, // keep up to half hour
        count: 10, // keep up to 1000 jobs
      },
      removeOnFail: {
        age: 24 * 3600, // keep up to 24 hours
      }
    }
});
