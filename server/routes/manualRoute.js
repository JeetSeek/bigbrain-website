import express from 'express';
import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';
import { validateManualSearch } from '../middleware/inputValidation.js';
import { adminAuth } from '../authMiddleware.js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── Manual Search Utilities ─────────────────────────────────────────────────
const BRAND_ALIASES = {
  'greenstar': 'worcester', 'green star': 'worcester', 'worcester bosch': 'worcester',
  'ecotec': 'vaillant', 'ecotec plus': 'vaillant', 'ecotec pro': 'vaillant',
  'turbomax': 'vaillant', 'turbotec': 'vaillant',
  'logic': 'ideal', 'logic plus': 'ideal', 'logic max': 'ideal', 'logic combi': 'ideal',
  'esprit': 'ideal', 'evo': 'ideal', 'isar': 'ideal', 'independent': 'ideal',
  'duotec': 'baxi', 'platinum': 'baxi', 'neta-tec': 'baxi', 'megaflo': 'heatrae-sadia',
  'ultracom': 'ideal', 'ultracom2': 'ideal',
  'flexicom': 'heatline', 'he plus': 'baxi',
};

function decodeManualName(rawName, manufacturer) {
  if (!rawName) return rawName;
  let name = rawName.replace(/\.(pdf|doc|docx)$/i, '');
  name = name.replace(/[_]+/g, ' ').replace(/-/g, ' ');
  name = name
    .replace(/\binstallation\b/gi, '').replace(/\bISS\s*\d+/gi, '')
    .replace(/\bNG\b/g, 'Nat Gas').replace(/\bLPG\b/g, 'LPG').replace(/\bOIL\b/g, 'Oil')
    .replace(/\bERP\b/gi, 'ErP').replace(/\bCOMBI\b/gi, 'Combi').replace(/\bSYSTEM\b/gi, 'System')
    .replace(/\bELEC\b/gi, 'Electric').replace(/\bCOMPACT\b/gi, 'Compact').replace(/\bPLUS\b/gi, 'Plus')
    .replace(/\bV(\d+)\b/g, 'v$1')
    .replace(/\bGB\b/g, '').replace(/\bOOO\b/g, '').replace(/\bFUR\b/gi, '')
    .replace(/\bRD\d+/gi, m => m.toUpperCase())
    .trim().replace(/\s{2,}/g, ' ');
  const mfr = (manufacturer || '').toLowerCase();
  if (mfr.includes('worcester') && !/greenstar|worcester/i.test(name)) {
    name = 'Greenstar ' + name;
  }
  return name || rawName;
}

function extractAliasFromSearch(searchTerm) {
  const lower = searchTerm.toLowerCase().trim();
  let mfr = '';
  let remaining = lower;
  const sorted = Object.entries(BRAND_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, manufacturer] of sorted) {
    if (lower.includes(alias)) {
      mfr = manufacturer;
      remaining = lower.replace(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
      break;
    }
  }
  return { manufacturer: mfr, remaining };
}

// --- GET /api/manuals ---
router.get('/', validateManualSearch, async (req, res) => {
  try {
    let search = (req.query.search || '').trim();
    let manufacturer = (req.query.manufacturer || '').trim();
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // 1. Extract brand aliases from search
    if (search) {
      const alias = extractAliasFromSearch(search);
      if (alias.manufacturer) {
        if (!manufacturer) manufacturer = alias.manufacturer;
        if (manufacturer.toLowerCase() === alias.manufacturer.toLowerCase()) search = alias.remaining;
      }
    }

    const tokens = search ? search.toLowerCase().split(/\s+/).filter(t => t.length >= 1) : [];
    logger.info(`[Manuals] Smart search: manufacturer=${manufacturer}, tokens=${JSON.stringify(tokens)}, limit=${limit}, offset=${offset}`);

    // 2. Build DB query
    let query = supabase.from('boiler_manuals').select('*', { count: 'exact' });

    if (manufacturer) {
      query = query.ilike('manufacturer', `%${manufacturer}%`);
      if (tokens.length > 0) {
        query = query.ilike('name', `%${tokens[0]}%`);
      }
      query = query.order('name').limit(500);
    } else if (tokens.length > 0) {
      const orParts = tokens.flatMap(t => [`name.ilike.%${t}%`, `manufacturer.ilike.%${t}%`]);
      query = query.or(orParts.join(','));
      query = query.order('manufacturer').limit(500);
    } else {
      return res.json({ data: [], total: 0, hasMore: false });
    }

    const { data, error } = await query;
    if (error) { logger.error('[Manuals] DB error:', error); throw error; }

    // 3. Decode names and score/rank results
    let results = (data || []).map(m => ({
      ...m,
      display_name: decodeManualName(m.name, m.manufacturer),
    }));

    if (tokens.length > 0) {
      results = results.map(m => {
        const haystack = `${m.display_name} ${m.name} ${m.manufacturer}`.toLowerCase();
        let score = 0, matched = 0;
        for (const t of tokens) {
          if (haystack.includes(t)) { score += t.length * 2; matched++; }
        }
        return { ...m, _score: score, _matched: matched };
      })
      .filter(m => m._matched > 0)
      .sort((a, b) => b._matched !== a._matched ? b._matched - a._matched : b._score - a._score);
    }

    // 4. Paginate and respond
    const total = results.length;
    const page = results.slice(offset, offset + limit).map(({ _score, _matched, ...rest }) => rest);

    logger.info(`[Manuals] Returning ${page.length} of ${total} results`);
    res.json({ data: page, total, hasMore: (offset + limit) < total });

  } catch (error) {
    logger.error('[Manuals] Error:', error);
    res.status(500).json({ error: 'Failed to fetch manuals' });
  }
});

// --- GET /api/manuals/:id ---
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: manual, error } = await supabase.from('boiler_manuals').select('*').eq('id', id).single();
    if (error) throw error;
    if (!manual) return res.status(404).json({ error: 'Manual not found' });
    res.json({ manual });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GET /api/manuals/:id/download — RETIRED 2026-04-21 (walkthrough P1) ---
// Download/Preview is now client-side window.open gated on a HEAD probe via
// the check-manual-link edge function. manual.url comes from the Manuals list
// fetch already; there is no need to round-trip through this endpoint. See
// docs/user-walkthrough-2026-04-21.md and
// src/components/ManualFinderStandalone.jsx:openManualUrl.

// --- POST /api/manuals (admin only, stub) ---
router.post('/', adminAuth, async (req, res) => {
  res.status(501).json({ error: 'Manual creation via API not implemented. Use Supabase dashboard.' });
});

// --- POST /api/manuals/upload (admin only, stub) ---
router.post('/upload', adminAuth, async (req, res) => {
  res.status(501).json({ error: 'File upload via API not implemented. Use Supabase dashboard or implement file upload.' });
});

export default router;
