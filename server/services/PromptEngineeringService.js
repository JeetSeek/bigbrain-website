/**
 * Enhanced Prompt Engineering Service
 * Builds dynamic, context-aware prompts for Gas Safe diagnostics
 * Integrates comprehensive diagnostic database for technical accuracy
 */

import DiagnosticDataIntegrationService from './DiagnosticDataIntegrationService.js';

export class PromptEngineeringService {
  constructor() {
    this.baseGasSafePrompt = this.buildBaseGasSafePrompt();
    this.manufacturerPrompts = this.buildManufacturerPrompts();
    this.expertiseLevels = ['beginner', 'intermediate', 'expert'];
    this.diagnosticDataService = new DiagnosticDataIntegrationService();
    this.isInitialized = false;
  }

  /**
   * Initialize diagnostic data integration
   */
  async initialize() {
    if (!this.isInitialized) {
      await this.diagnosticDataService.initialize();
      this.isInitialized = true;
    }
  }

  /**
   * Build dynamic prompt based on context with diagnostic data integration
   */
  async buildDynamicPrompt(context = {}) {
    await this.initialize();
    
    const {
      manufacturer,
      model,
      faultCodes = [],
      faultCodeDetails = [],
      hybridDiagnosticData,
      boilerType,
      expertiseLevel = 'intermediate',
      diagnosticStage = 'initial',
      userHistory = [],
      userMessage = ''
    } = context;

    let prompt = this.baseGasSafePrompt;

    // Get relevant diagnostic data from comprehensive database
    const boilerInfo = { manufacturer, model, faultCodes, systemType: boilerType };
    const diagnosticData = await this.diagnosticDataService.getRelevantDiagnosticData(userMessage, boilerInfo);
    
    // Integrate diagnostic data into prompt
    if (diagnosticData) {
      prompt += this.diagnosticDataService.buildLLMContext(diagnosticData);
    }

    // Add expertise level adaptation
    prompt += this.getExpertiseLevelPrompt(expertiseLevel);

    // Add enhanced manufacturer-specific context
    if (manufacturer) {
      prompt += this.getManufacturerContext(manufacturer, model);
      
      // Add manufacturer-specific diagnostic data
      if (diagnosticData.manufacturerSpecific?.length > 0) {
        prompt += '\n### MANUFACTURER-SPECIFIC DIAGNOSTICS:\n';
        diagnosticData.manufacturerSpecific.forEach(item => {
          prompt += `- ${item.description || item.procedure}\n`;
        });
        prompt += '\n';
      }
    }

    // Add enhanced fault code context with diagnostic procedures
    if (faultCodes.length > 0) {
      console.log('[PromptEngineering] faultCodeDetails exists:', !!faultCodeDetails);
      console.log('[PromptEngineering] faultCodeDetails content:', JSON.stringify(faultCodeDetails, null, 2));
      
      // Use hybrid diagnostic data if available (database-first approach)
      if (faultCodeDetails && faultCodeDetails.length > 0) {
        prompt += '\n### ⚠️ CRITICAL: MANDATORY DATABASE FAULT CODE INFORMATION ⚠️\n';
        prompt += 'YOU MUST USE THIS EXACT DATABASE INFORMATION - DO NOT OVERRIDE WITH GENERIC RESPONSES\n\n';
        faultCodeDetails.forEach(fault => {
          prompt += `**FAULT CODE ${fault.code || fault.fault_code}** (${fault.manufacturer}):\n`;
          prompt += `EXACT DIAGNOSIS: ${fault.description}\n`;
          if (fault.solutions) {
            const solutions = Array.isArray(fault.solutions) ? fault.solutions : fault.solutions.split('\n');
            prompt += `REQUIRED SOLUTIONS: ${solutions.join('; ')}\n`;
          }
          if (fault.model) {
            prompt += `SPECIFIC MODEL: ${fault.model}\n`;
          }
          prompt += '\n';
        });
        prompt += '🚨 CRITICAL INSTRUCTION: You MUST base your response on the EXACT DIAGNOSIS above. ';
        prompt += 'Do NOT use generic "PCB fault" or other training data responses. ';
        prompt += 'Use the specific database diagnosis and solutions provided above.\n\n';
      } else {
        // Fallback to basic fault code context
        prompt += this.getFaultCodeContext(faultCodes, manufacturer);
        
        if (diagnosticData.faultCodeData) {
          prompt += '\n### FAULT CODE DIAGNOSTIC PROCEDURES:\n';
          prompt += `Codes: ${faultCodes.join(', ')}\n`;
          if (diagnosticData.faultCodeData.commonCauses?.length > 0) {
            prompt += `Common Causes: ${diagnosticData.faultCodeData.commonCauses.join(', ')}\n`;
          }
          prompt += '\n';
        }
      }
    }

    // Add boiler type specific safety context
    if (boilerType) {
      prompt += this.getBoilerTypeContext(boilerType);
    }

    // Add diagnostic stage context
    prompt += this.getDiagnosticStageContext(diagnosticStage);

    // Add conversation history context
    if (userHistory.length > 0) {
      prompt += this.getHistoryContext(userHistory);
    }

    // Add technical precision instructions
    prompt += this.getTechnicalPrecisionInstructions(diagnosticData);

    return prompt;
  }

