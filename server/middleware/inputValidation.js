/**
 * Input Validation Middleware
 * Validates and sanitizes user input to prevent injection attacks
 */

import logger from '../utils/logger.js';

/**
 * Validate chat message input
 */
export function validateChatMessage(req, res, next) {
  const { message, sessionId } = req.body;

  // Validate message
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ 
      error: 'Invalid request', 
      message: 'Message is required and must be a string' 
    });
  }

  // Check message length
  if (message.length === 0) {
    return res.status(400).json({ 
      error: 'Invalid request', 
      message: 'Message cannot be empty' 
    });
  }

  if (message.length > 5000) {
    return res.status(400).json({ 
      error: 'Invalid request', 
      message: 'Message too long (max 5000 characters)' 
    });
  }

  // Validate sessionId if provided
  if (sessionId && typeof sessionId !== 'string') {
    return res.status(400).json({ 
      error: 'Invalid request', 
      message: 'SessionId must be a string' 
    });
  }

  // Check for UUID format if sessionId provided
  if (sessionId) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'SessionId must be a valid UUID' 
      });
    }
  }

  // Sanitize message - remove potentially dangerous patterns
  const sanitized = message
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();

  if (sanitized !== message) {
    logger.warn('[InputValidation] Potentially malicious content removed from message', {
      originalLength: message.length,
      sanitizedLength: sanitized.length
    });
  }

  // Update request with sanitized message
  req.body.message = sanitized;

  next();
}

/**
 * Validate manual search parameters
 */
export function validateManualSearch(req, res, next) {
  const { search, manufacturer, limit, offset } = req.query;

  // Validate search string
  if (search && typeof search !== 'string') {
    return res.status(400).json({ 
      error: 'Invalid request', 
      message: 'Search parameter must be a string' 
    });
  }

  if (search && search.length > 200) {
    return res.status(400).json({ 
      error: 'Invalid request', 
      message: 'Search query too long (max 200 characters)' 
    });
  }

  // Validate manufacturer
  if (manufacturer && typeof manufacturer !== 'string') {
    return res.status(400).json({ 
      error: 'Invalid request', 
      message: 'Manufacturer parameter must be a string' 
    });
  }

  // Validate limit
  if (limit) {
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Limit must be a number between 1 and 1000' 
      });
    }
  }

  // Validate offset
  if (offset) {
    const parsedOffset = parseInt(offset);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'Offset must be a non-negative number' 
      });
    }
  }

  next();
}

/**
 * General request validation
 */
export function validateRequest(req, res, next) {
  // Check Content-Type for POST/PUT requests
  if (['POST', 'PUT'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({ 
        error: 'Unsupported Media Type', 
        message: 'Content-Type must be application/json' 
      });
    }
  }

  // Check for excessively large payloads
  const contentLength = req.get('Content-Length');
  if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB
    return res.status(413).json({ 
      error: 'Payload Too Large', 
      message: 'Request body too large (max 1MB)' 
    });
  }

  next();
}

export default {
  validateChatMessage,
  validateManualSearch,
  validateRequest
};
