/**
 * BoilerBrain LLM Service
 *
 * Implements an intelligent chat service for Gas Safe engineers
 * with fault diagnosis, symptom analysis, and context tracking
 * Integrates with component/system schema for accurate system-specific troubleshooting
 * 
 * Updated with robust fault code handling, response management, and conversation state tracking
 */

import { supabase } from '../supabaseClient';

import { TIME } from './constants';
import { systemSchema } from './systemSchemaLoader';

// Import our robust services
import FaultCodeService from './FaultCodeService';
import ResponseManager from './ResponseManager';
import ConversationStateManager from './ConversationStateManager';

// Session contexts map - keyed by sessionId
const sessionContexts = new Map();

// Helper to create a new context object
function createNewContext() {
  return {
    manufacturer: null,
    model: null,
    gcNumber: null,
    symptoms: [],
    faultCodes: [],
    previousDiagnostics: [],
    heatingSystemType: null, // 'combi', 'system', 'heat-only', 'back boiler'
    systemComponents: [], // radiators, cylinder, tank, pump, etc.
    conversationStage: 'initial', // initial, gathering, diagnosing, suggesting
    messageCount: 0,
    stepCounter: 0, // Tracks which diagnostic step we're on for chunked responses
    diagnosticPath: [], // Stores the complete diagnostic path for reference
    currentComponent: null, // Tracks which component is being diagnosed
    componentSchema: null, // Stores the component schema for the current system type
    corrections: [], // Tracks user corrections for fact-checking
    history: [],

    // Reset context for a new conversation
    reset() {
      this.manufacturer = null;
      this.model = null;
      this.gcNumber = null;
      this.symptoms = [];
      this.faultCodes = [];
      this.previousDiagnostics = [];
      this.heatingSystemType = null;
      this.systemComponents = [];
      this.conversationStage = 'initial';
      this.messageCount = 0;
      this.stepCounter = 0;
      this.diagnosticPath = [];
      this.currentComponent = null;
      this.componentSchema = null;
      this.corrections = [];
      this.history = [];
    },
  };
}

// Get or create a context for a session
function getSessionContext(sessionId) {
  // Generate a default session ID if none provided
  const id = sessionId || 'default';
  
  if (!sessionContexts.has(id)) {
    sessionContexts.set(id, createNewContext());
  }
  
  return sessionContexts.get(id);
}

/**
 * Update context based on user message
 * Extracts key information like manufacturer, model, GC number,
 * heating system type, fault codes, symptoms, and user corrections
 *
 * @param {string} userMessage - Message from the user
 * @param {string} sessionId - ID of the user's session
 */
