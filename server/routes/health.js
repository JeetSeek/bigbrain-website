/**
 * Health Check Routes
 * API endpoints for monitoring and health checks
 */

import express from 'express';
import { supabase } from '../supabaseClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/v1/health
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {}
  };

  // Check database connection
  try {
    const { error } = await supabase
      .from('boiler_fault_codes')
      .select('id')
      .limit(1);
    
    health.checks.database = error ? 'unhealthy' : 'healthy';
    if (error) {
      health.status = 'degraded';
      logger.warn('[Health] Database check failed:', { error: error.message });
    }
  } catch (err) {
    health.checks.database = 'unhealthy';
    health.status = 'degraded';
    logger.error('[Health] Database check error:', { error: err.message });
  }

  // Check OpenAI API availability (optional - don't fail health check)
  try {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    health.checks.openai = hasApiKey ? 'configured' : 'not_configured';
  } catch (err) {
    health.checks.openai = 'error';
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
  };

  // Response time
  health.responseTime = `${Date.now() - startTime}ms`;

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /api/v1/health/ready
 * Readiness probe (Kubernetes compatible)
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if critical services are available
    const { error } = await supabase
      .from('boiler_fault_codes')
      .select('id')
      .limit(1);
    
    if (error) {
      return res.status(503).json({ 
        ready: false, 
        reason: 'Database unavailable' 
      });
    }

    res.json({ ready: true });
  } catch (err) {
    logger.error('[Health] Readiness check failed:', { error: err.message });
    res.status(503).json({ 
      ready: false, 
      reason: 'Service unavailable' 
    });
  }
});

/**
 * GET /api/v1/health/live
 * Liveness probe (Kubernetes compatible)
 */
router.get('/live', (req, res) => {
  // Simple liveness check - is the process running?
  res.json({ 
    alive: true,
    timestamp: new Date().toISOString()
  });
});

export default router;
