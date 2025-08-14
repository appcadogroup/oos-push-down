import { shopify } from "./app.js";

// Middleware to verify webhook HMAC
export async function verifyShopifyWebhook(req, res, next) {
  try {
    const body = req.body;
    
    const { valid, topic, webhookId, domain } = await shopify.webhooks.validate(
      {
        rawBody: body,
        rawRequest: req,
        rawResponse: res,
      },
    );

    if (valid) {
      req.body = JSON.parse(body); // parse body for next middleware
      req.webhooks = {
        topic,
        webhookId,
        domain,
      };
      return next();
    } 

    console.warn("❌ Webhook validation failed");
    return res.status(401).send("Unauthorized");
  } catch (error) {
    console.error("❌ Error in verify shopify webhook:", error);
    return res.status(401).json({
      status: "error",
      error: "Webhook validation failed",
    });
  }
}
