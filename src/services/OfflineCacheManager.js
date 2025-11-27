import { pako } from 'pako';

/**
 * Enhanced Offline Cache Manager for BoilerBrain
 * Supports compressed storage of 200+ fault codes and 10 boiler manuals
 * Provides cache status indicators and automatic cleanup
 */
class OfflineCacheManager {
  constructor() {
    this.cacheKey = 'boilerbrain-offline-cache';
    this.maxFaultCodes = 200;
    this.maxManuals = 10;
    this.compressionEnabled = true;
    this.cache = this.loadCache();
  }

  /**
   * Load cache from localStorage with decompression
   */
  loadCache() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) {
        return this.initializeEmptyCache();
      }

      const parsed = JSON.parse(cached);
      if (parsed.compressed && this.compressionEnabled) {
        // Decompress data
        const compressed = new Uint8Array(parsed.data.split(',').map(Number));
        const decompressed = pako.inflate(compressed, { to: 'string' });
        return { ...parsed, ...JSON.parse(decompressed), compressed: false };
      }

      return parsed;
    } catch (error) {
      console.warn('Failed to load offline cache:', error);
      return this.initializeEmptyCache();
    }
  }

  /**
   * Initialize empty cache structure
   */
  initializeEmptyCache() {
    return {
      faultCodes: {},
      manuals: {},
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalFaultCodes: 0,
        totalManuals: 0,
        cacheSize: 0,
        popularManufacturers: []
      },
      version: '2.0'
    };
  }

  /**
   * Save cache to localStorage with optional compression
   */
  saveCache() {
    try {
      const cacheToSave = {
        ...this.cache,
        metadata: {
          ...this.cache.metadata,
          lastUpdated: new Date().toISOString(),
          cacheSize: this.calculateCacheSize()
        }
      };

      let dataToStore = cacheToSave;

      if (this.compressionEnabled && this.shouldCompress()) {
        // Compress the data portion
        const dataToCompress = {
          faultCodes: cacheToSave.faultCodes,
          manuals: cacheToSave.manuals
        };

        const jsonString = JSON.stringify(dataToCompress);
        const compressed = pako.deflate(jsonString, { to: 'string' });
        const compressedArray = Array.from(new Uint8Array(compressed));

        dataToStore = {
          metadata: cacheToSave.metadata,
          compressed: true,
          data: compressedArray.join(','),
          version: cacheToSave.version
        };
      }

      localStorage.setItem(this.cacheKey, JSON.stringify(dataToStore));
      this.cache = cacheToSave;
    } catch (error) {
      console.error('Failed to save offline cache:', error);
      // If storage is full, try clearing old data
      this.cleanupOldData();
    }
  }

  /**
   * Determine if data should be compressed
   */
  shouldCompress() {
    const cacheSize = this.calculateCacheSize();
    return cacheSize > 50000; // Compress if over ~50KB
  }

  /**
   * Calculate approximate cache size
   */
  calculateCacheSize() {
    const faultCodeSize = Object.keys(this.cache.faultCodes).length * 1024; // ~1KB per fault code
    const manualSize = Object.keys(this.cache.manuals).length * 5120; // ~5KB per manual
    return faultCodeSize + manualSize;
  }

  /**
   * Add fault code to cache with LRU eviction
   */
  addFaultCode(code, data, manufacturer = 'unknown') {
    // Update popular manufacturers tracking
    this.updatePopularManufacturers(manufacturer);

    // Check if we need to evict old entries
    if (Object.keys(this.cache.faultCodes).length >= this.maxFaultCodes) {
      this.evictOldFaultCodes();
    }

    this.cache.faultCodes[code] = {
      ...data,
      cachedAt: new Date().toISOString(),
      manufacturer,
      accessCount: 0,
      lastAccessed: new Date().toISOString()
    };

    this.cache.metadata.totalFaultCodes = Object.keys(this.cache.faultCodes).length;
    this.saveCache();
  }

  /**
   * Get fault code from cache
   */
  getFaultCode(code) {
    const faultCode = this.cache.faultCodes[code];
    if (faultCode) {
      // Update access statistics
      faultCode.accessCount = (faultCode.accessCount || 0) + 1;
      faultCode.lastAccessed = new Date().toISOString();
      this.saveCache();
      return faultCode;
    }
    return null;
  }

  /**
   * Add manual to cache with size limits
   */
  addManual(manualId, data, manufacturer = 'unknown') {
    // Update popular manufacturers tracking
    this.updatePopularManufacturers(manufacturer);

    // Check if we need to evict old manuals
    if (Object.keys(this.cache.manuals).length >= this.maxManuals) {
      this.evictOldManuals();
    }

    this.cache.manuals[manualId] = {
      ...data,
      cachedAt: new Date().toISOString(),
      manufacturer,
      accessCount: 0,
      lastAccessed: new Date().toISOString(),
      size: data.size || 0
    };

    this.cache.metadata.totalManuals = Object.keys(this.cache.manuals).length;
    this.saveCache();
  }

  /**
   * Get manual from cache
   */
  getManual(manualId) {
    const manual = this.cache.manuals[manualId];
    if (manual) {
      // Update access statistics
      manual.accessCount = (manual.accessCount || 0) + 1;
      manual.lastAccessed = new Date().toISOString();
      this.saveCache();
      return manual;
    }
    return null;
  }

  /**
   * Update popular manufacturers tracking
   */
  updatePopularManufacturers(manufacturer) {
    const manufacturers = this.cache.metadata.popularManufacturers || [];
    const index = manufacturers.indexOf(manufacturer);

    if (index > -1) {
      // Move to front if already exists
      manufacturers.splice(index, 1);
    }

    manufacturers.unshift(manufacturer);

    // Keep only top 10 popular manufacturers
    this.cache.metadata.popularManufacturers = manufacturers.slice(0, 10);
  }

  /**
   * Evict old fault codes using LRU strategy
   */
  evictOldFaultCodes() {
    const entries = Object.entries(this.cache.faultCodes).map(([code, data]) => ({
      code,
      ...data
    }));

    // Sort by last accessed and access count
    entries.sort((a, b) => {
      const aScore = new Date(a.lastAccessed).getTime() + (a.accessCount * 1000);
      const bScore = new Date(b.lastAccessed).getTime() + (b.accessCount * 1000);
      return aScore - bScore;
    });

    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2);
    const codesToRemove = entries.slice(0, toRemove).map(entry => entry.code);

    codesToRemove.forEach(code => {
      delete this.cache.faultCodes[code];
    });

  }

  /**
   * Evict old manuals using LRU strategy
   */
  evictOldManuals() {
    const entries = Object.entries(this.cache.manuals).map(([id, data]) => ({
      id,
      ...data
    }));

    // Sort by last accessed and access count
    entries.sort((a, b) => {
      const aScore = new Date(a.lastAccessed).getTime() + (a.accessCount * 1000);
      const bScore = new Date(b.lastAccessed).getTime() + (b.accessCount * 1000);
      return aScore - bScore;
    });

    // Remove oldest 30% of entries (more aggressive for manuals due to size)
    const toRemove = Math.ceil(entries.length * 0.3);
    const idsToRemove = entries.slice(0, toRemove).map(entry => entry.id);

    idsToRemove.forEach(id => {
      delete this.cache.manuals[id];
    });

  }

  /**
   * Cleanup old data when storage is full
   */
  cleanupOldData() {
    try {
      // Aggressive cleanup - remove oldest 50% of entries
      this.evictOldFaultCodes();
      this.evictOldManuals();

      // Also clean up other old cache entries
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

      Object.keys(this.cache.faultCodes).forEach(code => {
        const entry = this.cache.faultCodes[code];
        if (new Date(entry.lastAccessed) < cutoffDate && entry.accessCount < 3) {
          delete this.cache.faultCodes[code];
        }
      });

      this.saveCache();
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
    }
  }

  /**
   * Get cache status information
   */
  getCacheStatus() {
    const faultCodes = Object.keys(this.cache.faultCodes).length;
    const manuals = Object.keys(this.cache.manuals).length;
    const cacheSize = this.calculateCacheSize();
    const lastUpdated = this.cache.metadata.lastUpdated;

    return {
      faultCodes: {
        current: faultCodes,
        max: this.maxFaultCodes,
        percentage: Math.round((faultCodes / this.maxFaultCodes) * 100)
      },
      manuals: {
        current: manuals,
        max: this.maxManuals,
        percentage: Math.round((manuals / this.maxManuals) * 100)
      },
      cacheSize: {
        current: cacheSize,
        formatted: this.formatBytes(cacheSize)
      },
      lastUpdated: new Date(lastUpdated).toLocaleDateString(),
      popularManufacturers: this.cache.metadata.popularManufacturers || []
    };
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clear all cache data
   */
  clearCache() {
    this.cache = this.initializeEmptyCache();
    localStorage.removeItem(this.cacheKey);
  }

  /**
   * Check if data is available offline
   */
  isAvailableOffline(type, identifier) {
    if (type === 'faultCode') {
      return !!this.cache.faultCodes[identifier];
    } else if (type === 'manual') {
      return !!this.cache.manuals[identifier];
    }
    return false;
  }

  /**
   * Get offline statistics
   */
  getOfflineStats() {
    const faultCodes = Object.values(this.cache.faultCodes);
    const manuals = Object.values(this.cache.manuals);

    const totalAccesses = [
      ...faultCodes.map(fc => fc.accessCount || 0),
      ...manuals.map(m => m.accessCount || 0)
    ].reduce((sum, count) => sum + count, 0);

    const averageAccessCount = faultCodes.length + manuals.length > 0
      ? totalAccesses / (faultCodes.length + manuals.length)
      : 0;

    return {
      totalItems: faultCodes.length + manuals.length,
      totalAccesses,
      averageAccessCount: Math.round(averageAccessCount * 10) / 10,
      mostAccessedFaultCode: this.getMostAccessed(faultCodes),
      mostAccessedManual: this.getMostAccessed(manuals),
      manufacturerBreakdown: this.getManufacturerBreakdown()
    };
  }

  /**
   * Get most accessed item
   */
  getMostAccessed(items) {
    if (items.length === 0) return null;

    return items.reduce((most, current) =>
      (current.accessCount || 0) > (most.accessCount || 0) ? current : most
    );
  }

  /**
   * Get manufacturer breakdown
   */
  getManufacturerBreakdown() {
    const breakdown = {};

    [...Object.values(this.cache.faultCodes), ...Object.values(this.cache.manuals)]
      .forEach(item => {
        const manufacturer = item.manufacturer || 'unknown';
        breakdown[manufacturer] = (breakdown[manufacturer] || 0) + 1;
      });

    return Object.entries(breakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5); // Top 5 manufacturers
  }
}

// Export singleton instance
export const offlineCache = new OfflineCacheManager();
export default offlineCache;
