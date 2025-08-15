/**
 * CSRF Token Utilities
 * Handles fetching, storing, and managing CSRF tokens for secure form submissions
 */

/**
 * Fetches a new CSRF token from the server
 * @returns {Promise<string>} The CSRF token
 */
export const fetchCsrfToken = async () => {
  try {
    const response = await fetch('/api/csrf-token');
    const data = await response.json();

    if (data.csrfToken) {
      // Store token in localStorage for reuse
      localStorage.setItem('csrfToken', data.csrfToken);
      return data.csrfToken;
    }

    throw new Error('No CSRF token returned');
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw error;
  }
};

/**
 * Gets the current CSRF token or fetches a new one if none exists
 * @returns {Promise<string>} The CSRF token
 */
export const getCsrfToken = async () => {
  const storedToken = localStorage.getItem('csrfToken');

  if (storedToken) {
    return storedToken;
  }

  return fetchCsrfToken();
};

/**
 * Creates fetch options object with CSRF token header
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Fetch options with CSRF token header
 */
export const withCsrfToken = async (options = {}) => {
  const token = await getCsrfToken();

  return {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': token,
    },
  };
};

/**
 * Uploads logs or screenshots securely with CSRF protection
 *
 * @param {string} logType - Type of log (e.g., 'error', 'screenshot', 'feedback')
 * @param {any} content - Content of the log or screenshot (can be text, base64, etc.)
 * @param {Object} userInfo - Optional user information
 * @returns {Promise<Object>} Response data
 */
export const uploadLog = async (logType, content, userInfo = null) => {
  try {
    const options = await withCsrfToken({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        logType,
        content,
        timestamp: new Date().toISOString(),
        userInfo,
      }),
    });

    const response = await fetch('/api/logs/upload', options);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    return response.json();
  } catch (error) {
    console.error('Log upload failed:', error);
    throw error;
  }
};
