// Supabase Edge Function: Chat API — Professional Gas Fault Diagnostics

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Retrieval configuration ──────────────────────────────────────────────────
// TODO(bb-migration): swap RETRIEVAL_TABLE/RPC to bb_content_chunks when
//   (a) SELECT count(*) FROM bb_content_chunks > 100k
//   (b) bb_content_chunks.page_number is populated on >=95% of rows
// See docs/user-walkthrough-2026-04-21.md for why we deferred.
const RETRIEVAL_TABLE = 'manual_content_chunks';
const RETRIEVAL_RPC = 'match_manual_chunks';
const RETRIEVAL_K = 6;
const RETRIEVAL_THRESHOLD = 0.75;
const RETRIEVAL_EMBEDDING_MODEL = 'text-embedding-3-small';

type ChunkSource = {
  chunk_id: string;
  manual_id: string;
  manual_name: string;
  manufacturer: string | null;
  page_number: number | null;
  similarity: number;
};

// ─── Manufacturer detection ───────────────────────────────────────────────────

const MFR_REGEX = /\b(worcester|worcester bosch|vaillant|baxi|ideal|glow[- ]?worm|potterton|viessmann|ariston|ferroli|alpha|ravenheat|intergas|atag|biasi|remeha|chaffoteaux|sime|vokera|navien|main)\b/i;
const SYS_REGEX = /\b(combi|combination|system|regular|conventional|heat only|back boiler)\b/i;

// ─── Fault code extraction ────────────────────────────────────────────────────

function extractFaultInfo(text: string) {
  const t = text.toLowerCase();
  const mfrMatch = t.match(MFR_REGEX);
  const manufacturer = mfrMatch ? mfrMatch[1].toLowerCase() : null;

  // PRIORITY 1: explicit context patterns (always trusted)
  const explicitPatterns = [
    /\bfault\s+code\s+([a-z]?\.?\d{1,3}[a-z]?)\b/i,
    /\berror\s+code\s+([a-z]?\.?\d{1,3}[a-z]?)\b/i,
    /\bcode\s+([a-z]{1,2}\.?\d{1,3})\b/i,
    /\b(?:showing|displays?|displaying|reads?|flashing)\s+([a-z]{1,2}\.?\d{1,3})\b/i,
    /\b([a-z]{1,2}\.?\d{1,3})\b\s+(?:fault|error|lockout|lock[\s-]?out)/i,
  ];

  let faultCode: string | null = null;
  for (const p of explicitPatterns) {
    const m = t.match(p);
    if (m) {
      const raw = (m[1] || '').toUpperCase().trim();
      if (/^(24|25|28|30|33|35|37|40|42)$/.test(raw)) continue; // skip kW ratings
      faultCode = raw;
      break;
    }
  }

  // PRIORITY 2: bare code (e.g. "F22") — only if surrounding context confirms diagnostics
  if (!faultCode) {
    const bareCodePattern = /(?<![\d-])\b([a-z]{1,2}\.?\d{2,3})\b/gi;
    const contextWords = /fault|error|code|lockout|lock[\s-]?out|ignition|\breset\b|display|showing|reads?|flashing|diagnostic|overheat|boiler|combi/i;
    const rejectPrefix = /fernox|fuse|version|firmware|\bv\d|\bsection|\bstep|\bitem|\boption|\bmenu|\bpart(?:\s+no)?|\btype|radiator/i;

    let m: RegExpExecArray | null;
    while ((m = bareCodePattern.exec(t)) !== null) {
      const raw = (m[1] || '').toUpperCase().trim();
      if (/^(24|25|28|30|33|35|37|40|42)$/.test(raw)) continue;

      const lo = Math.max(0, m.index - 80);
      const hi = Math.min(t.length, m.index + m[0].length + 80);
      if (!contextWords.test(t.slice(lo, hi))) continue;

      const nearby = t.slice(Math.max(0, m.index - 30), m.index);
      if (rejectPrefix.test(nearby)) continue;

      faultCode = raw;
      break;
    }
  }

  return { manufacturer, faultCode };
}

