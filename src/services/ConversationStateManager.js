/**
 * Enhanced ConversationStateManager
 *
 * Manages the state of a conversation for a given session with validation and cleanup.
 * State is persisted in sessionStorage to survive page reloads.
 */

const DEBUG = import.meta.env.MODE === 'development';

// State validation schema
const STATE_SCHEMA = {
  manufacturer: { type: 'string', optional: true },
  model: { type: 'string', optional: true },
  systemType: { type: 'string', optional: true },
  faultCodes: { type: 'array', optional: false },
  symptoms: { type: 'array', optional: false },
  attemptedFixes: { type: 'array', optional: false },
  conversationStage: { type: 'string', optional: false },
  messageCount: { type: 'number', optional: false },
  topicsCovered: { type: 'object', optional: false },
  lastDiagnosis: { type: 'object', optional: true },
  completeHistory: { type: 'array', optional: false }
};

// Default initial state for a new conversation
const getInitialState = () => ({
  manufacturer: null,
  model: null,
  systemType: null,
  faultCodes: [],
  symptoms: [],
  attemptedFixes: [],
  conversationStage: 'greeting', // e.g., greeting, gathering_info, diagnosing, suggesting_fix
  messageCount: 0,
  topicsCovered: {
    askedAboutSystemType: false,
    askedAboutManufacturer: false,
    askedAboutModel: false,
    askedAboutFaultCode: false,
  },
  lastDiagnosis: null,
  completeHistory: [],
});

