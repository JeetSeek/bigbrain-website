/**
 * Persistent Session Store
 * 
 * A production-grade session store implementation with:
 * - Database persistence (via Supabase)
 * - In-memory caching for performance
 * - Error recovery mechanisms
 * - Support for horizontal scaling
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// LRU Cache implementation for memory efficiency
class LRUCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    
    // Access refreshes position (LRU)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest item (first item in map)
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, value);
  }

  delete(key) {
    this.cache.delete(key);
  }

  has(key) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }
}

// Persistent Session Store class
class PersistentSessionStore {
  constructor(options = {}) {
    // Configuration options with defaults
    this.options = {
      ttlMs: 3600000, // Default 1 hour TTL
      cleanupInterval: 1800000, // Default cleanup every 30 min
      maxCacheSize: 1000, // Max number of sessions in memory
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
      ...options
    };

    // Initialize cache
    this.cache = new LRUCache(this.options.maxCacheSize);
    
    // Initialize Supabase client
    this.supabase = createClient(
      this.options.supabaseUrl,
      this.options.supabaseKey
    );

    // Setup session cleanup
    this.cleanupInterval = setInterval(
      () => this.cleanup(), 
      this.options.cleanupInterval
    );

  }

  // Get TTL timestamp for session expiration
  _getTTL() {
    return new Date(Date.now() + this.options.ttlMs);
  }

  // Create empty session object
  _createEmptySession(sessionId) {
    return {
      id: sessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      history: [],
      boilerInfo: {
        make: null,
        model: null,
        faultCodes: [],
        heatingSystemType: null,
        systemComponents: [],
        detectedIssues: []
      },
      summaries: [],
      metadata: {},
      _persisted: false,  // Flag to track if persisted to database
    };
  }

  // Serialize session for database storage
  _serializeForDb(session) {
    const { id, _persisted, ...data } = session;
    
    return {
      id,
      session_id: id,  // Added to match our table schema
      history: JSON.stringify(session.history || []),
      metadata: JSON.stringify({
        lastActivity: session.updatedAt,
        messageCount: session.history?.length || 0,
        boilerInfo: session.boilerInfo || {},
        summaries: session.summaries || []
      }),
      last_active: new Date().toISOString()  // Added to match our table schema
    };
  }

  // Deserialize session from database format
  _deserializeFromDb(dbRecord) {
    if (!dbRecord) return null;
    
    try {
      // Extract history from our new schema
      const history = typeof dbRecord.history === 'string' 
        ? JSON.parse(dbRecord.history) 
        : dbRecord.history || [];
      
      // Extract metadata from our new schema
      const metadata = typeof dbRecord.metadata === 'string' 
        ? JSON.parse(dbRecord.metadata) 
        : dbRecord.metadata || {};
      
      // Build a complete session object
      return {
        id: dbRecord.session_id || dbRecord.id,  // Use session_id as primary identifier
        createdAt: new Date(dbRecord.created_at).getTime() || Date.now(),
        updatedAt: new Date(dbRecord.last_active).getTime() || Date.now(),
        history: history,
        boilerInfo: metadata.boilerInfo || {
          make: null,
          model: null,
          faultCodes: [],
          heatingSystemType: null,
          systemComponents: [],
          detectedIssues: []
        },
        summaries: metadata.summaries || [],
        _persisted: true
      };
    } catch (err) {
      console.error(`Error deserializing session (${dbRecord.id || dbRecord.session_id}):`, err);
      return null;
    }
  }

  /**
   * Get a session by ID, creating it if it doesn't exist
   * @param {string} sessionId - Unique session identifier
   * @param {object} options - Additional options
   * @returns {Promise<object>} The session object
   */
  async getSession(sessionId, options = {}) {
    try {
      // Check cache first for performance
      const cachedSession = this.cache.get(sessionId);
      if (cachedSession) {
        // Update last accessed time
        cachedSession.updatedAt = Date.now();
        return cachedSession;
      }

      // Not in cache, try to load from database
      const { data: dbSession, error } = await this.supabase
        .from('chat_sessions')
        .select('*')
        .eq('session_id', sessionId)  // Using session_id as the unique identifier
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error(`Database error retrieving session (${sessionId}):`, error);
      }

      let session;
      if (dbSession) {
        // Session found in database
        session = this._deserializeFromDb(dbSession);
        
        if (!session) {
          // Deserialization failed, create new session
          session = this._createEmptySession(sessionId);
        }
      } else {
        // Create new session
        session = this._createEmptySession(sessionId);
      }

      // Update cache with fetched/created session
      this.cache.set(sessionId, session);
      return session;
    } catch (err) {
      console.error(`Error in getSession (${sessionId}):`, err);
      
      // Return fallback session in case of error
      const fallbackSession = this._createEmptySession(sessionId);
      this.cache.set(sessionId, fallbackSession);
      return fallbackSession;
    }
  }

  /**
   * Update a session with new messages and boiler info
   * @param {string} sessionId - Session identifier
   * @param {Array} history - Chat history array
   * @param {object} boilerInfo - Boiler information object
   * @returns {Promise<object>} Updated session
   */
  async updateSession(sessionId, history, boilerInfo = null) {
    try {
      
      // Retrieve session
      const session = await this.getSession(sessionId);
      
      // Update history and boiler info if provided
      if (history && Array.isArray(history)) {
        session.history = history;
      }
      
      if (boilerInfo) {
        session.boilerInfo = {
          ...session.boilerInfo,
          ...boilerInfo
        };
      }
      
      // Update timestamp
      session.updatedAt = Date.now();
      
      // Update cache
      this.cache.set(sessionId, session);
      
      // Always persist to database immediately
      const persistResult = await this._persistSessionAsync(sessionId, session);
      
      return session;
    } catch (err) {
      console.error(`[UpdateSession] Error updating session (${sessionId}):`, err);
      // Return fallback session in case of error
      return this.getSession(sessionId);
    }
  }

  /**
   * Update a session with new messages and boiler info
   * @param {string} sessionId - Session identifier
   * @param {Array} history - Chat history array
   * @param {string} summary - Conversation summary
   * @returns {Promise<object>} Updated session
   */
  async addSummary(sessionId, summary) {
    try {
      const session = await this.getSession(sessionId);
      
      session.summaries.push({
        timestamp: Date.now(),
        summary
      });
      
      session.updatedAt = Date.now();
      
      // Update cache
      this.cache.set(sessionId, session);
      
      // Schedule async persistence
      this._persistSessionAsync(sessionId, session);
      
      return session;
    } catch (err) {
      console.error(`Error in addSummary (${sessionId}):`, err);
      return this.getSession(sessionId); // Fallback
    }
  }

  /**
   * Persists a session to the database asynchronously
   * @param {string} sessionId - Session identifier
   * @param {object} session - Session data to persist
   * @private
   */
  async _persistSessionAsync(sessionId, session) {
    try {
      const data = this._serializeForDb(session);
      
      
      // Check if session exists first
      const { data: existingSession, error: checkError } = await this.supabase
        .from('chat_sessions')
        .select('id')
        .eq('session_id', sessionId)
        .maybeSingle();
      
      let result;
      
      if (existingSession) {
        // Update existing session
        result = await this.supabase
          .from('chat_sessions')
          .update({
            history: data.history,
            metadata: data.metadata,
            last_active: data.last_active
          })
          .eq('session_id', sessionId);
      } else {
        // Insert new session
        result = await this.supabase
          .from('chat_sessions')
          .insert(data);
      }
      
      if (result.error) {
        console.error(`Error persisting session (${sessionId}):`, result.error);
        return false;
      }
      
      
      // Mark as persisted
      session._persisted = true;
      return true;
    } catch (err) {
      console.error(`Unhandled error in _persistSessionAsync (${sessionId}):`, err);
      return false;
    }
  }

  /**
   * Delete a session
   * @param {string} sessionId - Session identifier to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteSession(sessionId) {
    try {
      // Remove from cache
      this.cache.delete(sessionId);
      
      // Remove from database
      const { error } = await this.supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) {
        console.error(`Error deleting session (${sessionId}):`, error);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error(`Exception deleting session (${sessionId}):`, err);
      return false;
    }
  }

  /**
   * Clean up expired sessions from cache and trigger database cleanup
   */
  async cleanup() {
    try {
      const now = Date.now();
      const expiryTime = now - this.options.ttlMs;
      
      // Log activity
      console.log(`Session store cleanup: ${new Date().toISOString()}`);
      
      // Clear expired sessions from cache
      for (const sessionId of this.cache.cache.keys()) {
        const session = this.cache.get(sessionId);
        if (session && session.updatedAt < expiryTime) {
          this.cache.delete(sessionId);
        }
      }
      
      // Trigger database cleanup via SQL function
      await this.supabase.rpc('cleanup_expired_chat_sessions');
    } catch (err) {
      console.error('Error in session cleanup:', err);
    }
  }

  /**
   * Close and clean up resources
   */
  close() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Recover session context in case of error
   * @param {string} sessionId - Session identifier
   * @returns {Promise<object>} Recovered session or new session if recovery fails
   */
  async recoverSession(sessionId) {
    try {
      // Clear cache entry if exists
      this.cache.delete(sessionId);
      
      // Force reload from database
      const { data: dbSession, error } = await this.supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (error || !dbSession) {
        console.warn(`Could not recover session (${sessionId}), creating new one`);
        return this._createEmptySession(sessionId);
      }
      
      const recoveredSession = this._deserializeFromDb(dbSession);
      if (recoveredSession) {
        // Update cache with recovered session
        this.cache.set(sessionId, recoveredSession);
        return recoveredSession;
      } else {
        // Fallback to new session
        return this._createEmptySession(sessionId);
      }
    } catch (err) {
      console.error(`Error in recoverSession (${sessionId}):`, err);
      return this._createEmptySession(sessionId);
    }
  }
}

// Create a singleton instance
const persistentSessionStore = new PersistentSessionStore();

export default persistentSessionStore;
