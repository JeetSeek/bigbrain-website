// Supabase Edge Function: Chat API — Professional Gas Fault Diagnostics

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Retrieval configuration ──────────────────────────────────────────────────
// 2026-04-26: cut over from match_manual_chunks (manual_content_chunks, ~76k
// rows, AND-mode tsquery design flaw) to bb_hybrid_search (bb_content_chunks,
// 25,345 rows, 100% embedded with text-embedding-3-small, cosine + ILIKE
// keyword boost, manufacturer filter that respects manufacturer_folder).
// See chat-bb-retrieval-2026-04-26 PR for the migration rationale.
const RETRIEVAL_TABLE = 'bb_content_chunks';
const RETRIEVAL_RPC = 'bb_hybrid_search';
const RETRIEVAL_K = 8;
const RETRIEVAL_THRESHOLD = 0.5;        // cosine; bb_hybrid_search applies this server-side
const RETRIEVAL_KEYWORD_BOOST = 0.15;   // weight added to combined_score on ILIKE keyword hits
const RETRIEVAL_EMBEDDING_MODEL = 'text-embedding-3-small';

// Dual-shape source: new bb_ keys per chat-bb-retrieval-2026-04-26 brief AND
// legacy keys (manual_name, page_number) so the existing MessageBubble pill
// renderer (added in 73ae54b) keeps working without UI changes. The legacy
// aliases can be removed once MessageBubble is updated to read `title` and
// `scope` directly.
type ChunkSource = {
  chunk_id: string;
  manual_id: string;
  filename: string | null;
  title: string | null;
  manufacturer: string | null;
  scope: string | null;
  chunk_index: number | null;
  similarity: number;
  snippet: string;
  // Legacy aliases for back-compat with MessageBubble.jsx (post-73ae54b):
  manual_name: string;
  page_number: number | null;
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
// strict grounding rules and labelled [1]…[N] citation markers so the LLM can
// cite inline. sources are returned to the client so MessageBubble can render
// source pills below assistant replies. If no chunk passes RETRIEVAL_THRESHOLD
// the caller short-circuits the LLM call to avoid ungrounded answers.
//
// Uses bb_hybrid_search(p_query_embedding, p_text_query, p_k, p_manufacturer,
// p_min_similarity, p_keyword_boost) → cosine vector match + ILIKE keyword
// boost, scoped to manufacturer / manufacturer_folder. The RPC applies
// p_min_similarity server-side, so we don't have to re-filter in JS like the
// old match_manual_chunks pipeline.

async function getRelevantChunks(
  supabase: any,
  message: string,
  manufacturer: string | null,
  apiKey: string
): Promise<{ context: string; sources: ChunkSource[] }> {
  const empty = { context: '', sources: [] as ChunkSource[] };
  try {
    // Embed the user message. Must be the same model that populated
    // bb_content_chunks.embedding (text-embedding-3-small, 1536-dim).
    // Mismatched models produce useless similarity scores.
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: RETRIEVAL_EMBEDDING_MODEL, input: message }),
    });
    if (!embRes.ok) {
      console.error('[bb_retrieval] embedding request failed:', embRes.status);
      return empty;
    }
    const embData = await embRes.json();
    const embedding = embData.data[0].embedding;

    const { data, error } = await supabase.rpc(RETRIEVAL_RPC, {
      p_query_embedding: embedding,
      p_text_query:      message,
      p_k:               RETRIEVAL_K * 2,    // over-fetch so dedup still leaves K
      p_manufacturer:    manufacturer,
      p_min_similarity:  RETRIEVAL_THRESHOLD,
      p_keyword_boost:   RETRIEVAL_KEYWORD_BOOST,
    });
    if (error) {
      console.error('[bb_retrieval] RPC error:', error.message || error);
      return empty;
    }
    if (!data || data.length === 0) {
      console.log(`[bb_retrieval] No chunks returned (manufacturer=${manufacturer ?? 'any'})`);
      return empty;
    }

    // Dedup on first 120 chars — manuals repeat boilerplate ("Safety Notes")
    // across docs and we don't want six of them eating the [1]…[N] budget.
    const seen = new Set<string>();
    const passing = (data as any[])
      .filter((c: any) => {
        const key = (c.chunk_text || '').slice(0, 120);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, RETRIEVAL_K);

    if (passing.length === 0) return empty;

    const topSim = Math.max(...passing.map((c: any) => Number(c.semantic_similarity) || 0));
    console.log(`[bb_retrieval] ${passing.length} chunks (manufacturer=${manufacturer ?? 'any'}, top_similarity=${topSim.toFixed(3)})`);

    const sources: ChunkSource[] = passing.map((c: any) => {
      const title    = (c.title as string | null) || null;
      const filename = (c.filename as string | null) || null;
      const label    = title || filename || c.manufacturer || 'Manual';
      const snippet  = (c.chunk_text || '').slice(0, 240).replace(/\s+/g, ' ').trim();
      return {
        chunk_id:    c.chunk_id,
        manual_id:   c.manual_id,
        filename,
        title,
        manufacturer: c.manufacturer || null,
        scope:       (c.scope as string | null) || null,
        chunk_index: typeof c.chunk_index === 'number' ? c.chunk_index : null,
        similarity:  Number(c.semantic_similarity) || 0,
        snippet,
        // Legacy aliases for the existing MessageBubble pill renderer:
        manual_name: label,
        page_number: null,    // bb_content_chunks doesn't carry page numbers
      };
    });

    // Build labelled context block. The [1]…[N] markers let the LLM cite
    // inline ("...as per [2]") and keep the pill strip and the inline cites
    // in lockstep — pill index N === [N] in the reply.
    const body = passing
      .map((c: any, i: number) => {
        const src = sources[i];
        const head = `[${i + 1}] ${src.manual_name}${src.scope ? ` · ${src.scope}` : ''}`;
        return `${head}\n${(c.chunk_text || '').slice(0, 600).trim()}`;
      })
      .join('\n---\n');

    const context = `MANUAL CONTEXT — CITATION RULES (MANDATORY):
• Each chunk below is tagged [1], [2], … [${passing.length}]. Use those exact bracket markers inline when stating any manufacturer-specific fact (e.g. "...the gas valve coil should read ~30Ω [2]").
• Every factual claim about the specific manufacturer/model MUST come from one of these chunks. If the chunks don't cover the point, say "the manual doesn't specify" and ask the engineer for clarification — never invent a value, fault code, or procedure and attribute it to the manual.
• Quote exactly when quoting; paraphrase only when faithful to the chunk.
• General Gas Safe engineering best-practice may be added AFTER the manual-grounded part, prefixed with "— general practice:" and without a [n] marker.

CHUNKS:
${body}
`;

    return { context, sources };
  } catch (e) {
    console.error('[bb_retrieval] unexpected error:', e);
    return empty;
  }
}

