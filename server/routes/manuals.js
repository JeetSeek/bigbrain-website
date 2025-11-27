/**
 * Manual Routes
 * API endpoints for boiler manual management
 */

import express from 'express';
import { supabase } from '../supabaseClient.js';
import { adminAuth } from '../authMiddleware.js';
import { validateManualSearch } from '../middleware/inputValidation.js';
import logger from '../utils/logger.js';
import * as CONSTANTS from '../constants/index.js';

const router = express.Router();

/**
 * GET /api/v1/manuals
 * Fetch boiler manuals from Supabase storage with search and filtering
 */
router.get('/', validateManualSearch, async (req, res) => {
  try {
    const search = req.query.search || '';
    const manufacturer = req.query.manufacturer || '';
    const limit = parseInt(req.query.limit) || CONSTANTS.DEFAULT_PAGE_LIMIT;
    const offset = parseInt(req.query.offset) || 0;

    logger.info(`[Manuals] Fetching manuals: manufacturer=${manufacturer}, search=${search}, limit=${limit}, offset=${offset}`);

    // Get list of storage buckets to find boiler-manuals
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      logger.error('[Manuals] Error listing buckets:', bucketsError);
      throw bucketsError;
    }

    // Find the boiler-manuals bucket
    const boilerBucket = buckets.find(b => b.name === 'boiler-manuals');
    if (!boilerBucket) {
      logger.warn('[Manuals] No boiler-manuals bucket found, checking for alternatives');
      
      // Check for alternative bucket names
      const altBuckets = buckets.filter(b => 
        b.name.includes('manual') || 
        b.name.includes('boiler') || 
        b.name.includes('document')
      );
      
      if (altBuckets.length === 0) {
        return res.json({ data: [], total: 0, hasMore: false });
      }
      
      logger.info('[Manuals] Found alternative buckets:', altBuckets.map(b => b.name));
    }

    const bucketName = boilerBucket ? 'boiler-manuals' : buckets[0]?.name;
    
    // Get manufacturer folders from storage (nested under dhs_manuals_all)
    const { data: rootFolders, error: rootError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: CONSTANTS.MAX_MANUFACTURER_FOLDERS });

    if (rootError) {
      logger.error('[Manuals] Error listing root folders:', rootError);
      throw rootError;
    }

    // Check if we have the dhs_manuals_all structure
    const dhsFolder = rootFolders.find(f => f.name === 'dhs_manuals_all');
    const basePath = dhsFolder ? 'dhs_manuals_all' : '';

    logger.info(`[Manuals] Using base path: ${basePath || 'root'}`);

    // Get manufacturer folders
    const { data: folders, error: foldersError } = await supabase.storage
      .from(bucketName)
      .list(basePath, { limit: CONSTANTS.MAX_MANUFACTURER_FOLDERS });

    if (foldersError) {
      logger.error('[Manuals] Error listing manufacturer folders:', foldersError);
      throw foldersError;
    }

    logger.info(`[Manuals] Found ${folders?.length || 0} manufacturer folders`);

    let allManuals = [];
    const manufacturerFolders = folders.filter(f => !f.name.includes('.'));

    // Filter by manufacturer if specified
    const targetFolders = manufacturer 
      ? manufacturerFolders.filter(f => f.name.toLowerCase().includes(manufacturer.toLowerCase()))
      : manufacturerFolders;

    logger.info(`[Manuals] Processing ${targetFolders.length} manufacturer folders`);

    // OPTIMIZATION: Fetch files in parallel instead of sequentially (fixes N+1 query)
    const folderPromises = targetFolders.map(async (folder) => {
      try {
        const folderPath = basePath ? `${basePath}/${folder.name}` : folder.name;
        
        const { data: files, error: filesError } = await supabase.storage
          .from(bucketName)
          .list(folderPath, { limit: CONSTANTS.MAX_FILES_PER_FOLDER });

        if (filesError) {
          logger.error(`[Manuals] Error listing files in ${folderPath}:`, { error: filesError.message });
          return [];
        }

        // Convert storage files to manual objects
        const folderManuals = files
          .filter(f => f.name.toLowerCase().includes('.pdf') || f.name.toLowerCase().includes('.doc'))
          .map((file, index) => {
            const { data: publicUrl } = supabase.storage
              .from(bucketName)
              .getPublicUrl(`${folderPath}/${file.name}`);

            // Clean up manufacturer name
            let cleanMfg = folder.name.replace(/[-_]/g, ' ');
            if (cleanMfg.startsWith('boilermanuals ')) {
              cleanMfg = cleanMfg.replace('boilermanuals ', '');
            }

            return {
              id: `${folder.name}_${index}`,
              name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
              manufacturer: cleanMfg,
              url: publicUrl.publicUrl,
              gc_number: `GC-${folder.name.toUpperCase()}-${String(index).padStart(3, '0')}`,
              file_size: file.metadata?.size || 0,
              created_at: file.created_at || new Date().toISOString()
            };
          });

        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          return folderManuals.filter(manual =>
            manual.name.toLowerCase().includes(searchLower) ||
            manual.manufacturer.toLowerCase().includes(searchLower) ||
            manual.gc_number.toLowerCase().includes(searchLower)
          );
        }
        
        return folderManuals;
      } catch (err) {
        logger.error(`[Manuals] Error processing folder ${folder.name}:`, { error: err.message });
        return [];
      }
    });

    // Wait for all folder fetches to complete in parallel
    const results = await Promise.all(folderPromises);
    allManuals = results.flat();

    // Sort results
    allManuals.sort((a, b) => a.name.localeCompare(b.name));

    // Apply pagination
    const paginatedManuals = allManuals.slice(offset, offset + limit);

    logger.info(`[Manuals] Returning ${paginatedManuals.length} manuals out of ${allManuals.length} total`);

    res.json({
      data: paginatedManuals,
      total: allManuals.length,
      hasMore: offset + limit < allManuals.length,
      bucketUsed: bucketName,
      foldersFound: manufacturerFolders.length
    });

  } catch (err) {
    logger.error('[Manuals] Error fetching manuals from storage:', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch manuals from storage' });
  }
});

/**
 * GET /api/v1/manuals/:id
 * Get a specific manual by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: manual, error } = await supabase
      .from('boiler_manuals')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    if (!manual) return res.status(404).json({ error: 'Manual not found' });
    
    res.json({ manual });
  } catch (err) {
    logger.error('[Manuals] Error fetching manual by ID:', { error: err.message, id: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/manuals/:id/download
 * Get download URL for a specific manual
 */
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: manual, error } = await supabase
      .from('boiler_manuals')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    if (!manual || !manual.url) {
      return res.status(404).json({ error: 'Manual or PDF not found' });
    }
    
    res.json({ download_url: manual.url, filename: manual.name + '.pdf' });
  } catch (err) {
    logger.error('[Manuals] Error fetching download URL:', { error: err.message, id: req.params.id });
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/manuals
 * Create a new manual (admin only)
 */
router.post('/', adminAuth, async (req, res) => {
  res.status(501).json({ 
    error: 'Manual creation via API not implemented', 
    message: 'Use Supabase dashboard to manage manuals' 
  });
});

/**
 * POST /api/v1/manuals/upload
 * Upload a new manual file (admin only)
 */
router.post('/upload', adminAuth, async (req, res) => {
  res.status(501).json({ 
    error: 'File upload via API not implemented', 
    message: 'Use Supabase dashboard or implement file upload handler' 
  });
});

export default router;
