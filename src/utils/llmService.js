/**
 * Service for handling LLM-related operations
 */

/**
 * Creates an OpenAI reasoner function for more natural conversations
 * 
 * @param {Object} options - Reasoner options
 * @param {string} options.model - OpenAI model to use
 * @param {string} options.systemPrompt - System prompt for the model
 * @returns {Function} Reasoning function that takes a query and returns a response
 */
export const getOpenAIReasoner = ({ model = 'gpt-3.5-turbo', systemPrompt = '' } = {}) => {
  /**
   * Reasoning function that processes a user query
   * 
   * @param {string} query - User query
   * @param {Array} conversationHistory - Previous conversation history
   * @param {Object} options - Additional options { sessionId?: string }
   * @returns {Promise<string>} AI response
   */
  return async (query, conversationHistory = [], options = {}) => {
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid query provided to OpenAI reasoner');
    }

    try {
      // Provider toggle (default to server-routed OpenAI for security)
      const provider = (import.meta.env.VITE_LLM_PROVIDER || 'openai').toLowerCase();

      // Prepare the messages array
      const messages = [
        { role: 'system', content: systemPrompt || 'You are a helpful assistant.' }
      ];

      // Add conversation history if available
      if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        messages.push(...conversationHistory);
      }

      // Add the current query as the user message
      messages.push({ role: 'user', content: query });

      if (provider === 'openai') {
        // Route through backend to protect API keys and leverage reliability layers
        const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            sessionId: options?.sessionId || null,
            systemPrompt: (options?.systemPromptOverride || systemPrompt || 'You are a helpful assistant.')
          })
        });

        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({}));
          throw new Error(errorData.message || `Chat API failed with status ${resp.status}`);
        }
        const json = await resp.json();
        if (typeof json.response === 'string' && json.response.length > 0) {
          return json.response;
        }
        throw new Error('Invalid response format from /api/chat');
      }

      // Fallback to DeepSeek direct from frontend when explicitly chosen
      const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY_1;
      if (!apiKey) {
        throw new Error('DeepSeek API key not found in environment variables');
      }

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: 0.7,
          max_tokens: 500,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      throw new Error('Invalid response format from DeepSeek API');
    } catch (error) {
      console.error('Error in DeepSeek reasoner:', error);
      throw error;
    }
  };
};

/**
 * Basic text completion function using OpenAI API
 * 
 * @param {Object} options - Completion options
 * @param {string} options.model - OpenAI model to use
 * @param {string} options.prompt - Prompt for completion
 * @param {number} options.temperature - Temperature parameter (0-1)
 * @returns {Promise<string>} Completion result
 */
export const getTextCompletion = async ({ 
  model = 'gpt-3.5-turbo-instruct',
  prompt,
  temperature = 0.7
}) => {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Invalid prompt provided for text completion');
  }

  try {
    // API URL for server-side proxy to OpenAI
    const apiUrl = '/api/completion';
    
    // Make the API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        temperature,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the completion text
    if (data.choices && data.choices[0] && data.choices[0].text) {
      return data.choices[0].text.trim();
    }
    
    throw new Error('Invalid response format from OpenAI API');
  } catch (error) {
    console.error('Error in text completion:', error);
    throw error;
  }
};

export default {
  getOpenAIReasoner,
  getTextCompletion
};
