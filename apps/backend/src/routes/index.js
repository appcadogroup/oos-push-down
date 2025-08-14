import express from 'express';
const router = express.Router();

import webhookRoutes from './webhooks.js';
import coreRoutes from './core.js';
router.use('/webhooks', webhookRoutes);
router.use('/core', coreRoutes);

export default router;