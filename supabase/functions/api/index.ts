import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface ChatRequest {
  message: string;
  sessionId?: string;
  systemPrompt?: string;
  tier?: 'default' | 'premium';
  userId?: string;
}

async function callOpenAIChat({ messages, model }: { messages: Array<{ role: string; content: string }>; model: string }) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY missing');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 350,
    })
  });

  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || `OpenAI error: ${res.status}`;
    const e: any = new Error(message);
    e.status = res.status;
    e.data = data;
    throw e;
  }

  const text = data?.choices?.[0]?.message?.content ?? '';
  const usage = data?.usage || null;
  return { text, usage };
}

async function callDeepSeekChat({ messages, model }: { messages: Array<{ role: string; content: string }>; model: string }) {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY missing');
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 350 })
  });
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || `DeepSeek error: ${res.status}`;
    const e: any = new Error(message);
    e.status = res.status;
    e.data = data;
    throw e;
  }
  const text = data?.choices?.[0]?.message?.content ?? '';
  // DeepSeek usage schema may differ; normalize if available
  const usage = data?.usage || null;
  return { text, usage };
}

function monthKeyUTC(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function isUUID(v?: string | null): v is string {
  return !!v && /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(v);
}

function estimateCostPence(usage: any, provider: 'openai' | 'deepseek', model: string): number {
  // Env-configurable pricing per 1K tokens (pence). Defaults are 0 to avoid accidental charges.
  const pIn = Number(Deno.env.get('PRICE_PENCE_PER_1K_PROMPT')) || 0;
  const pOut = Number(Deno.env.get('PRICE_PENCE_PER_1K_COMPLETION')) || 0;
  const inTok = Number(usage?.prompt_tokens ?? usage?.promptTokens ?? 0);
  const outTok = Number(usage?.completion_tokens ?? usage?.completionTokens ?? 0);
  const cost = (inTok / 1000) * pIn + (outTok / 1000) * pOut;
  return Number(cost.toFixed(4));
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase client using service role for server-side writes (usage metering)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = (supabaseUrl && serviceKey) ? createClient(supabaseUrl, serviceKey) : null;

    const url = new URL(req.url);
    const path = url.pathname;

    // Health check endpoint
    if (path === '/api/health') {
      return new Response(
        JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Chat endpoint (OpenAI primary, DeepSeek fallback)
    if (path === '/api/chat' && req.method === 'POST') {
      const body: ChatRequest = await req.json();
      const sessionId = body.sessionId || crypto.randomUUID();
      const userId = body.userId || req.headers.get('x-user-id') || null;

      const defaultModel = Deno.env.get('OPENAI_DEFAULT_MODEL') || 'gpt-4o-mini';
      const premiumModel = Deno.env.get('OPENAI_PREMIUM_MODEL') || 'gpt-4o';
      const model = body.tier === 'premium' ? premiumModel : defaultModel;

      const system = body.systemPrompt ||
        "You're a lead Gas Safe engineer. Keep responses short, practical, and safety-first.";

      const messages = [
        { role: 'system', content: system },
        { role: 'user', content: body.message || '' }
      ];

      // Soft budget pre-check (if userId and supabase available)
      const monthKey = monthKeyUTC();
      const monthlyBudgetPence = Number(Deno.env.get('MONTHLY_BUDGET_PENCE_DEFAULT') || '0');
      let blockedByBudget = false;
      if (supabase && isUUID(userId) && monthlyBudgetPence > 0) {
        const { data: usageRow } = await supabase
          .from('usage_monthly')
          .select('cost_pence')
          .eq('user_id', userId!)
          .eq('month_key', monthKey)
          .maybeSingle();
        if (usageRow && Number(usageRow.cost_pence) >= monthlyBudgetPence) {
          blockedByBudget = true;
        }
      }
      if (blockedByBudget) {
        return new Response(
          JSON.stringify({ error: 'budget_exceeded', message: 'Monthly budget reached. Upgrade or wait until next month.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        );
      }

      // Provider policy: OpenAI primary, fallback to DeepSeek on certain failures
      let provider: 'openai' | 'deepseek' = 'openai';
      let ai: { text: string; usage: any } | null = null;
      try {
        ai = await callOpenAIChat({ messages, model });
      } catch (err: any) {
        const status = err?.status || 500;
        if ((status >= 500 || status === 429) && Deno.env.get('DEEPSEEK_API_KEY')) {
          try {
            provider = 'deepseek';
            const dsModel = Deno.env.get('DEEPSEEK_DEFAULT_MODEL') || 'deepseek-chat';
            ai = await callDeepSeekChat({ messages, model: dsModel });
          } catch (fallbackErr) {
            console.error('Fallback provider failed', fallbackErr);
            return new Response(
              JSON.stringify({ error: 'provider_unavailable' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
            );
          }
        } else {
          console.error('Chat error', err);
          return new Response(
            JSON.stringify({ error: err?.message || 'Upstream provider error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
          );
        }
      }

      // Usage logging and budget accumulation
      if (supabase && isUUID(userId) && ai?.usage) {
        const costPence = estimateCostPence(ai.usage, provider, model);
        const inTok = Number(ai.usage?.prompt_tokens ?? 0);
        const outTok = Number(ai.usage?.completion_tokens ?? 0);
        // Insert event (best-effort)
        await supabase.from('usage_events').insert({
          user_id: userId,
          session_id: sessionId,
          month_key: monthKey,
          provider,
          model,
          tokens_in: inTok,
          tokens_out: outTok,
          cost_pence: costPence,
        });
        // Upsert monthly aggregate
        await supabase.rpc('upsert_usage_monthly', {
          p_user_id: userId,
          p_month_key: monthKey,
          p_tokens_in: inTok,
          p_tokens_out: outTok,
          p_cost_pence: costPence,
        }).catch(async () => {
          // Fallback if RPC not present: perform manual upsert
          const { data: row } = await supabase
            .from('usage_monthly')
            .select('id, tokens_in, tokens_out, cost_pence, calls_count')
            .eq('user_id', userId)
            .eq('month_key', monthKey)
            .maybeSingle();
          if (row) {
            await supabase.from('usage_monthly').update({
              tokens_in: Number(row.tokens_in) + inTok,
              tokens_out: Number(row.tokens_out) + outTok,
              cost_pence: Number(row.cost_pence) + costPence,
              calls_count: Number(row.calls_count) + 1,
              last_updated: new Date().toISOString(),
            }).eq('id', row.id);
          } else {
            await supabase.from('usage_monthly').insert({
              user_id: userId,
              month_key: monthKey,
              tokens_in: inTok,
              tokens_out: outTok,
              cost_pence: costPence,
              calls_count: 1,
            });
          }
        });
      }

      return new Response(
        JSON.stringify({
          response: ai?.text ?? '',
          sessionId,
          timestamp: new Date().toISOString(),
          usage: ai?.usage ?? null,
          model,
          provider,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Session persistence (no-op placeholder)
    if (path === '/api/chat/session' && req.method === 'POST') {
      // Accept payload and acknowledge. Real persistence + budget metering to be added.
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Fault codes endpoint
    if (path === '/api/fault-codes' && req.method === 'GET') {
      const brand = url.searchParams.get('brand');
      const code = url.searchParams.get('code');
      
      // Mock fault code response
      const faultCode = {
        brand: brand || 'Worcester',
        code: code || 'E9',
        description: 'Primary heat exchanger thermistor fault',
        solution: 'Check thermistor connections and replace if faulty',
        severity: 'medium'
      };

      return new Response(
        JSON.stringify(faultCode),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Default 404 response
    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404 
      }
    );

  } catch (error) {
    console.error('Edge Function Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
