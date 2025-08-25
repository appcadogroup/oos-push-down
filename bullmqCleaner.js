import { Queue } from 'bullmq';

const queueName = 'auto-sorting';

const queue = new Queue(queueName, {
  connection: {
    username: 'default',
    password: 'AVNS_-Fl1ebqNuwdQ0jBsqog',
    host: 'db-caching-nyc1-77651-do-user-21347744-0.f.db.ondigitalocean.com',
    port:  25061,
    tls: true
  }
});

async function clearQueue() {
  console.log(`🧹 Cleaning the ${queueName} queue...`);
  // Get total jobs not cleaned
  const totalJobs = await queue.count();
  console.log(`Total jobs in the ${queueName} queue: ${totalJobs}`);

  await queue.drain(true); // removes all waiting + delayed jobs
  await queue.clean(0, 0, 'completed'); // removes all completed jobs
  await queue.clean(0, 0, 'failed');    // removes all failed jobs
  await queue.clean(0, 0, 'wait');      // removes waiting jobs (drain should cover it)
  await queue.clean(0, 0, 'paused');    // removes paused jobs if any
  await queue.clean(0, 0, 'delayed');   // removes delayed jobs
  await queue.clean(0, 0, 'active');    // removes active jobs (be careful!)
  
  console.log('✅ Queue fully cleaned');
}

async function main() {
  await clearQueue();
}

main();