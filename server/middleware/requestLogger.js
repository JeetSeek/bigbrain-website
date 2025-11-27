/**
 * Request/Response Logging Middleware
 * Detailed logging for debugging and monitoring
 */

import logger from '../utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Enhanced request/response logging middleware
 */
export function requestLoggerMiddleware(req, res, next) {
  // Generate unique request ID
  const requestId = randomUUID();
  req.id = requestId;

  // Start timer
  const startTime = Date.now();

  // Log incoming request
  logger.info('[Request] Incoming', {
    id: requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length')
  });

  // Capture response
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function (data) {
    logResponse(req, res, startTime, data);
    return originalSend.call(this, data);
  };

  res.json = function (data) {
    logResponse(req, res, startTime, data);
    return originalJson.call(this, data);
  };

  next();
}

/**
 * Log response details
 */
function logResponse(req, res, startTime, data) {
  const duration = Date.now() - startTime;
  const dataSize = Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data));

  const logData = {
    id: req.id,
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    responseSize: `${Math.round(dataSize / 1024)}KB`,
    ip: req.ip || req.connection.remoteAddress
  };

  if (res.statusCode >= 500) {
    logger.error('[Response] Server Error', logData);
  } else if (res.statusCode >= 400) {
    logger.warn('[Response] Client Error', logData);
  } else if (duration > 5000) {
    logger.warn('[Response] Slow Response', logData);
  } else {
    logger.info('[Response] Success', logData);
  }
}

/**
 * Sanitize sensitive data from logs
 */
export function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') return data;

  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  const sanitized = { ...data };

  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}

export default requestLoggerMiddleware;
