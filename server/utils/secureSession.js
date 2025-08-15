/**
 * Secure Session Management
 * Implements secure session handling with HTTP-only cookies and CSRF protection
 */

import crypto from 'crypto';
import logger from './logger.js';

// Session configuration
const SESSION_CONFIG = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict',
  domain: process.env.SESSION_DOMAIN || undefined
};

// In-memory session store (use Redis in production)
const sessionStore = new Map();

/**
 * Generate secure session ID
 */
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate CSRF token
 */
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create new session
 */
export function createSession(userId, userData = {}) {
  const sessionId = generateSessionId();
  const csrfToken = generateCSRFToken();
  
  const session = {
    id: sessionId,
    userId,
    userData,
    csrfToken,
    createdAt: new Date(),
    lastAccessed: new Date(),
    isValid: true
  };

  sessionStore.set(sessionId, session);
  
  logger.auth('Session created', userId, { sessionId });
  
  return { sessionId, csrfToken };
}

/**
 * Get session by ID
 */
export function getSession(sessionId) {
  if (!sessionId) return null;
  
  const session = sessionStore.get(sessionId);
  
  if (!session) {
    return null;
  }

  // Check if session is expired
  const now = new Date();
  const sessionAge = now - session.createdAt;
  
  if (sessionAge > SESSION_CONFIG.maxAge) {
    sessionStore.delete(sessionId);
    logger.auth('Session expired', session.userId, { sessionId });
    return null;
  }

  // Update last accessed time
  session.lastAccessed = now;
  sessionStore.set(sessionId, session);
  
  return session;
}

/**
 * Validate CSRF token
 */
export function validateCSRF(sessionId, csrfToken) {
  const session = getSession(sessionId);
  
  if (!session || session.csrfToken !== csrfToken) {
    logger.warn('CSRF validation failed', { sessionId, hasSession: !!session });
    return false;
  }
  
  return true;
}

/**
 * Destroy session
 */
export function destroySession(sessionId) {
  const session = sessionStore.get(sessionId);
  
  if (session) {
    sessionStore.delete(sessionId);
    logger.auth('Session destroyed', session.userId, { sessionId });
    return true;
  }
  
  return false;
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions() {
  const now = new Date();
  let cleanedCount = 0;
  
  for (const [sessionId, session] of sessionStore.entries()) {
    const sessionAge = now - session.createdAt;
    
    if (sessionAge > SESSION_CONFIG.maxAge) {
      sessionStore.delete(sessionId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    logger.info(`Cleaned up ${cleanedCount} expired sessions`);
  }
  
  return cleanedCount;
}

/**
 * Express middleware for session management
 */
export function sessionMiddleware(req, res, next) {
  // Get session ID from cookie
  const sessionId = req.cookies?.sessionId;
  
  if (sessionId) {
    const session = getSession(sessionId);
    
    if (session) {
      req.session = session;
      req.user = { id: session.userId, ...session.userData };
    }
  }
  
  // Add session helper methods
  req.createSession = (userId, userData) => {
    const { sessionId, csrfToken } = createSession(userId, userData);
    
    // Set secure cookie
    res.cookie('sessionId', sessionId, SESSION_CONFIG);
    res.setHeader('X-CSRF-Token', csrfToken);
    
    req.session = getSession(sessionId);
    req.user = { id: userId, ...userData };
    
    return { sessionId, csrfToken };
  };
  
  req.destroySession = () => {
    if (req.session) {
      destroySession(req.session.id);
      res.clearCookie('sessionId');
      req.session = null;
      req.user = null;
    }
  };
  
  next();
}

/**
 * CSRF protection middleware
 */
export function csrfMiddleware(req, res, next) {
  // Skip CSRF for GET requests and public endpoints
  if (req.method === 'GET' || req.path.startsWith('/api/public/')) {
    return next();
  }
  
  const sessionId = req.cookies?.sessionId;
  const csrfToken = req.headers['x-csrf-token'];
  
  if (!sessionId || !csrfToken) {
    return res.status(403).json({
      error: 'CSRF protection',
      message: 'Missing session or CSRF token'
    });
  }
  
  if (!validateCSRF(sessionId, csrfToken)) {
    return res.status(403).json({
      error: 'CSRF protection',
      message: 'Invalid CSRF token'
    });
  }
  
  next();
}

// Cleanup expired sessions every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

export { SESSION_CONFIG };