  /**
   * Add technical precision instructions based on available diagnostic data
   */
  getTechnicalPrecisionInstructions(diagnosticData) {
    let instructions = '\n## KEEP IT CONVERSATIONAL:\n\n';
    
    instructions += '**REMEMBER:**\n';
    instructions += '- Short, practical responses only\n';
    instructions += '- Most likely cause first\n';
    instructions += '- One question max if you need more info\n';
    instructions += '- No formal lists or procedures\n';
    instructions += '- Talk like an engineer, not a manual\n\n';
    
    if (diagnosticData.testingSteps?.length > 0) {
      instructions += '**USE THESE SPECIFIC TESTING PROCEDURES:**\n';
      diagnosticData.testingSteps.forEach(test => {
        if (test.expectedValues) {
          instructions += `- ${test.name}: Expected values ${test.expectedValues}\n`;
        }
        if (test.equipment) {
          instructions += `  Equipment needed: ${test.equipment}\n`;
        }
      });
      instructions += '\n';
    }
    
    instructions += '**COMMUNICATION STYLE:**\n';
    instructions += '- Engineer-to-engineer professional tone\n';
    instructions += '- Reference specific manufacturer procedures where available\n';
    instructions += '- Include Gas Safe compliance requirements\n';
    instructions += '- Provide systematic diagnostic approach\n\n';
    
    return instructions;
  }

  /**
   * Base Gas Safe prompt with professional standards
   */
  buildBaseGasSafePrompt() {
    return `You're a senior Gas Safe engineer with 20+ years experience. You're chatting with a colleague who's stuck on a job and needs quick, practical advice.

COMMUNICATION STYLE:
- Talk like one engineer to another - casual but professional
- Keep responses short and practical (3-4 sentences max)
- Use engineer slang naturally ("knackered", "dodgy", "sorted")
- Give the most likely cause first for fault codes
- Ask one focused question if you need more info - don't interrogate
- Include quick safety reminders when relevant
- Give time estimates: "Should take you 20 minutes max"
- Practical tips: "Bit of WD40 on those connections won't hurt"

EXAMPLES:
- "L8? Flow sensor's probably knackered. Check the connections first - they get corroded. If that's clean, test the resistance across it."
- "F22 on an Ideal? Low water pressure mate. Check your filling loop, top it up to 1.5 bar. If it drops again, you've got a leak somewhere."
- "Right, Worcester Greenstar doing that? Classic diverter valve issue. Can you hear it clicking when you turn a tap on?"

Act like the experienced mate they call when they're stuck on site. No formal lists or procedures - just practical engineer-to-engineer chat.

`;
  }

  /**
   * Expertise level specific prompts
   */
  getExpertiseLevelPrompt(level) {
    const prompts = {
      beginner: `
EXPERTISE LEVEL: BEGINNER ENGINEER
- Provide detailed step-by-step instructions
- Emphasize safety procedures at each step
- Explain the reasoning behind each diagnostic step
- Include warnings about common mistakes
- Recommend when to seek senior engineer assistance
- Use clear, unambiguous language

`,
      intermediate: `
EXPERTISE LEVEL: INTERMEDIATE ENGINEER
- Provide efficient diagnostic procedures
- Include technical shortcuts where appropriate
- Reference relevant service bulletins and manuals
- Assume familiarity with basic tools and procedures
- Focus on problem-solving methodology

`,
      expert: `
EXPERTISE LEVEL: EXPERT ENGINEER
- Focus on complex diagnostics and edge cases
- Provide advanced troubleshooting techniques
- Reference latest technical bulletins and updates
- Discuss system interactions and root cause analysis
- Include cost-effective repair strategies

`
    };

    return prompts[level] || prompts.intermediate;
  }

