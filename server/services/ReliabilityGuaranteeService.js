/**
 * Reliability Guarantee Service
 * Ensures 100% response rate for all valid diagnostic queries
 * Implements multiple fallback layers and emergency response templates
 */

export class ReliabilityGuaranteeService {
  constructor() {
    this.emergencyTemplates = {
      // Gas Safe emergency responses for critical scenarios
      gasSafety: {
        gasLeak: `🚨 **IMMEDIATE ACTION REQUIRED:**\n\n1. **Turn off gas supply** at meter\n2. **Open all doors and windows**\n3. **NO smoking, switches, or naked flames**\n4. **Call Gas Emergency Service: 0800 111 999**\n5. **Evacuate property if smell persists**\n\nDo NOT attempt repairs. This requires immediate professional attention.`,
        
        carbonMonoxide: `🚨 **CARBON MONOXIDE RISK:**\n\n1. **Turn off boiler immediately**\n2. **Open all doors and windows**\n3. **Get fresh air immediately**\n4. **Call Gas Emergency Service: 0800 111 999**\n5. **Seek medical attention if feeling unwell**\n\nSymptoms: headache, dizziness, nausea, tiredness. This is potentially fatal.`,
        
        noGasSafeCert: `⚠️ **GAS SAFE REGISTRATION REQUIRED:**\n\nAll gas work must be carried out by Gas Safe registered engineers.\n\n**Find registered engineer:** www.gassaferegister.co.uk\n**Gas Emergency Service:** 0800 111 999\n\nNever attempt gas work without proper certification.`
      },
      
      // Professional diagnostic fallbacks
      diagnostic: {
        systemUnknown: `I need a bit more information to give you accurate guidance:\n\n**Essential details:**\n- What type of heating system? (combi/system/regular boiler)\n- Make and model of boiler?\n- Any fault codes or error displays?\n\nOnce I have these basics, I can provide specific diagnostic steps.`,
        
        faultCodeUnknown: `I don't have specific information for that fault code in my database.\n\n**Immediate steps:**\n1. Check manufacturer's manual for code definition\n2. Verify code is displaying correctly\n3. Note any other symptoms or unusual behavior\n\n**General approach:**\n- Reset boiler (if safe to do so)\n- Check basic supplies (gas, power, water pressure)\n- Contact manufacturer technical support if code persists`,
        
        complexIssue: `This sounds like a complex issue requiring systematic diagnosis:\n\n**Recommended approach:**\n1. **Safety first** - ensure gas supply and electrical safety\n2. **Basic checks** - pressure, power, gas supply\n3. **Systematic testing** - work through manufacturer's diagnostic sequence\n4. **Component isolation** - test individual components\n\nIf you need specific guidance for any step, let me know the exact symptoms and I'll walk you through it.`,
        
        insufficientInfo: `To give you the most accurate diagnostic guidance, I need:\n\n**System details:**\n- Boiler make and model\n- System type (combi/system/regular)\n- Any fault codes displayed\n\n**Current symptoms:**\n- What's not working?\n- When did it start?\n- Any unusual sounds/smells?\n\nWith these details, I can provide step-by-step diagnostic guidance.`
      },
      
      // Technical guidance templates
      technical: {
        combiDiverter: `**COMBI BOILER - Diverter Valve Diagnosis:**\n\n1. **Check demand signal** - DHW tap fully open?\n2. **Listen for valve movement** - clicking sound when tap opens?\n3. **Check water pressure** - should be 1-1.5 bar\n4. **Test valve manually** - can you feel/hear it move?\n\nIf valve not moving: check actuator motor, microswitches, or valve body.`,
        
        systemCylinder: `**SYSTEM BOILER - Cylinder Issues:**\n\n1. **Check cylinder thermostat** - calling for heat?\n2. **Test motorised valve** - opening fully?\n3. **Verify pump operation** - circulating to cylinder?\n4. **Check immersion heater** - backup heating working?\n\nNo diverter valve on system boilers - focus on zone controls.`,
        
        regularGravity: `**REGULAR BOILER - Gravity System:**\n\n1. **Check feed tank** - water level adequate?\n2. **Verify gravity circulation** - pipes getting hot?\n3. **Test cylinder thermostat** - switching correctly?\n4. **Check for airlocks** - bleeding required?\n\nGravity systems rely on natural circulation - check for blockages.`
      }
    };
    
    this.responseTimeouts = {
      enhanced: 15000,    // 15 seconds for enhanced processing
      fallback: 10000,    // 10 seconds for fallback processing
      emergency: 2000     // 2 seconds for emergency templates
    };
    
    this.reliabilityMetrics = {
      totalRequests: 0,
      successfulResponses: 0,
      fallbacksUsed: 0,
      emergencyTemplatesUsed: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Guarantee a response to any diagnostic query
   * @param {string} message - User message
   * @param {Object} context - Diagnostic context
   * @param {Function} primaryProcessor - Primary processing function
   * @param {Function} fallbackProcessor - Fallback processing function
   * @returns {Promise<Object>} Guaranteed response
   */
  async guaranteeResponse(message, context, primaryProcessor, fallbackProcessor) {
    const startTime = Date.now();
    this.reliabilityMetrics.totalRequests++;
    
    try {
      // Layer 1: Enhanced processing with timeout
      const enhancedResponse = await this.withTimeout(
        primaryProcessor(message, context),
        this.responseTimeouts.enhanced,
        'Enhanced processing timeout'
      );
      
      if (enhancedResponse && enhancedResponse.response) {
        this.reliabilityMetrics.successfulResponses++;
        this.updateResponseTime(startTime);
        return {
          response: enhancedResponse.response,
          source: 'enhanced',
          reliable: true,
          metadata: enhancedResponse.metadata || {}
        };
      }
    } catch (enhancedError) {
      console.warn('[Reliability] Enhanced processing failed:', enhancedError.message);
    }
    
    try {
      // Layer 2: Fallback processing with timeout
      const fallbackResponse = await this.withTimeout(
        fallbackProcessor(message, context),
        this.responseTimeouts.fallback,
        'Fallback processing timeout'
      );
      
      if (fallbackResponse && fallbackResponse.response) {
        this.reliabilityMetrics.fallbacksUsed++;
        this.reliabilityMetrics.successfulResponses++;
        this.updateResponseTime(startTime);
        return {
          response: fallbackResponse.response,
          source: 'fallback',
          reliable: true,
          metadata: fallbackResponse.metadata || {}
        };
      }
    } catch (fallbackError) {
      console.warn('[Reliability] Fallback processing failed:', fallbackError.message);
    }
    
    // Layer 3: Emergency template response (guaranteed)
    const emergencyResponse = this.generateEmergencyResponse(message, context);
    this.reliabilityMetrics.emergencyTemplatesUsed++;
    this.reliabilityMetrics.successfulResponses++;
    this.updateResponseTime(startTime);
    
    return {
      response: emergencyResponse,
      source: 'emergency_template',
      reliable: true,
      metadata: { 
        fallbackReason: 'All processing layers failed',
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Generate emergency response using templates
   * @param {string} message - User message
   * @param {Object} context - Diagnostic context
   * @returns {string} Emergency response
   */
  generateEmergencyResponse(message, context) {
    const messageLower = message.toLowerCase();
    
    // Check for gas safety emergencies
    if (this.isGasSafetyEmergency(messageLower)) {
      if (messageLower.includes('smell') || messageLower.includes('gas leak')) {
        return this.emergencyTemplates.gasSafety.gasLeak;
      }
      if (messageLower.includes('carbon monoxide') || messageLower.includes('co') || 
          messageLower.includes('headache') || messageLower.includes('dizzy')) {
        return this.emergencyTemplates.gasSafety.carbonMonoxide;
      }
      if (messageLower.includes('not gas safe') || messageLower.includes('not qualified')) {
        return this.emergencyTemplates.gasSafety.noGasSafeCert;
      }
    }
    
    // Determine system type for appropriate template
    const systemType = this.detectSystemType(messageLower, context);
    
    // Check if we have enough information for diagnosis
    if (!this.hasSufficientInfo(messageLower, context)) {
      return this.emergencyTemplates.diagnostic.insufficientInfo;
    }
    
    // Provide system-specific guidance
    if (systemType === 'combi' && (messageLower.includes('hot water') || messageLower.includes('dhw'))) {
      return this.emergencyTemplates.technical.combiDiverter;
    }
    
    if (systemType === 'system' && messageLower.includes('hot water')) {
      return this.emergencyTemplates.technical.systemCylinder;
    }
    
    if (systemType === 'regular' && messageLower.includes('hot water')) {
      return this.emergencyTemplates.technical.regularGravity;
    }
    
    // Check for unknown fault codes
    if (messageLower.match(/\b[fela]\d+\b/) && !this.isKnownFaultCode(messageLower)) {
      return this.emergencyTemplates.diagnostic.faultCodeUnknown;
    }
    
    // Default to complex issue guidance
    return this.emergencyTemplates.diagnostic.complexIssue;
  }

  /**
   * Check if message indicates gas safety emergency
   * @param {string} message - Message to check
   * @returns {boolean} Is gas safety emergency
   */
  isGasSafetyEmergency(message) {
    const emergencyKeywords = [
      'gas leak', 'smell gas', 'gas smell', 'carbon monoxide', 'co alarm',
      'headache', 'dizzy', 'nausea', 'not gas safe', 'not qualified',
      'emergency', 'danger', 'unsafe'
    ];
    
    return emergencyKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Detect system type from message and context
   * @param {string} message - User message
   * @param {Object} context - Diagnostic context
   * @returns {string} System type
   */
  detectSystemType(message, context) {
    if (context?.boilerInfo?.heatingSystemType) {
      return context.boilerInfo.heatingSystemType;
    }
    
    if (message.includes('combi')) return 'combi';
    if (message.includes('system boiler')) return 'system';
    if (message.includes('regular') || message.includes('heat only')) return 'regular';
    
    return 'unknown';
  }

  /**
   * Check if we have sufficient information for diagnosis
   * @param {string} message - User message
   * @param {Object} context - Diagnostic context
   * @returns {boolean} Has sufficient info
   */
  hasSufficientInfo(message, context) {
    const hasManufacturer = context?.boilerInfo?.manufacturer || 
                           /\b(ideal|worcester|vaillant|baxi|potterton|glow.?worm|viessmann)\b/.test(message);
    const hasSystemType = context?.boilerInfo?.heatingSystemType ||
                         /\b(combi|system|regular|heat.?only)\b/.test(message);
    const hasSymptom = /\b(no heat|no hot water|fault|error|problem|issue)\b/.test(message);
    
    return hasManufacturer && hasSystemType && hasSymptom;
  }

  /**
   * Check if fault code is in known database
   * @param {string} message - Message containing fault code
   * @returns {boolean} Is known fault code
   */
  isKnownFaultCode(message) {
    // This would integrate with the actual fault code database
    // For now, return false to trigger unknown fault code template
    return false;
  }

  /**
   * Add timeout to promise
   * @param {Promise} promise - Promise to timeout
   * @param {number} timeout - Timeout in milliseconds
   * @param {string} errorMessage - Error message for timeout
   * @returns {Promise} Promise with timeout
   */
  async withTimeout(promise, timeout, errorMessage) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(errorMessage)), timeout)
      )
    ]);
  }

