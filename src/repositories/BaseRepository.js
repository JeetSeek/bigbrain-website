/**
 * Base Repository Class
 * Provides common database operations and error handling
 */

import { createClient } from '@supabase/supabase-js';

class BaseRepository {
  constructor(tableName) {
    if (!tableName) {
      throw new Error('Table name is required for repository');
    }
    
    this.tableName = tableName;
    this.supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    );
    
    // Cache for frequently accessed data
    this.cache = new Map();
    this.cacheConfig = {
      ttl: 300000, // 5 minutes
      maxSize: 100
    };
  }

  /**
   * Get cached result or fetch from database
   * @private
   */
  async _getCached(key, fetchFn) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheConfig.ttl) {
      return cached.data;
    }

    const result = await fetchFn();
    
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
   * Find records by criteria
   */
  async findBy(criteria, options = {}) {
    try {
      let query = this.supabase.from(this.tableName).select(options.select || '*');
      
      // Apply filters
      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          query = query.eq(key, value);
        }
      });

      // Apply sorting
      if (options.orderBy) {
        query = query.order(options.orderBy.field, { 
          ascending: options.orderBy.ascending !== false 
        });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Repository error in ${this.tableName}:`, error);
        throw new Error(`Database query failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error(`Repository findBy error in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Find single record by criteria
   */
  async findOneBy(criteria, options = {}) {
    const results = await this.findBy(criteria, { ...options, limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find record by ID
   */
  async findById(id, options = {}) {
    if (!id) return null;
    
    const cacheKey = `${this.tableName}_${id}`;
    return this._getCached(cacheKey, async () => {
      return this.findOneBy({ id }, options);
    });
  }

  /**
   * Create new record
   */
  async create(data) {
    try {
      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error(`Repository create error in ${this.tableName}:`, error);
        throw new Error(`Failed to create record: ${error.message}`);
      }

      // Invalidate relevant cache entries
      this.cache.clear();

      return result;
    } catch (error) {
      console.error(`Repository create error in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Update record by ID
   */
  async update(id, data) {
    try {
      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Repository update error in ${this.tableName}:`, error);
        throw new Error(`Failed to update record: ${error.message}`);
      }

      // Invalidate cache
      this.cache.delete(`${this.tableName}_${id}`);

      return result;
    } catch (error) {
      console.error(`Repository update error in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Delete record by ID
   */
  async delete(id) {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Repository delete error in ${this.tableName}:`, error);
        throw new Error(`Failed to delete record: ${error.message}`);
      }

      // Invalidate cache
      this.cache.delete(`${this.tableName}_${id}`);

      return true;
    } catch (error) {
      console.error(`Repository delete error in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Count records matching criteria
   */
  async count(criteria = {}) {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          query = query.eq(key, value);
        }
      });

      const { count, error } = await query;

      if (error) {
        console.error(`Repository count error in ${this.tableName}:`, error);
        throw new Error(`Count query failed: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      console.error(`Repository count error in ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.cacheConfig.maxSize,
      tableName: this.tableName
    };
  }
}

export default BaseRepository;