// ─── Model-keyword extraction ───────────────────────────────────────────────
// bb_fault_codes is ambiguous when the same `code` value (e.g. "2") describes
// different faults across different manuals from the same manufacturer
// (Ideal "L2" can be Ignition Lockout, Flame Loss, BCC Fault, etc., depending
// on which manual you're reading). Without a model anchor, picking the first
// few rows surfaces a wrong description and the prompt's "fault_codes is
// authoritative" rule then leads the LLM into a wrong diagnosis.
//
// So we extract distinctive model tokens that appear after the matched
// manufacturer name in the user message ("Ideal Logic Combi 30" → ["Logic"]).
// If we can't find any model token, the caller skips the bb_fault_codes
// lookup entirely — vector RAG handles model disambiguation through embedding
// similarity, which is the safer default for under-specified queries.

const MODEL_GENERIC_TOKENS = new Set([
  'boiler', 'combi', 'combination', 'system', 'regular', 'conventional',
  'heat', 'only', 'open', 'vent', 'sealed',
  'fault', 'error', 'code', 'codes', 'lockout', 'showing', 'displaying',
  'displays', 'reads', 'flashing', 'reading',
  'what', 'does', 'mean', 'means', 'meaning',
  'on', 'an', 'the', 'my', 'your', 'with', 'for', 'and', 'but', 'this', 'that',
  'working', 'installation', 'servicing', 'service', 'install',
  'gas', 'natural', 'lpg',
]);

function extractModelKeywords(message: string, manufacturer: string | null): string[] {
  if (!manufacturer) return [];
  const lower = message.toLowerCase();
  const idx = lower.indexOf(manufacturer.toLowerCase());
  if (idx === -1) return [];
  const tail = message.slice(idx + manufacturer.length);
  const tokens = tail.split(/[^\w]+/).filter(Boolean);
  const out: string[] = [];
  for (const t of tokens.slice(0, 8)) {
    if (out.length >= 2) break;
    const tl = t.toLowerCase();
    if (MODEL_GENERIC_TOKENS.has(tl)) continue;
    if (/^\d+$/.test(t)) continue;            // pure-numeric (kW rating, model number) is too noisy alone
    if (tl.length < 3) continue;              // 'a', 'is', 'on' fall through here too
    out.push(t);
  }
  return out;
}

