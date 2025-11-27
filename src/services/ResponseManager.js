/**
 * ResponseManager Service
 * Manages the generation and processing of AI responses for the BoilerBrain chat
 */

import { getOpenAIReasoner } from '../utils/llmService';
import { 
  extractBoilerInfo, 
  extractBoilerComponents, 
  extractBoilerSymptoms 
} from '../utils/nlpUtils';
import { extractFaultCodes } from '../utils/faultCodeUtils';
import faultCodeService from './FaultCodeService';
import ConversationStateManager from './ConversationStateManager';
import { safelyAddResponseToContext } from '../utils/contextUtils';

// System prompt for the AI assistant (engineer-level)
const SYSTEM_PROMPT = `You're a lead Gas Safe engineer with 20+ years on-the-tools experience.

STYLE:
- Talk like one engineer to another. Keep it short, practical, and conversational (2–4 sentences).
- If info is missing, ask ONE focused question. Otherwise, do not re-ask for details the user already provided.
- Use previous messages and session memory. Assume the same job unless the user says otherwise.

FAULT CODES:
- If a fault code is mentioned, give the most likely cause first, then a quick check, then the next step.
- Reference model/manufacturer-specific nuances when known.

SAFETY & PRACTICALITY:
- Always include relevant safety notes briefly when needed.
- Give realistic time hints and field tips where appropriate.
`;

