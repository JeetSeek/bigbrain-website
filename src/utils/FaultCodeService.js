/**
 * Fault Code Service
 * 
 * A robust service for fault code lookup across multiple data sources
 * with manufacturer-specific handling and fallback strategies.
 */

import { supabase } from '../supabaseClient';

// Import local fault code data
import idealFaultCodes from '../data/fault-codes/ideal.json';
import worcesterFaultCodes from '../data/fault-codes/worcester.json';
import worcesterCompleteFaultCodes from '../data/fault-codes/worcester_complete.json';
import vaillantFaultCodes from '../data/fault-codes/vaillant.json';
import baxiFaultCodes from '../data/fault-codes/baxi.json';
import glowWormFaultCodes from '../data/fault-codes/glow_worm.json';
import viessmannFaultCodes from '../data/fault-codes/viessmann.json';

export class FaultCodeService {
  /**
   * Cached manufacturer fault code catalogs
   * This allows efficient access to local JSON data
   */
  static faultCodeCatalog = {
    ideal: idealFaultCodes,
    worcester: worcesterFaultCodes,
    worcester_bosch: worcesterCompleteFaultCodes,
    vaillant: vaillantFaultCodes,
    baxi: baxiFaultCodes,
    glow_worm: glowWormFaultCodes,
    viessmann: viessmannFaultCodes
  };

  /**
   * Main lookup method that tries multiple sources
   * @param {string} code - The fault code to lookup
   * @param {string} manufacturer - Boiler manufacturer
   * @param {string} model - Boiler model
   * @returns {Promise<object|null>} - Fault data or null if not found
   */
  static async lookup(code, manufacturer, model) {
    if (!code) return null;
    
    // Normalize inputs for consistent matching
    const normalizedCode = this.normalizeCode(code);
    const normalizedManufacturer = this.normalizeManufacturer(manufacturer, model);
    
    // Log lookup attempt
    
    try {
      // Strategy 1: Try database lookup (primary source)
      const dbResult = await this.lookupFromDatabase(normalizedCode, normalizedManufacturer);
      if (dbResult) {
        return dbResult;
      }
      
      // Strategy 2: Try local JSON data (fallback source)
      const localResult = await this.lookupFromLocalData(normalizedCode, normalizedManufacturer, model);
      if (localResult) {
        return localResult;
      }
      
      // Not found in any source
      console.warn(`[FaultCodeService] Fault code ${normalizedCode} not found for ${normalizedManufacturer || 'unknown'}`);
      return null;
    } catch (error) {
      console.error('[FaultCodeService] Error during fault code lookup:', error);
      return null;
    }
  }
  
  /**
   * Normalize fault code format for consistent matching
   * @param {string} code - Raw fault code
   * @returns {string} - Normalized fault code
   */
  static normalizeCode(code) {
    if (!code) return '';
    // Strip spaces, convert to uppercase
    return code.toString().trim().toUpperCase();
  }
  
  /**
   * Normalize manufacturer name for consistent matching
   * @param {string} manufacturer - Raw manufacturer name
   * @param {string} model - Model name (used for inference if manufacturer is missing)
   * @returns {string} - Normalized manufacturer name
   */
  static normalizeManufacturer(manufacturer, model) {
    // Extract manufacturer from inputs, with manufacturer taking precedence over model
    let mfr = manufacturer || '';
    
    // Try to determine manufacturer from model if not explicitly provided
    if (!mfr && model) {
      const modelLower = model.toLowerCase();
      if (modelLower.includes('ideal') || modelLower.includes('logic+')) {
        mfr = 'ideal';
      } else if (modelLower.includes('worcester') || modelLower.includes('bosch')) {
        mfr = 'worcester';
      }
      // Add more manufacturer detection as needed
    }
    
    return mfr.toLowerCase().trim();
  }
  
  /**
   * Look up fault code in the database
   * @param {string} code - Normalized fault code
   * @param {string} manufacturer - Normalized manufacturer
   * @returns {Promise<object|null>} - Fault data or null if not found
   */
  static async lookupFromDatabase(code, manufacturer) {
    try {
      // Query with manufacturer if available, otherwise just by code
      const query = supabase.from('fault_codes').select('*');
      
      if (manufacturer) {
        query.ilike('manufacturer', `%${manufacturer}%`);
      }
      
      const { data, error } = await query
        .eq('code', code)
        .limit(1);
      
      if (error || !data || data.length === 0) {
        return null;
      }
      
      // Convert to standardized format
      return this.standardizeFormat(data[0]);
    } catch (err) {
      console.error('[FaultCodeService] Database lookup error:', err);
      return null;
    }
  }
  
  /**
   * Look up fault code in local JSON data
   * @param {string} code - Normalized fault code
   * @param {string} manufacturer - Normalized manufacturer
   * @param {string} model - Model name
   * @returns {Promise<object|null>} - Fault data or null if not found
   */
  static async lookupFromLocalData(code, manufacturer, model) {
    try {
      // Determine which catalog to use
      let catalog = null;
      
      if (manufacturer && this.faultCodeCatalog[manufacturer]) {
        catalog = this.faultCodeCatalog[manufacturer];
      } else {
        // Fallback: try each catalog if manufacturer not specified or not found
        for (const mfr in this.faultCodeCatalog) {
          // Try to match model name against manufacturer's name
          if (model && model.toLowerCase().includes(mfr)) {
            catalog = this.faultCodeCatalog[mfr];
            break;
          }
        }
        
        // If still not found, try the first catalog that has the code
        if (!catalog) {
          for (const mfr in this.faultCodeCatalog) {
            const found = this.faultCodeCatalog[mfr].fault_codes.find(
              fc => this.normalizeCode(fc.code) === code
            );
            
            if (found) {
              catalog = this.faultCodeCatalog[mfr];
              break;
            }
          }
        }
      }
      
      // If we have a catalog to check, look for the code
      if (catalog) {
        const found = catalog.fault_codes.find(
          fc => this.normalizeCode(fc.code) === code
        );
        
        if (found) {
          // Add manufacturer from catalog metadata
          return this.standardizeFormat({
            ...found,
            manufacturer: catalog.metadata.manufacturer
          });
        }
      }
      
      return null;
    } catch (err) {
      console.error('[FaultCodeService] Local data lookup error:', err);
      return null;
    }
  }
  
  /**
   * Standardize fault code data format across sources
   * @param {object} data - Raw fault code data
   * @returns {object} - Standardized fault code data
   */
  static standardizeFormat(data) {
    // Ensure we have a consistent output format regardless of source
    return {
      code: data.code,
      description: data.description || '',
      troubleshooting_steps: data.troubleshooting_steps || '',
      safety_warning: data.safety_warning || null,
      manufacturer: data.manufacturer || 'Unknown',
      components: data.components || []
    };
  }
}

// Export a singleton instance for direct use
export default FaultCodeService;
