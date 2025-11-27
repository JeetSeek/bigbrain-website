/**
 * Session Manager Service
 * Handles persistent chat session storage in Supabase
 */

import { supabase } from '../supabaseClient.js';

class SessionManager {
  static SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
  static fallbackStorage = new Map(); // In-memory fallback

  /**
   * Create a new chat session
   * @param {string} sessionId - Unique session identifier
   * @param {string|null} userId - Optional user ID
   * @param {Array} initialHistory - Initial chat history
   * @returns {Promise<Object>} Created session
   */
  async createSession(sessionId, userId = null, initialHistory = []) {
    try {
      const expiresAt = new Date(Date.now() + SessionManager.SESSION_TIMEOUT);
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          session_id: sessionId,
          user_id: userId,
          history: initialHistory,
          expires_at: expiresAt,
          metadata: {
            created_from: 'chat_api',
            user_agent: 'BoilerBrain/1.0'
          }
        })
        .select()
        .single();
        
      if (error) {
        console.error('[SessionManager] Error creating session in database:', error);
        console.warn('[SessionManager] Falling back to in-memory storage');
        // Fallback to in-memory storage
        const session = {
          session_id: sessionId,
          user_id: userId,
          history: initialHistory,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
          metadata: {
            created_from: 'chat_api',
            user_agent: 'BoilerBrain/1.0',
            storage: 'in-memory'
          }
        };
        SessionManager.fallbackStorage.set(sessionId, session);
        return session;
      }
      
      console.log(`[SessionManager] Created session: ${sessionId}`);
      return data;
    } catch (error) {
      console.error('[SessionManager] createSession failed:', error);
      throw error;
    }
  }

  /**
   * Get an existing session by session ID
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Object|null>} Session data or null if not found/expired
   */
  async getSession(sessionId) {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .gt('expires_at', new Date().toISOString())
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - session doesn't exist or expired, check fallback
          const fallbackSession = SessionManager.fallbackStorage.get(sessionId);
          if (fallbackSession && new Date(fallbackSession.expires_at) > new Date()) {
            return fallbackSession;
          }
          return null;
        }
        console.error('[SessionManager] Error getting session from database:', error);
        console.warn('[SessionManager] Checking in-memory fallback storage');
        const fallbackSession = SessionManager.fallbackStorage.get(sessionId);
        if (fallbackSession && new Date(fallbackSession.expires_at) > new Date()) {
          return fallbackSession;
        }
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('[SessionManager] getSession failed:', error);
      return null;
    }
  }

  /**
   * Update session with new chat history
   * @param {string} sessionId - Session identifier
   * @param {Array} chatHistory - Updated chat history
   * @returns {Promise<Object>} Updated session
   */
  async updateSession(sessionId, chatHistory) {
    try {
      const expiresAt = new Date(Date.now() + SessionManager.SESSION_TIMEOUT);
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .update({
          history: chatHistory,
          updated_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
          expires_at: expiresAt
        })
        .eq('session_id', sessionId)
        .select()
        .single();
        
      if (error) {
        console.error('[SessionManager] Error updating session in database:', error);
        console.warn('[SessionManager] Falling back to in-memory storage');
        // Fallback to in-memory storage
        const session = {
          session_id: sessionId,
          history: chatHistory,
          updated_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
          expires_at: expiresAt,
          metadata: {
            storage: 'in-memory'
          }
        };
        SessionManager.fallbackStorage.set(sessionId, session);
        return session;
      }
      
      return data;
    } catch (error) {
      console.error('[SessionManager] updateSession failed:', error);
      throw error;
    }
  }

  /**
   * Delete a specific session
   * @param {string} sessionId - Session identifier
   */
  async deleteSession(sessionId) {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('session_id', sessionId);
        
      if (error) {
        console.error('[SessionManager] Error deleting session:', error);
        throw error;
      }
      
      console.log(`[SessionManager] Deleted session: ${sessionId}`);
    } catch (error) {
      console.error('[SessionManager] deleteSession failed:', error);
      throw error;
    }
  }

  /**
   * Clean up expired sessions (run periodically)
   * @returns {Promise<number>} Number of sessions deleted
   */
  async cleanupExpiredSessions() {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');
        
      if (error) {
        console.error('[SessionManager] Error cleaning up sessions:', error);
        return 0;
      }
      
      const count = data?.length || 0;
      if (count > 0) {
        console.log(`[SessionManager] Cleaned up ${count} expired sessions`);
      }
      
      return count;
    } catch (error) {
      console.error('[SessionManager] cleanupExpiredSessions failed:', error);
      return 0;
    }
  }

  /**
   * Get session statistics
   * @returns {Promise<Object>} Session stats
   */
  async getStats() {
    try {
      const { data: total, error: totalError } = await supabase
        .from('chat_sessions')
        .select('id', { count: 'exact', head: true });
        
      const { data: active, error: activeError } = await supabase
        .from('chat_sessions')
        .select('id', { count: 'exact', head: true })
        .gt('expires_at', new Date().toISOString());
        
      if (totalError || activeError) {
        console.error('[SessionManager] Error getting stats');
        return { total: 0, active: 0, expired: 0 };
      }
      
      return {
        total: total?.length || 0,
        active: active?.length || 0,
        expired: (total?.length || 0) - (active?.length || 0)
      };
    } catch (error) {
      console.error('[SessionManager] getStats failed:', error);
      return { total: 0, active: 0, expired: 0 };
    }
  }
}

export default new SessionManager();
