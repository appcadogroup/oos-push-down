import express from "express";
import { getClient } from "./factory.js";

export function redisHealthRouter() {
  const router = express.Router();

  router.get("/live", (_req, res) => res.json({ status: "ok" }));

  router.get("/ready", async (_req, res) => {
    try {
      const pong = await getClient("default").ping();
      res.json({ status: pong === "PONG" ? "ok" : "error" });
    } catch (e) {
      res.status(503).json({ status: "error", error: e?.message || String(e) });
    }
  });

  router.get("/info", async (_req, res) => {
    try {
      const info = await getClient("default").info("server");
      res.type("text/plain").send(info);
    } catch (e) {
      res.status(503).json({ status: "error", error: e?.message || String(e) });
    }
  });

  return router;
}
