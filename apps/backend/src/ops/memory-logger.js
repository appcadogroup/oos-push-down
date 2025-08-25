// memory-logger.js
setInterval(() => {
  const m = process.memoryUsage();
  const MB = x => Math.round(x/1024/1024);
  console.log({ rss: MB(m.rss), heapUsed: MB(m.heapUsed), heapTotal: MB(m.heapTotal),
                external: MB(m.external), arrayBuffers: MB(m.arrayBuffers), ts: new Date().toISOString() });
}, 30000);