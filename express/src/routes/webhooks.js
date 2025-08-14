import express from 'express';
const router = express.Router();
import { verifyShopifyWebhook } from '../../middleware.js';

router.post('/products', express.text({type: '*/*'}), verifyShopifyWebhook, async (req, res) => {
    const payload = req.body;
    const { topic, webhookId, domain = 'advanced-collection-sort.myshopify.com' } = req.webhooks;
    try {
       console.log(`Processing product webhook: ${topic} | ${webhookId} | ${domain}`);

        res.status(200).json({
            status: 'success',
            data: payload,
        });
    } catch (error) {

        res.status(500).json({
            status: 'error',
            error: 'Failed to process webhook -> Internal Server Error',
        });
    }
});



export default router;