/**
 * Enhanced LLM Response Service
 * Provides comprehensive diagnostic responses by integrating all available data sources
 * Ensures technical accuracy and professional Gas Safe standards
 */

import DiagnosticDataIntegrationService from './DiagnosticDataIntegrationService.js';
import PromptEngineeringService from './PromptEngineeringService.js';

export class EnhancedLLMResponseService {
  constructor() {
    this.diagnosticDataService = new DiagnosticDataIntegrationService();
    this.promptService = new PromptEngineeringService();
    this.isInitialized = false;
    this.responseCache = new Map();
    this.maxCacheSize = 100;
  }

  /**
   * Initialize all services
   */
  async initialize() {
    if (!this.isInitialized) {
      
      await Promise.all([
        this.diagnosticDataService.initialize(),
        this.promptService.initialize()
      ]);
      
      this.isInitialized = true;
    }
  }

  /**
   * Generate enhanced diagnostic response
   */
  async generateDiagnosticResponse(userMessage, context = {}) {
    await this.initialize();

    const startTime = Date.now();
    
    try {
      // Extract enhanced context
      const enhancedContext = await this.buildEnhancedContext(userMessage, context);
      
      // Get relevant diagnostic data
      const diagnosticData = await this.diagnosticDataService.getRelevantDiagnosticData(
        userMessage, 
        enhancedContext.boilerInfo
      );
      
      // Build comprehensive prompt
      const enhancedPrompt = await this.promptService.buildDynamicPrompt({
        ...enhancedContext,
        userMessage,
        diagnosticData
      });
      
      // Generate response with enhanced context
      const response = await this.makeEnhancedAPICall({
        prompt: enhancedPrompt,
        userMessage,
        context: enhancedContext,
        diagnosticData
      });
      
      // Post-process response for technical accuracy
      const processedResponse = this.postProcessResponse(response, diagnosticData);
      
      const duration = Date.now() - startTime;
      
      return {
        response: processedResponse,
        metadata: {
          duration,
          diagnosticDataUsed: this.getDiagnosticDataSummary(diagnosticData),
          technicalAccuracy: 'enhanced',
          responseType: 'comprehensive_diagnostic'
        }
      };
      
    } catch (error) {
      console.error('[EnhancedLLM] Error generating diagnostic response:', error);
      
      // Fallback to basic response
      return this.generateFallbackResponse(userMessage, context);
    }
  }

  /**
   * Build enhanced context with all available information
   */
  async buildEnhancedContext(userMessage, baseContext) {
    const context = {
      ...baseContext,
      userMessage,
      timestamp: new Date().toISOString()
    };
    
    // Extract technical terms and components
    context.technicalTerms = this.extractTechnicalTerms(userMessage);
    
    // Determine diagnostic complexity
    context.complexityLevel = this.assessDiagnosticComplexity(userMessage, baseContext);
    
    // Extract boiler information
    context.boilerInfo = this.extractBoilerInformation(userMessage, baseContext);
    
    // Determine required expertise level
    context.expertiseLevel = this.determineRequiredExpertise(userMessage, context.technicalTerms);
    
    return context;
  }

