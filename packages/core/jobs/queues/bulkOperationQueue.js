import { Queue } from "bullmq";
import { getClient } from "@acme/redis"; // Import shared Redis client
const redis = getClient(); // same singleton every import


export const bulkOperationQueue = new Queue('bulk-operation', {
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

  
