import "@shopify/shopify-api/adapters/node"; // import ONCE, here
import { shopifyApi, Session, ApiVersion } from "@shopify/shopify-api";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { getGlobal } from "./singleton.js";
import * as C from "./config.js";
import prisma from "@acme/db";

// Build the Shopify API instance exactly once per process
export const shopify = getGlobal("shopify", () => {
  if (!C.SHOPIFY_API_KEY || !C.SHOPIFY_API_SECRET || !C.SHOPIFY_APP_HOST) {
    throw new Error("Shopify config missing: SHOPIFY_API_KEY/SECRET/APP_URL required");
  }
  return shopifyApi({
    apiKey: C.SHOPIFY_API_KEY,
    apiSecretKey: C.SHOPIFY_API_SECRET,
    scopes: C.SHOPIFY_SCOPES,
    hostName: C.SHOPIFY_APP_HOST,          // domain only
    apiVersion: ApiVersion.April25,        // keep in sync with your app
    sessionStorage: new PrismaSessionStorage(prisma)
  });
});

// Use the officially supported storage to load sessions (fewer schema surprises)
async function getSessionFromStorage(sessionId) {
  const s = await prisma.session.findUnique({where: { id: sessionId },});
  return s ? new Session(s) : null; // normalize to Session instance
}

/**
 * Returns a ready Admin GraphQL client for a given shop domain (e.g., "shop.myshopify.com")
 * or null if no offline session exists (uninstalled or never installed).
 * 
 * Safe for worker usage (no Express dependency, no per-request init).
 */
export async function getAuthenticatedAdmin(shopDomain) {
  try {
    const offlineId = await shopify.session.getOfflineId(shopDomain);
    if (!offlineId) return null;

    const session = await getSessionFromStorage(offlineId);
    if (!session) return null;

    return new shopify.clients.Graphql({ session });
  } catch (err) {
    // In a worker, fail fast and let the job handler decide whether to retry
    console.error(`[shopify-auth] getAdminClientFor(${shopDomain}) error:`, err?.message || err);
    return null;
  }
}

/**
 * Optional helper: do a cheap sanity probe (does not consume API call)
 * Returns true if the app appears installed for this shop (has offline session).
 */
export async function isInstalled(shopDomain) {
  try {
    const offlineId = await shopify.session.getOfflineId(shopDomain);
    if (!offlineId) return false;
    const s = await prisma.session.findUnique({where: { id: sessionId },});
    return Boolean(s);
  } catch {
    return false;
  }
}
