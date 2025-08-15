/**
 * Interactive Diagnostic Workflow Service
 * Implements proper Gas Safe engineer methodology with stepwise information gathering
 * Follows the correct diagnostic sequence: System Type → Make/Model → Fault Codes → Detailed Diagnosis
 */

export class InteractiveDiagnosticWorkflow {
  constructor() {
    this.requiredInfo = {
      systemType: ['combi', 'system', 'heat-only', 'back boiler', 'regular'],
      manufacturers: [
        'ideal', 'worcester', 'worcester bosch', 'vaillant', 'baxi', 'potterton',
        'glow-worm', 'glow worm', 'viessmann', 'ariston', 'ferroli', 'intergas',
        'johnson and starley', 'johnson & starley', 'main', 'ravenheat',
        'siemens', 'sime', 'vokera', 'acv', 'alpha', 'danfoss'
      ]
    };
  }

  /**
   * Analyze conversation history to determine what information is missing
   * @param {Array} history - Conversation history
   * @param {string} currentMessage - Current user message
   * @returns {Object} Analysis of missing information and next steps
   */
  analyzeInformationGaps(history, currentMessage) {
    const fullText = [currentMessage, ...history.slice(-5).map(h => h.text || '')].join(' ').toLowerCase();
    
    const analysis = {
      hasSystemType: false,
      hasMakeModel: false,
      hasFaultCodes: false,
      hasBasicChecks: false,
      systemType: null,
      manufacturer: null,
      model: null,
      faultCodes: [],
      basicChecks: {
        gasSupply: null,
        power: null,
        pressure: null,
        isolation: null
      },
      nextQuestion: null,
      shouldProceedWithDiagnosis: false,
      diagnosticStage: 'initial'
    };

    // Check for system type with enhanced detection
    const systemTypeIndicators = {
      'combi': ['combi', 'combination', 'instant hot water', 'no cylinder'],
      'system': ['system boiler', 'separate cylinder', 'hot water cylinder', 'unvented cylinder'],
      'regular': ['regular boiler', 'heat only', 'heat-only', 'conventional', 'cold water tank', 'gravity fed'],
      'back boiler': ['back boiler', 'back-boiler']
    };

    for (const [type, indicators] of Object.entries(systemTypeIndicators)) {
      if (indicators.some(indicator => fullText.includes(indicator))) {
        analysis.hasSystemType = true;
        analysis.systemType = type;
        break;
      }
    }

    // Fallback to original simple check
    if (!analysis.hasSystemType) {
      for (const type of this.requiredInfo.systemType) {
        if (fullText.includes(type)) {
          analysis.hasSystemType = true;
          analysis.systemType = type;
          break;
        }
      }
    }

    // Check for manufacturer
    const sortedManufacturers = this.requiredInfo.manufacturers.sort((a, b) => b.length - a.length);
    for (const manufacturer of sortedManufacturers) {
      if (fullText.includes(manufacturer)) {
        analysis.hasMakeModel = true;
        analysis.manufacturer = manufacturer;
        break;
      }
    }

    // Check for model (basic pattern matching)
    const modelPatterns = [
      /\b(logic\s*combi?\s*\d+[a-z]*)/i,
      /\b(ecotec\s*\d+[a-z]*)/i,
      /\b(greenstar\s*\d+[a-z]*)/i,
      /\b(combi?\s*\d+[a-z]*)/i,
      /\b([a-z]+\s*\d+[a-z]*)/i
    ];

    for (const pattern of modelPatterns) {
      const match = fullText.match(pattern);
      if (match) {
        analysis.model = match[1];
        break;
      }
    }

    // Check for fault codes
    const faultCodeMatches = fullText.match(/\b[FELA]\d{1,3}\b/gi) || [];
    analysis.faultCodes = faultCodeMatches;
    analysis.hasFaultCodes = faultCodeMatches.length > 0 || fullText.includes('no fault codes') || fullText.includes('none are hot') || fullText.includes('no codes');

    // Check for basic engineer checks
    analysis.basicChecks.gasSupply = this.checkMentioned(fullText, ['gas supply', 'gas on', 'gas off', 'gas valve', 'gas meter']);
    analysis.basicChecks.power = this.checkMentioned(fullText, ['power', 'electricity', 'switched on', 'mains', 'electric']);
    analysis.basicChecks.pressure = this.checkMentioned(fullText, ['pressure', 'bar', 'gauge', 'manometer']);
    analysis.basicChecks.isolation = this.checkMentioned(fullText, ['isolated', 'isolation', 'switched off', 'safe']);
    
    analysis.hasBasicChecks = Object.values(analysis.basicChecks).some(check => check !== null);

    // Determine diagnostic stage and next question based on Gas Safe methodology
    // Be more flexible - proceed with diagnosis if we have enough information
    const hasMinimumInfo = analysis.hasMakeModel || analysis.hasFaultCodes || 
                          (analysis.hasSystemType && fullText.includes('no hot water')) ||
                          fullText.includes('heating works') || fullText.includes('fires up');
  
    if (hasMinimumInfo) {
      analysis.shouldProceedWithDiagnosis = true;
      analysis.diagnosticStage = 'detailed_diagnosis';
    } else if (!analysis.hasFaultCodes && !analysis.hasMakeModel) {
      analysis.nextQuestion = 'faultCodes';
      analysis.diagnosticStage = 'fault_codes';
    } else if (!analysis.hasSystemType && !analysis.hasMakeModel) {
      analysis.nextQuestion = 'systemType';
      analysis.diagnosticStage = 'system_type';
    } else if (!analysis.hasMakeModel) {
      analysis.nextQuestion = 'makeModel';
      analysis.diagnosticStage = 'make_model';
    } else {
      analysis.shouldProceedWithDiagnosis = true;
      analysis.diagnosticStage = 'detailed_diagnosis';
    }

    return analysis;
  }

