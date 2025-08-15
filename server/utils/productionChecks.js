/**
 * Production Environment Checks
 * Validates production readiness and security requirements
 */

import logger from './logger.js';
import { validateDatabaseSchema } from './databaseValidator.js';

/**
 * Critical production environment variables
 */
const CRITICAL_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'CSRF_SECRET',
  'SESSION_SECRET'
];

/**
 * Security-sensitive environment variables that shouldn't have default values
 */
const SECURITY_ENV_VARS = [
  'ADMIN_PASSWORD',
  'DEMO_USER_PASSWORD',
  'JWT_SECRET',
  'CSRF_SECRET',
  'SESSION_SECRET'
];

/**
 * Default values that indicate insecure configuration
 */
const INSECURE_DEFAULTS = [
  'CHANGE_IN_PRODUCTION',
  'CHANGE_THIS_IN_PRODUCTION',
  'SET_IN_PRODUCTION',
  'SET_SECURE_PASSWORD_IN_PRODUCTION',
  'your-production-domain.com',
  'admin@yourdomain.com',
  'demo@yourdomain.com'
];

/**
 * Run comprehensive production readiness checks
 */
export async function runProductionChecks() {
  const results = {
    ready: true,
    critical: [],
    warnings: [],
    info: [],
    environment: process.env.NODE_ENV || 'development'
  };

  logger.info('Starting production readiness checks');

  // Check critical environment variables
  for (const envVar of CRITICAL_ENV_VARS) {
    if (!process.env[envVar]) {
      results.ready = false;
      results.critical.push(`Missing critical environment variable: ${envVar}`);
    }
  }

  // Check for insecure default values
  for (const envVar of SECURITY_ENV_VARS) {
    const value = process.env[envVar];
    if (value && INSECURE_DEFAULTS.some(defaultVal => value.includes(defaultVal))) {
      results.ready = false;
      results.critical.push(`Environment variable ${envVar} contains insecure default value`);
    }
  }

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    results.warnings.push(`Node.js version ${nodeVersion} is outdated. Recommended: v18+`);
  }

  // Check if running in production mode
  if (process.env.NODE_ENV !== 'production') {
    results.warnings.push('NODE_ENV is not set to "production"');
  }

  // Check SSL/HTTPS configuration
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.FRONTEND_URL || !process.env.FRONTEND_URL.startsWith('https://')) {
      results.warnings.push('FRONTEND_URL should use HTTPS in production');
    }
  }

  // Check API key configuration
  const hasDeepSeek = process.env.DEEPSEEK_API_KEY_1;
  const hasOpenAI = process.env.OPENAI_API_KEY;
  
  if (!hasDeepSeek && !hasOpenAI) {
    results.critical.push('No AI API keys configured (DeepSeek or OpenAI)');
    results.ready = false;
  }

  // Database schema validation
  try {
    const dbValidation = await validateDatabaseSchema();
    if (!dbValidation.valid) {
      results.ready = false;
      results.critical.push(...dbValidation.errors);
    }
    results.warnings.push(...dbValidation.warnings);
  } catch (error) {
    results.ready = false;
    results.critical.push(`Database validation failed: ${error.message}`);
  }

  // Check memory limits
  const memoryUsage = process.memoryUsage();
  const memoryLimitMB = 512; // 512MB warning threshold
  if (memoryUsage.heapUsed > memoryLimitMB * 1024 * 1024) {
    results.warnings.push(`High memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
  }

  // Check for development dependencies in production
  if (process.env.NODE_ENV === 'production') {
    try {
      require('nodemon');
      results.warnings.push('Development dependencies detected in production');
    } catch (e) {
      // Good - nodemon not available in production
    }
  }

  // Log results
  if (results.ready) {
    logger.info('Production readiness checks passed', {
      critical: results.critical.length,
      warnings: results.warnings.length,
      environment: results.environment
    });
  } else {
    logger.error('Production readiness checks failed', {
      critical: results.critical,
      warnings: results.warnings,
      environment: results.environment
    });
  }

  return results;
}

/**
 * Get system information for monitoring
 */
export function getSystemInfo() {
  const memoryUsage = process.memoryUsage();
  
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024)
    },
    cpuUsage: process.cpuUsage()
  };
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware(req, res, next) {
  // Security headers for production
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
}
