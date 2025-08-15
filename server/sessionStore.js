/**
 * Chat Session Store
 * 
 * Maintains persistent chat sessions across API calls and provides memory
 * for conversations even when frontend disconnects temporarily.
 */

import { supabase } from './supabaseClient.js';

// Enhanced session store with Supabase persistence
class SessionStore {
  constructor(ttlMs = 3600000) { // Default 1 hour TTL
    this.sessions = new Map();
    this.ttlMs = ttlMs;
    this.cleanupInterval = setInterval(() => this.cleanup(), ttlMs / 2);
  }

  // Get a session by ID, first checking memory then Supabase
  async getSession(sessionId) {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Check memory first
    if (this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId);
      session.updatedAt = Date.now();
      return session;
    }

    // Try to load from Supabase
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (data && !error) {
        const session = {
          sessionId: data.session_id,
          createdAt: new Date(data.created_at).getTime(),
          updatedAt: Date.now(),
          history: data.history || [],
          boilerInfo: data.metadata?.boilerInfo || {
            manufacturer: null,
            model: null,
            faultCodes: [],
            heatingSystemType: null,
            systemComponents: [],
            detectedIssues: []
          },
          summaries: data.metadata?.summaries || []
        };
        
        // Cache in memory
        this.sessions.set(sessionId, session);
        return session;
      }
    } catch (error) {
      console.warn('[SessionStore] Failed to load from Supabase:', error.message);
    }

    // Create new session if not found
    return this.createSession(sessionId);
  }

  // Create a new session
  async createSession(sessionId, history = [], boilerInfo = null) {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    const session = {
      sessionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      history: history || [],
      boilerInfo: boilerInfo || {
        manufacturer: null,
        model: null,
        faultCodes: [],
        heatingSystemType: null,
        systemComponents: [],
        detectedIssues: []
      },
      summaries: []
    };

    // Store in memory
    this.sessions.set(sessionId, session);

    // Persist to Supabase
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .insert({
          session_id: sessionId,
          history: session.history,
          metadata: {
            boilerInfo: session.boilerInfo,
            summaries: session.summaries,
            messageCount: session.history.length
          },
          created_at: new Date(session.createdAt).toISOString(),
          last_activity: new Date(session.updatedAt).toISOString()
        });

      if (error) {
        console.warn('[SessionStore] Failed to persist new session to Supabase:', error.message);
      }
    } catch (error) {
      console.warn('[SessionStore] Supabase persistence error:', error.message);
    }

    return session;
  }

  // Update a session with new messages and boiler info
  async updateSession(sessionId, history, boilerInfo = null) {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    let session = this.sessions.get(sessionId);
    if (!session) {
      session = await this.getSession(sessionId);
    }
    
    // Update history
    if (history && Array.isArray(history)) {
      session.history = history;
    }
    
    // Update boiler info if provided
    if (boilerInfo) {
      session.boilerInfo = {
        ...session.boilerInfo,
        ...boilerInfo
      };
    }
    
    session.updatedAt = Date.now();

    // Persist to Supabase
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .upsert({
          session_id: sessionId,
          history: session.history,
          metadata: {
            boilerInfo: session.boilerInfo,
            summaries: session.summaries,
            messageCount: session.history.length
          },
          last_activity: new Date(session.updatedAt).toISOString()
        });

      if (error) {
        console.warn('[SessionStore] Failed to update session in Supabase:', error.message);
      }
    } catch (error) {
      console.warn('[SessionStore] Supabase update error:', error.message);
    }

    return session;
  }

  // Store a conversation summary
  addSummary(sessionId, summary) {
    const session = this.getSession(sessionId);
    session.summaries.push({
      timestamp: Date.now(),
      summary
    });
    return session;
  }

  // Clear expired sessions
  cleanup() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.updatedAt > this.ttlMs) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Close and clean up
  close() {
    clearInterval(this.cleanupInterval);
  }
}

// Create a singleton instance
const sessionStore = new SessionStore();

export default sessionStore;
