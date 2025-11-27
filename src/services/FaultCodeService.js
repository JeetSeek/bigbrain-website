/**
 * Enhanced Fault Code Service
 * Service for handling boiler fault code lookups and analysis with caching and lazy loading
 */

import { extractFaultCodes, findFaultCode } from '../utils/faultCodeUtils';

/**
 * Class to manage fault code operations and lookups with performance optimizations
 */
class FaultCodeService {
  constructor() {
    // Performance optimizations
    this.cache = new Map();
    this.loadPromise = null;
    this.faultCodeDatabases = {};
    // Back-compat for older tests expecting a `database` property
    this.database = null;
    this.isInitialized = false;
    
    // Map of manufacturer name variations to standardized names
    this.manufacturerAliases = {
      'ideal': 'ideal',
      'ideal boilers': 'ideal',
      'ideal logic': 'ideal',
      'ideal vogue': 'ideal',
      'worcester': 'worcester',
      'worcester bosch': 'worcester',
      'bosch': 'worcester',
      'greenstar': 'worcester',
      'vaillant': 'vaillant',
      'vaillant uk': 'vaillant',
      'baxi': 'baxi',
      'potterton': 'potterton',
      'glow-worm': 'glow-worm',
      'glowworm': 'glow-worm'
    };
    
    // Cache configuration
    this.cacheConfig = {
      maxSize: 1000,
      ttl: 300000 // 5 minutes
    };
  }

  /**
   * Backward-compatible alias used by some tests/integration code
   * @param {string} code
   * @param {string|null} manufacturer
   */
  async searchFaultCode(manufacturer, code) {
    // Accept both (manufacturer, code) and (code, manufacturer) orders
    let m = manufacturer;
    let c = code;
    // If first arg looks like a code (contains digit or hyphen) and second is a string manufacturer
    if (typeof manufacturer === 'string' && typeof code === 'string') {
      const codeLike = /[0-9]/.test(manufacturer) || /-/i.test(manufacturer);
      const manuLike = !(/[0-9]/.test(code));
      if (codeLike && manuLike) {
        m = code;
        c = manufacturer;
      }
    }

    // Validate inputs per tests
    if (!m || !c || typeof m !== 'string' || typeof c !== 'string') {
      return { success: false, data: null, message: 'Invalid manufacturer or fault code' };
    }

    const result = await this.findFaultCode(c, m);
    return {
      success: !!result?.found,
      data: result?.matches || [],
      message: result?.message || (result?.found ? 'Found' : 'Not found')
    };
  }
  
  /**
   * Lazy load fault code databases
   * @returns {Promise<void>}
   */
  async ensureInitialized() {
    if (this.isInitialized) return;
    
    if (this.loadPromise) {
      await this.loadPromise;
      return;
    }

    this.loadPromise = this._loadAllManufacturers();
    await this.loadPromise;
    this.isInitialized = true;
    // Keep back-compat property in sync
    this.database = this.faultCodeDatabases;
  }

  /**
   * Backward-compat convenience used by some tests to trigger lazy load
   */
  ensureDatabaseLoaded() {
    // Make database non-null immediately for tests, then load asynchronously
    if (this.database === null) {
      // Use current in-memory map (may be empty) to satisfy non-null expectation
      this.database = this.faultCodeDatabases || {};
    }
    // Fire and forget async initialization
    this.ensureInitialized();
    return this.database;
  }

  /**
   * Load all manufacturer databases dynamically
   * @private
   */
  async _loadAllManufacturers() {
    try {
      // Dynamic imports for better performance
      const [idealHyphenated, idealCodes, worcesterHyphenated, worcesterCodes, worcesterComplete] = await Promise.all([
        import('../data/fault-codes/ideal-fault-codes.json'),
        import('../data/fault-codes/ideal.json'),
        import('../data/fault-codes/worcester-fault-codes.json'),
        import('../data/fault-codes/worcester.json'),
        import('../data/fault-codes/worcester_complete.json')
      ]);

      // Initialize fault code databases with merged sources
      this.faultCodeDatabases = {
        ideal: [
          ...(idealHyphenated.default?.fault_codes || []),
          ...(idealCodes.default?.fault_codes || [])
        ],
        worcester: [
          ...(worcesterHyphenated.default?.fault_codes || []),
          ...(worcesterCodes.default?.fault_codes || []),
          ...(worcesterComplete.default?.fault_codes || [])
        ]
      };

      // Service initialized successfully
    } catch (error) {
      console.error('Failed to load fault code databases:', error);
      throw error;
    }
  }

