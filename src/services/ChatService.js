import { engineerChatService } from './engineerChatService.js';
import { ResponseManager } from './ResponseManager.js';

/**
 * Unified Chat Service for BoilerBrain
 * Provides consistent API interactions, error handling, and performance monitoring
 * Replaces direct API calls and consolidates deprecated ResponseManager usage
 */
class ChatService {
  constructor() {
    this.performanceMetrics = new Map();
    this.offlineMode = false;
    this.apiFallbackOrder = ['openai', 'deepseek'];
    this.currentApiIndex = 0;
  }

  /**
   * Send message with unified error handling and performance monitoring
   */
  async sendMessage(message, sessionId, options = {}) {
    const startTime = Date.now();
    const messageId = this.generateMessageId();

    try {
      // Check offline status
      if (!navigator.onLine) {
        this.offlineMode = true;
        throw new Error('OFFLINE_MODE');
      }

      // Attempt API call with fallback
      let response;
      let apiUsed;
      let attempts = 0;
      const maxAttempts = this.apiFallbackOrder.length;

      while (attempts < maxAttempts) {
        try {
          apiUsed = this.apiFallbackOrder[this.currentApiIndex];
          response = await this.callApi(message, sessionId, apiUsed, options);
          break; // Success, exit retry loop
        } catch (apiError) {
          console.warn(`API ${apiUsed} failed:`, apiError.message);
          attempts++;
          this.currentApiIndex = (this.currentApiIndex + 1) % maxAttempts;

          if (attempts >= maxAttempts) {
            throw new Error(`ALL_APIS_FAILED: ${apiError.message}`);
          }
        }
      }

      // Process response consistently
      const processedResponse = this.processApiResponse(response);

      // Record performance metrics
      this.recordPerformance(messageId, startTime, apiUsed, true);

      return {
        ...processedResponse,
        messageId,
        apiUsed,
        responseTime: Date.now() - startTime,
        sessionId
      };

    } catch (error) {
      // Record failed performance metrics
      this.recordPerformance(messageId, startTime, null, false, error.message);

      // Handle different error types
      return this.handleError(error, messageId);
    }
  }

  /**
   * Call specific API with consistent interface
   */
  async callApi(message, sessionId, apiType, options) {
    const payload = {
      message,
      sessionId,
      timestamp: new Date().toISOString(),
      ...options
    };

    switch (apiType) {
      case 'openai':
        return await this.callOpenAI(payload);
      case 'deepseek':
        return await this.callDeepSeek(payload);
      default:
        throw new Error(`UNSUPPORTED_API: ${apiType}`);
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(payload) {
    const response = await fetch('/api/chat/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`OPENAI_API_ERROR: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Call DeepSeek API
   */
  async callDeepSeek(payload) {
    const response = await fetch('/api/chat/deepseek', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`DEEPSEEK_API_ERROR: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Process API response to ensure consistent field naming
   */
  processApiResponse(response) {
    // Ensure consistent 'reply' field regardless of API
    if (response.reply) {
      return response;
    } else if (response.response) {
      return { ...response, reply: response.response };
    } else if (response.content) {
      return { ...response, reply: response.content };
    } else if (response.message) {
      return { ...response, reply: response.message };
    } else if (typeof response === 'string') {
      return { reply: response };
    }

    // Fallback for unexpected response format
    console.warn('Unexpected API response format:', response);
    return { reply: 'I apologize, but I received an unexpected response format. Please try again.' };
  }

  /**
   * Handle various error types with user-friendly messages
   */
  handleError(error, messageId) {
    let userMessage = 'I apologize, but I encountered an error. Please try again.';
    let errorType = 'UNKNOWN_ERROR';

    if (error.message.includes('OFFLINE_MODE')) {
      userMessage = 'You appear to be offline. Please check your internet connection and try again.';
      errorType = 'OFFLINE';
    } else if (error.message.includes('ALL_APIS_FAILED')) {
      userMessage = 'All AI services are temporarily unavailable. Please try again in a few moments.';
      errorType = 'API_UNAVAILABLE';
    } else if (error.message.includes('OPENAI_API_ERROR')) {
      userMessage = 'The AI service is temporarily unavailable. Trying alternative service...';
      errorType = 'API_ERROR';
    } else if (error.message.includes('DEEPSEEK_API_ERROR')) {
      userMessage = 'The AI service is temporarily unavailable. Please try again.';
      errorType = 'API_ERROR';
    }

    return {
      reply: userMessage,
      error: true,
      errorType,
      messageId,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get authentication token
   */
  getAuthToken() {
    // Implementation depends on your auth system
    return localStorage.getItem('authToken') || '';
  }

  /**
   * Generate unique message ID
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record performance metrics
   */
  recordPerformance(messageId, startTime, apiUsed, success, errorMessage = null) {
    const duration = Date.now() - startTime;
    const metric = {
      messageId,
      timestamp: new Date().toISOString(),
      duration,
      apiUsed,
      success,
      errorMessage
    };

    // Store in performance metrics map (could be sent to analytics service)
    this.performanceMetrics.set(messageId, metric);

    // Log to console for debugging
    if (success) {
    } else {
      console.error(`Chat error: ${errorMessage} (${duration}ms)`);
    }

    // Clean up old metrics (keep last 100)
    if (this.performanceMetrics.size > 100) {
      const oldestKey = this.performanceMetrics.keys().next().value;
      this.performanceMetrics.delete(oldestKey);
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics() {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics() {
    this.performanceMetrics.clear();
  }

  /**
   * Check if user is online
   */
  isOnline() {
    return navigator.onLine;
  }

  /**
   * Set offline mode
   */
  setOfflineMode(offline) {
    this.offlineMode = offline;
  }
}

// Export singleton instance
export const chatService = new ChatService();
export default chatService;
