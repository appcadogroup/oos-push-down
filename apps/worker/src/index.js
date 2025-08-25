// worker/src/index.js
BigInt.prototype.toJSON = function () {
  const int = Number.parseInt(this.toString());
  return int ?? this.toString();
};
import express from "express";
import { initWorkers } from "./bootstrap/queue.js";
import { queueDashboardRouter, QUEUES } from "@acme/queue";

const app = express();
app.use(express.json());

// // Minimal "app" with only the shape we need
// const fakeApp = { use() {} };

// Boots all workers ONCE and installs shutdown hooks
initWorkers(app);

// Mount dashboard at /dashboard/queues
app.use(
  queueDashboardRouter({
    queues: Object.values(QUEUES),
    basePath: "/dashboard/queues",
    readOnly: true, // flip to false only behind VPN/admin auth
    // or set QUEUE_DASH_USER / QUEUE_DASH_PASS in env
    auth: { username: process.env.QUEUE_DASH_USER, password: process.env.QUEUE_DASH_PASS }
  })
);

const port = Number(process.env.WORKER_PORT || 3100);
app.listen(port, () => console.log(`[worker] on ${port}`));

// // Keep process alive; shutdown handled by installed hooks
// process.stdin.resume(); // prevents exit when no timers are pending

// console.log(`[worker] started (pid ${process.pid})`);