  /**
   * Check if any of the keywords are mentioned in the text
   * @param {string} text - Text to search in
   * @param {Array} keywords - Keywords to search for
   * @returns {boolean|null} True if mentioned positively, false if mentioned negatively, null if not mentioned
   */
  checkMentioned(text, keywords) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        // Check for negative context
        const negativeWords = ['no', 'not', 'without', 'missing', 'off', 'down', 'broken', 'failed'];
        const keywordIndex = text.indexOf(keyword);
        const beforeKeyword = text.substring(Math.max(0, keywordIndex - 20), keywordIndex);
        
        const hasNegative = negativeWords.some(neg => beforeKeyword.includes(neg));
        return !hasNegative;
      }
    }
    return null;
  }

  /**
   * Generate appropriate system prompt based on information gaps
   * @param {Object} analysis - Information gap analysis
   * @param {string} basePrompt - Base system prompt
   * @param {Object} originalIssue - Original reported issue to maintain focus
   * @returns {string} Enhanced interactive system prompt
   */
  generateInteractivePrompt(analysis, basePrompt, originalIssue = null) {
    let interactivePrompt = basePrompt;

    // Add original issue context to maintain diagnostic focus
    if (originalIssue && originalIssue.focus) {
      interactivePrompt += `\n\n**ORIGINAL REPORTED ISSUE:**\n`;
      interactivePrompt += `Primary Problem: ${originalIssue.focus}\n`;
      interactivePrompt += `Symptoms: ${originalIssue.symptoms.join(', ')}\n`;
      interactivePrompt += `Context: "${originalIssue.context}"\n`;
      interactivePrompt += `\n**CRITICAL: Stay focused on this ${originalIssue.focus} issue throughout the entire diagnostic conversation. Do NOT switch to unrelated problems.**\n\n`;
    }

    // Add interactive diagnostic methodology
    interactivePrompt += `**INTERACTIVE DIAGNOSTIC METHODOLOGY:**\n`;
    interactivePrompt += `You must follow proper Gas Safe engineer diagnostic sequence:\n`;
    interactivePrompt += `1. System Type (combi/system/heat-only/back boiler)\n`;
    interactivePrompt += `2. Make and Model + GC number if possible\n`;
    interactivePrompt += `3. Fault codes or flashing lights\n`;
    interactivePrompt += `4. Only then provide detailed diagnostic steps\n\n`;

    // Add current information status
    if (analysis.hasSystemType || analysis.hasMakeModel || analysis.hasFaultCodes) {
      interactivePrompt += `**INFORMATION GATHERED SO FAR:**\n`;
      if (analysis.hasSystemType) {
        interactivePrompt += `✅ System Type: ${analysis.systemType}\n`;
      }
      if (analysis.hasMakeModel) {
        interactivePrompt += `✅ Make: ${analysis.manufacturer}${analysis.model ? ` Model: ${analysis.model}` : ''}\n`;
      }
      if (analysis.hasFaultCodes) {
        interactivePrompt += `✅ Fault Codes: ${analysis.faultCodes.join(', ')}\n`;
      }
      interactivePrompt += `\n`;
    }

    // Add specific instructions based on what's missing
    switch (analysis.nextQuestion) {
      case 'systemType':
        interactivePrompt += `**NEXT STEP REQUIRED:**\n`;
        interactivePrompt += `Ask the engineer what type of heating system they're working on:\n`;
        interactivePrompt += `- Combi boiler (has diverter valve for hot water)\n`;
        interactivePrompt += `- System boiler (separate hot water cylinder, NO diverter valve)\n`;
        interactivePrompt += `- Heat-only/regular boiler (cold water tank + hot water cylinder, NO diverter valve)\n`;
        interactivePrompt += `- Back boiler\n\n`;
        interactivePrompt += `Keep your response SHORT and focused on getting this essential information first.\n`;
        interactivePrompt += `CRITICAL: System type determines which components are present - only combi boilers have diverter valves!\n`;
        break;

      case 'makeModel':
        interactivePrompt += `**NEXT STEP REQUIRED:**\n`;
        interactivePrompt += `Ask for the boiler make and model:\n`;
        interactivePrompt += `- What make is the boiler? (e.g., Worcester Bosch, Ideal, Vaillant, etc.)\n`;
        interactivePrompt += `- What model? (e.g., Greenstar 24i, Logic Combi 30, etc.)\n`;
        interactivePrompt += `- GC number if visible on the data plate\n\n`;
        interactivePrompt += `Keep your response SHORT and focused on getting this information.\n`;
        interactivePrompt += `Do NOT provide detailed diagnostic steps until you have all essential information.\n`;
        break;

      case 'faultCodes':
        interactivePrompt += `**NEXT STEP REQUIRED:**\n`;
        interactivePrompt += `Ask about fault codes and symptoms:\n`;
        interactivePrompt += `- Are there any fault codes showing? (e.g., F22, L2, E1, etc.)\n`;
        interactivePrompt += `- Any flashing lights or error displays?\n`;
        interactivePrompt += `- What exactly is the problem? (no heating, no hot water, etc.)\n\n`;
        interactivePrompt += `Keep your response SHORT and focused on getting this information.\n`;
        interactivePrompt += `Once you have fault codes, THEN ask for basic safety checks.\n`;
        break;

      case 'basicChecks':
        interactivePrompt += `**NEXT STEP REQUIRED - BASIC SAFETY CHECKS:**\n`;
        interactivePrompt += `Before any diagnosis, confirm basic Gas Safe checks:\n`;
        interactivePrompt += `- Is the gas supply on and working? (check other gas appliances)\n`;
        interactivePrompt += `- Is the boiler switched on at the mains and programmer?\n`;
        interactivePrompt += `- What's the system pressure showing? (should be 1-1.5 bar when cold)\n`;
        interactivePrompt += `- Have you isolated the boiler safely before any checks?\n\n`;
        interactivePrompt += `Keep your response SHORT and focused on these basic checks.\n`;
        interactivePrompt += `Only proceed to detailed diagnosis once these basics are confirmed.\n`;
        interactivePrompt += `This follows proper Gas Safe engineer methodology.\n`;
        break;

      default:
        if (analysis.shouldProceedWithDiagnosis) {
          interactivePrompt += `**PROCEED WITH DIAGNOSIS:**\n`;
          interactivePrompt += `You now have sufficient information to provide detailed diagnostic guidance.\n`;
          interactivePrompt += `Provide specific, practical steps based on the system type, make/model, and fault codes.\n`;
          interactivePrompt += `Keep responses concise but technically accurate - like one engineer talking to another.\n\n`;
          
          // Add boiler-type-specific component guidance
          if (analysis.systemType) {
            interactivePrompt += `**CRITICAL COMPONENT ACCURACY:**\n`;
            if (analysis.systemType.includes('combi')) {
              interactivePrompt += `COMBI BOILER - Has: diverter valve, plate heat exchanger, expansion vessel\n`;
              interactivePrompt += `Can reference: diverter valve operation, DHW flow sensor, plate heat exchanger\n`;
            } else if (analysis.systemType.includes('system')) {
              interactivePrompt += `SYSTEM BOILER - Has: separate hot water cylinder, motorised valves, pump\n`;
              interactivePrompt += `NO diverter valve! Use: cylinder thermostat, motorised valves, zone valves\n`;
            } else if (analysis.systemType.includes('regular') || analysis.systemType.includes('heat-only')) {
              interactivePrompt += `REGULAR/HEAT-ONLY BOILER - Has: separate cylinder, cold water tank, gravity fed\n`;
              interactivePrompt += `NO diverter valve! Use: cylinder thermostat, gravity circulation, tank thermostats\n`;
            }
            interactivePrompt += `Never reference components that don't exist on this boiler type!\n\n`;
          }
        }
        break;
    }

    interactivePrompt += `\n**COMMUNICATION STYLE:**\n`;
    interactivePrompt += `- Be conversational and practical\n`;
    interactivePrompt += `- Ask ONE focused question at a time\n`;
    interactivePrompt += `- Don't interrogate with long lists\n`;
    interactivePrompt += `- Act like the experienced engineer they call when stuck\n`;
    interactivePrompt += `- Use natural engineer language when appropriate\n`;

    return interactivePrompt;
  }

  /**
   * Determine if response should be fast/interactive vs detailed
   * @param {Object} analysis - Information gap analysis
   * @returns {Object} Response strategy
   */
  getResponseStrategy(analysis) {
    return {
      shouldBeInteractive: !analysis.shouldProceedWithDiagnosis,
      maxResponseLength: analysis.shouldProceedWithDiagnosis ? 'detailed' : 'short',
      focusArea: analysis.nextQuestion || 'diagnosis',
      priority: analysis.shouldProceedWithDiagnosis ? 'technical_guidance' : 'information_gathering'
    };
  }

  /**
 * Process diagnostic query with interactive workflow
 * @param {string} message - User message
 * @param {Array} history - Conversation history
 * @returns {Object} Interactive diagnostic context
 */
