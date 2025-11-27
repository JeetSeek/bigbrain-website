/**
 * BoilerBrain API Server - Version 2
 * Refactored with modular routes and improved architecture
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import logger from './utils/logger.js';
import { validateRequest } from './middleware/inputValidation.js';
import * as CONSTANTS from './constants/index.js';
import { supabase, testConnection } from './config/database.js';
import apiRoutes from './routes/index.js';

// Get directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the server directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || CONSTANTS.DEFAULT_PORT;

// Rate limiting configuration using constants
const apiLimiter = rateLimit({
  windowMs: CONSTANTS.RATE_LIMIT_WINDOW_MS,
  max: CONSTANTS.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const chatLimiter = rateLimit({
  windowMs: CONSTANTS.CHAT_RATE_LIMIT_WINDOW_MS,
  max: CONSTANTS.CHAT_RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many chat requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// CORS configuration with origin whitelist
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5176', 'http://localhost:5177'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
}));

// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(301, `https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

app.use(express.json());
app.use('/api', validateRequest); // Apply general request validation
app.use('/api', apiLimiter); // Apply rate limiting to all API routes

// Mount API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'BoilerBrain API',
    version: '2.0.0',
    status: 'operational',
    endpoints: {
      api: '/api',
      health: '/api/v1/health',
      docs: '/api/docs'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: '/api'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('[Server] Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Test database connection on startup
testConnection()
  .then(success => {
    if (success) {
      logger.info('[Server] Database connection verified');
    } else {
      logger.warn('[Server] Database connection failed - using fallback storage');
    }
  })
  .catch(err => {
    logger.error('[Server] Database test error:', { error: err.message });
  });

// Start server
app.listen(PORT, () => {
  logger.info(`[Server] BoilerBrain API v2 running on http://localhost:${PORT}`);
  logger.info(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`[Server] CORS origins: ${allowedOrigins.join(', ')}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('[Server] SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('[Server] SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