  /**
   * Manufacturer-specific context
   */
  getManufacturerContext(manufacturer, model = null) {
    const manufacturerData = this.manufacturerPrompts[manufacturer.toLowerCase()];
    if (!manufacturerData) {
      return `\nMANUFACTURER: ${manufacturer}\n${model ? `MODEL: ${model}\n` : ''}Refer to manufacturer-specific service procedures and fault code interpretations.\n\n`;
    }

    let context = `\nMANUFACTURER CONTEXT: ${manufacturer.toUpperCase()}\n`;
    if (model) context += `MODEL: ${model}\n`;
    
    context += manufacturerData.commonIssues;
    context += manufacturerData.diagnosticNotes;
    context += manufacturerData.safetyWarnings;
    
    return context + '\n';
  }

  /**
   * Fault code specific context
   */
  getFaultCodeContext(faultCodes, manufacturer) {
    let context = '\nFAULT CODE ANALYSIS:\n';
    
    faultCodes.forEach(code => {
      context += `- ${code}: Reference manufacturer database for specific diagnostic procedures\n`;
      context += `  * Check component specifications and test procedures\n`;
      context += `  * Verify electrical connections and signal integrity\n`;
      context += `  * Follow systematic elimination process\n`;
    });

    context += '\nDIAGNOSTIC PRIORITY:\n';
    context += '1. Verify fault code accuracy and conditions\n';
    context += '2. Check obvious causes before complex diagnostics\n';
    context += '3. Use manufacturer-specific test procedures\n';
    context += '4. Document findings for warranty/compliance\n\n';

    return context;
  }

  /**
   * Boiler type specific context
   */
  getBoilerTypeContext(boilerType) {
    const typeContexts = {
      combi: `
BOILER TYPE: COMBINATION BOILER
- Focus on diverter valve operation and plate heat exchanger
- Check DHW flow sensor and thermistors
- Verify system pressure for proper diverter operation
- Consider DHW priority valve operation
- Check for limescale in DHW circuit

`,
      system: `
BOILER TYPE: SYSTEM BOILER
- Check expansion vessel and pressure relief valve
- Verify pump operation and system circulation
- Examine motorized valves and zone controls
- Check system water quality and inhibitor levels
- Consider system design and pipe sizing

`,
      'heat-only': `
BOILER TYPE: HEAT-ONLY BOILER
- Check feed and expansion tank operation
- Verify pump and valve operation
- Examine system circulation and air removal
- Check thermostat and control wiring
- Consider system design and gravity circulation

`,
      'back-boiler': `
BOILER TYPE: BACK BOILER
- Check flue integrity and ventilation
- Verify gas supply and pressure
- Examine heat exchanger condition
- Check for adequate air supply
- Consider age-related component degradation

`
    };

    return typeContexts[boilerType] || '';
  }

  /**
   * Diagnostic stage context
   */
  getDiagnosticStageContext(stage) {
    const stageContexts = {
      initial: `
DIAGNOSTIC STAGE: INITIAL ASSESSMENT
- Gather system information (make, model, age, installation date)
- Record current symptoms and fault codes
- Check obvious issues (power, gas supply, water pressure)
- Verify system operation mode and settings
- Document baseline readings

`,
      detailed: `
DIAGNOSTIC STAGE: DETAILED ANALYSIS
- Perform systematic component testing
- Use manufacturer-specific test procedures
- Record all measurements and observations
- Compare readings to specification values
- Identify root cause vs. symptoms

`,
      verification: `
DIAGNOSTIC STAGE: VERIFICATION & COMPLETION
- Confirm repair effectiveness
- Test all system functions
- Verify safety device operation
- Complete compliance documentation
- Provide customer guidance and maintenance advice

`
    };

    return stageContexts[stage] || stageContexts.initial;
  }

  /**
   * Conversation history context
   */
  getHistoryContext(userHistory) {
    if (userHistory.length === 0) return '';

    let context = '\nCONVERSATION CONTEXT:\n';
    context += 'Previous discussion points:\n';
    
    userHistory.slice(-3).forEach((msg, index) => {
      if (msg.sender === 'user' || msg.role === 'user') {
        const text = msg.text || msg.content || '';
        context += `- User mentioned: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n`;
      }
    });

    context += '\nBuild on previous conversation and avoid repeating information already covered.\n\n';
    return context;
  }

