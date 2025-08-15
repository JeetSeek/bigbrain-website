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
import conversationStateManager from './ConversationStateManager';
import { safelyAddResponseToContext } from '../utils/contextUtils';

// System prompt for the AI assistant
const SYSTEM_PROMPT = `
You are BoilerBrain, a virtual assistant that specializes in helping with heating system problems.
Your expertise is in diagnosing boiler issues, explaining fault codes, and recommending solutions.
Keep responses concise but helpful, focusing on practical advice.
When discussing technical issues, prioritize safety and recommend professional help when appropriate.
If you're not sure about something, acknowledge that limitation instead of providing potentially incorrect information.
If the user mentions a fault code, explain what it means and suggest common fixes.
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
      if (sessionId) {
        conversationState = await conversationStateManager.getConversationState(sessionId);
      }
      
      // Build the context for the AI
      const context = this.buildContext(sanitizedQuery, extractedInfo, conversationState);
      
      // Generate response using the AI model
      const response = await this.reasoner(sanitizedQuery, context);
      
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
      if (sessionId) {
        await conversationStateManager.updateConversationState(
          sessionId, 
          {
            lastQuery: sanitizedQuery,
            lastResponse: processedResponse,
            extractedInfo,
            timestamp: new Date().toISOString()
          }
        );
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
  buildContext(query, extractedInfo, conversationState = {}) {
    // Start with the existing conversation context
    const context = [...this.conversationContext];
    
    // Add fault code information if detected
    if (extractedInfo.faultCodes && extractedInfo.faultCodes.length > 0) {
      // Look up each fault code
      extractedInfo.faultCodes.forEach(code => {
        // Try with the manufacturer if we have it
        let manufacturer = null;
        if (extractedInfo.boilerInfo && extractedInfo.boilerInfo.manufacturer) {
          manufacturer = extractedInfo.boilerInfo.manufacturer;
        }
        
        // Look up the fault code
        const faultCodeInfo = faultCodeService.findFaultCode(code, manufacturer);
        
        if (faultCodeInfo.found && faultCodeInfo.matches.length > 0) {
          // We found information about this fault code, add it to the context
          const match = faultCodeInfo.matches[0];
          
          context.push({
            role: 'system',
            content: `The user mentioned fault code ${code}. This fault code is for ${match.manufacturer} boilers and means: "${match.description}". Common solutions include: ${match.solutions.join(', ')}.`
          });
        }
      });
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
          const faultCodeInfo = faultCodeService.findFaultCode(code);
          
          if (faultCodeInfo.found && faultCodeInfo.matches.length > 0) {
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
