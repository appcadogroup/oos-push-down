BigInt.prototype.toJSON = function () {
  const int = Number.parseInt(this.toString());
  return int ?? this.toString();
};

import dotenv from "dotenv";
dotenv.config();
import app from './app.js';
import "./ops/memory-logger.js"

const PORT = process.env.EXPRESS_PORT || 3012;

async function startServer() {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  process.once("SIGINT",  () => { console.log("SIGINT");  server.close(()=>process.exit(0)); });
  process.once("SIGTERM", () => { console.log("SIGTERM"); server.close(()=>process.exit(0)); });
}
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    process.exit(0);
});

startServer();