class ResponseManager {
  constructor() {
    // Initialize the OpenAI reasoner with our system prompt
    this.reasoner = getOpenAIReasoner({
      model: 'gpt-3.5-turbo',
      systemPrompt: SYSTEM_PROMPT
    });
    
    // Keep track of conversation context
    this.conversationContext = [];
    
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
    }
  }

  /**
   * Format a diagnostic response for display
   * @param {object|null} diagnosticData
   * @returns {string}
   */
  formatDiagnosticResponse(diagnosticData) {
    if (!diagnosticData || typeof diagnosticData !== 'object') {
      return 'No diagnostic information is available at this time.';
    }
    const { faultCode, manufacturer, description, solutions } = diagnosticData;
    const parts = [];
    if (faultCode) parts.push(`Fault Code: ${faultCode}`);
    if (manufacturer) parts.push(`Manufacturer: ${manufacturer}`);
    if (description) parts.push(`Description: ${description}`);
    if (Array.isArray(solutions) && solutions.length) {
      parts.push(`Possible solutions: ${solutions.join(', ')}`);
    }
    return parts.join(' | ') || 'No diagnostic information is available at this time.';
  }

  /**
   * Format an error response safely (without leaking secrets)
   * @param {Error|string} error
   * @returns {string}
   */
  formatErrorResponse(error) {
    const message = typeof error === 'string' ? error : error?.message || 'Unknown error';
    // Simple sanitization to avoid leaking obvious secrets/tokens
    const sanitized = message.replace(/(api|key|password|token)[:=\s]*[^\s]+/gi, '$1:[redacted]');
    return `An error occurred: ${sanitized}`;
  }

  /**
   * Validate a standard response shape
   * @param {object} response
   * @returns {boolean}
   */
  validateResponse(response) {
    if (!response || typeof response !== 'object') return false;
    const hasSuccess = typeof response.success === 'boolean';
    const hasMessage = 'message' in response || 'text' in response;
    const hasData = 'data' in response ? typeof response.data === 'object' || response.data === null : true;
    return hasSuccess && hasMessage && hasData;
  }
  

  /**
   * Generate a response to the user's query
   * 
   * @param {string} query - User's query text
   * @param {string} [sessionId=null] - Session ID for persistence
   * @returns {Promise<Object>} Response object with text and metadata
   */
  async generateResponse(query, sessionId = null) {
    try {
      if (!query || typeof query !== 'string' || query.trim() === '') {
        throw new Error('Invalid query: empty or not a string');
      }
      
      const sanitizedQuery = this.sanitizeInput(query);
      
      // Extract potentially useful information from the query
      const extractedInfo = this.extractInfoFromQuery(sanitizedQuery);
      
      // Get conversation state if sessionId is provided
      let conversationState = {};
      let csm = null;
      if (sessionId) {
        csm = new ConversationStateManager(sessionId);
        conversationState = csm.getContext();
      }
      
      // Build the context for the AI (includes fault code lookups)
      const context = await this.buildContext(sanitizedQuery, extractedInfo, conversationState);
      
      // Build a dynamic per-call system prompt to avoid re-asking for info already supplied
      let promptOverride = null;
      try {
        const details = [];
        const bi = extractedInfo?.boilerInfo || {};
        const manuf = bi.manufacturer ? String(bi.manufacturer).trim() : '';
        const model = bi.model ? String(bi.model).trim() : '';
        if (manuf || model) {
          details.push(`Boiler: ${[manuf, model].filter(Boolean).join(' ')}`);
        }
        if (Array.isArray(extractedInfo?.faultCodes) && extractedInfo.faultCodes.length > 0) {
          details.push(`Fault codes: ${extractedInfo.faultCodes.join(', ')}`);
        }
        if (details.length) {
          promptOverride = `${SYSTEM_PROMPT}\n\nContext from user message: ${details.join(' | ')}\nDo not ask for these details again; proceed with targeted diagnostic guidance.`;
        }
      } catch (_) {
        // non-fatal; fall back to base prompt
      }

      // Generate response using the AI model, passing sessionId for server memory and prompt override
      const response = await this.reasoner(sanitizedQuery, context, { sessionId, systemPromptOverride: promptOverride });
      
      // Process the response to include any additional information
      const processedResponse = await this.processResponse(
        response, 
        extractedInfo,
        conversationState
      );
      
      // Update conversation context for future interactions
      this.conversationContext = safelyAddResponseToContext(
        this.conversationContext, 
        sanitizedQuery, 
        false
      );
      
      this.conversationContext = safelyAddResponseToContext(
        this.conversationContext, 
        processedResponse.text, 
        true
      );
      
      // Update conversation state if sessionId is provided
      if (csm) {
        csm.updateSession({
          lastQuery: sanitizedQuery,
          lastResponse: processedResponse,
          extractedInfo,
          timestamp: new Date().toISOString()
        });
      }
      
      return processedResponse;
    } catch (error) {
      console.error('Error generating response:', error);
      
      // Return a friendly error message
      return {
        text: "I'm sorry, I encountered an issue while processing your question. Please try again or rephrase your question.",
        error: error.message,
        success: false
      };
    }
  }
  
  /**
   * Sanitize user input to prevent issues
   * 
   * @param {string} input - User input to sanitize
   * @returns {string} Sanitized input
   */
  sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';
    
    // Remove potentially problematic characters
    return input
      .trim()
      .replace(/[\\<>]/g, '')  // Remove characters that could cause issues
      .slice(0, 500);          // Limit length
  }
  
  /**
   * Extract relevant information from user query
   * 
   * @param {string} query - User's query text
   * @returns {Object} Extracted information
   */
  extractInfoFromQuery(query) {
    return {
      boilerInfo: extractBoilerInfo(query),
      components: extractBoilerComponents(query),
      symptoms: extractBoilerSymptoms(query),
      faultCodes: extractFaultCodes(query)
    };
  }
  
  /**
   * Build context for the AI model based on the current conversation and extracted info
   * 
   * @param {string} query - User's query
   * @param {Object} extractedInfo - Information extracted from the query
   * @param {Object} conversationState - Current conversation state
   * @returns {Array} Context messages for the AI model
   */
  async buildContext(query, extractedInfo, conversationState = {}) {
    // Start with the existing conversation context
    const context = [...this.conversationContext];
    
    // Add fault code information if detected
    if (extractedInfo.faultCodes && extractedInfo.faultCodes.length > 0) {
      // Look up each fault code (sequential to keep order deterministic)
      for (const code of extractedInfo.faultCodes) {
        // Try with the manufacturer if we have it
        let manufacturer = null;
        if (extractedInfo.boilerInfo && extractedInfo.boilerInfo.manufacturer) {
          manufacturer = extractedInfo.boilerInfo.manufacturer;
        }

        // Look up the fault code
        const faultCodeInfo = await faultCodeService.findFaultCode(code, manufacturer);

        if (faultCodeInfo?.found && Array.isArray(faultCodeInfo.matches) && faultCodeInfo.matches.length > 0) {
          const match = faultCodeInfo.matches[0];
          const solutions = Array.isArray(match.solutions) ? match.solutions.join(', ') : '';
          const manufacturerText = match.manufacturer || manufacturer || 'the relevant';
          context.push({
            role: 'system',
            content: `The user mentioned fault code ${code}. This fault code is for ${manufacturerText} boilers and means: "${match.description || 'No description available'}".${solutions ? ` Common solutions include: ${solutions}.` : ''}`
          });
        }
      }
    }
    
    // Add boiler information if detected
    if (extractedInfo.boilerInfo) {
      const { manufacturer, model } = extractedInfo.boilerInfo;
      
      if (manufacturer || model) {
        context.push({
          role: 'system',
          content: `The user has mentioned a ${manufacturer || ''} ${model || ''} boiler.`
        });
      }
    }
    
    // Add previous conversation state context if available
    if (conversationState.previousTopics) {
      context.push({
        role: 'system',
        content: `Previously, the user has discussed: ${conversationState.previousTopics.join(', ')}.`
      });
    }
    
    return context;
  }
  
  /**
   * Process the AI response to add additional information if needed
   * 
   * @param {string} response - Raw AI response
   * @param {Object} extractedInfo - Information extracted from the query
   * @param {Object} conversationState - Current conversation state
   * @returns {Object} Processed response with additional metadata
   */
  async processResponse(response, extractedInfo, conversationState = {}) {
    // Start with the basic response
    const processedResponse = {
      text: response,
      success: true,
      timestamp: new Date().toISOString()
    };
    
    // Add fault code information if detected but not answered in the response
    if (extractedInfo.faultCodes && extractedInfo.faultCodes.length > 0) {
      const faultCodeDetails = [];
      
      for (const code of extractedInfo.faultCodes) {
        // Only add if the fault code isn't already clearly explained in the response
        if (!response.includes(`fault code ${code}`) && !response.includes(`code ${code}`)) {
          const faultCodeInfo = await faultCodeService.findFaultCode(code);
          
          if (faultCodeInfo?.found && Array.isArray(faultCodeInfo.matches) && faultCodeInfo.matches.length > 0) {
            faultCodeDetails.push(faultCodeInfo.matches[0]);
          }
        }
      }
      
      if (faultCodeDetails.length > 0) {
        processedResponse.faultCodeDetails = faultCodeDetails;
        
        // Add fault code info to the text if not already included
        const faultCodeSummary = faultCodeDetails.map(detail => 
          `Fault code ${detail.fault_code}: ${detail.description}`
        ).join('\n');
        
        processedResponse.text += `\n\nAdditional fault code information:\n${faultCodeSummary}`;
      }
    }
    
    // Add metadata to help with UI rendering
    processedResponse.metadata = {
      extractedInfo,
      hasFaultCodes: extractedInfo.faultCodes && extractedInfo.faultCodes.length > 0,
      hasBoilerInfo: !!extractedInfo.boilerInfo,
      detectedComponents: extractedInfo.components,
      detectedSymptoms: extractedInfo.symptoms
    };
    
    return processedResponse;
  }
  
  /**
   * Reset the conversation context
   */
  resetConversation() {
    this.conversationContext = [];
  }
  
  /**
   * Fact check specific statements in the response
   * 
   * @param {string} response - Response to fact check
   * @returns {Object} Fact checking results
   */
  factCheckCorrections(response) {
    try {
      const corrections = [];
      
      // Common misconceptions to check for
      const checkPatterns = [
        {
          pattern: /all boilers need annual service/i,
          correction: 'Most boilers should have annual service, but some manufacturers specify different intervals.'
        },
        {
          pattern: /bleeding radiators will fix all heating problems/i,
          correction: 'While bleeding radiators can resolve air locks, many heating issues require different solutions.'
        },
        {
          pattern: /pressure should be above ([3-9]|[1-9][0-9]) bar/i,
          correction: 'Most domestic boilers should operate with pressure between 1-2 bar. Pressure above 3 bar is usually excessive.'
        }
      ];
      
      // Check for patterns that need correction
      checkPatterns.forEach(check => {
        if (check.pattern.test(response)) {
          corrections.push(check.correction);
        }
      });
      
      return {
        hasCorrections: corrections.length > 0,
        corrections
      };
    } catch (error) {
      console.error('Error during fact checking:', error);
      return {
        hasCorrections: false,
        corrections: []
      };
    }
  }
}

// Export a singleton instance
const responseManager = new ResponseManager();
export default responseManager;
