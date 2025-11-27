/**
 * API Client for Production Deployment
 * Configured for Supabase Edge Functions
 */

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hfyfidpbtoqnqhdywdzw.supabase.co';

// Get API URL from environment or use Supabase Edge Functions
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Production default: Supabase Edge Functions
  if (import.meta.env.PROD) {
    return `${SUPABASE_URL}/functions/v1`;
  }
  // Development default: localhost
  return 'http://localhost:3204';
};

const API_BASE_URL = getApiUrl();

export default {
  API_BASE_URL
};
