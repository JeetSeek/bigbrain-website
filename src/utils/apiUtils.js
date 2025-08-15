/**
 * API Utilities for BoilerBrain
 * Contains standardized functions for making API requests with proper error handling,
 * timeout management, and consistent response processing
 */
import { API } from './constants';

/**
 * Creates an API request with standardized timeout and error handling
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @param {number} timeoutMs - Timeout in milliseconds (default: 8000ms)
 * @returns {Promise<any>} - Response data or throws error
 */
export const fetchWithTimeout = async (url, options = {}, timeoutMs = API.TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
    }

    // Check content type to determine how to parse response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }

    throw error;
  }
};

/**
 * Standardized API request with retry logic
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {function} onRetry - Optional callback function called on each retry attempt
 * @returns {Promise<any>} - Response data or throws error
 */
export const fetchWithRetry = async (
  url,
  options = {},
  maxRetries = API.MAX_RETRIES,
  timeoutMs = API.TIMEOUT,
  onRetry = null
) => {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // First attempt or retry
      if (attempt > 0 && typeof onRetry === 'function') {
        onRetry(attempt, lastError);
      }

      return await fetchWithTimeout(url, options, timeoutMs);
    } catch (error) {
      lastError = error;

      // Don't wait if it's the last attempt
      if (attempt < maxRetries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms, etc.
        const backoffMs = Math.min(500 * Math.pow(2, attempt), API.BACKOFF_MAX);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  // If we've exhausted all retries
  throw lastError;
};

/**
 * Post JSON data to an API endpoint
 * @param {string} url - The API endpoint URL
 * @param {Object} data - Data to send as JSON
 * @param {Object} options - Additional fetch options
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<any>} - Response data or throws error
 */
export const postJsonData = async (
  url,
  data,
  options = {},
  maxRetries = API.MAX_RETRIES,
  timeoutMs = API.TIMEOUT
) => {
  return fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    },
    maxRetries,
    timeoutMs,
    options.onRetry
  );
};

// Remove the default export to maintain consistency with other utility modules
// and improve tree-shaking in the final bundle
