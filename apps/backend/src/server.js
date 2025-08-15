import dotenv from "dotenv";
dotenv.config();
import app from './app.js';
import { getLogger } from "@acme/core/server";

const logger = getLogger('server');

const PORT = process.env.EXPRESS_PORT || 3012;

async function startServer() {
  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

//   // Keep these slightly higher than nginx proxy_* timeouts
//   server.requestTimeout  = 60_000; // default 5m in Node 20; we lower it
//   server.headersTimeout  = 65_000;
//   server.keepAliveTimeout= 61_000;

  process.once("SIGINT",  () => { logger.info("SIGINT");  server.close(()=>process.exit(0)); });
  process.once("SIGTERM", () => { logger.info("SIGTERM"); server.close(()=>process.exit(0)); });
}
process.on('SIGINT', async () => {
    logger.info('Shutting down server...');
    process.exit(0);
});

startServer();