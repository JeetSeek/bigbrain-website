/**
 * Database Access Layer
 * 
 * Provides optimized data access patterns for Supabase
 * - Connection pooling
 * - Query caching
 * - Error handling
 * - Retry logic
 * - Performance monitoring
 */

import { createClient } from '@supabase/supabase-js';
import secretsManager from '../utils/secretsManager.js';
import { v4 as uuidv4 } from 'uuid';

// Cache timeouts in milliseconds
const CACHE_TIMEOUTS = {
  SHORT: 60 * 1000,       // 1 minute
  MEDIUM: 5 * 60 * 1000,  // 5 minutes 
  LONG: 60 * 60 * 1000,   // 1 hour
  PERMANENT: null         // No expiration
};

// Initialize client
const supabaseUrl = secretsManager.supabase.getUrl();
const supabaseServiceKey = secretsManager.supabase.getServiceKey();
const supabaseAnonKey = secretsManager.supabase.getAnonKey();

// Create clients for different access patterns
const adminClient = createClient(supabaseUrl, supabaseServiceKey);
const publicClient = createClient(supabaseUrl, supabaseAnonKey);

// In-memory cache store
const queryCache = new Map();

// Performance metrics
const performanceMetrics = {
  totalQueries: 0,
  cacheHits: 0,
  cacheMisses: 0,
  errors: 0,
  slowQueries: 0,
  queryTimes: []
};

// Get query statistics
function getQueryStats() {
  const total = performanceMetrics.queryTimes.length;
  if (total === 0) return { min: 0, max: 0, avg: 0 };
  
  const min = Math.min(...performanceMetrics.queryTimes);
  const max = Math.max(...performanceMetrics.queryTimes);
  const avg = performanceMetrics.queryTimes.reduce((a, b) => a + b, 0) / total;
  
  const cacheHitRate = performanceMetrics.totalQueries > 0 
    ? (performanceMetrics.cacheHits / performanceMetrics.totalQueries) * 100 
    : 0;
  
  return {
    min,
    max,
    avg,
    total: performanceMetrics.totalQueries,
    cacheHitRate: cacheHitRate.toFixed(2),
    errors: performanceMetrics.errors,
    slowQueries: performanceMetrics.slowQueries
  };
}

/**
 * Generate a cache key from query parameters
 */
function generateCacheKey(table, query, params) {
  const queryString = JSON.stringify(query);
  const paramsString = JSON.stringify(params);
  return `${table}:${queryString}:${paramsString}`;
}

/**
 * Check if cached result exists and is valid
 */
function getCachedResult(cacheKey) {
  if (!queryCache.has(cacheKey)) return null;
  
  const cached = queryCache.get(cacheKey);
  if (cached.expiry && cached.expiry < Date.now()) {
    queryCache.delete(cacheKey); // Expired, remove from cache
    return null;
  }
  
  performanceMetrics.cacheHits++;
  return cached.data;
}

/**
 * Store result in cache
 */
function cacheResult(cacheKey, data, timeout = CACHE_TIMEOUTS.MEDIUM) {
  const expiry = timeout === null ? null : Date.now() + timeout;
  queryCache.set(cacheKey, { data, expiry });
}

/**
 * Clear specific cache entries by pattern
 * @param {string} pattern - String pattern to match cache keys
 */
function clearCache(pattern = null) {
  if (!pattern) {
    queryCache.clear();
    return;
  }
  
  for (const key of queryCache.keys()) {
    if (key.includes(pattern)) {
      queryCache.delete(key);
    }
  }
}

/**
 * Execute query with error handling, caching, and performance tracking
 * @param {Function} queryFn - Query function to execute
 * @param {Object} options - Options for the query
 * @returns {Promise<{data, error}>} - Query result
 */