// ─── Direct fault-code lookup against bb_fault_codes ─────────────────────────
// Vector search over chunked manuals is the wrong tool for the question
// "what does fault code 224 mean?" — fault codes are tabular data, and the
// 224-explanation chunk often gets outranked by generic model-overview chunks
// that score higher on semantic similarity to the model name. So we run a
// direct table query in parallel and surface any code matches as additional
// "sources" with scope='fault_codes' and similarity=1.0, ranking them above
// the vector chunks in the merged grounding context.
//
// Returns ChunkSource[] (same shape as getRelevantChunks output) so the main
// handler can merge the two lists without bespoke handling. Empty array on
// any error or no match.

async function getBbFaultCodeMatches(
  supabase: any,
  faultCode: string,
  manufacturer: string | null,
  modelKeywords: string[]
): Promise<ChunkSource[]> {
  try {
    // No manufacturer or no model anchor → skip. Vector RAG handles
    // under-specified queries via embedding similarity, which is safer than
    // pulling a possibly-conflicting set of fault-code rows from across all
    // of a manufacturer's catalogue.
    if (!manufacturer) {
      console.log('[bb_fault_codes] no manufacturer extracted, skipping (vector-only)');
      return [];
    }
    if (modelKeywords.length === 0) {
      console.log('[bb_fault_codes] no model keywords extracted, skipping (vector-only)');
      return [];
    }

    // Pre-filter bb_manuals to those that match BOTH the manufacturer AND
    // every model keyword (ANDed in JS — PostgREST doesn't compose AND-of-OR
    // across two columns cleanly). We keep this list small (manufacturers
    // typically have <500 manuals each in bb_manuals).
    const { data: allManuals, error: manualsErr } = await supabase
      .from('bb_manuals')
      .select('id, manufacturer, title, filename')
      .ilike('manufacturer', `%${manufacturer}%`);
    if (manualsErr) {
      console.error('[bb_fault_codes] bb_manuals query error:', manualsErr.message || manualsErr);
      return [];
    }
    const kwLower = modelKeywords.map(k => k.toLowerCase());
    const matchedManuals = (allManuals || []).filter((m: any) => {
      const haystack = `${m.title || ''} ${m.filename || ''}`.toLowerCase();
      return kwLower.every(kw => haystack.includes(kw));
    });
    if (matchedManuals.length === 0) {
      console.log(`[bb_fault_codes] no manuals match mfr=${manufacturer} + keywords=${modelKeywords.join(',')}, skipping`);
      return [];
    }
    const manualById: Map<string, any> = new Map(matchedManuals.map((m: any) => [m.id, m]));
    const matchedManualIds = matchedManuals.map((m: any) => m.id);

    // Now query bb_fault_codes scoped to those manuals + code variants.
    const variants = buildFaultCodeVariants(faultCode);
    const { data: rows, error } = await supabase
      .from('bb_fault_codes')
      .select('id, manual_id, code, subcode, description, probable_cause, recovery_actions')
      .in('code', variants)
      .in('manual_id', matchedManualIds)
      .limit(20);

    if (error) {
      console.error('[bb_fault_codes] query error:', error.message || error);
      return [];
    }
    if (!rows || rows.length === 0) {
      console.log(`[bb_fault_codes] No rows for code=${variants.join('|')} across ${matchedManuals.length} model-matched manuals`);
      return [];
    }
    const scoped = rows;

    // Frequency-aware dedup: group rows by normalized description and rank
    // by how many manuals carry that description. With ambiguous codes
    // (e.g. Ideal "L2" appears as Ignition Lockout in 70 manuals and Flame
    // Loss in 1), this ensures the dominant interpretation wins regardless
    // of PostgREST result order. Take top 3 distinct descriptions.
    const groups = new Map<string, { rep: any; count: number }>();
    for (const r of scoped) {
      const key = (r.description || '').trim().toLowerCase().replace(/[\s.]+/g, ' ');
      if (!key) continue;
      const g = groups.get(key);
      if (g) g.count++;
      else groups.set(key, { rep: r, count: 1 });
    }
    const deduped = [...groups.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(g => g.rep);

    console.log(`[bb_fault_codes] ${deduped.length} unique matches for ${faultCode} (mfr=${manufacturer ?? 'any'})`);

    return deduped.map((r: any): ChunkSource => {
      const m = manualById.get(r.manual_id) || {};
      const title    = (m.title as string | null) || null;
      const filename = (m.filename as string | null) || null;
      const label    = title || filename || (m.manufacturer as string | null) || 'Manual';
      const recovery = Array.isArray(r.recovery_actions) ? r.recovery_actions.filter(Boolean).join(' ') : '';
      const snippet  = `Code ${r.code}: ${r.description || ''}${r.probable_cause ? ` — ${r.probable_cause}` : ''}${recovery ? ` Recovery: ${recovery}` : ''}`
        .slice(0, 240).replace(/\s+/g, ' ').trim();
      return {
        chunk_id:    r.id,
        manual_id:   r.manual_id,
        filename,
        title,
        manufacturer: (m.manufacturer as string | null) || null,
        scope:       'fault_codes',
        chunk_index: null,
        similarity:  1.0,                  // exact code match — top of the pile
        snippet,
        manual_name: label,
        page_number: null,
      };
    });
  } catch (e) {
    console.error('[bb_fault_codes] unexpected error:', e);
    return [];
  }
}

// Merge fault-code matches (highest priority) with vector chunks, dedup by
// chunk_id, cap at RETRIEVAL_K, and rebuild the labelled context block so
// pill index N === [N] in the LLM reply.
function buildMergedContext(
  faultMatches: ChunkSource[],
  vectorContext: { context: string; sources: ChunkSource[] }
): { context: string; sources: ChunkSource[] } {
  if (faultMatches.length === 0) return vectorContext;

  const seen = new Set(faultMatches.map(s => s.chunk_id));
  const merged = [
    ...faultMatches,
    ...vectorContext.sources.filter(s => !seen.has(s.chunk_id)),
  ].slice(0, RETRIEVAL_K);

  const body = merged.map((src, i) => {
    const head = `[${i + 1}] ${src.manual_name}${src.scope ? ` · ${src.scope}` : ''}`;
    return `${head}\n${src.snippet}`;
  }).join('\n---\n');

  const context = `MANUAL CONTEXT — CITATION RULES (MANDATORY):
• Each source below is tagged [1], [2], … [${merged.length}]. Use those exact bracket markers inline when stating any manufacturer-specific fact.
• Sources with scope='fault_codes' come from a structured fault-code table — treat their description/cause/recovery as authoritative for that code.
• Sources with other scopes are excerpts from manual chunks — quote exactly when quoting; paraphrase only when faithful.
• If the sources don't cover the point, say "the manual doesn't specify" and ask the engineer for clarification — never invent a value.
• General Gas Safe best-practice may be added AFTER the grounded part, prefixed with "— general practice:" and without a [n] marker.

SOURCES:
${body}
`;

  return { context, sources: merged };
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

    // Grounding: vector chunks (always) + bb_fault_codes direct lookup (when
    // a fault code was extracted). Run in parallel and merge so a structured
    // fault-code row beats a generic model-overview chunk to the [1] slot.
    // Extract distinctive model tokens from the user message so the
    // fault-code lookup can scope to the right manual (avoids "L2 = Flame
    // Loss" leaking from i-mini onto a Logic Combi query). Empty array means
    // we'll skip the fault-code lookup entirely — vector RAG only.
    const modelKeywords = extractModelKeywords(message, extracted.manufacturer);
    if (extracted.faultCode) {
      console.log(`[chat] faultCode=${extracted.faultCode} mfr=${extracted.manufacturer ?? 'any'} modelKeywords=${modelKeywords.join(',') || '(none)'}`);
    }

    const [vectorResult, faultCodeMatches] = await Promise.all([
      getRelevantChunks(supabase, message, extracted.manufacturer, Deno.env.get('OPENAI_API_KEY')!),
      extracted.faultCode
        ? getBbFaultCodeMatches(supabase, extracted.faultCode, extracted.manufacturer, modelKeywords)
        : Promise.resolve([] as ChunkSource[]),
    ]);
    const { context: ragContext, sources } = buildMergedContext(faultCodeMatches, vectorResult);

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
