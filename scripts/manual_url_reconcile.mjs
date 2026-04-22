#!/usr/bin/env node
/**
 * Manual URL reconciliation — Commit 1 (report only, no writes).
 *
 * Context (2026-04-22):
 * `boiler_manuals` has 6,026 rows. 5,879 (97.6%) already point at our
 * Supabase `boiler-manuals` bucket. The remaining 147 point at external
 * manufacturer CDNs (freeboilermanuals.com mostly, a handful of
 * worcester-bosch.co.uk, professional.vaillant.co.uk, etc.). Many of those
 * 147 already have PDF equivalents in our bucket under slightly different
 * filenames.
 *
 * This script classifies each orphan row as high / medium / none based on
 * token-overlap (Jaccard) against the filenames in the matching manufacturer
 * folder of the `boiler-manuals` bucket, and emits a CSV for triage. It
 * makes NO writes. Commits 2 and 3 handle repointing and flagging.
 *
 * Run:
 *   node scripts/manual_url_reconcile.mjs
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_KEY in .env (service
 * role is needed to read `storage.objects` metadata — the bucket is public
 * for read but the objects table itself is RLS-gated).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Minimal zero-dep .env loader — only reads, doesn't mutate process.env if
// the keys are already set (so CI/overrides still work).
async function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  let raw;
  try {
    raw = await fs.readFile(envPath, 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

await loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[reconcile] Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- Token cleaning ---------------------------------------------------------
// Drop tokens that carry no disambiguating signal. "Installation" appears in
// most filenames; keeping it would inflate overlap for unrelated docs.
// RD\d+ are revision tokens ("RD12", "RD5") that rarely match between DB and
// storage because the DB strips them.
const NOISE_TOKENS = new Set([
  'V2', 'V3', 'V4',
  'ERP',
  'NG', 'LPG',
  'INSTALLATION', 'INSTALLING', 'INSTALL',
  'MANUAL', 'MANUALS',
  'SERVICING', 'SERVICE',
  'USER', 'USERS',
  'OPERATION', 'OPERATING', 'OPERATIONAL',
  'INSTRUCTIONS', 'INSTRUCTION',
  'GUIDE',
  'PDF',
  'COMPRESSED',
  'AND', 'OR', 'OF', 'FOR', 'WITH', 'THE',
]);
const NOISE_REGEX = /^(RD|REV|MK)\d+$/;

function tokenize(s) {
  return String(s || '')
    .toUpperCase()
    .replace(/\.(PDF|COMPRESSED)$/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .split('_')
    .filter(t => t.length > 1) // drop single-char noise ("A", "S")
    .filter(t => !NOISE_TOKENS.has(t) && !NOISE_REGEX.test(t));
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

// --- Fetch orphans ----------------------------------------------------------
const { data: orphans, error: orphansErr } = await supabase
  .from('boiler_manuals')
  .select('id, manufacturer, name, url')
  .not('url', 'ilike', '%supabase.co%')
  .order('manufacturer', { ascending: true })
  .order('id',           { ascending: true });

if (orphansErr) {
  console.error('[reconcile] select orphans failed:', orphansErr);
  process.exit(1);
}

console.log(`[reconcile] ${orphans.length} orphan rows`);

// --- Group by manufacturer so we list storage once per folder ---------------
const byMfr = new Map();
for (const row of orphans) {
  const key = (row.manufacturer || 'unknown').toLowerCase();
  if (!byMfr.has(key)) byMfr.set(key, []);
  byMfr.get(key).push(row);
}

// --- For each manufacturer, list the bucket folder and score candidates ----
const results = [];
for (const [mfrLower, rows] of byMfr) {
  const prefix = `dhs_manuals_all/${mfrLower}/`;

  // Storage list API — paginate at 1000/page. The `storage` schema isn't
  // exposed through PostgREST so we can't `.schema('storage').from(...)`.
  const folder = prefix.replace(/\/$/, '');
  const PAGE_SIZE = 1000;
  let offset = 0;
  const collected = [];
  let listErr = null;
  while (true) {
    const { data: page, error: pageErr } = await supabase
      .storage
      .from('boiler-manuals')
      .list(folder, { limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (pageErr) { listErr = pageErr; break; }
    if (!page || page.length === 0) break;
    collected.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (listErr) {
    console.warn(`[reconcile] ${mfrLower}: storage list failed — ${listErr.message}`);
    for (const row of rows) {
      results.push({
        id: row.id,
        manufacturer: row.manufacturer,
        name: row.name,
        current_url: row.url,
        best_match_path: null,
        overlap_ratio: 0,
        confidence: 'none',
      });
    }
    continue;
  }

  const candidates = collected
    .filter(f => f.name && /\.pdf$/i.test(f.name))
    .map(f => ({
      path: `${prefix}${f.name}`,
      filename: f.name,
      tokens: tokenize(f.name),
    }));

  console.log(`[reconcile] ${mfrLower}: ${rows.length} orphan rows, ${candidates.length} bucket candidates`);

  for (const row of rows) {
    const qTokens = tokenize(row.name);
    let best = null;
    let bestRatio = 0;
    let ties = 0;

    for (const c of candidates) {
      const r = jaccard(qTokens, c.tokens);
      if (r > bestRatio) {
        bestRatio = r;
        best = c;
        ties = 1;
      } else if (r === bestRatio && r > 0) {
        ties++;
      }
    }

    let confidence;
    if (bestRatio >= 0.7 && ties === 1) confidence = 'high';
    else if (bestRatio >= 0.4)          confidence = 'medium';
    else                                 confidence = 'none';

    results.push({
      id: row.id,
      manufacturer: row.manufacturer,
      name: row.name,
      current_url: row.url,
      best_match_path: best ? best.path : null,
      overlap_ratio: Number(bestRatio.toFixed(3)),
      confidence,
      ties,
      candidate_count: candidates.length,
    });
  }
}

// --- Write CSV --------------------------------------------------------------
const csvPath = path.join(__dirname, 'output', 'manual_url_reconcile.csv');
await fs.mkdir(path.dirname(csvPath), { recursive: true });

const esc = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const header = 'id,manufacturer,name,current_url,best_match_path,overlap_ratio,confidence,ties,candidate_count\n';
const body = results.map(r => [
  r.id, r.manufacturer, r.name, r.current_url,
  r.best_match_path, r.overlap_ratio, r.confidence,
  r.ties, r.candidate_count,
].map(esc).join(',')).join('\n');
await fs.writeFile(csvPath, header + body + '\n');

// --- Summary ---------------------------------------------------------------
const counts = { high: 0, medium: 0, none: 0 };
for (const r of results) counts[r.confidence]++;

console.log('\n=== RECONCILIATION SUMMARY ===');
console.log(`Total orphans: ${results.length}`);
console.log(`  high:   ${counts.high}`);
console.log(`  medium: ${counts.medium}`);
console.log(`  none:   ${counts.none}`);
console.log(`\nCSV: ${path.relative(process.cwd(), csvPath)}`);

// Per-manufacturer breakdown — makes it obvious when a whole folder is empty.
console.log('\n=== PER-MANUFACTURER BREAKDOWN ===');
const mfrBreakdown = new Map();
for (const r of results) {
  const k = r.manufacturer;
  if (!mfrBreakdown.has(k)) mfrBreakdown.set(k, { high: 0, medium: 0, none: 0, candidates: r.candidate_count });
  mfrBreakdown.get(k)[r.confidence]++;
}
for (const [mfr, b] of [...mfrBreakdown.entries()].sort()) {
  console.log(`  ${mfr.padEnd(24)} rows: ${b.high + b.medium + b.none}  high/medium/none=${b.high}/${b.medium}/${b.none}  bucket_files=${b.candidates}`);
}

const fmtRow = (r) =>
  `[${r.manufacturer}] "${r.name}"\n  → ${r.best_match_path ?? '(no candidate)'}  (overlap ${r.overlap_ratio}, ties=${r.ties})`;

console.log('\n=== 10 SAMPLE HIGH-CONFIDENCE ROWS ===');
const highs = results.filter(r => r.confidence === 'high').slice(0, 10);
if (highs.length === 0) console.log('(none)');
for (const r of highs) console.log(fmtRow(r));

// Medium = the most interesting tier for triage. Show all of them (brief says
// medium is 0.4–0.7 OR ≥0.7 with ties; sample is tiny, print all).
console.log(`\n=== ALL MEDIUM ROWS (${counts.medium}) ===`);
const mediums = results
  .filter(r => r.confidence === 'medium')
  .sort((a, b) => b.overlap_ratio - a.overlap_ratio);
if (mediums.length === 0) console.log('(none)');
for (const r of mediums) console.log(fmtRow(r));

// "Worst misses" worth eyeballing are the ones where storage HAD candidates
// but nothing scored ≥0.4. Rows in empty folders carry no signal about the
// matcher — a dedicated subsection handles those at the bottom.
console.log('\n=== 10 WORST MISSES WHERE BUCKET HAD CANDIDATES ===');
const nonesWithCandidates = results
  .filter(r => r.confidence === 'none' && r.candidate_count > 0)
  .sort((a, b) => a.overlap_ratio - b.overlap_ratio)
  .slice(0, 10);
if (nonesWithCandidates.length === 0) console.log('(none)');
for (const r of nonesWithCandidates) console.log(fmtRow(r));

const emptyFolderCount = results.filter(r => r.candidate_count === 0).length;
if (emptyFolderCount > 0) {
  console.log(`\n${emptyFolderCount} orphan rows live in manufacturer folders that are EMPTY in the bucket — those are unreconcilable at this pass and will go straight to bb_manual_link_issues in Commit 3.`);
}
