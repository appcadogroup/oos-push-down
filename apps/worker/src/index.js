// worker/src/index.js
BigInt.prototype.toJSON = function () {
  const int = Number.parseInt(this.toString());
  return int ?? this.toString();
};
import { initWorkers } from "./bootstrap/queue.js";

// Minimal "app" with only the shape we need
const fakeApp = { use() {} };

// Boots all workers ONCE and installs shutdown hooks
initWorkers(fakeApp);

// Keep process alive; shutdown handled by installed hooks
process.stdin.resume(); // prevents exit when no timers are pending

console.log(`[worker] started (pid ${process.pid})`);
