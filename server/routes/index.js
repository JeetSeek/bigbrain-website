/**
 * API Routes Index
 * Centralized router configuration with versioning
 */

import express from 'express';
import manualsRouter from './manuals.js';
import chatRouter from './chat.js';
import healthRouter from './health.js';

const router = express.Router();

/**
 * API Version 1 Routes
 */
router.use('/v1/manuals', manualsRouter);
router.use('/v1/chat', chatRouter);
router.use('/v1/health', healthRouter);

/**
 * Legacy routes (backwards compatibility)
 * Redirect to v1 routes
 */
router.use('/manuals', manualsRouter);
router.use('/chat', chatRouter);
router.use('/health', healthRouter);

/**
 * API root endpoint
 */
router.get('/', (req, res) => {
  res.json({
    name: 'BoilerBrain API',
    version: '1.0.0',
    endpoints: {
      health: '/api/v1/health',
      manuals: '/api/v1/manuals',
      chat: '/api/v1/chat'
    },
    documentation: '/api/docs',
    status: 'operational'
  });
});

export default router;
