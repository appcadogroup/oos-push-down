import { QueueEvents } from "bullmq";
import { REG } from "./registry.js";
import { connectionOptions, queuePrefix } from "./connection.js";

export function getQueueEvents(name) {
  if (REG.events.has(name)) return REG.events.get(name);
  const qe = new QueueEvents(name, {
    connection: connectionOptions(),
    prefix: queuePrefix()
  });
  // Attach minimal listeners once – avoid piling up listeners
  qe.on("error", (err) => {
    // Do not throw; log in your central logger instead
    console.error(`[QueueEvents:${name}]`, err?.message || err);
  });
  REG.events.set(name, qe);
  return qe;
}

export async function closeEvents() {
  const closes = [];
  for (const [, qe] of REG.events) closes.push(qe.close().catch(() => {}));
  await Promise.all(closes);
  REG.events.clear();
}
