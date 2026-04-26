// P1 (walkthrough 2026-04-21): HEAD-check a manufacturer manual URL before
// the client hands off to window.open, and log dead URLs to
// bb_manual_link_issues so burrows1980@yahoo.co.uk can triage them.
//
// Request:  POST { url: string, manual_id?: uuid }
// Response: { ok: boolean, status: number | null, reason?: string }
//
// Runtime rules:
// - 1.5s fetch timeout (walkthrough spec).
// - HEAD first; if the origin rejects HEAD (405/501), fall back to GET Range: 0-0.
// - Log every non-2xx / timeout / network error to bb_manual_link_issues
//   using the service_role key (table has RLS with no anon/authenticated
//   policies — service_role bypasses it).
// - CORS allowlist matches the chat function's stance.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const ALLOWED_ORIGINS = new Set([
  'https://boiler-brain-ai.netlify.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
]);

function corsHeadersFor(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://boiler-brain-ai.netlify.app';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

const HEAD_TIMEOUT_MS = 1500;

async function probe(url: string): Promise<{ ok: boolean; status: number | null; reason?: string }> {
  // HEAD first — cheapest. Many CDNs answer HEAD fine; origin servers that
  // don't (Apache modules stripping HEAD, some WordPress) will answer 405/501.
  for (const method of ['HEAD', 'GET'] as const) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: controller.signal,
        headers: method === 'GET' ? { Range: 'bytes=0-0' } : {},
      });
      clearTimeout(timer);
      // 405/501 on HEAD => retry with GET Range.
      if (method === 'HEAD' && (res.status === 405 || res.status === 501)) continue;
      return { ok: res.ok, status: res.status };
    } catch (err: any) {
      clearTimeout(timer);
      // If HEAD was aborted/network-failed, try GET once before giving up.
      if (method === 'HEAD') continue;
      return { ok: false, status: null, reason: err?.name === 'AbortError' ? 'timeout' : (err?.message || 'network_error') };
    }
  }
  return { ok: false, status: null, reason: 'exhausted' };
}

// @ts-ignore Deno global
Deno.serve(async (req: Request) => {
  const cors = corsHeadersFor(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const url: string | undefined = body?.url;
  const manualId: string | null = body?.manual_id ?? null;
  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    return new Response(JSON.stringify({ error: 'url required and must be http(s)' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const result = await probe(url);

  // Log failures (not timeouts-under-healthy-cdn? — yes, log those too; if a
  // CDN is slow enough to blow a 1.5s HEAD the user experience is already
  // broken and we want to see it).
  if (!result.ok) {
    try {
      // @ts-ignore Deno global
      const supabase = createClient(
        // @ts-ignore Deno global
        Deno.env.get('SUPABASE_URL')!,
        // @ts-ignore Deno global
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      await supabase.from('bb_manual_link_issues').insert({
        manual_id: manualId,
        url,
        http_status: result.status,
        error_message: result.reason ?? null,
      });
    } catch (e) {
      // Non-fatal: don't block the user on logging failure.
      console.error('[check-manual-link] failed to log issue:', e);
    }
  }

  return new Response(JSON.stringify(result), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