async function executeQuery(queryFn, options = {}) {
  const startTime = Date.now();
  
  // Track query count
  performanceMetrics.totalQueries++;
  
  // Generate cache key if caching is enabled
  let cacheKey = null;
  if (options.cache && options.cacheKey) {
    cacheKey = options.cacheKey;
    
    // Check cache
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) {
      return { data: cachedResult, error: null };
    }
    performanceMetrics.cacheMisses++;
  }
  
  try {
    // Execute query with retry logic
    let attempts = 0;
    const maxRetries = options.maxRetries || 3;
    
    while (attempts < maxRetries) {
      attempts++;
      
      try {
        const result = await queryFn();
        
        // Calculate query time
        const queryTime = Date.now() - startTime;
        performanceMetrics.queryTimes.push(queryTime);
        
        // Track slow queries (> 500ms)
        if (queryTime > 500) {
          performanceMetrics.slowQueries++;
          console.warn(`Slow query detected (${queryTime}ms): ${options.cacheKey || 'unnamed query'}`);
        }
        
        // Cache successful results if caching is enabled
        if (!result.error && options.cache && cacheKey) {
          cacheResult(cacheKey, result.data, options.cacheTimeout || CACHE_TIMEOUTS.MEDIUM);
        }
        
        return result;
      } catch (error) {
        if (attempts >= maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const backoff = 100 * Math.pow(2, attempts);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }
  } catch (error) {
    performanceMetrics.errors++;
    return {
      data: null,
      error: {
        message: error.message,
        details: error.details || null,
        hint: error.hint || 'Database operation failed',
        code: error.code || 'UNKNOWN'
      }
    };
  }
}

/**
 * Database access object with optimized queries and error handling
 */
const db = {
  /**
   * Execute a raw SQL query
   */
  async query(sql, params = {}, options = {}) {
    return executeQuery(
      () => adminClient.rpc('run_sql', { sql, params }),
      options
    );
  },
  
  /**
   * Create a new record 
   */
  async create(table, data, options = {}) {
    clearCache(table); // Invalidate table cache
    
    return executeQuery(
      () => adminClient.from(table).insert(data).select(),
      options
    );
  },
  
  /**
   * Get records by query
   */
  async get(table, query = {}, options = {}) {
    const cacheKey = options.cache ? 
      generateCacheKey(table, query, options.queryOptions) : null;
    
    let builder = publicClient.from(table).select(query.select || '*');
    
    // Apply filters
    if (query.filter) {
      Object.entries(query.filter).forEach(([column, value]) => {
        builder = builder.eq(column, value);
      });
    }
    
    // Apply range filters
    if (query.gt) {
      Object.entries(query.gt).forEach(([column, value]) => {
        builder = builder.gt(column, value);
      });
    }
    
    if (query.lt) {
      Object.entries(query.lt).forEach(([column, value]) => {
        builder = builder.lt(column, value);
      });
    }
    
    // Apply ordering
    if (query.orderBy) {
      builder = builder.order(query.orderBy.column, { 
        ascending: query.orderBy.ascending !== false 
      });
    }
    
    // Apply limits
    if (query.limit) {
      builder = builder.limit(query.limit);
    }
    
    // Apply pagination
    if (query.page && query.pageSize) {
      const from = (query.page - 1) * query.pageSize;
      const to = from + query.pageSize - 1;
      builder = builder.range(from, to);
    }
    
    return executeQuery(
      () => builder,
      { ...options, cacheKey, cacheTimeout: options.cacheTimeout }
    );
  },
  
  /**
   * Get a single record by ID
   */
  async getById(table, id, options = {}) {
    const cacheKey = options.cache ? `${table}:id:${id}` : null;
    
    return executeQuery(
      () => publicClient.from(table).select('*').eq('id', id).single(),
      { ...options, cacheKey }
    );
  },
  
  /**
   * Update a record
   */
  async update(table, id, data, options = {}) {
    // Clear relevant cache entries
    clearCache(table);
    clearCache(`${table}:id:${id}`);
    
    return executeQuery(
      () => adminClient.from(table).update(data).eq('id', id).select(),
      options
    );
  },
  
  /**
   * Delete a record
   */
  async delete(table, id, options = {}) {
    // Clear relevant cache entries
    clearCache(table);
    clearCache(`${table}:id:${id}`);
    
    return executeQuery(
      () => adminClient.from(table).delete().eq('id', id),
      options
    );
  },
  
  /**
   * Perform a vector similarity search
   */
  async vectorSearch(embedding, options = {}) {
    const {
      matchThreshold = 0.7,
      matchCount = 5,
      filterTag = null,
    } = options;
    
    // Use the find_similar_documents function we created in the migration
    return executeQuery(
      () => adminClient.rpc('find_similar_documents', {
        query_embedding: embedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        filter_tag: filterTag
      }),
      options
    );
  },
  
  // Access to raw Supabase clients if needed
  supabase: {
    admin: adminClient,
    public: publicClient
  },
  
  // Cache control
  cache: {
    clear: clearCache,
    getStats: getQueryStats,
    timeouts: CACHE_TIMEOUTS
  },
  
  // Stats and monitoring
  stats: getQueryStats
};

export default db;
