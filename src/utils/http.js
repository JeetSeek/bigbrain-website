// Unified HTTP client with base URL, auth, timeouts, and JSON helpers
// Supports both local Express backend and Supabase Edge Functions

const DEFAULT_TIMEOUT = 30000; // 30s

// Supabase project fallbacks — anon key is public by design (security via RLS)
const FALLBACK_SUPABASE_URL = 'https://hfyfidpbtoqnqhdywdzw.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmeWZpZHBidG9xbnFoZHl3ZHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTQ4OTksImV4cCI6MjA2MTA3MDg5OX0.eZrUGTGOOnHrZp2BoIbnaqSPvcmNKYfpoLXmGsa3PME';

// Supabase configuration - env vars preferred, fallbacks ensure dev works out of the box
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

// Default to Supabase mode unless a local Express URL is explicitly configured.
// This matches live behaviour without requiring env file setup.
const DEPLOYMENT_MODE = import.meta.env.VITE_DEPLOYMENT_MODE ||
  (import.meta.env.VITE_DEV_API_URL ? 'local' : 'supabase');

const getBaseUrl = () => {
  // Local Express backend — only when VITE_DEV_API_URL is explicitly set
  if (DEPLOYMENT_MODE === 'local') {
    return import.meta.env.VITE_DEV_API_URL || 'http://localhost:3204';
  }
  // Supabase Edge Functions (default for both dev and prod)
  return `${SUPABASE_URL}/functions/v1`;
};

const getAuthHeaders = () => {
  if (DEPLOYMENT_MODE === 'local') {
    return {};
  }
  // Add Supabase auth headers for Edge Functions
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };
};

// Map API paths to Edge Function names
const mapPathToFunction = (path) => {
  if (DEPLOYMENT_MODE === 'local') {
    return path; // Keep original path for local Express dev
  }

  // Map /api/xxx to Edge Function name
  const pathMappings = {
    '/api/chat': '/chat',
    '/api/agent/chat': '/chat',
    '/api/manuals': '/manuals',
    '/api/manufacturers': '/manufacturers',
    '/api/sessions': '/sessions',
    '/api/check-manual-link': '/check-manual-link',
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
