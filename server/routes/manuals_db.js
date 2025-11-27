/**
 * Manuals Routes - Database Version
 * Query boiler_manuals table instead of storage buckets
 */

import { supabase } from '../supabaseClient.js';
import logger from '../utils/logger.js';

export async function getManualsFromDatabase(req, res) {
  try {
    const search = req.query.search || '';
    const manufacturer = req.query.manufacturer || '';
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    logger.info(`[Manuals] Query database: manufacturer=${manufacturer}, search=${search}, limit=${limit}, offset=${offset}`);

    // Build query
    let query = supabase.from('boiler_manuals').select('*', { count: 'exact' });

    // Apply manufacturer filter
    if (manufacturer) {
      query = query.ilike('manufacturer', `%${manufacturer}%`);
    }

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,manufacturer.ilike.%${search}%,gc_number.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1).order('name');

    // Execute query
    const { data: manuals, error, count } = await query;

    if (error) {
      logger.error('[Manuals] Database query error:', { error: error.message });
      throw error;
    }

    logger.info(`[Manuals] Found ${manuals?.length || 0} manuals out of ${count} total`);

    res.json({
      data: manuals || [],
      total: count || 0,
      hasMore: offset + limit < (count || 0),
      source: 'database'
    });

  } catch (err) {
    logger.error('[Manuals] Error fetching from database:', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch manuals from database' });
  }
}
