/**
 * Production-ready logging utility
 * Provides structured logging with different levels and formats
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level based on environment
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? 
  (process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG);

// Log directory
const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Format log entry with timestamp and level
 */
function formatLogEntry(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message,
    ...meta
  };
  
  return JSON.stringify(entry);
}

/**
 * Write log to file
 */
function writeToFile(level, entry) {
  if (process.env.NODE_ENV === 'production') {
    const filename = `${level.toLowerCase()}.log`;
    const filepath = path.join(logDir, filename);
    
    fs.appendFileSync(filepath, entry + '\n');
  }
}

/**
 * Logger class with different log levels
 */
class Logger {
  error(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      const entry = formatLogEntry('ERROR', message, meta);
      console.error(`🚨 ${entry}`);
      writeToFile('ERROR', entry);
    }
  }

  warn(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      const entry = formatLogEntry('WARN', message, meta);
      console.warn(`⚠️  ${entry}`);
      writeToFile('WARN', entry);
    }
  }

  info(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      const entry = formatLogEntry('INFO', message, meta);
      writeToFile('INFO', entry);
    }
  }

  debug(message, meta = {}) {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      const entry = formatLogEntry('DEBUG', message, meta);
      writeToFile('DEBUG', entry);
    }
  }

  /**
   * Log HTTP requests
   */
  request(req, res, responseTime) {
    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };

    if (res.statusCode >= 400) {
      this.error(`HTTP ${res.statusCode} ${req.method} ${req.url}`, meta);
    } else {
      this.info(`HTTP ${res.statusCode} ${req.method} ${req.url}`, meta);
    }
  }

  /**
   * Log authentication events
   */
  auth(event, userId, meta = {}) {
    this.info(`Auth: ${event}`, {
      userId,
      event,
      ...meta
    });
  }

  /**
   * Log database operations
   */
  database(operation, table, meta = {}) {
    this.debug(`Database: ${operation} on ${table}`, {
      operation,
      table,
      ...meta
    });
  }
}

// Export singleton instance
export default new Logger();
