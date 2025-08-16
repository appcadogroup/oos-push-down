import express from 'express';
import { verifyShopifyWebhook } from '../middleware.js';
import { getAuthenticatedAdmin } from '../app.js';
import { ProductWebhookHandler, CollectionWebhookHandler, BulkOperationWebhookHandler, AppWebhookHandler } from '@acme/core/server';

const router = express.Router();
// const productLogger = getLogger('webhooks/products');
// const collectionLogger = getLogger('webhooks/collections');
// const bulkOpLogger = getLogger('webhooks/bulk-operations');
// const appLogger = getLogger('webhooks/apps');

router.post('/products', express.text({type: '*/*'}), verifyShopifyWebhook, async (req, res) => {
    const payload = req.body;
    const { topic, webhookId, domain } = req.webhooks;
    try {
        const admin = await getAuthenticatedAdmin(domain);
        const handler = new ProductWebhookHandler({ payload, shop: domain, admin });
        console.log(`Webhook ${topic} | ${webhookId} | ${domain}`);
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
        console.log(`Authenticating ${topic} | ${webhookId} | ${domain}`);
        const admin = await getAuthenticatedAdmin(domain);
        console.log(`Authenticated ${topic} | ${webhookId} | ${domain}`);
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