processInteractiveQuery(message, history = []) {
  const analysis = this.analyzeInformationGaps(history, message);
  const strategy = this.getResponseStrategy(analysis);
  
  // Extract and maintain focus on the original reported issue
  const originalIssue = this.extractOriginalIssue(message, history);
  
  return {
    analysis,
    strategy,
    isReadyForDiagnosis: analysis.shouldProceedWithDiagnosis,
    nextStep: analysis.nextQuestion,
    originalIssue,
    collectedInfo: {
      systemType: analysis.systemType,
      manufacturer: analysis.manufacturer,
      model: analysis.model,
      faultCodes: analysis.faultCodes
    }
  };
}

/**
 * Extract the original reported issue to maintain diagnostic focus
 * @param {string} currentMessage - Current user message
 * @param {Array} history - Conversation history
 * @returns {Object} Original issue details
 */
extractOriginalIssue(currentMessage, history = []) {
  // Get the first user message or current message if no history
  const firstUserMessage = history.find(msg => msg.sender === 'user' || msg.role === 'user')?.text || currentMessage;
  const fullText = firstUserMessage.toLowerCase();
  
  const issue = {
    type: null,
    symptoms: [],
    context: firstUserMessage,
    focus: null
  };
  
  // Identify the primary issue type
  if (fullText.includes('no hot water') || fullText.includes('hot water not working')) {
    issue.type = 'hot_water';
    issue.focus = 'hot water system';
    issue.symptoms.push('no hot water');
  } else if (fullText.includes('no heating') || fullText.includes('heating not working')) {
    issue.type = 'heating';
    issue.focus = 'heating system';
    issue.symptoms.push('no heating');
  } else if (fullText.includes('both') && (fullText.includes('hot water') && fullText.includes('heating'))) {
    issue.type = 'both';
    issue.focus = 'heating and hot water';
    issue.symptoms.push('no heating', 'no hot water');
  } else if (fullText.match(/\b[FELA]\d{1,3}\b/gi)) {
    issue.type = 'fault_code';
    issue.focus = 'fault code diagnosis';
    const codes = fullText.match(/\b[FELA]\d{1,3}\b/gi);
    issue.symptoms.push(`fault code ${codes.join(', ')}`);
  }
  
  // Extract additional symptoms
  if (fullText.includes('strange noise') || fullText.includes('noisy')) {
    issue.symptoms.push('unusual noise');
  }
  if (fullText.includes('leak')) {
    issue.symptoms.push('water leak');
  }
  if (fullText.includes('pressure')) {
    issue.symptoms.push('pressure issue');
  }
  
  return issue;
}

}

export default InteractiveDiagnosticWorkflow;
