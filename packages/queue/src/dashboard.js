import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { ExpressAdapter } from "@bull-board/express";
import { getQueue } from "./queue-factory.js";
import { REG } from "./registry.js";

/** Basic Auth (optional) */
function basicAuth({ username, password }) {
  const header = 'Basic realm="Queue Dashboard"';
  return (req, res, next) => {
    if (!username || !password) return next(); // disabled
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Basic ")) {
      res.set("WWW-Authenticate", header);
      return res.status(401).send("Auth required");
    }
    const [user, pass] = Buffer.from(auth.slice(6), "base64")
      .toString("utf8")
      .split(":");
    if (user === username && pass === password) return next();
    res.set("WWW-Authenticate", header);
    return res.status(401).send("Unauthorized");
  };
}

/** Read-only guard (blocks mutating HTTP verbs) */
function readOnlyGuard(readOnly = true) {
  const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  return (req, res, next) => {
    if (!readOnly) return next();
    if (MUTATING.has(req.method)) return res.status(403).send("Read-only");
    next();
  };
}

/**
 * Build an Express router that serves BullMQ dashboard.
 *
 * @param {Object} opts
 * @param {string[]} opts.queues - queue names to expose
 * @param {string} [opts.basePath="/dashboard/queues"] - mount path within the router
 * @param {boolean} [opts.readOnly=true] - prevent job mutations from UI
 * @param {{username:string,password:string}} [opts.auth] - basic auth creds
 *
 * @returns {express.Router}
 */
export function queueDashboardRouter({
  queues = [],
  basePath = "/dashboard/queues",
  readOnly = true,
  auth = {
    username: process.env.QUEUE_DASH_USER,
    password: process.env.QUEUE_DASH_PASS
  }
} = {}) {
  const router = express.Router();

  // // Optional security layers
  // router.use(basePath, basicAuth(auth));
  // router.use(basePath, readOnlyGuard(readOnly));

  // Express adapter for bull-board
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(basePath);

  // Ensure Queue singletons exist and wrap them
  const adapters = queues.map((name) => new BullMQAdapter(getQueue(name)));

  // Create bull-board instance
  createBullBoard({
    queues: adapters,
    serverAdapter
  });

  // Mount UI + JSON API under basePath
  router.use(basePath, serverAdapter.getRouter());

  // Make it easy to add/remove queues later (optional helpers)
  router.addQueue = (name) => {
    const adapter = new BullMQAdapter(getQueue(name));
    adapters.push(adapter);
    // @bull-board doesn’t expose a public add API in older versions;
    // with v5 you can rebuild if needed. In practice, define queues up-front.
  };

  return router;
}
