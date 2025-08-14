import express from 'express';
import { verifyShopifyWebhook } from '../../middleware.js';
import { getAuthenticatedAdmin } from '../app.js';
import { ProductWebhookHandler, CollectionWebhookHandler, getLogger, BulkOperationWebhookHandler, AppWebhookHandler } from '@acme/core/server';
const router = express.Router();
const productLogger = getLogger('webhooks/products');
const collectionLogger = getLogger('webhooks/collections');
const bulkOpLogger = getLog../../src/middleware.jsoperations');
const appLogger = getLogger('webhooks/apps');
router.post('/products', express.text({
  type: '*/*'
}), verifyShopifyWebhook, async (req, res) => {
  const payload = req.body;
  const {
    topic,
    webhookId,
    domain = 'advanced-collection-sort.myshopify.com'
  } = req.webhooks;
  try {
    const admin = await getAuthenticatedAdmin(domain);
    const handler = new ProductWebhookHandler({
      payload,
      shop: domain,
      admin
    });
    productLogger.info(`Webhook ${topic} | ${webhookId} | ${domain}`);
    await handler.handle(topic);
    res.status(200).json({
      status: 'success',
      data: payload
    });
  } catch (error) {
    productLogger.error(`Error:`, {
      error: error?.message || error,
      webhookId: webhookId,
      domain: domain,
      payload: payload
    });
    res.status(500).json({
      status: 'error',
      error: 'Failed to process webhook -> Internal Server Error'
    });
  }
});
router.post('/collections', express.text({
  type: '*/*'
}), verifyShopifyWebhook, async (req, res) => {
  const payload = req.body;
  const {
    topic,
    webhookId,
    domain = 'advanced-collection-sort.myshopify.com'
  } = req.webhooks;
  try {
    const admin = await getAuthenticatedAdmin(domain);
    const handler = new CollectionWebhookHandler({
      payload,
      shop: domain,
      admin
    });
    collectionLogger.info(`Webhook ${topic} | ${webhookId} | ${domain}`);
    await handler.handle(topic);
    res.status(200).json({
      status: 'success',
      data: payload
    });
  } catch (error) {
    collectionLogger.error(`Error:`, {
      error: error,
      webhookId: webhookId,
      domain: domain,
      payload: payload
    });
    res.status(500).json({
      status: 'error',
      error: 'Failed to process webhook -> Internal Server Error'
    });
  }
});
router.post('/bulk-operations', express.text({
  type: '*/*'
}), verifyShopifyWebhook, async (req, res) => {
  const payload = req.body;
  const {
    topic,
    webhookId,
    domain = 'advanced-collection-sort.myshopify.com'
  } = req.webhooks;
  try {
    const admin = await getAuthenticatedAdmin(domain);
    const handler = new BulkOperationWebhookHandler({
      payload,
      shop: domain,
      admin
    });
    bulkOpLogger.info(`Webhook ${topic} | ${webhookId} | ${domain}`);
    await handler.handle(topic);
    res.status(200).json({
      status: 'success',
      data: payload
    });
  } catch (error) {
    bulkOpLogger.error(`Error:`, {
      error: error,
      webhookId: webhookId,
      domain: domain,
      payload: payload
    });
    res.status(500).json({
      status: 'error',
      error: 'Failed to process webhook -> Internal Server Error'
    });
  }
});
router.post('/apps', express.text({
  type: '*/*'
}), verifyShopifyWebhook, async (req, res) => {
  const payload = req.body;
  const {
    topic,
    webhookId,
    domain = 'advanced-collection-sort.myshopify.com'
  } = req.webhooks;
  try {
    const admin = await getAuthenticatedAdmin(domain);
    const handler = new AppWebhookHandler({
      payload,
      shop: domain,
      admin
    });
    appLogger.info(`Webhook ${topic} | ${webhookId} | ${domain}`);
    await handler.handle(topic);
    res.status(200).json({
      status: 'success',
      data: 'Webhook processed successfully'
    });
  } catch (error) {
    appLogger.error(`Error:`, {
      error: error,
      webhookId: webhookId,
      domain: domain,
      payload: payload
    });
    res.status(500).json({
      status: 'error',
      error: 'Failed to process webhook -> Internal Server Error'
    });
  }
});
export default router;