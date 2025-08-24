import express from 'express';
import { verifyShopifyWebhook } from '../middleware.js';
import { getAuthenticatedAdmin } from '@acme/shopify-auth';
import { ProductWebhookHandler, BulkOperationWebhookHandler, CollectionWebhookHandler, AppWebhookHandler } from '../webhook-handler/index.js';

const router = express.Router();

router.post('/products', express.text({type: '*/*'}), verifyShopifyWebhook, async (req, res) => {
    const payload = req.body;
    const { topic, webhookId, domain } = req.webhooks;
    try {
        const admin = await getAuthenticatedAdmin(domain);
        if (!admin) {
            return res.status(200).end();
        }
        const handler = new ProductWebhookHandler({ payload, shop: domain, admin });
        console.log(`Webhook ${topic} | ${webhookId} (${domain})`);
        await handler.handle(topic);

        return res.status(200).end();
    } catch (error) {
        console.error(`Error:`, { error: error?.message || error, webhookId: webhookId, domain: domain, payload: payload  });
        return res.status(500).end();
    }
});


router.post('/collections', express.text({type: '*/*'}), verifyShopifyWebhook, async (req, res) => {
    const payload = req.body;
    const { topic, webhookId, domain } = req.webhooks;
    try {

        const admin = await getAuthenticatedAdmin(domain);
        if (!admin) {
            return res.status(200).end();
        }
        const handler = new CollectionWebhookHandler({ payload, shop: domain, admin });
        console.log(`Webhook ${topic} | ${webhookId} | ${domain}`);
        await handler.handle(topic);

        return res.status(200).end();
    } catch (error) {
        console.error(`Error:`, { error: error, webhookId: webhookId, domain: domain, payload: payload  });
        return res.status(500).end();
    }
});

router.post('/bulk-operations', express.text({type: '*/*'}), verifyShopifyWebhook, async (req, res) => {
    const payload = req.body;
    const { topic, webhookId, domain } = req.webhooks;
    try {
        const admin = await getAuthenticatedAdmin(domain);
        if (!admin) {
            return res.status(200).end();
        }
        const handler = new BulkOperationWebhookHandler({ payload, shop: domain, admin });
        console.log(`Webhook ${topic} | ${webhookId} | ${domain}`);
        await handler.handle(topic);

        return res.status(200).end();
    } catch (error) {
        console.error(`Error:`, { error: error, webhookId: webhookId, domain: domain, payload: payload  });
        return res.status(500).end();
    }
});

router.post('/apps', express.text({type: '*/*'}), verifyShopifyWebhook, async (req, res) => {
    const payload = req.body;
    const { topic, webhookId, domain } = req.webhooks;
    try {
        const admin = await getAuthenticatedAdmin(domain);
        if (!admin) {
            return res.status(200).end();
        }
        const handler = new AppWebhookHandler({ payload, shop: domain, admin });
        console.log(`Webhook ${topic} | ${webhookId} | ${domain}`);
        await handler.handle(topic);

        return res.status(200).end();
    } catch (error) {
        console.error(`Error:`, { error: error, webhookId: webhookId, domain: domain, payload: payload  });
        return res.status(500).end();
    }

});

export default router;