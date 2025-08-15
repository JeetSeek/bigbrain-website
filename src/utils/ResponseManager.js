/**
 * Response Manager
 * 
 * A sophisticated service for managing chat responses to ensure variety,
 * avoid repetition, and maintain context across conversations.
 */

export class ResponseManager {
  /**
   * Map to track sent responses by session and type
   * Format: { sessionId:responseType => [indices of used responses] }
   */
  static sentResponses = new Map();
  
  /**
   * Response variations by type
   */
  static responseVariations = {
    greeting: [
      "Hey there! I'm your friendly BoilerBrain assistant. What make and model of boiler are we looking at today? 😊",
      "Hello! I'm BoilerBrain AI, your virtual fault-finding assistant. What type of boiler system do you need help with today?",
      "Welcome to BoilerBrain! I'm here to help diagnose your boiler issues. Could you tell me about your heating system?"
    ],
    
    contextRecovery: [
      "Let me continue analyzing your boiler situation. Based on what you've shared, could you tell me more about what's happening when the issue occurs?",
      "I understand. To diagnose your boiler problem accurately, can you describe any specific symptoms or behaviors you're seeing?",
      "Thanks for the information so far. To help troubleshoot your boiler issue, could you tell me if there are any unusual sounds, error messages, or performance issues?",
      "Let's focus on solving your boiler issue. What exactly happens when you try to use the heating or hot water system?"
    ],
    
    faultCodeNotFound: [
      "I couldn't find specific information about that fault code in my database. To help diagnose the issue, could you tell me what happens when this code appears?",
      "That fault code isn't in my immediate reference data. Does the boiler display any other symptoms or behaviors when the code appears?",
      "I don't have the exact details for this fault code on record. Many boiler faults relate to either ignition, water pressure, or sensor issues. What is the boiler doing when this code appears?"
    ],
    
    // Add more response types as needed
  };
  
  /**
   * Get a unique response variation to avoid repetition
   * @param {string} sessionId - Current session ID
   * @param {string} responseType - Type of response needed
   * @returns {string} - Selected response text
   */
  static getUniqueResponse(sessionId, responseType) {
    const variations = this.responseVariations[responseType];
    
    // If no variations available for this type, return empty string
    if (!variations || !variations.length) {
      console.warn(`[ResponseManager] No variations found for response type: ${responseType}`);
      return '';
    }
    
    // If only one variation, return it
    if (variations.length === 1) {
      return variations[0];
    }
    
    const sessionKey = `${sessionId || 'default'}:${responseType}`;
    const sentIndices = this.sentResponses.get(sessionKey) || [];
    
    // Find unused variations or least recently used
    const availableIndices = [...Array(variations.length).keys()]
      .filter(i => !sentIndices.includes(i));
    
    let selectedIndex;
    if (availableIndices.length > 0) {
      // Randomly select from unused variations
      selectedIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    } else {
      // Use least recently used if all have been used
      selectedIndex = sentIndices[0];
      // Remove oldest entry
      sentIndices.shift();
    }
    
    // Track this usage
    sentIndices.push(selectedIndex);
    this.sentResponses.set(sessionKey, sentIndices.slice(-variations.length)); // Only keep last N
    
    return variations[selectedIndex];
  }
  
  /**
   * Check if a response is too similar to a recent one
   * @param {string} sessionId - Current session ID
   * @param {string} newResponse - Proposed new response
   * @param {Array} history - Conversation history array
   * @returns {boolean} - True if response is too similar to recent ones
   */
  static isResponseRepetitive(sessionId, newResponse, history) {
    if (!history || history.length < 2) return false;
    
    // Look at last 2 AI responses
    const recentAIResponses = history
      .filter(msg => msg.sender === 'ai' || msg.role === 'assistant')
      .slice(-2)
      .map(msg => msg.text || msg.content || '');
    
    // Check for substantial similarity
    for (const recent of recentAIResponses) {
      // If response shares significant text with a recent one
      if (this.calculateSimilarity(newResponse, recent) > 0.6) {
        return true;
      }
      
      // Check for common repetitive phrases
      const repetitivePatterns = [
        "I understand",
        "Let me continue helping you",
        "Could you provide any additional details",
        "Let me know"
      ];
      
      for (const pattern of repetitivePatterns) {
        if (newResponse.includes(pattern) && recent.includes(pattern)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Calculate similarity between two strings
   * Simple implementation based on shared words
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Similarity score (0-1)
   */
  static calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    // Extract words and normalize
    const words1 = new Set(str1.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    const words2 = new Set(str2.toLowerCase().split(/\W+/).filter(w => w.length > 3));
    
    // Count shared words
    let shared = 0;
    for (const word of words1) {
      if (words2.has(word)) {
        shared++;
      }
    }
    
    // Calculate Jaccard similarity
    const union = words1.size + words2.size - shared;
    return union > 0 ? shared / union : 0;
  }
  
  /**
   * Generate alternative response if original seems repetitive
   * @param {string} sessionId - Current session ID
   * @param {string} originalResponse - Original potentially repetitive response
   * @param {Array} history - Conversation history
   * @returns {string} - Either original or alternative response
   */
  static ensureUniqueResponse(sessionId, originalResponse, history) {
    if (!this.isResponseRepetitive(sessionId, originalResponse, history)) {
      return originalResponse;
    }
    
    console.warn('[ResponseManager] Detected repetitive response, generating alternative');
    
    // Generate an alternative based on the context
    return this.getUniqueResponse(sessionId, 'contextRecovery');
  }
}

// Export a singleton instance for direct use
export default ResponseManager;
