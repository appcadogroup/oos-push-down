export const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
export const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
// hostName must be domain only (no protocol, no trailing slash)
export const SHOPIFY_APP_HOST = (process.env.SHOPIFY_APP_URL || "")
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");

export const SHOPIFY_SCOPES = (process.env.SCOPES || "").split(",").map(s => s.trim()).filter(Boolean);

// Pin a supported version you deploy with; keep in step with your app
// (Using April25 in your snippet; update when you update the app.)
export const SHOPIFY_API_VERSION = "2025-04"; // or use ApiVersion.April25 if importing enum
