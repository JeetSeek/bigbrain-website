/**
 * API Configuration for BigBrain Frontend
 * Handles API endpoint routing for production deployment
 */

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hfyfidpbtoqnqhdywdzw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmeWZpZHBidG9xbnFoZHl3ZHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTQ4OTksImV4cCI6MjA2MTA3MDg5OX0.eZrUGTGOOnHrZp2BoIbnaqSPvcmNKYfpoLXmGsa3PME';

// Get the API base URL - Supabase Edge Functions in production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${SUPABASE_URL}/functions/v1`;

/**
 * Get the full API URL for a given endpoint
 * @param {string} endpoint - The API endpoint (e.g., '/chat', '/health')
 * @returns {string} - The full API URL
 */
export function getApiUrl(endpoint) {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
}

/**
 * Make an API request with proper headers
 * @param {string} endpoint - The API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} - The fetch response
 */
export async function apiRequest(endpoint, options = {}) {
  const url = getApiUrl(endpoint);
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  return fetch(url, config);
}

export default {
  getApiUrl,
  apiRequest,
};
