/**
 * Context Recovery Service
 * 
 * Provides robust error handling and context recovery for chat sessions
 * to ensure conversation context is maintained even during errors or failovers.
 */

import persistentSessionStore from '../persistentSessionStore.js';

class ContextRecoveryService {
  /**
   * Attempts to recover context from a failed session
   * @param {string} sessionId - The session ID to recover
   * @returns {Promise<object>} - The recovered session or a new session
   */
  async recoverContext(sessionId) {
    if (!sessionId) {
      console.warn('Cannot recover context: No sessionId provided');
      return null;
    }
    
    try {
      const recoveredSession = await persistentSessionStore.recoverSession(sessionId);
      
      if (recoveredSession._persisted) {
      } else {
      }
      
      return recoveredSession;
    } catch (err) {
      console.error(`Failed to recover context for session ${sessionId}:`, err);
      return null;
    }
  }
  
  /**
   * Creates a recovery point for a session (snapshot)
   * @param {string} sessionId - The session ID to create recovery point for
   * @param {object} context - The current context data
   */
  async createRecoveryPoint(sessionId, context) {
    if (!sessionId || !context) return;
    
    try {
      // Force an immediate persistence to database as recovery point
      await persistentSessionStore._persistSessionAsync(sessionId, context);
    } catch (err) {
      console.error(`Failed to create recovery point for session ${sessionId}:`, err);
    }
  }
  
  /**
   * Extracts important context from chat history to help with recovery
   * @param {Array} history - Chat history messages
   * @returns {object} - Key context information
   */
  extractContextFromHistory(history) {
    if (!Array.isArray(history) || !history.length) {
      return { extractedContext: {} };
    }
    
    try {
      // Get user-provided information about boiler
      const userMessages = history.filter(msg => 
        (msg.sender === 'user' || msg.role === 'user'));
      
      const assistantMessages = history.filter(msg => 
        (msg.sender === 'assistant' || msg.role === 'assistant'));
      
      // Extract potential boiler information mentioned by user
      const extractedContext = {
        lastUserMessage: userMessages.length > 0 ? 
          userMessages[userMessages.length - 1] : null,
        lastAssistantMessage: assistantMessages.length > 0 ? 
          assistantMessages[assistantMessages.length - 1] : null,
        messageCount: history.length
      };
      
      return { extractedContext };
    } catch (err) {
      console.error('Error extracting context from history:', err);
      return { extractedContext: {} };
    }
  }
}

const contextRecoveryService = new ContextRecoveryService();
export default contextRecoveryService;
