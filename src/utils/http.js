// Unified HTTP client with base URL, auth, timeouts, and JSON helpers

const DEFAULT_TIMEOUT = 30000; // 30s

const getBaseUrl = () => {
  // Use environment variable for API URL in production, localhost in development
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || '/api';
  }
  return import.meta.env.VITE_DEV_API_URL || 'http://localhost:3204';
};

const getAuthHeaders = () => {
  // Remove Supabase auth headers for local development
  return {};
};

async function request(path, { method = 'GET', headers = {}, body, timeout = DEFAULT_TIMEOUT, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const base = getBaseUrl();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;

  const finalHeaders = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...headers,
  };

  try {
    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: signal || controller.signal,
    });

    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await res.json().catch(() => ({})) : await res.text();

    if (!res.ok) {
      const err = new Error(data?.error || data?.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

export const http = {
  get: (path, opts = {}) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts = {}) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts = {}) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts = {}) => request(path, { ...opts, method: 'DELETE' }),
};

export default http;
