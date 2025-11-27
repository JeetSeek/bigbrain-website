// engineerChatService with enhanced error handling, timeouts, and diagnostic features
// Uses backend API with Enhanced Fault Code Service for professional diagnostics

// API timeout settings in milliseconds
const API_TIMEOUT = 30000; // 30 seconds - optimized for user experience

const engineerChatService = {
  // Removed duplicate getResponse method - sendMessage handles all API communication
  
  /**
   * Send a new message to the chat service with robust error handling
   * @param {string} text - User message text
   * @param {string} sessionId - Chat session ID
   * @returns {Promise<{text: string}>}
   */
  async sendMessage(text, sessionId) {
    try {
      // Call backend API with Enhanced Fault Code Service
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId
        }),
        signal: AbortSignal.timeout(API_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return { 
        text: data.response || data.reply || 'Sorry, I could not generate a response right now.',
        sender: 'assistant',
        isFinal: true,
        isError: false
      };
    } catch (error) {
      console.error('Error sending message:', error);
      
      if (!navigator.onLine) {
        return {
          text: 'You appear to be offline. Please check your internet connection and try again. If this is an emergency gas issue, please call the Gas Emergency Service on 0800 111 999.',
          sender: 'assistant',
          isFinal: true,
          isError: true
        };
      }
      
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        return {
          text: 'The diagnostic system is taking longer than usual. Please try again. For urgent gas safety issues, call 0800 111 999.',
          sender: 'assistant',
          isFinal: true,
          isError: true
        };
      }
      
      return {
        text: 'Diagnostic system temporarily unavailable. Please try again shortly. For emergency gas issues, call 0800 111 999.',
        sender: 'assistant',
        isFinal: true,
        isError: true
      };
    }
  },
  
  /**
   * Validate user message to ensure it's suitable for processing
   * @param {string} text - User message text
   * @returns {boolean} - Whether the message is valid
   */
  validateMessage(text) {
    if (!text || text.trim().length === 0) {
      return false;
    }
    
    // Minimum message length requirement
    if (text.trim().length < 2) {
      return false;
    }
    
    return true;
  }
};

export { engineerChatService };
