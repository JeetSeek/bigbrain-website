/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers throughout the codebase
 */

// Cache timeouts (in milliseconds)
export const CACHE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 100;
export const CHAT_RATE_LIMIT_WINDOW_MS = 1 * 60 * 1000; // 1 minute
export const CHAT_RATE_LIMIT_MAX_REQUESTS = 10;

// HTTP timeouts
export const DEFAULT_HTTP_TIMEOUT_MS = 30000; // 30 seconds

// Pagination
export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 1000;

// OpenAI configuration
export const OPENAI_MODEL = 'gpt-4o-mini';
export const OPENAI_MAX_TOKENS_STANDARD = 550;
export const OPENAI_MAX_TOKENS_DETAILED = 900;
export const OPENAI_TEMPERATURE_STANDARD = 0.2;
export const OPENAI_TEMPERATURE_DETAILED = 0.25;

// Tool iteration limits
export const MAX_TOOL_ITERATIONS = 4;

// Server configuration
export const DEFAULT_PORT = 3204;

// Gas Safe emergency contact
export const GAS_EMERGENCY_NUMBER = '0800 111 999';

// Manual search limits
export const MAX_MANUFACTURER_FOLDERS = 100;
export const MAX_FILES_PER_FOLDER = 1000;
export const MAX_MANUAL_RESULTS = 3;

export default {
  CACHE_TIMEOUT_MS,
  SESSION_TIMEOUT_MS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
  CHAT_RATE_LIMIT_WINDOW_MS,
  CHAT_RATE_LIMIT_MAX_REQUESTS,
  DEFAULT_HTTP_TIMEOUT_MS,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  OPENAI_MODEL,
  OPENAI_MAX_TOKENS_STANDARD,
  OPENAI_MAX_TOKENS_DETAILED,
  OPENAI_TEMPERATURE_STANDARD,
  OPENAI_TEMPERATURE_DETAILED,
  MAX_TOOL_ITERATIONS,
  DEFAULT_PORT,
  GAS_EMERGENCY_NUMBER,
  MAX_MANUFACTURER_FOLDERS,
  MAX_FILES_PER_FOLDER,
  MAX_MANUAL_RESULTS
};
