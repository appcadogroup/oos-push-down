import express from "express";
import { getQueue } from "./queue-factory.js";

export function queueHealthRouter({ queues = [] } = {}) {
  const router = express.Router();

  router.get("/live", (_req, res) => {
    res.json({ status: "ok" });
  });

  router.get("/ready", async (_req, res) => {
    try {
      // ping via an inexpensive call
      await Promise.all(queues.map((q) => getQueue(q).getJobCounts("waiting")));
      res.json({ status: "ok" });
    } catch (e) {
      res.status(503).json({ status: "error", error: e?.message || String(e) });
    }
  });

  router.get("/queues", async (_req, res) => {
    const data = {};
    for (const name of queues) {
      const q = getQueue(name);
      const counts = await q.getJobCounts(
        "active","completed","failed","delayed","waiting","paused"
      );
      data[name] = counts;
    }
    res.json(data);
  });

  return router;
}