  /**
   * Update response time metrics
   * @param {number} startTime - Start time
   */
  updateResponseTime(startTime) {
    const responseTime = Date.now() - startTime;
    this.reliabilityMetrics.averageResponseTime = 
      (this.reliabilityMetrics.averageResponseTime * (this.reliabilityMetrics.successfulResponses - 1) + responseTime) / 
      this.reliabilityMetrics.successfulResponses;
  }

  /**
   * Get reliability metrics
   * @returns {Object} Reliability metrics
   */
  getReliabilityMetrics() {
    return {
      ...this.reliabilityMetrics,
      successRate: (this.reliabilityMetrics.successfulResponses / this.reliabilityMetrics.totalRequests) * 100,
      fallbackRate: (this.reliabilityMetrics.fallbacksUsed / this.reliabilityMetrics.totalRequests) * 100,
      emergencyRate: (this.reliabilityMetrics.emergencyTemplatesUsed / this.reliabilityMetrics.totalRequests) * 100
    };
  }

  /**
   * Reset reliability metrics
   */
  resetMetrics() {
    this.reliabilityMetrics = {
      totalRequests: 0,
      successfulResponses: 0,
      fallbacksUsed: 0,
      emergencyTemplatesUsed: 0,
      averageResponseTime: 0
    };
  }
}

export default ReliabilityGuaranteeService;
