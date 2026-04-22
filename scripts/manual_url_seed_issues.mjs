#!/usr/bin/env node
/**
 * Manual URL reconciliation — Commit 3 (seed bb_manual_link_issues).
 *
 * Per walkthrough-2026-04-22 decision (see scripts/manual_url_reconcile.mjs):
 * we can't auto-repoint any of the 147 orphan rows — 121 live in bucket
 * folders that are empty, and the remaining 26 all land at medium confidence
 * because DB names are family-level while storage carries variant codes.
 *
 * So this script skips Commit 2 entirely and logs EVERY orphan (medium + none)
 * into bb_manual_link_issues, which:
 *   - Makes them visible in the admin triage view (future dashboard).
 *   - Lets the check-manual-link edge function's existing click-time path keep
 *     catching them without us pre-emptying boiler_manuals.url.
 *
 * Timestamps are spread by 1s per row (ordered by boiler_manuals.id) so the
 * admin sort doesn't collapse them into one tick.
 *
 * Run:
 *   node scripts/manual_url_seed_issues.mjs
 *
 * Reads: scripts/output/manual_url_reconcile.csv (output of Commit 1 script).
 * Writes: N rows into public.bb_manual_link_issues.
 * No other side effects. boiler_manuals.url is NOT touched.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --- .env loader (zero-dep, same as Commit 1 script) -----------------------
async function loadEnv() {
  try {
    const raw = await fs.readFile(path.join(ROOT, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch { /* no .env — rely on process.env */ }
}
await loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.VITE_SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[seed] Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- CSV parser (RFC4180-ish, handles the quoting we emit in Commit 1) -----
function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQuotes = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v !== ''));
}

// --- Read the Commit 1 CSV --------------------------------------------------
const csvPath = path.join(__dirname, 'output', 'manual_url_reconcile.csv');
const csvText = await fs.readFile(csvPath, 'utf8').catch(err => {
  console.error(`[seed] Cannot read ${csvPath}. Run scripts/manual_url_reconcile.mjs first.`);
  throw err;
});
const parsed = parseCSV(csvText);
const [header, ...dataRows] = parsed;
const col = (name) => header.indexOf(name);
const iId = col('id');
const iUrl = col('current_url');
const iConf = col('confidence');
if (iId < 0 || iUrl < 0 || iConf < 0) {
  console.error('[seed] CSV missing expected columns (id, current_url, confidence).');
  process.exit(1);
}

// Filter: medium + none. "high" should never appear (Commit 2 skipped) but
// skip defensively just in case the CSV predates this commit.
const orphans = dataRows
  .map(r => ({ id: r[iId], url: r[iUrl], confidence: r[iConf] }))
  .filter(r => r.confidence === 'medium' || r.confidence === 'none');

console.log(`[seed] ${orphans.length} orphan rows to log (medium + none).`);
if (orphans.length === 0) {
  console.log('[seed] Nothing to insert. Exiting.');
  process.exit(0);
}

// Pre-flight: show current row count so re-runs are obvious.
const { count: existingCount, error: countErr } = await supabase
  .from('bb_manual_link_issues')
  .select('id', { count: 'exact', head: true });
if (countErr) {
  console.error('[seed] count probe failed:', countErr);
  process.exit(1);
}
console.log(`[seed] bb_manual_link_issues currently has ${existingCount} rows.`);

// --- Build rows with spread timestamps (1s apart, oldest first) ------------
// Anchor at "now minus (N-1) seconds" so the newest row lands at ~now. This
// keeps the admin dashboard "most recent first" ordering sensible on insert.
const baseMs = Date.now() - (orphans.length - 1) * 1000;
// Keep deterministic order — sort by boiler_manuals.id (the CSV already
// sorts by manufacturer then id; re-sorting by id alone keeps it stable
// against CSV re-runs that might change manufacturer grouping later).
orphans.sort((a, b) => String(a.id).localeCompare(String(b.id)));

const payload = orphans.map((o, idx) => ({
  manual_id: o.id,
  url: o.url,
  http_status: null,
  error_message: `Orphan during reconciliation (${o.confidence})`,
  observed_at: new Date(baseMs + idx * 1000).toISOString(),
}));

// Sanity: print first/last row so the user sees what's going in.
console.log('[seed] First payload row:', JSON.stringify(payload[0]));
console.log('[seed] Last  payload row:', JSON.stringify(payload[payload.length - 1]));

// --- Insert in batches of 500 (well under Postgres insert-row cap) ---------
const BATCH = 500;
let inserted = 0;
for (let i = 0; i < payload.length; i += BATCH) {
  const slice = payload.slice(i, i + BATCH);
  const { error } = await supabase
    .from('bb_manual_link_issues')
    .insert(slice);
  if (error) {
    console.error(`[seed] insert batch failed at offset ${i}:`, error);
    console.error(`[seed] ${inserted} rows inserted before failure. Re-run is safe; duplicates are expected by design.`);
    process.exit(1);
  }
  inserted += slice.length;
}

console.log(`[seed] Inserted ${inserted} rows into bb_manual_link_issues.`);

// Post-flight count for the commit log.
const { count: afterCount } = await supabase
  .from('bb_manual_link_issues')
  .select('id', { count: 'exact', head: true });
console.log(`[seed] bb_manual_link_issues now has ${afterCount} rows (was ${existingCount}).`);
