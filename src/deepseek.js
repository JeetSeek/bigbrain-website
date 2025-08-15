// Utility to call DeepSeek APIs with fallback logic
// Tries up to 5 endpoints in order until one succeeds

const deepseekEndpoints = [
  import.meta.env.VITE_DEEPSEEK_API_URL_1,
  import.meta.env.VITE_DEEPSEEK_API_URL_2,
  import.meta.env.VITE_DEEPSEEK_API_URL_3,
  import.meta.env.VITE_DEEPSEEK_API_URL_4,
  import.meta.env.VITE_DEEPSEEK_API_URL_5,
];

/**
 * Calls each DeepSeek API endpoint in order until one succeeds.
 * @param {string} path - The API path (e.g., '/chat')
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<Response>} The successful fetch response
 * @throws If all endpoints fail
 */
export async function callDeepSeekWithFallback(path, options) {
  let lastError;
  for (const baseUrl of deepseekEndpoints) {
    if (!baseUrl) continue;
    try {
      const response = await fetch(baseUrl + path, options);
      if (response.ok) return response;
      lastError = new Error(`Endpoint ${baseUrl} responded with status ${response.status}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('No DeepSeek endpoints available');
}
