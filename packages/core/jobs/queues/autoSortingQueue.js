import { Queue } from "bullmq";
import { getClient } from "@acme/redis"; // Import shared Redis client
const redis = getClient(); // same singleton every import


export const sortingQueue = new Queue('auto-sorting', {
    connection: redis,
    defaultJobOptions: { 
      removeOnComplete: true,
      removeOnFail: {
        age: 24 * 3600, // keep up to 24 hours
      }
    }
});

  