// ─── Database lookup — queries gc_fault_codes, fault_finding_guides, boiler_fault_codes ──

function buildFaultCodeVariants(faultCode: string): string[] {
  const clean = faultCode.replace(/[.\s]/g, '').toUpperCase();
  const withDot = clean.replace(/^([A-Z])(\d)/, '$1.$2');
  const variants = new Set<string>([faultCode, clean, withDot]);

  // Letter+digits (e.g. F22) → also try bare digits "22"
  const letterNum = clean.match(/^([A-Z])(\d{1,3})$/);
  if (letterNum) {
    variants.add(letterNum[2]);
  }

  // Bare numeric (3+ digits, e.g. 227) → try common manufacturer prefixes
  // Skip 1-2 digit codes (ambiguous with kW ratings, room temps, etc.)
  const pureNum = clean.match(/^(\d{3,})$/);
  if (pureNum) {
    for (const prefix of ['F', 'E', 'A', 'L']) {
      variants.add(`${prefix}${pureNum[1]}`);
      variants.add(`${prefix}.${pureNum[1]}`);
    }
  }

  return [...variants];
}

// Simple TTL cache (per-instance; edge runtime reuses across invocations when warm)
const faultCache = new Map<string, { value: any; expires: number }>();
const FAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const FAULT_CACHE_MAX = 200;

function cacheGet(key: string): any | undefined {
  const hit = faultCache.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    faultCache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key: string, value: any): void {
  if (faultCache.size >= FAULT_CACHE_MAX) {
    // Drop oldest (iteration order = insertion order)
    const firstKey = faultCache.keys().next().value;
    if (firstKey !== undefined) faultCache.delete(firstKey);
  }
  faultCache.set(key, { value, expires: Date.now() + FAULT_CACHE_TTL_MS });
}

