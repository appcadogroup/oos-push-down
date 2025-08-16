// apps/backend/src/ops/heapdump.js
import heapdump from "heapdump";
process.on("SIGUSR2", () => {
  const file = `/app/heap-${Date.now()}.heapsnapshot`;
  heapdump.writeSnapshot(file, (err, fname) => console.log("[heapdump]", err || `wrote ${fname}`));
});
