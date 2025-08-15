/**
 * Secrets Manager Utility
 * 
 * Provides a secure interface for accessing sensitive configuration values
 * with additional protection measures:
 * - Environment-specific configuration
 * - Key rotation capabilities
 * - Obfuscation for logging purposes
 * - Validation of required secrets
 */

import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment-specific configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const envPath = path.resolve(rootDir, `.env${NODE_ENV !== 'production' ? '.' + NODE_ENV : ''}`);

// Load base .env first, then environment-specific one if it exists
dotenv.config({ path: path.resolve(rootDir, '.env') });
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true });
}

/**
 * Required secrets for the application to function
 * If any of these are missing, the application will throw an error
 */
const REQUIRED_SECRETS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY'
];

// Validate required secrets are present
for (const secret of REQUIRED_SECRETS) {
  if (!process.env[secret]) {
    throw new Error(`Missing required environment variable: ${secret}`);
  }
}

/**
 * Returns a masked version of a secret for logging
 * @param {string} value - The secret to mask
 * @param {number} visibleChars - Number of characters to show at start and end
 * @returns {string} - The masked secret
 */
const maskSecret = (value, visibleChars = 4) => {
  if (!value) return '[NOT SET]';
  if (value.length <= visibleChars * 2) return '*'.repeat(value.length);
  
  const start = value.substring(0, visibleChars);
  const end = value.substring(value.length - visibleChars);
  return `${start}${'*'.repeat(value.length - visibleChars * 2)}${end}`;
};

/**
 * API Keys manager object
 * Provides access to API keys with rotation support
 */
const apiKeys = {
  /**
   * Returns OpenAI API key
   * @returns {string|null} - API key or null if not configured
   */
  getOpenAIKey() {
    return process.env.OPENAI_API_KEY || null;
  },
  
  /**
   * Returns a DeepSeek API key using rotation strategy
   * @returns {string|null} - API key or null if none configured
   */
  getDeepSeekKey(index = null) {
    // If specific index requested, try to get that key
    if (index !== null) {
      const key = process.env[`DEEPSEEK_API_KEY_${index}`];
      return key || null;
    }
    
    // Find all available DeepSeek keys
    const keys = [];
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`DEEPSEEK_API_KEY_${i}`];
      if (key) keys.push(key);
    }
    
    if (keys.length === 0) return null;
    
    // Simple rotation: return a random key from the available ones
    // For more sophisticated rotation, implement logic based on usage tracking
    return keys[Math.floor(Math.random() * keys.length)];
  },
  
  /**
   * Returns whether using OpenAI is configured
   * @returns {boolean}
   */
  isOpenAIConfigured() {
    return !!this.getOpenAIKey();
  },
  
  /**
   * Returns whether using DeepSeek is configured
   * @returns {boolean}
   */
  isDeepSeekConfigured() {
    return this.getDeepSeekKey() !== null;
  },
  
  /**
   * Returns all available DeepSeek API keys
   * @returns {Array} - Array of available keys
   */
  getAllDeepSeekKeys() {
    const keys = [];
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`DEEPSEEK_API_KEY_${i}`];
      if (key) keys.push(key);
    }
    return keys;
  },
  
  /**
   * Returns the number of available DeepSeek API keys
   * @returns {number}
   */
  getDeepSeekKeyCount() {
    return this.getAllDeepSeekKeys().length;
  }
};

/**
 * Supabase configuration manager
 */
const supabase = {
  /**
   * Returns Supabase URL
   * @returns {string}
   */
  getUrl() {
    return process.env.SUPABASE_URL;
  },
  
  /**
   * Returns Supabase anonymous key for client-side operations
   * @returns {string}
   */
  getAnonKey() {
    return process.env.SUPABASE_ANON_KEY;
  },
  
  /**
   * Returns Supabase service role key for admin operations
   * @returns {string}
   */
  getServiceKey() {
    return process.env.SUPABASE_SERVICE_KEY;
  }
};

/**
 * General application configuration
 */
const appConfig = {
  /**
   * Returns preferred model provider
   * @returns {'openai'|'deepseek'} - The configured model provider
   */
  getModelProvider() {
    const configuredProvider = process.env.USE_MODEL?.toLowerCase() || 'openai';
    
    // If configured provider is not available, fall back to another one
    if (configuredProvider === 'openai' && !apiKeys.isOpenAIConfigured()) {
      return apiKeys.isDeepSeekConfigured() ? 'deepseek' : 'openai';
    }
    
    if (configuredProvider === 'deepseek' && !apiKeys.isDeepSeekConfigured()) {
      return apiKeys.isOpenAIConfigured() ? 'openai' : 'deepseek';
    }
    
    return configuredProvider;
  },
  
  /**
   * Returns server port
   * @returns {number}
   */
  getPort() {
    return parseInt(process.env.PORT || '3001', 10);
  },
  
  /**
   * Returns current environment name
   * @returns {string}
   */
  getEnvironment() {
    return NODE_ENV;
  },
  
  /**
   * Returns whether in production mode
   * @returns {boolean}
   */
  isProduction() {
    return NODE_ENV === 'production';
  },
  
  /**
   * Returns JWT secret if configured
   * @returns {string|null}
   */
  getJwtSecret() {
    return process.env.JWT_SECRET || null;
  }
};

/**
 * Logs configuration status (without exposing secrets)
 */
function logConfigStatus() {
  console.log(`Environment: ${appConfig.getEnvironment()}`);
  console.log(`Supabase: ${supabase.getUrl() ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`OpenAI API: ${apiKeys.isOpenAIConfigured() ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`DeepSeek API: ${apiKeys.isDeepSeekConfigured() ? `✅ ${apiKeys.getDeepSeekKeyCount()} keys` : '❌ Not configured'}`);
  console.log(`Model Provider: ${appConfig.getModelProvider()}`);
  console.log(`JWT Security: ${appConfig.getJwtSecret() ? '✅ Configured' : '❌ Not configured'}`);
}

export default {
  apiKeys,
  supabase,
  appConfig,
  maskSecret,
  logConfigStatus
};
