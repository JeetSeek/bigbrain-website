/**
 * Lightweight error tracking utility
 * Drop-in replacement ready for Sentry integration.
 * 
 * To upgrade to Sentry:
 *   1. npm install @sentry/react
 *   2. Replace init() with Sentry.init({ dsn: '...' })
 *   3. Replace captureException with Sentry.captureException
 *   4. Replace captureMessage with Sentry.captureMessage
 */

const MAX_ERRORS = 50;
const errorLog = [];

export function init() {
  // Global unhandled error handler
  window.addEventListener('error', (event) => {
    captureException(event.error || new Error(event.message), {
      source: 'window.onerror',
      filename: event.filename,
      lineno: event.lineno,
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason || new Error('Unhandled rejection'), {
      source: 'unhandledrejection',
    });
  });

  console.log('[ErrorTracking] Initialized');
}

export function captureException(error, context = {}) {
  const entry = {
    type: 'exception',
    message: error?.message || String(error),
    stack: error?.stack,
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href,
  };

  errorLog.push(entry);
  if (errorLog.length > MAX_ERRORS) errorLog.shift();

  console.error('[ErrorTracking]', entry.message, context);
}

export function captureMessage(message, level = 'info', context = {}) {
  const entry = {
    type: 'message',
    message,
    level,
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href,
  };

  errorLog.push(entry);
  if (errorLog.length > MAX_ERRORS) errorLog.shift();

  if (level === 'error') {
    console.error('[ErrorTracking]', message, context);
  } else if (level === 'warning') {
    console.warn('[ErrorTracking]', message, context);
  }
}

export function getErrorLog() {
  return [...errorLog];
}

export function setUser(userId, email) {
  // Placeholder — Sentry would call Sentry.setUser({ id, email })
  console.log('[ErrorTracking] User set:', userId, email);
}

export default { init, captureException, captureMessage, getErrorLog, setUser };
