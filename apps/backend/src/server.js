import dotenv from "dotenv";
dotenv.config();
import app from './app.js';
import './jobs/workers/index.js';
import { getLogger } from "@acme/core/server";

const logger = getLogger('server');

const PORT = process.env.EXPRESS_PORT || 3012;

async function startServer() {
    try {
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to Start Server', error);
        process.exit(1); // Exit the process if the database connection fails
    }
}

process.on('SIGINT', async () => {
    logger.info('Shutting down server...');
    process.exit(0);
});

startServer();