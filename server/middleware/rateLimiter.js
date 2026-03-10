import rateLimit from 'express-rate-limit';
import * as CONSTANTS from '../constants/index.js';

export const apiLimiter = rateLimit({
  windowMs: CONSTANTS.RATE_LIMIT_WINDOW_MS,
  max: CONSTANTS.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const chatLimiter = rateLimit({
  windowMs: CONSTANTS.CHAT_RATE_LIMIT_WINDOW_MS,
  max: CONSTANTS.CHAT_RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many chat requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});