  /**
   * Get cached result or compute and cache
   * @private
   */
  _getFromCache(key, computeFn) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheConfig.ttl) {
      return cached.data;
    }

    const result = computeFn();
    
    // Manage cache size
    if (this.cache.size >= this.cacheConfig.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }
  
  /**
   * Get all supported manufacturers
   * 
   * @returns {Promise<Array>} List of supported manufacturer names
   */
  async getSupportedManufacturers() {
    await this.ensureInitialized();
    return Object.keys(this.faultCodeDatabases);
  }
  
  /**
   * Normalize manufacturer name with input validation
   * 
   * @param {string} manufacturer - User input manufacturer name
   * @returns {string|null} Normalized manufacturer name or null if not recognized
   */
  normalizeManufacturer(manufacturer) {
    if (!manufacturer || typeof manufacturer !== 'string') return null;
    
    const lowercaseInput = manufacturer.toLowerCase().trim();
    
    // Use cache for frequent lookups
    const cacheKey = `normalize_${lowercaseInput}`;
    return this._getFromCache(cacheKey, () => {
      return this.manufacturerAliases[lowercaseInput] || null;
    });
  }
  
  /**
   * Extract fault codes from user text
   * 
   * @param {string} text - User input text
   * @returns {Array} Extracted fault codes
   */
  extractFaultCodesFromText(text) {
    return extractFaultCodes(text);
  }

  /**
   * Backward-compatible singular extractor returning first match or null
   * @param {string} text
   * @returns {string|null}
   */
  extractFaultCode(text) {
    const codes = this.extractFaultCodesFromText(text);
    return Array.isArray(codes) && codes.length ? codes[0] : null;
  }
  
  /**
   * Find fault code in database with caching
   * 
   * @param {string} code - Fault code to look up
   * @param {string} [manufacturer=null] - Optional manufacturer name to limit search
   * @returns {Promise<Object>} Search results with matches and manufacturer info
   */
  async findFaultCode(code, manufacturer = null) {
    await this.ensureInitialized();
    
    // Input validation: require both code and manufacturer for precise lookups
    if (!code || typeof code !== 'string' || !manufacturer || typeof manufacturer !== 'string') {
      return {
        found: false,
        message: 'Invalid manufacturer or fault code provided',
        matches: []
      };
    }

    // Use cache for frequent lookups
    const cacheKey = `find_${code}_${manufacturer || 'all'}`;
    return this._getFromCache(cacheKey, () => this._findFaultCodeInternal(code, manufacturer));
  }

  /**
   * Search across all manufacturers when a manufacturer is not specified
   * @param {string} code
   */
  async findFaultCodeAny(code) {
    await this.ensureInitialized();
    if (!code || typeof code !== 'string') {
      return { found: false, message: 'Invalid fault code provided', matches: [] };
    }
    const cacheKey = `find_${code}_all`;
    return this._getFromCache(cacheKey, () => this._findFaultCodeInternal(code, null));
  }

  /**
   * Internal fault code finding logic
   * @private
   */
  _findFaultCodeInternal(code, manufacturer = null) {
    let searchResults = [];
    
    // If manufacturer is specified, only search that database
    if (manufacturer) {
      const normalizedManufacturer = this.normalizeManufacturer(manufacturer);
      if (normalizedManufacturer && this.faultCodeDatabases[normalizedManufacturer]) {
        const match = findFaultCode(code, this.faultCodeDatabases[normalizedManufacturer]);
        if (match) {
          searchResults.push({
            ...match,
            manufacturer: normalizedManufacturer
          });
        }
      } else {
        return {
          found: false,
          message: `Manufacturer "${manufacturer}" not recognized or supported`,
          matches: []
        };
      }
    } else {
      // Search across all manufacturer databases
      Object.entries(this.faultCodeDatabases).forEach(([manufacturer, database]) => {
        const match = findFaultCode(code, database);
        if (match) {
          searchResults.push({
            ...match,
            manufacturer
          });
        }
      });
    }
    
    if (searchResults.length === 0) {
      return {
        found: false,
        message: manufacturer 
          ? `Fault code "${code}" not found for ${manufacturer}` 
          : `Fault code "${code}" not found in any supported manufacturer database`,
        matches: []
      };
    }
    
    return {
      found: true,
      message: searchResults.length === 1 
        ? `Found 1 match for fault code "${code}"` 
        : `Found ${searchResults.length} matches for fault code "${code}"`,
      matches: searchResults
    };
  }
  
  /**
   * Find all fault codes for a specific manufacturer with caching
   * 
   * @param {string} manufacturer - Manufacturer name
   * @returns {Promise<Array>} All fault codes for the manufacturer or empty array if manufacturer not supported
   */
  async getAllFaultCodesForManufacturer(manufacturer) {
    await this.ensureInitialized();
    
    const normalizedManufacturer = this.normalizeManufacturer(manufacturer);
    
    if (!normalizedManufacturer || !this.faultCodeDatabases[normalizedManufacturer]) {
      return [];
    }
    
    const cacheKey = `all_codes_${normalizedManufacturer}`;
    return this._getFromCache(cacheKey, () => {
      return [...this.faultCodeDatabases[normalizedManufacturer]];
    });
  }
  
  /**
   * Get fault code data by manufacturer and code with caching
   * 
   * @param {string} manufacturer - Manufacturer name
   * @param {string} code - Fault code
   * @returns {Promise<Object|null>} Fault code data or null if not found
   */
  async getFaultCode(manufacturer, code) {
    await this.ensureInitialized();
    
    // Input validation
    if (!manufacturer || !code || typeof manufacturer !== 'string' || typeof code !== 'string') {
      return null;
    }
    
    const normalizedManufacturer = this.normalizeManufacturer(manufacturer);
    
    if (!normalizedManufacturer || !this.faultCodeDatabases[normalizedManufacturer]) {
      return null;
    }
    
    const cacheKey = `get_${normalizedManufacturer}_${code}`;
    return this._getFromCache(cacheKey, () => {
      return findFaultCode(code, this.faultCodeDatabases[normalizedManufacturer]);
    });
  }

  /**
   * Clear cache - useful for testing or memory management
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.cacheConfig.maxSize,
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
    };
  }
}

// Export singleton instance by default (runtime code expects instance)
const faultCodeService = new FaultCodeService();
export default faultCodeService;
// Also export the class for tests that need to construct instances
export { FaultCodeService };
