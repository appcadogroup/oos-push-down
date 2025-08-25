import express from "express";
import { Queue as QueueMQ } from "bullmq";
// Conver to import
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

const BULLMQ_QUEUES = {
  AUTO_SORTING: "auto-sorting",
  BULK_OPERATION: "bulk-operation",
  HIDE_PRODUCT: "hide-product",
};

const queues = Object.values(BULLMQ_QUEUES);

const connection = {
  username: "default",
  password: "AVNS_-Fl1ebqNuwdQ0jBsqog",
  host: "db-caching-nyc1-77651-do-user-21347744-0.f.db.ondigitalocean.com",
  port: 25061,
  tls: true,
};

// Ensure Queue singletons exist and wrap them
const adapters = queues.map((name) => new BullMQAdapter(new QueueMQ(name, { connection })));

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: adapters,
  serverAdapter: serverAdapter,
});

const app = express();

app.use("/admin/queues", serverAdapter.getRouter());

// other configurations of your server

app.listen(3100, () => {
  console.log("Running on 3100...");
  console.log("For the UI, open http://localhost:3100/admin/queues");
  console.log("Make sure Redis is running on port 6379 by default");
});
