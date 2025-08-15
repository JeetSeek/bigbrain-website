// engineerChatService with enhanced error handling, timeouts, and diagnostic features

// API timeout settings in milliseconds
const API_TIMEOUT = 60000; // 60 seconds - increased for server stability

// Structured system prompt with professional guidance rails
const SYSTEM_PROMPT = `You're a lead Gas Safe engineer with 20+ years experience. You're chatting with a colleague who's on-site troubleshooting. Keep responses short, practical, and conversational - like you're standing next to them.

CONVERSATION STYLE:
- Talk like one engineer to another - no formal lists or manual speak
- Keep responses under 3-4 sentences unless they ask for detail
- Use natural language: "Right, L8 on an Ideal Logic - that's usually the flow sensor mate"
- Ask one focused question if you need more info

WHEN THEY MENTION A FAULT CODE:
- Give the most likely cause first: "L8? Flow sensor's probably knackered"
- Quick test: "Check the resistance across the terminals - should be around 10kΩ"
- If stuck: "If that's fine, check the wiring to the PCB"

KEEP IT REAL:
- Use engineer slang naturally ("knackered", "dodgy", "sorted")
- Give practical tips: "Bit of WD40 on those connections won't hurt"
- Mention time: "Should take you 20 minutes max"
- Safety when needed: "Turn the gas off first obviously"

IF THEY'RE VAGUE:
- Ask one specific question: "What make and model?" or "Any fault codes showing?"
- Don't interrogate them with lists

You're the experienced mate they call when stuck - helpful, direct, no waffle.`;



const engineerChatService = {
  /**
   * Get GPT response following Boiler Brain rails
   * @param {string} sessionId Chat session identifier
   * @param {string} messageText Current user message
   * @param {Array} history Array of previous chat messages (ChatDock format)
   * @returns {Promise<{text:string,sender:string,isFinal:boolean}>}
   */
  async getResponse(sessionId, messageText, history = []) {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    try {
      // Build updated history including current user message
      const updatedHistory = [
        ...history,
        { sender: 'user', text: messageText }
      ];

      // Detect any boiler fault codes in the message
      const faultCodeRegex = /\b[FELA]\d{1,3}\b/gi;
      const detectedFaultCodes = messageText.match(faultCodeRegex) || [];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: messageText,
          sessionId: sessionId,
          systemPrompt: SYSTEM_PROMPT,
        }),
      });

      // Clear timeout since request completed
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error('rate_limit');
        } else if (response.status >= 500) {
          throw new Error('server_error');
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('auth_error');
        }
        throw new Error(errorData.error || `Failed to get response from backend (status ${response.status})`);
      }

      const data = await response.json();

      return {
        text: data.response || data.answer || data.message || 'No response',
        sender: 'assistant',
        isFinal: true,
      };
    } catch (error) {
      // Clear timeout if there was an error
      clearTimeout(timeoutId);
      
      console.error('Error in engineerChatService:', error);
      
      if (error.name === 'AbortError') {
        return {
          text: 'Request timed out. This could be due to heavy server load or complex diagnostics. Please try again shortly.',
          sender: 'assistant',
          isFinal: true,
          isError: true
        };
      } else if (!navigator.onLine) {
        return {
          text: 'You appear to be offline. Please check your internet connection and try again. If this is an emergency gas issue, please call the Gas Emergency Service on 0800 111 999.',
          sender: 'assistant',
          isFinal: true,
          isError: true
        };
      }
      
      return {
        text: 'Sorry, I could not generate a response right now. Please try again shortly.',
        sender: 'assistant',
        isFinal: true,
        isError: true
      };
    }
  },
  
  /**
   * Send a new message to the chat service with robust error handling
   * @param {string} text - User message text
   * @param {string} sessionId - Chat session ID
   * @returns {Promise<{text: string}>}
   */
  async sendMessage(text, sessionId) {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    try {
      // Detect any boiler fault codes in the message
      const faultCodeRegex = /\b[FELA]\d{1,3}\b/gi;
      const detectedFaultCodes = text.match(faultCodeRegex) || [];
      
      // Enhanced request with diagnostic context
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          sessionId: sessionId || 'default-session',
          systemPrompt: SYSTEM_PROMPT,
          diagnosticContext: {
            detectedFaultCodes: detectedFaultCodes.length > 0 ? detectedFaultCodes : undefined,
            timestamp: new Date().toISOString(),
            clientInfo: {
              userAgent: navigator.userAgent,
              language: navigator.language,
              onlineStatus: navigator.onLine
            }
          }
        }),
      });

      // Clear timeout since request completed
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('rate_limit');
        } else if (response.status >= 500) {
          throw new Error('server_error');
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('auth_error');
        } else if (response.status === 400 && text.trim().length === 0) {
          throw new Error('empty_message');
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return { text: data.message || data.response || data.answer || 'No response' };
    } catch (error) {
      // Clear timeout if there was an error
      clearTimeout(timeoutId);
      
      console.error('Error sending message:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('timeout');
      } else if (!navigator.onLine) {
        throw new Error('network');
      }
      
      throw error;
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