  /**
   * Manufacturer-specific prompts and knowledge
   */
  buildManufacturerPrompts() {
    return {
      ideal: {
        commonIssues: `
IDEAL BOILER COMMON ISSUES:
- F22: Low water pressure (most common)
- F28: Ignition failure (gas valve or electrode)
- F75: Pressure sensor fault
- Diverter valve issues on Logic series
- PCB failures on older models

`,
        diagnosticNotes: `
IDEAL DIAGNOSTIC NOTES:
- Use Ideal service tool for advanced diagnostics
- Check for latest firmware updates
- Verify correct gas valve voltage (24V DC)
- Test pressure sensor resistance (variable with pressure)
- Check DHW thermistor resistance (10kΩ at 25°C)

`,
        safetyWarnings: `
IDEAL SAFETY WARNINGS:
- Ensure gas isolation before electrical work
- Check flue integrity on older installations
- Verify adequate ventilation for room-sealed units
- Use only Ideal approved spare parts

`
      },
      baxi: {
        commonIssues: `
BAXI BOILER COMMON ISSUES:
- E133: Ignition lockout (ignition sequence failure)
- E125: Circulation fault
- E110: Overheat thermostat operation
- Pump failures on older models
- Heat exchanger blockages

`,
        diagnosticNotes: `
BAXI DIAGNOSTIC NOTES:
- Use Baxi diagnostic tool for fault history
- Check pump speed settings and operation
- Verify gas valve operation sequence
- Test overheat thermostat continuity
- Check system water quality

`,
        safetyWarnings: `
BAXI SAFETY WARNINGS:
- Follow Baxi-specific lockout reset procedures
- Check for gas leaks after any gas work
- Verify flue gas analysis within limits
- Ensure proper system inhibitor levels

`
      },
      worcester: {
        commonIssues: `
WORCESTER BOSCH COMMON ISSUES:
- EA fault codes (various sensors)
- D5: Water pressure sensor fault
- C6: Fan speed fault
- Diverter valve issues on Greenstar series
- Condensate drain blockages

`,
        diagnosticNotes: `
WORCESTER DIAGNOSTIC NOTES:
- Use Worcester service tool for diagnostics
- Check condensate trap and drain regularly
- Verify fan operation and air pressure switch
- Test water pressure sensor calibration
- Check system filter condition

`,
        safetyWarnings: `
WORCESTER SAFETY WARNINGS:
- Ensure condensate drain is clear and safe
- Check for proper system water treatment
- Verify correct flue installation
- Use Worcester approved components only

`
      }
    };
  }

  /**
   * Get multi-stage diagnostic prompt
   */
  getMultiStagePrompt(stage, context) {
    const stages = {
      assessment: {
        focus: 'Initial problem identification and safety checks',
        questions: [
          'What are the current symptoms?',
          'Any fault codes displayed?',
          'When did the problem start?',
          'Any recent work on the system?'
        ]
      },
      diagnosis: {
        focus: 'Systematic testing and component verification',
        questions: [
          'What tests have been performed?',
          'What readings were obtained?',
          'Which components have been checked?',
          'Any unusual observations?'
        ]
      },
      resolution: {
        focus: 'Repair implementation and verification',
        questions: [
          'What repair action is planned?',
          'Are replacement parts available?',
          'How will the repair be verified?',
          'What documentation is required?'
        ]
      }
    };

    const stageInfo = stages[stage] || stages.assessment;
    
    return `
CURRENT DIAGNOSTIC STAGE: ${stage.toUpperCase()}
FOCUS: ${stageInfo.focus}

RELEVANT QUESTIONS TO CONSIDER:
${stageInfo.questions.map(q => `- ${q}`).join('\n')}

Provide guidance appropriate to this diagnostic stage.

`;
  }

  /**
   * Build safety-focused prompt for specific operations
   */
  getSafetyPrompt(operation) {
    const safetyPrompts = {
      gas_work: `
GAS WORK SAFETY REQUIREMENTS:
- Confirm Gas Safe registration for gas work
- Use appropriate gas detection equipment
- Follow Tightness Testing procedures (IGE/UP/1)
- Complete Gas Safety Record documentation
- Verify adequate ventilation and air supply

`,
      electrical: `
ELECTRICAL WORK SAFETY:
- Isolate electrical supply before work
- Use appropriate test equipment (GS38 compliant)
- Check for live parts after isolation
- Verify earth continuity and insulation resistance
- Complete Electrical Safety documentation

`,
      system_work: `
SYSTEM WORK SAFETY:
- Depressurize system before component removal
- Use appropriate PPE for hot water/chemicals
- Check for asbestos in older installations
- Verify system water treatment and inhibitor
- Follow COSHH requirements for chemicals

`
    };

    return safetyPrompts[operation] || safetyPrompts.system_work;
  }
}

export default PromptEngineeringService;