async function getFaultCodeInfo(supabase: any, faultCode: string, manufacturer: string | null) {
  const cacheKey = `${faultCode}|${manufacturer || '*'}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  const clean = faultCode.replace(/[.\s]/g, '').toUpperCase();
  const variants = buildFaultCodeVariants(faultCode);

  const promises: Promise<any>[] = [];

  // 1. gc_fault_codes (richest — 13,876 rows)
  for (const v of variants) {
    if (manufacturer) {
      promises.push(
        supabase.from('gc_fault_codes')
          .select('fault_code, description, cause, remedy, severity, manufacturer')
          .eq('fault_code', v)
          .ilike('manufacturer', `%${manufacturer}%`)
          .limit(3)
      );
    }
    promises.push(
      supabase.from('gc_fault_codes')
        .select('fault_code, description, cause, remedy, severity')
        .eq('fault_code', v)
        .limit(3)
    );
  }

  // 2. fault_finding_guides — try all variants
  promises.push(
    supabase.from('fault_finding_guides')
      .select('fault_code, description, possible_causes, components_to_check, reset_type')
      .in('fault_code', variants)
      .limit(3)
  );

  // 3. boiler_fault_codes (legacy) — try all variants
  promises.push(
    supabase.from('boiler_fault_codes')
      .select('fault_code, description, solutions, manufacturer')
      .in('fault_code', variants)
      .limit(3)
  );

  // 4. diagnostic_fault_codes — try all variants
  promises.push(
    supabase.from('diagnostic_fault_codes')
      .select('fault_code, fault_description, diagnostic_steps')
      .in('fault_code', variants)
      .limit(3)
  );

  const results = await Promise.allSettled(promises);
  const allData: any[] = results.flatMap((r: any) =>
    r.status === 'fulfilled' ? (r.value?.data || []) : []
  );

  if (allData.length === 0) {
    cacheSet(cacheKey, null);
    return null;
  }

  // Prefer manufacturer-specific match
  const best = manufacturer
    ? allData.find((d: any) => d.manufacturer?.toLowerCase().includes(manufacturer)) || allData[0]
    : allData[0];

  const description = best.description || best.fault_description || '';
  const cause = best.cause || best.possible_causes || '';
  const remedy = best.remedy || best.solutions || best.diagnostic_steps || '';
  const components = best.components_to_check || '';

  const result = { faultCode, manufacturer: best.manufacturer, description, cause, remedy, components };
  cacheSet(cacheKey, result);
  return result;
}

// ─── RAG: embed query and retrieve relevant manual chunks ───────────────────
// Returns { context, sources }. context is injected into the system prompt with
// strict grounding rules; sources are returned to the client so ChatDock can
// render source cards (manual name + page number, linked to the Manuals tab).
// If no chunk passes RETRIEVAL_THRESHOLD, sources is empty and caller should
// short-circuit the LLM call to avoid ungrounded answers.

async function getRelevantChunks(
  supabase: any,
  message: string,
  manufacturer: string | null,
  apiKey: string
): Promise<{ context: string; sources: ChunkSource[] }> {
  const empty = { context: '', sources: [] as ChunkSource[] };
  try {
    // Embed the user message. Must use the same model that populated RETRIEVAL_TABLE
    // (text-embedding-3-small). Mismatched models produce useless similarity scores
    // and everything short-circuits to "not in the corpus".
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: RETRIEVAL_EMBEDDING_MODEL, input: message }),
    });
    if (!embRes.ok) return empty;
    const embData = await embRes.json();
    const embedding = embData.data[0].embedding;

    // Hybrid search RPC (GIN text pre-filter + pgvector re-rank, scoped to manufacturer)
    const { data, error } = await supabase.rpc(RETRIEVAL_RPC, {
      query_embedding: embedding,
      match_count: RETRIEVAL_K * 2, // over-fetch so dedup still leaves us with K
      filter_manufacturer: manufacturer,
      min_similarity: RETRIEVAL_THRESHOLD, // RPC ignores this; we filter below
      query_text: message,
    });
    if (error || !data || data.length === 0) return empty;

    // Filter on threshold (the RPC accepts min_similarity but does not actually
    // apply it — verified in pg_proc definition 2026-04-21). Must filter in JS.
    const seen = new Set<string>();
    const passing = (data as any[])
      .filter((c: any) => typeof c.similarity === 'number' && c.similarity >= RETRIEVAL_THRESHOLD)
      .filter((c: any) => {
        // Dedup on first 120 chars — manuals often repeat boilerplate
        const key = (c.chunk_text || '').slice(0, 120);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, RETRIEVAL_K);

    if (passing.length === 0) return empty;

    // Batch-fetch manual names. Chunks only carry manual_id, not name.
    const manualIds = [...new Set(passing.map((c: any) => c.manual_id).filter(Boolean))];
    let nameById = new Map<string, string>();
    if (manualIds.length > 0) {
      const { data: manuals } = await supabase
        .from('boiler_manuals')
        .select('id, name')
        .in('id', manualIds);
      nameById = new Map((manuals || []).map((m: any) => [m.id, m.name as string]));
    }

    const sources: ChunkSource[] = passing.map((c: any) => ({
      chunk_id: c.id,
      manual_id: c.manual_id,
      manual_name: nameById.get(c.manual_id) || c.manufacturer || 'Unknown manual',
      manufacturer: c.manufacturer || null,
      page_number: typeof c.page_number === 'number' ? c.page_number : null,
      similarity: c.similarity,
    }));

    // Build grounded context block. Short chunk_id tag lets the LLM cite
    // without bloating token budget; full chunk_id returned to client for
    // deep-linking to the Manuals tab.
    const body = passing
      .map((c: any, i: number) => {
        const src = sources[i];
        const cite = `[${src.manual_name}${src.page_number ? `, p.${src.page_number}` : ''}]`;
        return `${cite}\n${(c.chunk_text || '').slice(0, 600).trim()}`;
      })
      .join('\n---\n');

    const context = `MANUAL CONTEXT — SOURCE GROUNDING RULES (MANDATORY):
• Every factual claim about the specific manufacturer/model MUST come from one of the chunks below.
• If the chunks do not cover the specific point, say "the manual doesn't specify" and ask for clarification — never invent a value, fault code, or procedure and attribute it to the manual.
• When quoting, quote exactly. Paraphrasing is allowed only if it stays faithful to chunk content.
• General Gas Safe engineering best-practice may be added AFTER the manual-grounded part, prefixed with "— general practice:".

CHUNKS:
${body}
`;

    return { context, sources };
  } catch (e) {
    console.error('[getRelevantChunks] error:', e);
    return empty;
  }
}

// ─── System prompt — expert Gas Safe engineer with systematic methodology ────

function buildSystemPrompt(faultInfo: any, ragContext = ''): string {
  const dbSection = faultInfo
    ? `\nREFERENCE DATA (cross-check with your engineering knowledge — DB entries can span multiple manufacturers):
Fault code ${faultInfo.faultCode}: ${faultInfo.description || 'see manufacturer manual'}
${faultInfo.cause ? `Possible cause: ${faultInfo.cause}` : ''}
${faultInfo.remedy ? `Suggested remedy: ${faultInfo.remedy}` : ''}
${faultInfo.components ? `Key components: ${faultInfo.components}` : ''}
Use this as a guide — if it conflicts with what you know about this specific manufacturer/model, trust your expertise.\n`
    : '';

  return `You are a Master Gas Safe engineer with 25+ years experience diagnosing boiler faults. You are talking to a FELLOW GAS SAFE REGISTERED ENGINEER on-site. Never suggest calling support — they ARE the expert.
${ragContext ? ragContext + '\n' : ''}

GAS SMELL / CO ALARM — OVERRIDE ALL OTHER RULES — respond EXACTLY like this:
"Right, stop. Gas smell means immediate action before anything else:
1. Isolate at the ECV (Emergency Control Valve) — turn off the gas supply
2. Do NOT operate any electrical switches — no lights, no phones inside
3. Open all doors and windows immediately
4. Evacuate the property now
5. Call 0800 111 999 from outside the building
Do NOT attempt any checks until the supply is isolated, the area is vented, and a full tightness test has been carried out. What's the situation — is the property evacuated?"

DIAGNOSTIC METHODOLOGY — apply every single response:
1. ONE confident diagnosis: "Right, this is almost certainly [cause]." — never "it could be..." / "it may be..." / "possibly..."
2. 2–4 numbered checks — each MUST include: specific component | exact tool | specific pass/fail value or expected reading
3. ONE sharp follow-up question

RESPONSE FORMAT (HARD LIMIT: 180 words):
- Open with: "Right," or "OK," or "So,"
- Line 1–2: most likely cause + brief reasoning
- Numbered checks: e.g. "1. Gas valve coil resistance — multimeter on Ω, expect ~30Ω per coil; open circuit = replace valve"
- Final line: ONE question only

VOICE — ALWAYS decisive, regardless of question type:
- FAULT DIAGNOSIS: "Right, this is almost certainly [cause]." — never waffle
- PROCEDURES / HOW-TO: "Right, the critical step here is X — I've seen more callbacks from missing this than anything else." / "Nine times out of ten it's the Y that catches people out on these."
- COMPARISONS / EDUCATION: "Right, in practice the key difference is X — most likely if you're seeing [code B] rather than [code A], you're dealing with Y."
- COMMISSIONING: "Right, the most important thing to nail on first fire is X — I'd put the gas rate and combustion check first every time."
- ALWAYS include at least one of: "almost certainly" / "nine times out of ten" / "most likely" / "typically" / "I've seen" / "I'd put"

TECHNICAL VALUES (include where relevant):
- Gas valve coil resistance: ~30Ω per coil (open circuit = dead coil, replace)
- Electrode gap: 3–4mm; check for cracks, carbon, glazed tip
- System pressure: 1–1.5 bar cold, expansion vessel pre-charge 0.75–1.0 bar
- NTC thermistor: ~10kΩ at 25°C (drops with heat — measure with multimeter on Ω)
- Fan: check speed signal (Hall effect sensor), air pressure switch — probe across switch terminals, should close when fan proves
- COMBI DHW: diverter valve + plate heat exchanger + DHW flow sensor/turbine
- SYSTEM DHW: motorised zone valve (e.g. Honeywell V4043H) + cylinder thermostat — NO diverter valve; microswitch failure is most common zone valve fault
- Condensate: frozen pipe → thaw with warm water (NOT boiling — max 45°C) or heat wrap; always check trap for cracks post-thaw; inspect neutraliser if fitted; pipe must fall at 2.5° min (BS 6798); internal diameter ≥ 22mm external runs
- Flue gas (combustion analyser): CO/CO₂ ratio <0.004 = acceptable; CO2 ~8–10% on natural gas; net efficiency >85%; high CO = incomplete combustion → check heat exchanger, gas rate, air supply
- Water treatment: inhibitor (e.g. Fernox F1) should show 100–500ppm; magnetic filter check for sludge; system pH 6.5–8.0; black sludge = urgent power flush needed
- Gas rates: 2.83kWh/ft³ (natural gas); check meter for correct kW output; dynamic inlet pressure min 17mbar, static 21mbar (NG)

BANNED PHRASES:
- "it may be" / "it might be" / "possibly" / "perhaps" / "it could be several things"
- "contact support" / "call manufacturer" / "if unsure seek help" / "register with manufacturer"
- "my training" / "knowledge cutoff" / "I cannot"
- Assumptions: never state a reading the engineer hasn't given — ASK instead
- kW ratings (24, 28, 30, 32, 35) are NOT fault codes — never treat them as such
- BENCHMARK / WARRANTY: the signed Benchmark Logbook IS the warranty document — never say "contact manufacturer for warranty" or "register with manufacturer"; just tell them to complete, sign, and leave the logbook with the user
${dbSection}`;
}

// ─── Ensure response is concise and always ends with a question ──────────────

function processReply(reply: string): string {
  let text = reply
    .replace(/\*\*\[[^\]]+\]\*\*\s*/g, '')   // strip [ASSESSMENT] headers
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Hard cap at 200 words (system prompt targets 180 — this allows a small buffer)
  const words = text.split(/\s+/);
  if (words.length > 200) {
    const truncated = words.slice(0, 200).join(' ');
    const lastSentence = Math.max(truncated.lastIndexOf('\n\n'), truncated.lastIndexOf('? '), truncated.lastIndexOf('. '));
    text = (lastSentence > 100 ? truncated.slice(0, lastSentence + 1) : truncated).trim();
    if (!/[?!.]$/.test(text)) text += '.';
  }

  // Ensure response ends with a question (system prompt instructs this, fallback for edge cases)
  if (!text.includes('?')) {
    text += '\n\nWhat are you seeing?';
  }

  return text.trim();
}

// ─── Call OpenAI ──────────────────────────────────────────────────────────────

async function callOpenAI(systemPrompt: string, messages: any[], temperature: number): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OpenAI API key not configured');

  const body = JSON.stringify({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature,
    max_tokens: 550,
  });

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body,
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0].message.content;
    }

    // Retry on rate limit (429) or overload (503)
    if ((response.status === 429 || response.status === 503) && attempt < 2) {
      const wait = (attempt + 1) * 2000; // 2s, 4s
      await new Promise(r => setTimeout(r, wait));
      continue;
    }

    const err = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${err}`);
  }

  throw new Error('OpenAI: max retries exceeded');
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, sessionId, history: rawHistory = [] } = body;

    // Validate message
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (message.length > 4000) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 4000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate sessionId (optional, but if provided must be UUID-ish)
    if (sessionId !== undefined && (typeof sessionId !== 'string' || sessionId.length > 100)) {
      return new Response(
        JSON.stringify({ error: 'Invalid sessionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cap history to prevent token cost runaway
    const history = Array.isArray(rawHistory) ? rawHistory.slice(-30) : [];

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Build full conversation text for context checks (history + current message)
    const conversationText = [...history, { text: message }]
      .map((m: any) => typeof m.text === 'string' ? m.text : (m.text?.text || ''))
      .join(' ');

    // ── SAFETY OVERRIDE: gas smell / CO alarm → hardcoded emergency response ──
    const isSafetyCritical = /gas smell|smell gas|smell of gas|carbon monoxide|co alarm|co detector|smell.*gas|gas.*smell/i.test(message);
    if (isSafetyCritical) {
      const coScenario = /carbon monoxide|co alarm|co detector/i.test(message);
      const safetyReply = coScenario
        ? `Right, stop — CO alarm means immediate action:\n1. Evacuate the property now — everyone out\n2. Do NOT operate any electrical switches — leave everything as is\n3. Open doors and windows on the way out if safe to do so\n4. Call 0800 111 999 from outside — they will advise\n5. Do NOT re-enter until the property has been declared safe and the source identified\n\nOnce cleared: we need to find the source — could be flue spillage, incomplete combustion, or a cracked heat exchanger. What appliances are in the property and was the boiler running when the alarm triggered?`
        : `Right, stop — gas smell means emergency action before anything else:\n1. Isolate at the ECV (Emergency Control Valve) — turn the gas off at the meter\n2. Do NOT operate any electrical switches — no lights, no phones inside the property\n3. Open all doors and windows immediately\n4. Evacuate the property now\n5. Call 0800 111 999 from outside the building\n\nDo NOT attempt any checks until the supply is isolated, area vented, and a full tightness test (BS 6891) has been carried out. Is the property evacuated and supply isolated?`;

      return new Response(
        JSON.stringify({ reply: safetyReply }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract fault info and lookup DB
    const extracted = extractFaultInfo(message + ' ' + conversationText);
    let faultInfo = null;
    if (extracted.faultCode) {
      faultInfo = await getFaultCodeInfo(supabase, extracted.faultCode, extracted.manufacturer);
    }

    // Adaptive temperature
    const hasSafetyCriticalContext = /gas smell|smell gas|carbon monoxide|co alarm/i.test(conversationText);
    const hasFaultCode = extracted.faultCode !== null;
    const temperature = hasSafetyCriticalContext ? 0.2 : hasFaultCode ? 0.4 : 0.55;

    // RAG: retrieve relevant manual chunks
    const { context: ragContext, sources } = await getRelevantChunks(
      supabase,
      message,
      extracted.manufacturer,
      Deno.env.get('OPENAI_API_KEY')!
    );

    // Short-circuit: no fault-code DB match AND no retrieval hits → do NOT call
    // the LLM. Returning an empty-corpus response here kills the hallucination
    // vector for general-knowledge questions ("what colour is the sky?") and
    // saves token cost. Safety override earlier in the handler still runs first.
    if (sources.length === 0 && !faultInfo) {
      const emptyReply = "I don't have that in the manual corpus — try rephrasing, or check the Manuals tab directly. What make and model are you working on?";
      return new Response(
        JSON.stringify({ reply: emptyReply, sources: [], faultInfo: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt and message array
    const systemPrompt = buildSystemPrompt(faultInfo, ragContext);
    const llmMessages = [
      ...history.slice(-12).map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: typeof m.text === 'string' ? m.text : m.text?.text || JSON.stringify(m.text),
      })),
      { role: 'user', content: message },
    ];

    const rawReply = await callOpenAI(systemPrompt, llmMessages, temperature);
    const reply = processReply(rawReply);

    // Persist session (include sources so UI can re-render citations on reload)
    if (sessionId) {
      const updatedHistory = [
        ...history,
        { sender: 'user', text: message, timestamp: new Date().toISOString() },
        { sender: 'assistant', text: reply, sources, timestamp: new Date().toISOString() },
      ];
      await supabase
        .from('chat_sessions')
        .upsert(
          { session_id: sessionId, history: updatedHistory, updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() },
          { onConflict: 'session_id' }
        );
    }

    return new Response(
      JSON.stringify({ reply, sources, faultInfo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        reply: "Having trouble connecting right now. For gas emergencies call 0800 111 999.",
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
