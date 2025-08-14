import dotenv from "dotenv";
dotenv.config();
import app from './src/app.js';
// import prisma from "@acme/db";
// import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";


const PORT = 3012;

async function startServer() {
    try {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {

        process.exit(1); // Exit the process if the database connection fails
    }
}

process.on('SIGINT', async () => {
    process.exit(0);
});

startServer();