import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import logger from './utils/logger.js';
import { validateRequest } from './middleware/inputValidation.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import * as CONSTANTS from './constants/index.js';
import chatRoute from './routes/chatRoute.js';
import agentRoute from './routes/agentRoute.js';
import sessionRoute from './routes/sessionRoute.js';
import manualRoute from './routes/manualRoute.js';

// Get directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the server directory first, then root .env for additional keys (e.g. ANTHROPIC_API_KEY)
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Initialize Supabase client (backend uses SERVICE_KEY for full access)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const app = express();

// Railway detection and PORT configuration
// CRITICAL: Railway dynamically assigns PORT, but we may have manually set it to 3204
// We need to detect Railway's actual assigned port from RAILWAY_STATIC_URL or use a different strategy
let PORT;
if (process.env.RAILWAY_STATIC_URL) {
  PORT = parseInt(process.env.PORT) || 3000;
  logger.info(`[Railway] Environment detected. Listening on PORT: ${PORT}`);
  logger.info(`[Railway] RAILWAY_STATIC_URL: ${process.env.RAILWAY_STATIC_URL}`);
} else {
  // Local development
  PORT = process.env.PORT || CONSTANTS.DEFAULT_PORT;
  logger.info(`[Local] Development mode. PORT: ${PORT}`);
}

// Rate limiting imported from shared middleware (apiLimiter, chatLimiter in route files)

// HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// CORS configuration with origin whitelist
// Include all production and development origins
const defaultOrigins = [
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:3000',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:3000',
  'https://boiler-brain.netlify.app',
  'https://boiler-brain-ai.netlify.app',
  'https://1gassapp.netlify.app'
];

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? [...defaultOrigins, ...process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())]
  : defaultOrigins;

logger.info('[CORS] Allowed origins: ' + JSON.stringify(allowedOrigins));

// Security headers (helmet) — applied before CORS
app.use(helmet({
  contentSecurityPolicy: false, // disabled for API (no HTML served); Netlify handles frontend CSP
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost and 127.0.0.1 on any port
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`[CORS] Blocked request from origin: ${origin}`);
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

// Admin auth middleware is imported from authMiddleware.js

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: '1GassApp API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', apiLimiter, async (req, res) => {
  try {
    const start = Date.now();
    const { error } = await supabase.from('manufacturers').select('name', { count: 'exact', head: true });
    const dbLatency = Date.now() - start;
    if (error) throw error;
    res.json({ status: 'healthy', db: 'connected', db_latency_ms: dbLatency, uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'unreachable', error: err.message });
  }
});

// Manual search routes extracted to routes/manualRoute.js

// --- GET /api/manufacturers ---
app.get('/api/manufacturers', async (req, res) => {
  try {
    const { data, error } = await supabase.from('manufacturers').select('name').order('name');
    if (error) throw error;
    const manufacturers = [...new Set((data || []).map(m => m.name))].sort();
    res.json({ manufacturers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- POST /api/validate-invite ---
app.post('/api/validate-invite', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.json({ valid: true }); // invite code is optional

    const upper = code.trim().toUpperCase();
    const { data, error } = await supabase
      .from('invite_codes')
      .select('id, code, max_uses, uses, active, expires_at')
      .eq('code', upper)
      .eq('active', true)
      .single();

    if (error || !data) return res.json({ valid: false, reason: 'Invalid invite code' });
    if (data.expires_at && new Date(data.expires_at) < new Date()) return res.json({ valid: false, reason: 'Invite code expired' });
    if (data.max_uses && data.uses >= data.max_uses) return res.json({ valid: false, reason: 'Invite code fully redeemed' });

    // Increment usage count
    await supabase.from('invite_codes').update({ uses: data.uses + 1 }).eq('id', data.id);

    res.json({ valid: true });
  } catch (err) {
    logger.error('[Invite] Error:', err);
    res.status(500).json({ valid: false, reason: 'Server error' });
  }
});

// --- User & Admin profile endpoints (stubbed) ---
app.get('/api/user', (req, res) => {
  res.status(501).json({ error: 'User profile API not implemented. Use Supabase Auth.' });
});

// ─── Route modules ──────────────────────────────────────────────────────────
app.use('/api/manuals', manualRoute);
// Chat routes retired 2026-04-21 — production chat is served by the Supabase
// Edge Function at supabase/functions/chat/index.ts. Keeping chatRoute.js /
// agentRoute.js on disk for historical reference only. See
// docs/user-walkthrough-2026-04-21.md (P0) for rationale.
// app.use('/api/chat', chatRoute);
// app.use('/api/agent/chat', agentRoute);
app.use('/api', sessionRoute);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Boiler Brain server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`CORS origins: ${process.env.ALLOWED_ORIGINS || '*'}`);
});
