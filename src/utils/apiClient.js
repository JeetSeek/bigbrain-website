/**
 * API Client for Production Deployment
 * Configured for Railway backend deployment
 */

// Get API URL from environment or use Railway production URL
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Production default: Railway backend
  if (import.meta.env.PROD) {
    return 'https://boilerbrain-api-production.up.railway.app';
  }
  // Development default: localhost
  return 'http://localhost:3204';
};

const API_BASE_URL = getApiUrl();

export default {
  API_BASE_URL
};
