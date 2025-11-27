/**
 * API Configuration for BigBrain Frontend
 * Handles API endpoint routing for production deployment
 */

// Get the API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://hfyfidpbtoqnqhdywdzw.supabase.co/functions/v1/api';

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
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
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
