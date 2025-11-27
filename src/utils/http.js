// Unified HTTP client with base URL, auth, timeouts, and JSON helpers
// Supports both local Express backend and Supabase Edge Functions

const DEFAULT_TIMEOUT = 30000; // 30s

// Deployment modes
const DEPLOYMENT_MODE = import.meta.env.VITE_DEPLOYMENT_MODE || (import.meta.env.PROD ? 'supabase' : 'local');

// Production fallbacks for Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hfyfidpbtoqnqhdywdzw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmeWZpZHBidG9xbnFoZHl3ZHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTQ4OTksImV4cCI6MjA2MTA3MDg5OX0.eZrUGTGOOnHrZp2BoIbnaqSPvcmNKYfpoLXmGsa3PME';

const getBaseUrl = () => {
  // Supabase Edge Functions mode (production)
  if (DEPLOYMENT_MODE === 'supabase' || import.meta.env.PROD) {
    return `${SUPABASE_URL}/functions/v1`;
  }
  
  // Local Express backend mode (development)
  return import.meta.env.VITE_DEV_API_URL || 'http://localhost:3204';
};

const getAuthHeaders = () => {
  // Add Supabase auth headers for Edge Functions
  if (DEPLOYMENT_MODE === 'supabase' || import.meta.env.PROD) {
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    };
  }
  return {};
};

// Map API paths to Edge Function names
const mapPathToFunction = (path) => {
  if (DEPLOYMENT_MODE !== 'supabase' && !import.meta.env.PROD) {
    return path; // Keep original path for local dev
  }
  
  // Map /api/xxx to Edge Function name
  const pathMappings = {
    '/api/chat': '/chat',
    '/api/manuals': '/manuals',
    '/api/manufacturers': '/manufacturers',
    '/api/sessions': '/sessions',
  };
  
  for (const [apiPath, funcName] of Object.entries(pathMappings)) {
    if (path.startsWith(apiPath)) {
      return funcName + path.slice(apiPath.length);
    }
  }
  
  return path;
};

async function request(path, { method = 'GET', headers = {}, body, timeout = DEFAULT_TIMEOUT, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const base = getBaseUrl();
  const mappedPath = mapPathToFunction(path);
  const url = path.startsWith('http') ? path : `${base}${mappedPath.startsWith('/') ? '' : '/'}${mappedPath}`;

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