class ConversationStateManager {
  constructor(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('A valid sessionId string is required to manage conversation state.');
    }
    this.sessionId = sessionId;
    this.storageKey = `chat_session_${sessionId}`;
    this.maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    // Initialize cleanup on first use
    this._scheduleCleanup();
  }

  /**
   * Retrieves the current conversation context from sessionStorage with validation.
   * If no context is found, it initializes and returns a default state.
   * @returns {object} The conversation context.
   */
  getContext() {
    try {
      const storedState = sessionStorage.getItem(this.storageKey);
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        
        // Check if state is expired
        if (this._isStateExpired(parsedState)) {
          this.resetContext();
          return getInitialState();
        }
        
        // Validate state structure
        const validatedState = this._validateAndRepairState(parsedState);
        
        return validatedState;
      } else {
        const initialState = getInitialState();
        this.saveContext(initialState);
        return initialState;
      }
    } catch (error) {
      console.error('[ConversationStateManager] Error getting context:', error);
      // Return a safe default if storage fails
      const safeState = getInitialState();
      this.saveContext(safeState);
      return safeState;
    }
  }

  /**
   * Saves the provided conversation context to sessionStorage with validation.
   * @param {object} context The conversation context to save.
   */
  saveContext(context) {
    try {
      if (!context || typeof context !== 'object') {
        throw new Error('Cannot save null, undefined, or non-object context.');
      }
      
      // Validate context before saving
      const validatedContext = this._validateAndRepairState(context);
      
      // Add timestamp for expiration tracking
      const contextWithTimestamp = {
        ...validatedContext,
        _timestamp: Date.now(),
        _sessionId: this.sessionId
      };
      
      sessionStorage.setItem(this.storageKey, JSON.stringify(contextWithTimestamp));
      // Context saved successfully
    } catch (error) {
      console.error('[ConversationStateManager] Error saving context:', error);
      // Try to save a safe fallback state
      try {
        const fallbackState = {
          ...getInitialState(),
          _timestamp: Date.now(),
          _sessionId: this.sessionId
        };
        sessionStorage.setItem(this.storageKey, JSON.stringify(fallbackState));
      } catch (fallbackError) {
        console.error('[ConversationStateManager] Failed to save fallback state:', fallbackError);
      }
    }
  }

  /**
   * Resets the conversation context to its initial state.
   */
  resetContext() {
    try {
      const initialState = getInitialState();
      this.saveContext(initialState);
    } catch (error) {
      console.error('[ConversationStateManager] Error resetting context:', error);
    }
  }

  /**
   * Creates a new session with initial state
   * @param {object} initialData - Optional initial data to merge with default state
   * @returns {object} The created session context
   */
  createSession(initialData = {}) {
    try {
      const initialState = getInitialState();
      const sessionContext = {
        ...initialState,
        ...initialData,
        _timestamp: Date.now(),
        _sessionId: this.sessionId
      };
      
      this.saveContext(sessionContext);
      return sessionContext;
    } catch (error) {
      console.error('[ConversationStateManager] Error creating session:', error);
      throw error;
    }
  }

  /**
   * Updates the current session with new data
   * @param {object} updateData - Data to update in the session
   * @returns {object} The updated session context
   */
  updateSession(updateData) {
    try {
      if (!updateData || typeof updateData !== 'object') {
        throw new Error('Update data must be a valid object');
      }

      const currentContext = this.getContext();
      const updatedContext = {
        ...currentContext,
        ...updateData,
        _timestamp: Date.now(),
        _sessionId: this.sessionId
      };

      this.saveContext(updatedContext);
      return updatedContext;
    } catch (error) {
      console.error('[ConversationStateManager] Error updating session:', error);
      throw error;
    }
  }

  /**
   * Validate and repair state structure
   * @private
   */
  _validateAndRepairState(state) {
    const repairedState = { ...state };
    
    // Validate each field according to schema
    Object.entries(STATE_SCHEMA).forEach(([field, config]) => {
      if (!config.optional && !(field in repairedState)) {
        // Add missing required field with default value
        const initialState = getInitialState();
        repairedState[field] = initialState[field];
        if (DEBUG) console.warn(`[ConversationStateManager] Repaired missing field: ${field}`);
      }
      
      if (field in repairedState) {
        const value = repairedState[field];
        const expectedType = config.type;
        
        // Type validation and repair
        if (expectedType === 'array' && !Array.isArray(value)) {
          repairedState[field] = [];
        } else if (expectedType === 'object' && (typeof value !== 'object' || Array.isArray(value) || value === null)) {
          const initialState = getInitialState();
          repairedState[field] = initialState[field];
        } else if (expectedType === 'string' && typeof value !== 'string' && value !== null) {
          repairedState[field] = null;
        } else if (expectedType === 'number' && typeof value !== 'number') {
          const initialState = getInitialState();
          repairedState[field] = initialState[field];
        }
      }
    });
    
    return repairedState;
  }

  /**
   * Check if state is expired
   * @private
   */
  _isStateExpired(state) {
    if (!state._timestamp) return false; // Legacy states without timestamp
    return Date.now() - state._timestamp > this.maxSessionAge;
  }

  /**
   * Schedule periodic cleanup of old sessions
   * @private
   */
  _scheduleCleanup() {
    // Run cleanup every hour
    setInterval(() => {
      this._cleanupOldSessions();
    }, 60 * 60 * 1000);
    
    // Run initial cleanup
    setTimeout(() => {
      this._cleanupOldSessions();
    }, 1000);
  }

  /**
   * Clean up old sessions from sessionStorage
   * @private
   */
  _cleanupOldSessions() {
    try {
      const keysToRemove = [];
      const cutoffTime = Date.now() - this.maxSessionAge;
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('chat_session_')) {
          try {
            const value = sessionStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              if (parsed._timestamp && parsed._timestamp < cutoffTime) {
                keysToRemove.push(key);
              }
            }
          } catch (parseError) {
            // Remove corrupted entries
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      console.error('[ConversationStateManager] Error during cleanup:', error);
    }
  }

  /**
   * Get session statistics for monitoring
   */
  getSessionStats() {
    try {
      const stats = {
        sessionId: this.sessionId,
        storageKey: this.storageKey,
        totalSessions: 0,
        currentSessionSize: 0,
        totalStorageUsed: 0
      };
      
      // Count chat sessions and calculate storage usage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('chat_session_')) {
          stats.totalSessions++;
          const value = sessionStorage.getItem(key);
          if (value) {
            const size = new Blob([value]).size;
            stats.totalStorageUsed += size;
            if (key === this.storageKey) {
              stats.currentSessionSize = size;
            }
          }
        }
      }
      
      return stats;
    } catch (error) {
      console.error('[ConversationStateManager] Error getting session stats:', error);
      return null;
    }
  }
}

export default ConversationStateManager;
