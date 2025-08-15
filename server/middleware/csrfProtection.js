/**
 * CSRF Protection Middleware
 * Implements Cross-Site Request Forgery protection for admin and sensitive endpoints
 */

import crypto from 'crypto';

// CSRF token storage (in production, use Redis or database)
const csrfTokens = new Map();
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

/**
 * Generate a secure CSRF token
 * @param {string} sessionId - Session identifier
 * @returns {string} CSRF token
 */
export function generateCSRFToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + CSRF_TOKEN_EXPIRY;
  
  csrfTokens.set(sessionId, {
    token,
    expiresAt
  });
  
  // Clean up expired tokens
  cleanupExpiredTokens();
  
  return token;
}

/**
 * Validate CSRF token
 * @param {string} sessionId - Session identifier
 * @param {string} token - CSRF token to validate
 * @returns {boolean} True if token is valid
 */
export function validateCSRFToken(sessionId, token) {
  const storedData = csrfTokens.get(sessionId);
  
  if (!storedData) {
    return false;
  }
  
  // Check if token is expired
  if (Date.now() > storedData.expiresAt) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  // Validate token
  return storedData.token === token;
}

/**
 * Clean up expired CSRF tokens
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (now > data.expiresAt) {
      csrfTokens.delete(sessionId);
    }
  }
}

/**
 * CSRF protection middleware for Express
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function csrfProtection(req, res, next) {
  // Skip CSRF check for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Get session ID from various sources
  const sessionId = req.headers['x-session-id'] || 
                   req.body?.sessionId || 
                   req.query?.sessionId ||
                   req.user?.id;
  
  if (!sessionId) {
    return res.status(400).json({
      error: 'CSRF Protection',
      message: 'Session ID required for CSRF protection'
    });
  }
  
  // Get CSRF token from headers
  const csrfToken = req.headers['x-csrf-token'] || 
                   req.body?.csrfToken ||
                   req.query?.csrfToken;
  
  if (!csrfToken) {
    return res.status(403).json({
      error: 'CSRF Protection',
      message: 'CSRF token required'
    });
  }
  
  // Validate CSRF token
  if (!validateCSRFToken(sessionId, csrfToken)) {
    return res.status(403).json({
      error: 'CSRF Protection',
      message: 'Invalid or expired CSRF token'
    });
  }
  
  next();
}

/**
 * Generate CSRF token endpoint
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export function generateCSRFTokenEndpoint(req, res) {
  try {
    const sessionId = req.headers['x-session-id'] || 
                     req.query?.sessionId ||
                     req.user?.id ||
                     crypto.randomUUID();
    
    const token = generateCSRFToken(sessionId);
    
    res.json({
      csrfToken: token,
      sessionId: sessionId,
      expiresIn: CSRF_TOKEN_EXPIRY
    });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to generate CSRF token'
    });
  }
}

export default {
  generateCSRFToken,
  validateCSRFToken,
  csrfProtection,
  generateCSRFTokenEndpoint
};
