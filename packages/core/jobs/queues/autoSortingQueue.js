import { Queue } from "bullmq";
import { redis } from "@acme/redis";

export const sortingQueue = new Queue('auto-sorting', {
    connection: redis,
    defaultJobOptions: { 
      removeOnComplete: true,
      removeOnFail: {
        age: 24 * 3600, // keep up to 24 hours
      }
    }
});

  