function updateContext(userMessage, sessionId) {
  // Get the context for this session
  const sessionContext = getSessionContext(sessionId);
  
  // Update message count
  sessionContext.messageCount++;

  // Track the message in history
  sessionContext.history.push({ role: 'user', content: userMessage });

  // Only track the last 10 messages to stay within token limits
  if (sessionContext.history.length > 10) {
    sessionContext.history = sessionContext.history.slice(-10);
  }

  // Check for corrections or contradictions
  const correctionPatterns = [
    /(?:no|incorrect|wrong|that(?:'s| is) not right|actually|in fact)/i,
    /(?:that(?:'s| is) not how|doesn't work that way)/i,
    /(?:you're|you are) (?:incorrect|wrong|mistaken)/i,
  ];

  const isCorrection = correctionPatterns.some(pattern => pattern.test(userMessage));

  if (isCorrection) {
    // Store this as a correction for future fact-checking
    sessionContext.corrections.push({
      message: userMessage,
      timestamp: Date.now(),
    });
  }

  // Extract heating system type
  const previousSystemType = sessionContext.heatingSystemType;

  if (!sessionContext.heatingSystemType || isCorrection) {
    const heatingSystemPatterns = [
      /(?:it's|its|have|got|a|using|with|my)\s+(?:an?\s+)?(combi|combination|system|heat[- ]only|back\s*boiler|conventional)\s+(?:boiler|system)/i,
      /(?:heating|boiler)\s+(?:system\s+)?(?:is|type\s+is)\s+(?:an?\s+)?(combi|combination|system|heat[- ]only|back\s*boiler|conventional)/i,
    ];

    for (const pattern of heatingSystemPatterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        const typeMatch = match[1].toLowerCase();
        if (typeMatch.includes('combi') || typeMatch.includes('combination')) {
          sessionContext.heatingSystemType = 'combi';
        } else if (typeMatch.includes('system')) {
          sessionContext.heatingSystemType = 'system';
        } else if (typeMatch.includes('heat') || typeMatch.includes('conventional')) {
          sessionContext.heatingSystemType = 'heat-only';
        } else if (typeMatch.includes('back')) {
          sessionContext.heatingSystemType = 'back boiler';
        }
        break;
      }
    }

    // Infer from context clues if not explicitly mentioned
    if (!sessionContext.heatingSystemType) {
      if (
        userMessage.toLowerCase().includes('instant hot water') ||
        userMessage.toLowerCase().includes('no cylinder') ||
        userMessage.toLowerCase().includes('direct hot water')
      ) {
        sessionContext.heatingSystemType = 'combi';
      } else if (
        userMessage.toLowerCase().includes('hot water cylinder') &&
        !userMessage.toLowerCase().includes('cold water tank')
      ) {
        sessionContext.heatingSystemType = 'system';
      } else if (
        userMessage.toLowerCase().includes('hot water cylinder') &&
        userMessage.toLowerCase().includes('cold water tank')
      ) {
        sessionContext.heatingSystemType = 'heat-only';
      }
    }
  }

  // If system type changed, load the appropriate component schema
  if (
    sessionContext.heatingSystemType &&
    (sessionContext.heatingSystemType !== previousSystemType || !sessionContext.componentSchema)
  ) {
    loadSystemComponentSchema();
  }

  // Update conversation stage if needed
  if (sessionContext.conversationStage === 'initial' && sessionContext.messageCount > 1) {
    sessionContext.conversationStage = 'gathering';
  } else if (
    sessionContext.conversationStage === 'gathering' &&
    (sessionContext.manufacturer || sessionContext.model || sessionContext.faultCodes.length > 0)
  ) {
    sessionContext.conversationStage = 'diagnosing';
  }

  // Extract mentioned system components
  extractSystemComponents(userMessage, sessionId);
}

/**
 * Load system component schema based on heating system type
 * @param {string} sessionId - ID of the user's session
 */
function loadSystemComponentSchema(sessionId) {
  const sessionContext = getSessionContext(sessionId);
  if (!sessionContext.heatingSystemType) return;

  try {
    // Convert heating system type to the format used in the schema
    const schemaType = sessionContext.heatingSystemType
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace('-', '_');

    // Load components for this system type
    sessionContext.componentSchema = systemSchema.getSystemComponents(schemaType);

    // Extract common component names for this system type
    if (sessionContext.componentSchema && Array.isArray(sessionContext.componentSchema)) {
      sessionContext.systemComponents = sessionContext.componentSchema.map(
        comp => comp.component_name
      );
    }

    if (import.meta.env.DEV) {
      console.log(
        `Loaded schema for ${sessionContext.heatingSystemType} system with ${sessionContext.systemComponents.length} components`
      );
    }
  } catch (error) {
    console.error('Error loading system component schema:', error);
  }
}

/**
 * Extract mentioned system components from user's message
 * @param {string} userMessage - Message from the user
 * @param {string} sessionId - ID of the user's session
 */
function extractSystemComponents(userMessage, sessionId) {
  const sessionContext = getSessionContext(sessionId);
  if (!sessionContext.heatingSystemType || !sessionContext.componentSchema) return;

  try {
    // Look for component names and aliases in the user message
    if (Array.isArray(sessionContext.componentSchema)) {
      for (const component of sessionContext.componentSchema) {
        // Check for component name
        if (userMessage.toLowerCase().includes(component.component_name.toLowerCase())) {
          // Track this as the current component being discussed
          sessionContext.currentComponent = component.component_name;
          return;
        }

        // Check aliases
        if (component.known_aliases && Array.isArray(component.known_aliases)) {
          for (const alias of component.known_aliases) {
            if (userMessage.toLowerCase().includes(alias.toLowerCase().replace(/["\\[\\]]/g, ''))) {
              sessionContext.currentComponent = component.component_name;
              return;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error extracting system components:', error);
  }

  if (import.meta.env.DEV) {
  }
  return sessionContext;
}

/**
 * Lookup fault code in the database
 *
 * @param {string} faultCode - Fault code to lookup
 * @returns {Promise<object|null>} - Fault data or null if not found
 */
/**
 * Fact check user corrections against system component schema
 * @param {string} sessionId - ID of the user's session
 * @returns {string} Fact check context
 */
async function factCheckCorrections(sessionId) {
  const sessionContext = getSessionContext(sessionId);
  if (!sessionContext.corrections || sessionContext.corrections.length === 0) {
    return '';
  }

  // Only focus on the most recent correction for clarity
  const latestCorrection = sessionContext.corrections[sessionContext.corrections.length - 1];
  let factCheckInfo = '';

  try {
    // Get the component information from the schema if available
    if (sessionContext.currentComponent && sessionContext.componentSchema) {
      // Find the component in the schema
      const componentInfo = Array.isArray(sessionContext.componentSchema)
        ? sessionContext.componentSchema.find(
            c => c.component_name.toLowerCase() === sessionContext.currentComponent.toLowerCase()
          )
        : null;

      if (componentInfo) {
        factCheckInfo += `FACT-CHECK INFORMATION:\n`;
        factCheckInfo += `Component: ${componentInfo.component_name}\n`;

        if (componentInfo.description) {
          factCheckInfo += `Description: ${componentInfo.description}\n`;
        }

        if (componentInfo.function) {
          factCheckInfo += `Function: ${componentInfo.function}\n`;
        }

        if (componentInfo.common_faults && Array.isArray(componentInfo.common_faults)) {
          factCheckInfo += `Common faults:\n`;
          componentInfo.common_faults.forEach(fault => {
            factCheckInfo += `- ${fault.fault_name}: ${fault.description}\n`;
            if (fault.symptoms && Array.isArray(fault.symptoms)) {
              factCheckInfo += `  Symptoms: ${fault.symptoms.join(', ')}\n`;
            }
          });
        }

        if (componentInfo.diagnostic_tips && Array.isArray(componentInfo.diagnostic_tips)) {
          factCheckInfo += `Diagnostic tips:\n`;
          componentInfo.diagnostic_tips.forEach(tip => {
            factCheckInfo += `- ${tip}\n`;
          });
        }
      }
    }

    // If we have a system type but no specific component, provide general system info
    if (sessionContext.heatingSystemType && !factCheckInfo) {
      const systemType = sessionContext.heatingSystemType
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace('-', '_');

      const systemData = systemSchema.loadSystemSchema()?.[systemType];

      if (systemData) {
        factCheckInfo += `SYSTEM TYPE INFORMATION:\n`;
        factCheckInfo += `System type: ${sessionContext.heatingSystemType}\n`;

        if (systemData.description) {
          factCheckInfo += `Description: ${systemData.description}\n`;
        }

        if (systemData.key_characteristics && Array.isArray(systemData.key_characteristics)) {
          factCheckInfo += `Key characteristics:\n`;
          systemData.key_characteristics.forEach(characteristic => {
            factCheckInfo += `- ${characteristic}\n`;
          });
        }
      }
    }
  } catch (error) {
    console.error('[boilerBrainLLMService] Error during fact checking:', error);
    // Continue with whatever factCheckInfo we've collected so far
  }
  
  return factCheckInfo;
}

/**
 * Lookup information about a fault code from the knowledge base using robust FaultCodeService
 * @param {string} faultCode - The fault code to look up
 * @param {string} sessionId - ID of the user's session
 * @returns {Promise<object|null>} - Fault data or null if not found
 */
async function lookupFaultCode(faultCode, sessionId) {
  if (!faultCode) return null;
  
  const sessionContext = getSessionContext(sessionId);
  
  try {
    
    // Track this fault code in conversation state
    if (sessionContext && !sessionContext.faultCodes.includes(faultCode)) {
      sessionContext.faultCodes.push(faultCode);
    }
    
    try {
      // Update conversation state manager with this fault code
      ConversationStateManager.updateContext(sessionId, {
        detectedFaultCodes: sessionContext.faultCodes
      });
    } catch (stateErr) {
      console.warn('[boilerBrainLLMService] Error updating conversation state:', stateErr);
      // Don't let state management errors block fault code lookup
    }
    
    // Use our robust FaultCodeService for layered lookup (DB + local JSON)
    const faultData = await FaultCodeService.lookup(
      faultCode, 
      sessionContext.manufacturer,
      sessionContext.model
    );
    
    if (faultData) {
      return faultData;
    }
    
    return null;
  } catch (err) {
    console.error('[boilerBrainLLMService] Error in fault code lookup:', err);
    return null;
  }
}

/**
 * Lookup symptom-based issues from the knowledge base
 * @param {string} sessionId - ID of the user's session
 * @returns {Promise<Array|null>} - Array of issues or null if not found
 */
async function lookupSymptomBasedIssues(sessionId) {
  const sessionContext = getSessionContext(sessionId);
  try {
    // First try with specific manufacturer and model
    if (sessionContext.manufacturer && sessionContext.model) {
      const { data, error } = await supabase
        .from('common_issues')
        .select('*')
        .eq('manufacturer', sessionContext.manufacturer)
        .eq('model', sessionContext.model)
        .limit(10);

      if (!error && data && data.length > 0) {
        // Filter by symptoms
        const matchingIssues = data.filter(issue =>
          sessionContext.symptoms.some(symptom =>
            issue.symptoms.toLowerCase().includes(symptom.toLowerCase())
          )
        );

        if (matchingIssues.length > 0) {
          return matchingIssues[0];
        }
      }
    }

    // If that fails, try with just manufacturer
    if (sessionContext.manufacturer) {
      const { data, error } = await supabase
        .from('common_issues')
        .select('*')
        .eq('manufacturer', sessionContext.manufacturer)
        .limit(10);

      if (!error && data && data.length > 0) {
        // Filter by symptoms
        const matchingIssues = data.filter(issue =>
          sessionContext.symptoms.some(symptom =>
            issue.symptoms.toLowerCase().includes(symptom.toLowerCase())
          )
        );

        if (matchingIssues.length > 0) {
          return matchingIssues[0];
        }
      }
    }

    return null;
  } catch (err) {
    console.error('Error looking up symptom-based issues:', err);
    return null;
  }
}

/**
 * Perform semantic search on knowledge embeddings
 * @param {string} query - Search query
 * @param {string} sessionId - Session ID for context
 * @returns {Promise<Array>} - Array of relevant knowledge items
 */
async function performSemanticSearch(query, sessionId) {
  try {
    const context = getSessionContext(sessionId);
    
    // Build search filters based on context
    let filters = {};
    if (context.manufacturer) {
      filters.manufacturer = context.manufacturer.toLowerCase();
    }
    if (context.heatingSystemType) {
      filters.system_type = context.heatingSystemType;
    }

    if (process.env.NODE_ENV === 'development') {
    }

    // Query knowledge_embeddings with semantic search
    // Note: This would ideally use vector similarity, but for now we'll use text matching
    let searchQuery = supabase
      .from('knowledge_embeddings')
      .select('*')
      .eq('is_active', true)
      .ilike('content', `%${query}%`)
      .limit(5);

    // Add manufacturer filter if available
    if (filters.manufacturer) {
      searchQuery = searchQuery.or(`metadata->>'manufacturer'.ilike.%${filters.manufacturer}%`);
    }

    const { data, error } = await searchQuery;

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[SemanticSearch] Error:', error);
      }
      return [];
    }

    if (process.env.NODE_ENV === 'development') {
    }

    return data || [];
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[SemanticSearch] Exception:', error);
    }
    return [];
  }
}

/**
 * Enhanced symptom lookup with semantic search fallback
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array|null>} - Enhanced symptom data
 */
async function lookupSymptomBasedIssuesEnhanced(sessionId) {
  const context = getSessionContext(sessionId);
  
  // First try the original symptom lookup
  const originalResults = await lookupSymptomBasedIssues(sessionId);
  
  if (originalResults && originalResults.length > 0) {
    return originalResults;
  }

  // If no results, try semantic search with symptoms
  if (context.symptoms && context.symptoms.length > 0) {
    const symptomQuery = context.symptoms.join(' ');
    const semanticResults = await performSemanticSearch(symptomQuery, sessionId);
    
    if (semanticResults && semanticResults.length > 0) {
      // Convert semantic results to the expected format
      return semanticResults.map(result => ({
        content: result.content,
        tag: result.tag,
        source: result.source,
        metadata: result.metadata,
        relevance_score: result.relevance_score || 0.8 // Default high relevance for semantic matches
      }));
    }
  }

  return null;
}

/**
 * Handle initial conversation stage
 * @param {string} sessionId - ID of the user's session
 */
function handleInitialInteraction(sessionId) {
  const sessionContext = getSessionContext(sessionId);
  sessionContext.conversationStage = 'gathering';

  // Use ResponseManager for varied greetings
  const greeting = ResponseManager.getUniqueResponse(sessionId, 'greeting') || 
    "Hi there. I'm BoilerBrain, here to help with your boiler diagnostics. To get started, could you tell me the make and model of the boiler you're working with?";

  return {
    text: greeting,
    source: 'ai_greeting',
  };
}

/**
 * Prompt for boiler information if missing
 * @param {string} sessionId - ID of the user's session
 */
function promptForBoilerInfo(sessionId) {
  const sessionContext = getSessionContext(sessionId);
  
  if (!sessionContext.manufacturer) {
    return {
      text: ResponseManager.getUniqueResponse(sessionId, 'requestManufacturer') || 
        "Could you tell me which manufacturer made the boiler you're working on?",
      source: 'ai_request_manufacturer',
    };
  } else if (!sessionContext.model) {
    return {
      text: ResponseManager.getUniqueResponse(sessionId, 'requestModel') || 
        `Great, so it's a ${sessionContext.manufacturer} boiler. What's the specific model?`,
      source: 'ai_request_model',
    };
  } else {
    sessionContext.conversationStage = 'diagnosing';
    return {
      text: ResponseManager.getUniqueResponse(sessionId, 'requestSymptoms') || 
        'Thanks. Now, what symptoms are you seeing, or is there a fault code displayed?',
      source: 'ai_request_symptoms',
    };
  }
}

/**
 * Format a response for a fault code
 * @param {object} faultData - Fault code data
 * @param {string} sessionId - ID of the user's session
 * @returns {object} Formatted response
 */
async function formatFaultCodeResponse(faultData, sessionId) {
  const sessionContext = getSessionContext(sessionId);
  
  // Update conversation state with this fault code information
  ConversationStateManager.updateContext(sessionId, {
    manufacturer: sessionContext.manufacturer,
    model: sessionContext.model,
    heatingSystemType: sessionContext.heatingSystemType,
    detectedFaultCodes: sessionContext.faultCodes,
    conversationStage: 'diagnosing'
  });
  
  try {
    // Track retry attempts for API resilience
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts <= maxAttempts) {
      try {
        
        // Create a prompt that includes database info but requires reasoning
        const systemMessage = {
          role: 'system',
          content: `You are BoilerBrain, an expert heating engineer assistant. 
          You've found information about a fault code in your database, but you need to analyze and explain it using your expertise.
          DO NOT just repeat the database text. Synthesize, reason, and explain using your engineering knowledge.
          Consider component interactions, probable root causes, and system design aspects.
          Use the database information as ONE input to your reasoning, not your entire response.
          
          IMPORTANT: When working with boilers, always emphasize safety first:
          - For gas issues, remind users to ensure proper ventilation and never attempt repairs themselves
          - For electrical issues, advise turning off power before inspecting components
          - For pressure issues, advise caution with hot water and steam
          
          Provide clear, step-by-step guidance that a heating engineer could follow.`,
        };

        // Create a detailed user message with all available context
        const userMessage = {
          role: 'user',
          content: `I'm working with a ${sessionContext.manufacturer || 'unspecified'} ${sessionContext.model || ''} boiler with ${sessionContext.heatingSystemType ? `a ${sessionContext.heatingSystemType} system` : 'my heating system'}. 
          It's showing fault code ${faultData.code}. Based on your technical expertise and the database information, what's likely happening and how should I approach this problem?`,
        };

        // Provide context about what we found in the database
        const assistantContext = {
          role: 'assistant',
          content: `I found this in my technical database about fault code ${faultData.code} for ${faultData.manufacturer} boilers:\n\n
          Issue description: ${faultData.description}\n\n
          Troubleshooting steps: ${faultData.troubleshooting_steps}\n\n
          ${faultData.safety_warning ? `Safety warning: ${faultData.safety_warning}\n\n` : ''}
          ${faultData.components && faultData.components.length ? `Components involved: ${faultData.components.join(', ')}\n\n` : ''}
          
          Now I'll analyze this situation using my heating engineering knowledge and explain what's likely happening and the best approach to fix it...`,
        };

        const messages = [
          systemMessage,
          userMessage,
          assistantContext,
        ];

        // Try to get a response from the API
        const timeoutMs = 60000; // 60 seconds

        const controller = new AbortController();
        const idTimeout = setTimeout(() => controller.abort(), timeoutMs);

        const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            chatId: sessionId,
          }),
          signal: controller.signal,
        });

        clearTimeout(idTimeout);

        if (!resp.ok) {
          attempts++;
          throw new Error(
            `Failed to get a response: ${resp.status} ${resp.statusText}`,
          );
        }

        const data = await resp.json();
        const aiResponse = data.message.content;
        
        // Check for context issues or repetitive responses using ConversationStateManager
        const history = sessionContext.history || [];
        const contextIssue = ConversationStateManager.detectContextIssues(sessionId, history, aiResponse);
        
        let finalResponse = aiResponse;
        
        // If there are context issues, handle them appropriately
        if (contextIssue.hasIssue) {
          console.warn(`[boilerBrainLLMService] Detected ${contextIssue.issueType} issue in response`);
          
          if (contextIssue.recommendedAction === 'use_varied_response') {
            // Use ResponseManager to get a non-repetitive response
            const variedResponse = ResponseManager.ensureUniqueResponse(
              sessionId, 
              aiResponse, 
              history
            );
            
            if (variedResponse !== aiResponse) {
              finalResponse = variedResponse;
            }
          }
        }

        return {
          text: finalResponse,
          source: 'ai_fault_code',
          faultData,
        };
      } catch (err) {
        if (attempts >= maxAttempts) {
          console.error('[boilerBrainLLMService] Error generating fault code response:', err);
          
          // Use ResponseManager to get a suitable fallback response
          let fallbackResponse;
          try {
            fallbackResponse = ResponseManager.getUniqueResponse(sessionId, 'faultCodeFallback') || 
              `I've found information about fault code ${faultData.code}: ${faultData.description}. ${faultData.troubleshooting_steps} ${faultData.safety_warning ? faultData.safety_warning : ''}`;
          } catch (fallbackErr) {
            console.error('[boilerBrainLLMService] Error generating fallback response:', fallbackErr);
            fallbackResponse = `I've found information about fault code ${faultData.code}: ${faultData.description}. ${faultData.troubleshooting_steps}`;
          }
          
          return {
            text: fallbackResponse,
            source: 'fallback_fault_code',
            faultData,
          };
        }

        attempts++;
        console.warn(
          `[boilerBrainLLMService] Attempt ${attempts} failed, retrying... Error: ${err.message}`,
        );
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Fallback if we somehow exit the while loop without returning
    throw new Error('All retry attempts failed');
  } catch (error) {
    console.error('Error synthesizing fault response:', error);
    // Fallback to the old template method if API call fails
    return {
      text: `Fault Code: ${faultData.code}\n\nDescription: ${faultData.description}\n\nTroubleshooting Steps: ${faultData.troubleshooting_steps}\n\n${faultData.safety_warning ? `Safety Warning: ${faultData.safety_warning}\n\n` : ''}`,
      source: 'database_fault',
    };
  }
}

/**
 * Generate a fallback response when a fault code can't be found
 * @param {string} faultCode - The fault code that wasn't found
 * @param {string} sessionId - ID of the user's session
 * @returns {object} Response with text and metadata
 */
function generateFaultCodeFallbackResponse(faultCode, sessionId) {
  const context = getSessionContext(sessionId);
  
  // Try semantic search for similar fault codes or symptoms
  performSemanticSearch(faultCode, sessionId).then(results => {
    if (results && results.length > 0) {
      // Store semantic results for potential follow-up
      context.semanticMatches = results;
    }
  });

  let response = `I don't have specific information about fault code **${faultCode}**`;
  
  if (context.manufacturer) {
    response += ` for ${context.manufacturer} boilers`;
  }
  
  response += ` in my current database.\n\n`;

  // Enhanced context-aware guidance
  if (context.manufacturer && context.model) {
    response += `For your **${context.manufacturer} ${context.model}** boiler:\n\n`;
  }

  response += `**General Fault Code Troubleshooting Steps:**\n`;
  response += `1. **Check the manual** - Consult your boiler's installation and service manual for manufacturer-specific fault code definitions\n`;
  response += `2. **Basic checks** - Verify gas supply, electrical connections, and system pressure (should be 1-1.5 bar when cold)\n`;
  response += `3. **Reset procedure** - Try resetting the boiler after addressing any obvious issues\n`;
  response += `4. **Professional diagnosis** - If the fault persists, contact a Gas Safe registered engineer\n\n`;

  // Add system-specific advice if available
  if (context.heatingSystemType) {
    const systemAdvice = getSystemSpecificAdvice('fault code');
    if (systemAdvice) {
      response += `**${context.heatingSystemType.charAt(0).toUpperCase() + context.heatingSystemType.slice(1)} Boiler Specific:**\n${systemAdvice}\n\n`;
    }
  }

  // Add manufacturer-specific guidance
  const manufacturerGuidance = {
    'worcester': 'Worcester Bosch fault codes often relate to ignition, pump, or sensor issues. Check the display panel for additional information.',
    'ideal': 'Ideal boiler fault codes typically indicate ignition, overheat, or pressure issues. The LED display may show additional diagnostic information.',
    'vaillant': 'Vaillant fault codes are usually prefixed with F or S. Check the digital display and refer to the quick reference guide.',
    'baxi': 'Baxi fault codes often start with E followed by numbers. The boiler may also show additional status indicators.',
    'viessmann': 'Viessmann fault codes may appear as error messages on the digital display. Check both the boiler and any external controls.'
  };

  if (context.manufacturer) {
    const guidance = manufacturerGuidance[context.manufacturer.toLowerCase()];
    if (guidance) {
      response += `**${context.manufacturer} Specific Guidance:**\n${guidance}\n\n`;
    }
  }

  response += `**Safety Reminder:** Always ensure gas isolation and electrical safety before investigating any boiler faults. Only Gas Safe registered engineers should work on gas appliances.\n\n`;
  response += `If you can provide more details about the symptoms or when the fault occurs, I may be able to offer more specific guidance.`;

  return {
    text: response,
    faultCode: faultCode,
    manufacturer: context.manufacturer || null,
    model: context.model || null,
    fallback: true,
    semanticSearchAttempted: true,
    conversationStage: 'diagnosing'
  };
}

/**
 * Format a response for symptom-based issues
 * @param {Array} issues - Array of issue data
 * @param {object|null} componentContext - Component schema information if available
 * @param {string} sessionId - ID of the user's session
 * @returns {object} Response with text and metadata
 */
async function formatSymptomResponse(issues, componentContext, sessionId) {
  const sessionContext = getSessionContext(sessionId);
  try {
    // Parse diagnostic steps into an array if it's not already
    if (!sessionContext.diagnosticPath.length && issues[0].diagnostic_steps) {
      // Split steps by numbered lists or bullet points
      const stepMatches = issues[0].diagnostic_steps.match(/\d+\.\s+[^\d\n]+|\*\s+[^\*\n]+/g) || [];

      if (stepMatches.length > 0) {
        sessionContext.diagnosticPath = stepMatches.map(step => step.trim());
      } else {
        // If no clear steps found, split by sentences as a fallback
        sessionContext.diagnosticPath = issueData.diagnostic_steps
          .split('.')
          .filter(s => s.trim().length > 0)
          .map(s => s.trim() + '.');
      }

      // Extract component being diagnosed (if mentioned)
      const componentMatch = issueData.issue.match(/check the ([\w\s-]+)/i);
      if (componentMatch) {
        sessionContext.currentComponent = componentMatch[1].trim();
      }
    }

    // Create a prompt that includes database info but requires reasoning
    // Now with step limiting
    const systemMessage = {
      role: 'system',
      content: `You are BoilerBrain, an expert heating engineer assistant.
      You've found information about the reported symptoms in your database, but you need to provide guidance in small, manageable steps.
      
      CRITICAL INSTRUCTIONS:
      - Provide ONLY 1-2 diagnostic steps in each response
      - Be direct and concise - engineers need clarity, not excessive details
      - Wait for the user to complete these steps before providing more
      - If explaining a multi-step component check, break it into separate messages
      - Acknowledge the system type (${sessionContext.heatingSystemType || 'unknown'}) and adapt advice accordingly
      - Include appropriate safety warnings for each component check`,
    };

    const symptoms = sessionContext.symptoms.join(', ');

    // Determine which steps to show in this response
    const currentStepIndex = sessionContext.stepCounter;

    // Determine number of steps to show based on component complexity
    const numStepsToShow = componentContext && componentContext.complexity === 'high' ? 1 : 2;

    let stepsToShow = [];

    if (currentStepIndex < sessionContext.diagnosticPath.length) {
      // Select steps based on where we are in the process and complexity
      stepsToShow = sessionContext.diagnosticPath.slice(
        sessionContext.stepCounter,
        sessionContext.stepCounter + numStepsToShow
      );

      // Update step counter for next time
      sessionContext.stepCounter += stepsToShow.length;

      // If we've reached the end, reset for follow-up diagnostics
      if (sessionContext.stepCounter >= sessionContext.diagnosticPath.length) {
        sessionContext.conversationStage = 'suggesting';
      }
    }

    // Include component-specific advice if available
    let componentAdvice = '';
    if (componentContext) {
      if (componentContext.diagnostic_tips && Array.isArray(componentContext.diagnostic_tips)) {
        componentAdvice = `\n\nBased on the system schema for ${sessionContext.heatingSystemType} systems, here's specific advice for the ${componentContext.component_name}:\n`;
        componentAdvice += componentContext.diagnostic_tips
          .slice(0, 2)
          .map(tip => `- ${tip}`)
          .join('\n');
      }
    }

    // Provide context about issue and some steps
    const assistantContext = {
      role: 'assistant',
      content: `Based on my analysis, the issue with your ${sessionContext.manufacturer} ${sessionContext.model} ${sessionContext.heatingSystemType ? `(${sessionContext.heatingSystemType} system)` : ''} is likely: ${issueData.issue}
      
      ${
        currentStepIndex === 0
          ? `Let's start diagnosing this step-by-step. Here's what to check first:`
          : `Let's continue with the next diagnostic step:`
      }
        
      ${
        stepsToShow.length
          ? stepsToShow.map((step, i) => `${i + 1}. ${step}`).join('\n')
          : "We've gone through all the diagnostic steps. If the issue persists, let's try a different approach."
      }
      
      ${componentAdvice}
      
      ${
        currentStepIndex === 0 && issueData.parts_needed
          ? `\n\nYou might eventually need these parts: ${issueData.parts_needed}, but let's diagnose first before replacing anything.`
          : ''
      }
        
      Let me know what you find after completing ${stepsToShow.length > 1 ? 'these steps' : 'this step'}.`,
    };

    // Call OpenAI API for synthesized response
    const { data } = await supabase.functions.invoke('openai-chat', {
      body: {
        messages: [systemMessage, userMessage, assistantContext],
        model: 'gpt-4-turbo-preview',
        temperature: 0.2,
      },
    });

    return {
      text: data.choices[0].message.content,
      source: 'ai_synthesized_symptoms',
      hasMoreSteps: sessionContext.stepCounter < sessionContext.diagnosticPath.length,
    };
  } catch (error) {
    console.error('Error synthesizing symptom response:', error);

    // Fallback to simplified step-limiting approach
    let fallbackResponse = '';

    if (sessionContext.diagnosticPath.length === 0) {
      // First fallback response if we couldn't parse steps
      fallbackResponse = `Based on the symptoms with your ${sessionContext.manufacturer} ${sessionContext.model}:\n\n
      **Likely issue:** ${issueData.issue}\n\n
      Let's approach this methodically. First, check for:\n\n
      1. ${issueData.diagnostic_steps.split('.')[0]}.\n\n
      Let me know what you find after checking this.`;
    } else {
      // Show next 1-2 steps if we already have parsed steps
      const currentStepIndex = sessionContext.stepCounter;
      const stepsToShow = sessionContext.diagnosticPath.slice(
        currentStepIndex,
        currentStepIndex + (sessionContext.diagnosticPath[currentStepIndex]?.length > 50 ? 1 : 2)
      );

      sessionContext.stepCounter += stepsToShow.length;

      fallbackResponse = `Let's continue diagnosing your ${sessionContext.manufacturer} ${sessionContext.model}:\n\n
      ${stepsToShow.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n
      Let me know what you find after checking ${stepsToShow.length > 1 ? 'these items' : 'this'}.`;
    }

    return {
      text: fallbackResponse,
      source: 'database_symptoms_fallback',
      hasMoreSteps: sessionContext.stepCounter < sessionContext.diagnosticPath.length,
    };
  }
}

/**
 * Generate a fallback response when symptoms don't match a known issue
 * @param {object|null} componentContext - Component schema information if available
 * @param {string} sessionId - ID of the user's session
 * @returns {object} Response with text and metadata
 */
function generateSymptomFallbackResponse(componentContext, sessionId) {
  const context = getSessionContext(sessionId);
  
  // Try semantic search with current symptoms
  let semanticPromise = null;
  if (context.symptoms && context.symptoms.length > 0) {
    semanticPromise = performSemanticSearch(context.symptoms.join(' '), sessionId);
  }

  let response = `Based on the information you've provided, I'll help you troubleshoot your`;
  
  if (context.manufacturer && context.model) {
    response += ` **${context.manufacturer} ${context.model}**`;
  } else if (context.manufacturer) {
    response += ` **${context.manufacturer}**`;
  }
  
  if (context.heatingSystemType) {
    response += ` ${context.heatingSystemType}`;
  }
  
  response += ` boiler.\n\n`;

  // Add symptoms summary if available
  if (context.symptoms && context.symptoms.length > 0) {
    response += `**Symptoms identified:**\n`;
    context.symptoms.forEach((symptom, index) => {
      response += `${index + 1}. ${symptom}\n`;
    });
    response += `\n`;
  }

  // System-specific troubleshooting approach
  response += `**Systematic Troubleshooting Approach:**\n\n`;
  
  // Basic safety and preparation
  response += `**1. Safety First**\n`;
  response += `- Ensure gas isolation valve is accessible\n`;
  response += `- Check for any gas smells (if detected, stop immediately and call National Gas Emergency Service: 0800 111 999)\n`;
  response += `- Have your Gas Safe registration card ready for any engineer visits\n\n`;

  // System pressure check
  response += `**2. System Pressure Check**\n`;
  response += `- Check pressure gauge (should read 1.0-1.5 bar when system is cold)\n`;
  response += `- If low: look for visible leaks, check radiator valves, and top up if safe to do so\n`;
  response += `- If high (above 2.5 bar): may indicate expansion vessel issues\n\n`;

  // Power and controls
  response += `**3. Power and Controls**\n`;
  response += `- Verify electrical supply to boiler\n`;
  response += `- Check programmer/timer settings\n`;
  response += `- Test room thermostat operation\n`;
  response += `- Ensure any external controls are calling for heat/hot water\n\n`;

  // System-specific guidance
  if (context.heatingSystemType) {
    response += `**4. ${context.heatingSystemType.charAt(0).toUpperCase() + context.heatingSystemType.slice(1)} Boiler Specific Checks**\n`;
    
    switch (context.heatingSystemType) {
      case 'combi':
        response += `- Test hot water flow rate (should be adequate for DHW demand)\n`;
        response += `- Check diverter valve operation (heating vs hot water priority)\n`;
        response += `- Verify plate heat exchanger isn't blocked\n`;
        response += `- Test flow sensor/turbine operation\n`;
        break;
      case 'system':
        response += `- Check unvented cylinder thermostat and controls\n`;
        response += `- Verify motorized valve operation (heating/hot water zones)\n`;
        response += `- Test cylinder temperature and recovery time\n`;
        response += `- Check expansion vessel (both boiler and cylinder)\n`;
        break;
      case 'heat-only':
        response += `- Check feed and expansion tank water levels\n`;
        response += `- Verify external pump operation\n`;
        response += `- Test motorized valve switching\n`;
        response += `- Check for airlocks in gravity circuits\n`;
        break;
      case 'back_boiler':
        response += `- Ensure adequate ventilation around the unit\n`;
        response += `- Check pilot light operation (if applicable)\n`;
        response += `- Verify flue draw and termination\n`;
        response += `- Test thermocouple and gas valve operation\n`;
        break;
    }
    response += `\n`;
  }

  // Component-specific advice if available
  if (componentContext) {
    response += `**5. Component-Specific Guidance**\n`;
    response += `Based on your system type, pay particular attention to:\n`;
    response += `- **${componentContext.component_name}**: ${componentContext.description || 'Key component for your system type'}\n`;
    if (componentContext.common_issues) {
      response += `- Common issues: ${componentContext.common_issues}\n`;
    }
    response += `\n`;
  }

  // Manufacturer-specific notes
  if (context.manufacturer) {
    const manufacturerNotes = {
      'worcester': 'Worcester Bosch boilers often have diagnostic LEDs - check the sequence and refer to the manual for interpretation.',
      'ideal': 'Ideal boilers typically show fault codes on the display - note any codes and their sequence for diagnosis.',
      'vaillant': 'Vaillant boilers have comprehensive self-diagnostics - check the digital display for error codes and status.',
      'baxi': 'Baxi boilers may show multiple status indicators - check all LEDs and display messages for complete diagnosis.',
      'viessmann': 'Viessmann boilers have advanced diagnostics - use the service menu if accessible for detailed fault information.'
    };
    
    const note = manufacturerNotes[context.manufacturer.toLowerCase()];
    if (note) {
      response += `**${context.manufacturer} Specific:**\n${note}\n\n`;
    }
  }

  // Next steps
  response += `**Next Steps:**\n`;
  response += `1. Work through the checks systematically\n`;
  response += `2. Note any fault codes or unusual behavior\n`;
  response += `3. If you find specific fault codes, I can provide more targeted guidance\n`;
  response += `4. For gas-related issues or if you're unsure, contact a Gas Safe registered engineer\n\n`;

  response += `**What information would be most helpful next?**\n`;
  response += `- Any fault codes displayed?\n`;
  response += `- Specific symptoms or unusual behavior?\n`;
  response += `- Results from the systematic checks above?\n`;

  // Handle semantic search results asynchronously
  if (semanticPromise) {
    semanticPromise.then(results => {
      if (results && results.length > 0) {
        context.semanticMatches = results;
        // Could potentially trigger a follow-up response with semantic matches
      }
    });
  }

  return {
    text: response,
    symptoms: context.symptoms || [],
    manufacturer: context.manufacturer || null,
    model: context.model || null,
    systemType: context.heatingSystemType || null,
    componentContext: componentContext || null,
    fallback: true,
    systematicApproach: true,
    conversationStage: 'diagnosing',
    nextSteps: ['fault_codes', 'symptoms', 'check_results']
  };
}

/**
 * Generate system-specific troubleshooting advice based on heating system type
 */
function getSystemSpecificAdvice(symptom) {
  const type = sessionContext.heatingSystemType;

  const advice = {
    combi: {
      'no hot water':
        'For a combi boiler, check the diverter valve, plate heat exchanger, and flow sensor/turbine. These are common failure points for hot water issues.',
      'no heating':
        "For a combi boiler, verify the diverter valve is shifting to the heating position when there's a demand. Also check the pump and heating circuit.",
      pressure:
        'On combi boilers, pressure issues often relate to the auto air vent, expansion vessel, or pressure relief valve. There could also be a leak in the plate heat exchanger.',
    },
    system: {
      'no hot water':
        'For a system boiler, check the cylinder thermostat, 3-way valve operation, and that the programmer is correctly configured for hot water timing.',
      'no heating':
        'On system boilers, verify the 3-way valve is directing flow to radiators when heating is demanded. Also check the pump and zone controls if installed.',
      pressure:
        'For system boilers, check the expansion vessel in both the boiler and the unvented cylinder. Also inspect the pressure relief valve and tundish for discharge.',
    },
    'heat-only': {
      'no hot water':
        'For a heat-only boiler, check the cylinder thermostat, feed and expansion tank water levels, and motorized valve operation.',
      'no heating':
        'With heat-only boilers, check the external pump, motorized valves, and zone controls if fitted. Also verify header tank levels.',
      pressure:
        'Heat-only boilers operate on an open-vented system - check feed and expansion tank levels and for airlocks in the gravity circuit.',
    },
    'back boiler': {
      'no hot water':
        'For back boilers, check the pilot light (if applicable), thermocouple, and ensure adequate ventilation around the fire/boiler unit.',
      'no heating':
        'Back boilers often use external pumps - check pump operation, thermostats, and that the fire front is operating correctly if integrated.',
      pressure:
        'Back boilers typically use open-vented systems - check feed and expansion tank water levels and connections.',
    },
  };

  if (!type || !advice[type]) {
    return '';
  }

  // Match the symptom to an advice category
  let adviceKey = 'no heating'; // Default

  if (symptom.includes('hot water') || symptom.includes('dhw')) {
    adviceKey = 'no hot water';
  } else if (symptom.includes('pressure') || symptom.includes('leak')) {
    adviceKey = 'pressure';
  }

  return advice[type][adviceKey] || '';
}

/**
 * Process a user message and generate a response
 *
 * @param {Array} history - Chat history array
 * @param {string} sessionId - ID of the user's session
 * @returns {Promise<object>} - Response object with text and metadata
 */
async function processMessage(history, sessionId = null) {
  // Get the context for this session
  const sessionContext = getSessionContext(sessionId);
  
  // Reset memory if new conversation
  if (!history || history.length <= 1) {
    sessionContext.reset();
  }

  // Always keep the last message in history
  const lastMessage = history && history.length > 0 ? history[history.length - 1] : null;

  if (!lastMessage || lastMessage.role !== 'user') {
    return {
      text: "I'm sorry, I didn't receive a message to process.",
    };
  }

  // Update context based on user's message
  updateContext(lastMessage.content, sessionId);

  // Check if this is a correction and we should perform fact-checking
  let factCheckContext = '';
  if (sessionContext.corrections && sessionContext.corrections.length > 0) {
    // Only fact-check if the latest correction was from the current message
    const latestCorrection = sessionContext.corrections[sessionContext.corrections.length - 1];
    if (Date.now() - latestCorrection.timestamp < TIME.MINUTE_MS) {
      factCheckContext = await factCheckCorrections(sessionId);
    }
  }

  // Update system component schema if needed based on current context
  if (sessionContext.heatingSystemType && !sessionContext.componentSchema) {
    loadSystemComponentSchema(sessionId);
  }

  // Handle different conversation stages
  switch (sessionContext.conversationStage) {
    case 'initial':
      return handleInitialInteraction(sessionId);
    case 'gathering':
      // Check if we're missing crucial boiler info
      if (!sessionContext.manufacturer && !sessionContext.model) {
        return promptForBoilerInfo(sessionId);
      }
    // Fall through to diagnosing if we have some information
    case 'diagnosing':
      // If we have a fact-check context from a user correction, address it first
      if (factCheckContext) {
        return {
          text: `Based on the technical information in our system schema for ${sessionContext.heatingSystemType || 'heating systems'}, I should clarify my previous response. ${factCheckContext}`,
          factCheck: true,
          systemTypeContext: sessionContext.heatingSystemType || null,
          componentContext: sessionContext.currentComponent || null,
        };
      }

      // If we have a fault code, prioritize that for diagnosis
      if (sessionContext.faultCodes.length > 0) {
        const faultData = await lookupFaultCode(sessionContext.faultCodes[0], sessionId);
        if (faultData) {
          return formatFaultCodeResponse(faultData, sessionId);
        } else {
          return generateFaultCodeFallbackResponse(sessionContext.faultCodes[0], sessionId);
        }
      }

      // Otherwise, try to diagnose based on symptoms
      const issueData = await lookupSymptomBasedIssuesEnhanced(sessionId);

      // Check if we have relevant component information from the system schema
      let componentContext = null;
      if (sessionContext.currentComponent && sessionContext.componentSchema) {
        const relevantComponent = Array.isArray(sessionContext.componentSchema)
          ? sessionContext.componentSchema.find(
              c => c.component_name.toLowerCase() === sessionContext.currentComponent.toLowerCase()
            )
          : null;

        if (relevantComponent) {
          componentContext = relevantComponent;
        }
      }

      if (issueData && Array.isArray(issueData) && issueData.length > 0) {
        return formatSymptomResponse(issueData, componentContext, sessionId);
      } else {
        return generateSymptomFallbackResponse(componentContext, sessionId);
      }
    default:
      return {
        text: "I'm having trouble understanding where we are in the diagnostic process. Can you tell me what issue you're experiencing with your boiler?",
      };
  }

  // Simulate a brief thinking delay for a more natural conversation flow
  await new Promise(resolve => setTimeout(resolve, TIME.SECOND / 2));

  return response;
}

// Public API
export const boilerBrainLLMService = {
  processMessage,

  // Expose session context for persistence/debugging
  getSessionContext(sessionId = null) {
    return { ...getSessionContext(sessionId) };
  },

  // Allow setting session context from saved state
  restoreSessionContext(savedContext, sessionId = null) {
    const sessionContext = getSessionContext(sessionId);
    Object.keys(savedContext).forEach(key => {
      if (sessionContext.hasOwnProperty(key)) {
        sessionContext[key] = savedContext[key];
      }
    });
  },

  // Clear session context
  clearSessionContext(sessionId = null) {
    const sessionContext = getSessionContext(sessionId);
    sessionContext.reset();
  },
};