  /**
   * Extract technical terms from user message
   */
  extractTechnicalTerms(message) {
    const lowerMessage = message.toLowerCase();
    
    const technicalTerms = {
      components: [],
      symptoms: [],
      testEquipment: [],
      faultCodes: [],
      measurements: []
    };
    
    // Component terms
    const componentPatterns = [
      'heat exchanger', 'diverter valve', 'gas valve', 'fan', 'pcb', 'pump',
      'thermostat', 'pressure switch', 'ignition', 'electrode', 'flue',
      'expansion vessel', 'motorized valve', 'cylinder', 'programmer'
    ];
    
    technicalTerms.components = componentPatterns.filter(term => 
      lowerMessage.includes(term)
    );
    
    // Symptom terms
    const symptomPatterns = [
      'no heating', 'no hot water', 'lockout', 'noise', 'leak', 'pressure loss',
      'overheating', 'kettling', 'cycling', 'ignition failure', 'flame failure'
    ];
    
    technicalTerms.symptoms = symptomPatterns.filter(term => 
      lowerMessage.includes(term)
    );
    
    // Test equipment
    const equipmentPatterns = [
      'multimeter', 'manometer', 'gas analyzer', 'flue gas analyzer',
      'pressure gauge', 'thermometer', 'gas detector'
    ];
    
    technicalTerms.testEquipment = equipmentPatterns.filter(term => 
      lowerMessage.includes(term)
    );
    
    // Fault codes
    const faultCodeRegex = /[FE]\d{1,3}/gi;
    technicalTerms.faultCodes = message.match(faultCodeRegex) || [];
    
    // Measurements (voltage, pressure, temperature)
    const measurementRegex = /(\d+(?:\.\d+)?)\s*(v|volt|bar|psi|°c|celsius|ohm|amp)/gi;
    technicalTerms.measurements = [...message.matchAll(measurementRegex)].map(match => match[0]);
    
    return technicalTerms;
  }

  /**
   * Assess diagnostic complexity level
   */
  assessDiagnosticComplexity(message, context) {
    let complexityScore = 0;
    
    // Multiple symptoms increase complexity
    const symptoms = (message.match(/no heating|no hot water|noise|leak|pressure/gi) || []).length;
    complexityScore += symptoms * 2;
    
    // Multiple components increase complexity
    const components = (message.match(/heat exchanger|valve|pump|pcb|fan/gi) || []).length;
    complexityScore += components * 1.5;
    
    // Electrical/gas work increases complexity
    if (/electrical|gas|multimeter|voltage|pressure/i.test(message)) {
      complexityScore += 3;
    }
    
    // Safety concerns increase complexity
    if (/leak|gas|carbon monoxide|safety/i.test(message)) {
      complexityScore += 4;
    }
    
    if (complexityScore >= 8) return 'high';
    if (complexityScore >= 4) return 'medium';
    return 'low';
  }

  /**
   * Extract boiler information from message and context
   */
  extractBoilerInformation(message, context) {
    const boilerInfo = {
      manufacturer: context.manufacturer || null,
      model: context.model || null,
      systemType: context.systemType || context.boilerType || null,
      faultCodes: context.faultCodes || [],
      age: null,
      location: null
    };
    
    // Extract manufacturer from message
    const manufacturerRegex = /\b(ideal|worcester|vaillant|baxi|viessmann|glow-worm|potterton|alpha|ferroli|ariston)\b/gi;
    const manufacturerMatch = message.match(manufacturerRegex);
    if (manufacturerMatch && !boilerInfo.manufacturer) {
      boilerInfo.manufacturer = manufacturerMatch[0];
    }
    
    // Extract system type
    const systemTypeRegex = /\b(combi|system|regular|conventional|back boiler|heat only)\b/gi;
    const systemMatch = message.match(systemTypeRegex);
    if (systemMatch && !boilerInfo.systemType) {
      boilerInfo.systemType = systemMatch[0].toLowerCase();
    }
    
    // Extract fault codes
    const faultCodeRegex = /[FE]\d{1,3}/gi;
    const codes = message.match(faultCodeRegex) || [];
    boilerInfo.faultCodes = [...new Set([...boilerInfo.faultCodes, ...codes])];
    
    return boilerInfo;
  }

  /**
   * Determine required expertise level
   */
  determineRequiredExpertise(message, technicalTerms) {
    // High expertise for electrical/gas work
    if (technicalTerms.testEquipment.length > 0 || 
        /electrical|gas rate|combustion|pcb|wiring/i.test(message)) {
      return 'expert';
    }
    
    // Medium expertise for component diagnosis
    if (technicalTerms.components.length > 1 || 
        /diagnosis|fault finding|testing/i.test(message)) {
      return 'intermediate';
    }
    
    return 'beginner';
  }

