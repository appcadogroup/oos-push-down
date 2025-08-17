import "@shopify/shopify-api/adapters/node";
import express from "express";
import {
  shopifyApi,
  Session,
  ApiVersion,
} from "@shopify/shopify-api";
import prisma from "@acme/db";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";

const app = express();

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(","),
  sessionStorage: new PrismaSessionStorage(prisma),
  hostName: process.env.SHOPIFY_APP_URL,
  apiVersion: ApiVersion.April25
});

async function getSessionFromStorage(sessionId) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    console.error(`Session not found for ID: ${sessionId}`);
    return null
  }

  return new Session(session);
}

export async function getAuthenticatedAdmin(domain) {
  try {
    const sessionId = await shopify.session.getOfflineId(domain);
    if (!sessionId) {
      console.error(`Session ID not found for shop: ${domain}`);
      return null;
    }

    const session = await getSessionFromStorage(sessionId);
    if (!session) {
      console.error(`Session not found for shop: ${domain}`);
      return null;
    }
   return new shopify.clients.Graphql({ session });
  } catch (error) {
    console.error(`Error getting authenticated admin for shop: ${domain}`);
    return null;
  }
}


import routes from "./routes/index.js";
app.use('/', routes);


app.use(express.json());

export default app;