// Uses Node's built-in CPU profiler when started with --cpu-prof*
process.on("SIGUSR1", () => {
  // On Node 18/20, SIGUSR1 toggles the profiler: start if off, stop & write file if on.
  console.log("[cpuprof] toggle SIGUSR1");
});