  /**
   * Make enhanced API call with comprehensive context
   */
  async makeEnhancedAPICall({ prompt, userMessage, context, diagnosticData }) {
    const apiKey = process.env.DEEPSEEK_API_KEY_1 || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('No API key available for enhanced response');
    }
    
    const messages = [
      {
        role: 'system',
        content: prompt
      },
      {
        role: 'user',
        content: userMessage
      }
    ];
    
    // Add diagnostic context as additional system message
    if (diagnosticData && (diagnosticData.procedures.length > 0 || diagnosticData.components.length > 0)) {
      messages.splice(1, 0, {
        role: 'system',
        content: `DIAGNOSTIC CONTEXT: Based on your query, I have specific technical procedures and data available. Use this information to provide precise, technical guidance following Gas Safe standards.`
      });
    }
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 1500,
        temperature: 0.3, // Lower temperature for technical accuracy
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Enhanced API call failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Post-process response for technical accuracy
   */
  postProcessResponse(response, diagnosticData) {
    let processedResponse = response;
    
    // Add safety warnings if not present
    if (diagnosticData.safetyWarnings?.length > 0) {
      const hasWarnings = /⚠️|WARNING|SAFETY|CAUTION/i.test(response);
      if (!hasWarnings) {
        processedResponse = `⚠️ **SAFETY FIRST**: ${diagnosticData.safetyWarnings[0]}\n\n${processedResponse}`;
      }
    }
    
    // Ensure technical precision
    if (diagnosticData.testingSteps?.length > 0) {
      const hasSpecificValues = /\d+(\.\d+)?\s*(v|volt|bar|psi|°c|ohm|amp)/i.test(response);
      if (!hasSpecificValues && diagnosticData.testingSteps[0].expectedValues) {
        processedResponse += `\n\n**Expected Values**: ${diagnosticData.testingSteps[0].expectedValues}`;
      }
    }
    
    // Add Gas Safe compliance reminder
    if (!/gas safe|registered|compliance/i.test(response)) {
      processedResponse += '\n\n*Ensure all work complies with Gas Safe regulations and is carried out by registered engineers.*';
    }
    
    return processedResponse;
  }

  /**
   * Generate fallback response when enhanced processing fails
   */
  async generateFallbackResponse(userMessage, context) {
    
    const basicPrompt = `You are a Gas Safe registered engineer providing diagnostic assistance. 
    Respond professionally with safety-first approach. Keep responses concise and practical.`;
    
    try {
      const response = await this.makeBasicAPICall([
        { role: 'system', content: basicPrompt },
        { role: 'user', content: userMessage }
      ]);
      
      return {
        response,
        metadata: {
          responseType: 'fallback',
          technicalAccuracy: 'basic'
        }
      };
      
    } catch (error) {
      return {
        response: "I'm experiencing technical difficulties. For immediate Gas Safe assistance, please contact Gas Emergency Services on 0800 111 999 if you suspect a gas leak, or consult your local Gas Safe registered engineer.",
        metadata: {
          responseType: 'emergency_fallback',
          error: error.message
        }
      };
    }
  }

  /**
   * Make basic API call for fallback
   */
  async makeBasicAPICall(messages) {
    const apiKey = process.env.DEEPSEEK_API_KEY_1;
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        max_tokens: 500,
        temperature: 0.5
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Get diagnostic data summary for metadata
   */
  getDiagnosticDataSummary(diagnosticData) {
    return {
      proceduresFound: diagnosticData.procedures?.length || 0,
      componentsFound: diagnosticData.components?.length || 0,
      testingStepsFound: diagnosticData.testingSteps?.length || 0,
      safetyWarnings: diagnosticData.safetyWarnings?.length || 0,
      manufacturerSpecific: diagnosticData.manufacturerSpecific?.length || 0
    };
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      isInitialized: this.isInitialized,
      cacheSize: this.responseCache.size,
      diagnosticDataStats: this.diagnosticDataService.getStatistics()
    };
  }

  /**
   * Clear response cache
   */
  clearCache() {
    this.responseCache.clear();
  }
}

export default EnhancedLLMResponseService;
