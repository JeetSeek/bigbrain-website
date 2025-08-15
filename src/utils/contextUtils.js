/**
 * Utility functions for handling chat context and conversation state
 */

/**
 * Safely adds an AI response to the conversation context
 * Handles various edge cases like null responses, non-string responses, etc.
 * 
 * @param {Array} context - Current conversation context array
 * @param {string|Object} response - Response to add to context
 * @param {boolean} [isAI=true] - Whether the response is from AI (true) or user (false)
 * @returns {Array} Updated context array with new response added
 */
export const safelyAddResponseToContext = (context, response, isAI = true) => {
  // Ensure context is an array
  const safeContext = Array.isArray(context) ? [...context] : [];
  
  // Handle null/undefined response
  if (response === null || response === undefined) {
    console.warn('Attempted to add null/undefined response to context');
    return safeContext;
  }
  
  // Format the response based on type
  let formattedResponse;
  
  if (typeof response === 'string') {
    formattedResponse = response.trim();
  } else if (typeof response === 'object') {
    try {
      // If response is an object with a text property, use that
      if (response.text && typeof response.text === 'string') {
        formattedResponse = response.text.trim();
      } else {
        // Otherwise stringify the object
        formattedResponse = JSON.stringify(response);
      }
    } catch (e) {
      console.error('Failed to stringify response object:', e);
      formattedResponse = 'Error processing response';
    }
  } else {
    // Convert other types to string
    formattedResponse = String(response).trim();
  }
  
  // Only add non-empty responses
  if (formattedResponse.length === 0) {
    console.warn('Attempted to add empty response to context');
    return safeContext;
  }
  
  // Add to context with appropriate role
  safeContext.push({
    role: isAI ? 'assistant' : 'user',
    content: formattedResponse
  });
  
  return safeContext;
};

/**
 * Extracts conversation history in format suitable for API calls
 * 
 * @param {Array} messages - Array of message objects
 * @param {number} [limit=10] - Maximum number of messages to include
 * @returns {Array} Formatted conversation history for API
 */
export const formatConversationHistory = (messages, limit = 10) => {
  if (!Array.isArray(messages)) return [];
  
  // Get last N messages
  const recentMessages = messages.slice(-limit);
  
  return recentMessages.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: typeof msg.text === 'string' ? msg.text : 
             (typeof msg.text === 'object' && msg.text !== null) ? 
             JSON.stringify(msg.text) : String(msg.text || '')
  }));
};

/**
 * Truncates conversation history if it exceeds token limits
 * 
 * @param {Array} context - Conversation context array
 * @param {number} [maxTokens=4000] - Maximum tokens to keep
 * @returns {Array} Truncated context array
 */
export const truncateContext = (context, maxTokens = 4000) => {
  if (!Array.isArray(context) || context.length === 0) return [];
  
  // Simple approximation: assume avg 4 chars per token
  const estimateTokens = (text) => {
    if (typeof text !== 'string') return 0;
    return Math.ceil(text.length / 4);
  };
  
  let totalTokens = 0;
  const truncatedContext = [];
  
  // Start from most recent messages and work backwards
  for (let i = context.length - 1; i >= 0; i--) {
    const message = context[i];
    const messageTokens = estimateTokens(message.content);
    
    if (totalTokens + messageTokens <= maxTokens) {
      truncatedContext.unshift(message); // Add to beginning
      totalTokens += messageTokens;
    } else {
      break; // Stop when token limit reached
    }
  }
  
  return truncatedContext;
};

export default {
  safelyAddResponseToContext,
  formatConversationHistory,
  truncateContext
};
