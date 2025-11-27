/**
 * In-Memory Cache Utility
 * Simple caching layer for frequently accessed data
 */

import logger from './logger.js';
import * as CONSTANTS from '../constants/index.js';

class Cache {
  constructor() {
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Get value from cache
   */
  get(key) {
    const item = this.store.get(key);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = CONSTANTS.CACHE_TIMEOUT_MS) {
    const expiresAt = ttl ? Date.now() + ttl : null;
    
    this.store.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });

    this.stats.sets++;
    return true;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const item = this.store.get(key);
    if (!item) return false;
    
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete specific key
   */
  delete(key) {
    const result = this.store.delete(key);
    if (result) this.stats.deletes++;
    return result;
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.store.size;
    this.store.clear();
    logger.info(`[Cache] Cleared ${size} items`);
  }

  /**
   * Clear expired items
   */
  clearExpired() {
    const now = Date.now();
    let cleared = 0;

    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.store.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      logger.info(`[Cache] Cleared ${cleared} expired items`);
    }

    return cleared;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      size: this.store.size,
      hitRate: `${hitRate}%`,
      ...this.stats
    };
  }

  /**
   * Get or set with callback
   */
  async getOrSet(key, callback, ttl = CONSTANTS.CACHE_TIMEOUT_MS) {
    // Try to get from cache
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Not in cache, execute callback
    try {
      const value = await callback();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      logger.error('[Cache] getOrSet error:', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidatePattern(pattern) {
    let invalidated = 0;
    const regex = new RegExp(pattern);

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        invalidated++;
      }
    }

    if (invalidated > 0) {
      logger.info(`[Cache] Invalidated ${invalidated} items matching pattern: ${pattern}`);
    }

    return invalidated;
  }
}

// Create singleton instance
const cache = new Cache();

// Auto-cleanup expired items every 5 minutes
setInterval(() => {
  cache.clearExpired();
}, 5 * 60 * 1000);

export default cache;

/**
 * Cache decorator for functions
 */
export function cached(ttl = CONSTANTS.CACHE_TIMEOUT_MS) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;
      return cache.getOrSet(cacheKey, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
}
