/**
 * Enhanced Integration Service
 * Orchestrates all enhanced MCP/GPT components for seamless operation
 * Provides unified interface for advanced diagnostic capabilities
 */

import PromptEngineeringService from './PromptEngineeringService.js';
import EnhancedFunctionHandlers from './EnhancedFunctionHandlers.js';
import MultiModelService from './MultiModelService.js';
import RealTimeKnowledgeMonitor from './RealTimeKnowledgeMonitor.js';
import { ENHANCED_FUNCTION_DECLARATIONS } from '../constants/enhancedFunctionDeclarations.js';

export class EnhancedIntegrationService {
  constructor() {
    this.isInitialized = false;
    this.services = {};
    this.config = {
      enableMultiModel: true,
      enableRealTimeMonitoring: true,
      enableEnhancedFunctions: true,
      enableAdvancedPrompts: true,
      autoStartMonitoring: false // Set to false to prevent auto-start on init
    };
    
  }

  /**
   * Initialize all enhanced services
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }


    try {
      // Initialize core services with timeout protection
      const initPromises = [];
      
      // Initialize services with individual error handling
      try {
        this.services.promptEngineering = new PromptEngineeringService();
      } catch (error) {
        console.warn('[EnhancedIntegration] PromptEngineeringService failed to initialize:', error.message);
      }

      try {
        this.services.functionHandlers = new EnhancedFunctionHandlers();
      } catch (error) {
        console.warn('[EnhancedIntegration] EnhancedFunctionHandlers failed to initialize:', error.message);
      }

      try {
        this.services.multiModel = new MultiModelService();
      } catch (error) {
        console.warn('[EnhancedIntegration] MultiModelService failed to initialize:', error.message);
      }

      try {
        this.services.knowledgeMonitor = new RealTimeKnowledgeMonitor();
      } catch (error) {
        console.warn('[EnhancedIntegration] RealTimeKnowledgeMonitor failed to initialize:', error.message);
      }

      // DO NOT start real-time monitoring automatically to prevent blocking
      // It can be started manually later if needed
      if (this.config.enableRealTimeMonitoring && this.config.autoStartMonitoring) {
        // await this.services.knowledgeMonitor.startMonitoring();
      }

      this.isInitialized = true;

      return {
        success: true,
        services: Object.keys(this.services).filter(key => this.services[key] !== undefined),
        capabilities: this.getCapabilities()
      };

    } catch (error) {
      console.error('[EnhancedIntegration] Initialization error:', error.message);
      // Don't throw error - allow partial initialization
      this.isInitialized = true;
      console.log('[EnhancedIntegration] Partial initialization completed with warnings');
      
      return {
        success: false,
        error: error.message,
        services: Object.keys(this.services).filter(key => this.services[key] !== undefined),
        capabilities: this.getCapabilities()
      };
    }
  }

  /**
   * Process enhanced diagnostic request
   */
  async processEnhancedDiagnostic(userMessage, context = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const diagnosticStart = Date.now();

    try {
      // 1. Extract diagnostic context
      const enhancedContext = await this.extractDiagnosticContext(userMessage, context);
      
      // 2. Select optimal model
      const selectedModel = this.config.enableMultiModel ? 
        this.services.multiModel.selectOptimalModel(userMessage, enhancedContext) : 
        'deepseek';

      // 3. Build enhanced prompt with diagnostic data integration
      const enhancedPrompt = this.config.enableAdvancedPrompts ?
        await this.services.promptEngineering.buildDynamicPrompt({
          ...enhancedContext,
          userMessage
        }) :
        this.buildBasicPrompt(enhancedContext);

      // 4. Prepare function declarations
      const functionDeclarations = this.config.enableEnhancedFunctions ?
        ENHANCED_FUNCTION_DECLARATIONS :
        [];

      // 5. Make enhanced API call
      const response = await this.makeEnhancedAPICall({
        model: selectedModel,
        prompt: enhancedPrompt,
        userMessage,
        functions: functionDeclarations,
        context: enhancedContext
      });

      // 6. Process function calls if any
      const processedResponse = await this.processFunctionCalls(response, enhancedContext);

      // 7. Log performance metrics
      const duration = Date.now() - diagnosticStart;
      await this.logDiagnosticMetrics({
        duration,
        model: selectedModel,
        context: enhancedContext,
        success: true
      });

      return {
        response: processedResponse,
        metadata: {
          model: selectedModel,
          duration,
          context: enhancedContext,
          enhancementsUsed: this.getActiveEnhancements()
        }
      };

    } catch (error) {
      console.error('[EnhancedIntegration] Diagnostic processing error:', error.message);
      
      // Log error metrics
      const duration = Date.now() - diagnosticStart;
      await this.logDiagnosticMetrics({
        duration,
        error: error.message,
        success: false
      });

      throw error;
    }
  }

  /**
   * Extract enhanced diagnostic context from user message
   */
  async extractDiagnosticContext(userMessage, baseContext) {
    const context = { ...baseContext };

    // If diagnostic context was passed from hybridDiagnosticService, use it as primary source
    if (baseContext.diagnosticContext) {
      console.log('[Enhanced Integration] Using hybrid diagnostic context with fault codes:', 
        baseContext.diagnosticContext.faultCodes?.length || 0);
      
      // Use the rich diagnostic context from the hybrid service
      context.hybridDiagnosticData = baseContext.diagnosticContext;
      
      // Extract fault codes from hybrid service data
      if (baseContext.diagnosticContext.faultCodes && baseContext.diagnosticContext.faultCodes.length > 0) {
        context.faultCodes = baseContext.diagnosticContext.faultCodes.map(fc => fc.code || fc.fault_code);
        context.faultCodeDetails = baseContext.diagnosticContext.faultCodes;
      }
      
      // Extract manufacturer from hybrid service data
      if (baseContext.diagnosticContext.boilerInfo?.manufacturer) {
        context.manufacturer = baseContext.diagnosticContext.boilerInfo.manufacturer;
      }
    } else {
      // Fallback to basic pattern matching if no hybrid context available
      
      // Extract manufacturer
      const manufacturers = ['ideal', 'worcester bosch', 'baxi', 'vaillant', 'viessmann', 'ferroli', 'alpha'];
      const foundManufacturer = manufacturers.find(m => 
        userMessage.toLowerCase().includes(m)
      );
      if (foundManufacturer) {
        context.manufacturer = foundManufacturer;
      }

      // Extract fault codes
      const faultCodePattern = /([A-Z]\d{1,3}|[A-Z]{1,2}\d{1,3})/gi;
      const faultCodes = userMessage.match(faultCodePattern) || [];
      if (faultCodes.length > 0) {
        context.faultCodes = faultCodes;
      }
    }

    // Extract boiler type
    const boilerTypes = ['combi', 'system', 'heat only', 'back boiler'];
    const foundType = boilerTypes.find(type => 
      userMessage.toLowerCase().includes(type)
    );
    if (foundType) {
      context.boilerType = foundType;
    }

    // Determine expertise level from message complexity
    context.expertiseLevel = this.determineExpertiseLevel(userMessage);

    // Determine diagnostic stage
    context.diagnosticStage = this.determineDiagnosticStage(userMessage, context);

    return context;
  }

  /**
   * Determine user expertise level from message characteristics
   */
  determineExpertiseLevel(message) {
    const expertTerms = ['pcb', 'voltage', 'resistance', 'flow rate', 'gas valve', 'heat exchanger'];
    const beginnerTerms = ['not working', 'broken', 'help', 'what do i do'];
    
    const expertCount = expertTerms.filter(term => 
      message.toLowerCase().includes(term)
    ).length;
    
    const beginnerCount = beginnerTerms.filter(term => 
      message.toLowerCase().includes(term)
    ).length;

    if (expertCount > beginnerCount && expertCount >= 2) return 'expert';
    if (beginnerCount > expertCount) return 'beginner';
    return 'intermediate';
  }

  /**
   * Determine diagnostic stage from context
   */
  determineDiagnosticStage(message, context) {
    if (context.faultCodes && context.faultCodes.length > 0) {
      return 'fault_analysis';
    }
    if (message.toLowerCase().includes('no hot water') || 
        message.toLowerCase().includes('no heating')) {
      return 'symptom_analysis';
    }
    if (message.toLowerCase().includes('test') || 
        message.toLowerCase().includes('check')) {
      return 'testing';
    }
    return 'initial';
  }

  /**
   * Make enhanced API call with multi-model support
   */
  async makeEnhancedAPICall({ model, prompt, userMessage, functions, context }) {
    const messages = [
      { role: 'system', content: prompt },
      { role: 'user', content: userMessage }
    ];

    if (this.config.enableMultiModel) {
      const result = await this.services.multiModel.makeRequest(messages, {
        forceModel: model,
        context,
        functions
      });
      return result.response;
    } else {
      // Fallback to basic API call
      return await this.makeBasicAPICall(messages);
    }
  }

  /**
   * Process function calls in AI response
   */
  async processFunctionCalls(response, context) {
    if (!this.config.enableEnhancedFunctions) {
      return response;
    }

    // Check if response contains function calls
    // This is a simplified implementation - in practice, you'd parse the actual function calls
    if (response.includes('getComponentSpecifications') ||
        response.includes('getDiagnosticProcedure') ||
        response.includes('getSafetyRequirements')) {
      
      // Simulate function call processing
      const enhancedResponse = await this.enhanceResponseWithFunctions(response, context);
      return enhancedResponse;
    }

    return response;
  }

  /**
   * Enhance response with function call results
   */
  async enhanceResponseWithFunctions(response, context) {
    try {
      // Get relevant function results based on context
      const functionResults = [];

      if (context.faultCodes && context.faultCodes.length > 0) {
        const procedure = await this.services.functionHandlers.getDiagnosticProcedure({
          faultCode: context.faultCodes[0],
          manufacturer: context.manufacturer,
          boilerModel: context.boilerModel
        });
        functionResults.push(`**Diagnostic Procedure:** ${procedure}`);
      }

      if (context.manufacturer) {
        const safety = await this.services.functionHandlers.getSafetyRequirements({
          operationType: 'diagnostic',
          manufacturer: context.manufacturer
        });
        functionResults.push(`**Safety Requirements:** ${safety}`);
      }

      // Combine original response with function results
      if (functionResults.length > 0) {
        return `${response}\n\n---\n\n${functionResults.join('\n\n')}`;
      }

      return response;

    } catch (error) {
      console.error('[EnhancedIntegration] Function enhancement error:', error.message);
      return response; // Return original response if enhancement fails
    }
  }

  /**
   * Build basic prompt for fallback
   */
  buildBasicPrompt(context) {
    let prompt = `You are a professional Gas Safe registered heating engineer with 20+ years experience. 
Provide expert diagnostic guidance for boiler faults.`;

    if (context.manufacturer) {
      prompt += ` Focus on ${context.manufacturer} boilers.`;
    }

    if (context.faultCodes && context.faultCodes.length > 0) {
      prompt += ` Address fault code(s): ${context.faultCodes.join(', ')}.`;
    }

    return prompt;
  }

  /**
   * Make basic API call (fallback)
   */
  async makeBasicAPICall(messages) {
    // This would implement a basic API call without multi-model features
    // For now, return a placeholder
    return "Enhanced integration service is processing your request...";
  }

  /**
   * Log diagnostic performance metrics
   */
  async logDiagnosticMetrics(metrics) {
    try {
      // In a real implementation, this would log to database or monitoring service
      console.log('[EnhancedIntegration] Metrics:', {
        timestamp: new Date().toISOString(),
        ...metrics
      });
    } catch (error) {
      console.error('[EnhancedIntegration] Metrics logging error:', error.message);
    }
  }

  /**
   * Get current capabilities
   */
  getCapabilities() {
    return {
      multiModelSelection: this.config.enableMultiModel,
      advancedPrompts: this.config.enableAdvancedPrompts,
      enhancedFunctions: this.config.enableEnhancedFunctions,
      realTimeMonitoring: this.config.enableRealTimeMonitoring,
      functionCount: ENHANCED_FUNCTION_DECLARATIONS.length,
      availableModels: this.services.multiModel ? 
        Object.keys(this.services.multiModel.models) : [],
      monitoringSources: this.services.knowledgeMonitor ? 
        this.services.knowledgeMonitor.manufacturerSources.length : 0
    };
  }

  /**
   * Get active enhancements for current request
   */
  getActiveEnhancements() {
    const active = [];
    if (this.config.enableMultiModel) active.push('multi-model');
    if (this.config.enableAdvancedPrompts) active.push('advanced-prompts');
    if (this.config.enableEnhancedFunctions) active.push('enhanced-functions');
    if (this.config.enableRealTimeMonitoring) active.push('real-time-monitoring');
    return active;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      services: Object.keys(this.services).reduce((status, serviceName) => {
        status[serviceName] = this.services[serviceName] ? 'active' : 'inactive';
        return status;
      }, {}),
      config: this.config,
      capabilities: this.getCapabilities()
    };
  }

  /**
   * Start real-time monitoring manually
   */
  async startMonitoring() {
    if (this.services.knowledgeMonitor) {
      await this.services.knowledgeMonitor.startMonitoring();
    }
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring() {
    if (this.services.knowledgeMonitor) {
      this.services.knowledgeMonitor.stopMonitoring();
    }
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats() {
    if (this.services.knowledgeMonitor) {
      return this.services.knowledgeMonitor.getStatistics();
    }
    return null;
  }

  /**
   * Process quick interactive response for information gathering
   * Optimized for fast, focused questions rather than detailed diagnosis
   */
  async processQuickInteractiveResponse(userMessage, context) {
    const startTime = Date.now();
    const enhancementsUsed = ['interactive_workflow', 'quick_response'];

    try {
      // Use a simplified, faster approach for information gathering
      const messages = [
        {
          role: 'system',
          content: context.systemPrompt
        },
        {
          role: 'user', 
          content: userMessage
        }
      ];

      // Use the fastest available model for quick responses
      const response = await this.makeQuickAPICall({
        model: 'deepseek-chat',
        messages,
        maxTokens: 150, // Keep responses short and focused
        temperature: 0.3 // Lower temperature for more focused responses
      });

      const duration = Date.now() - startTime;

      return {
        response: response.content,
        metadata: {
          model: 'deepseek-chat',
          duration,
          enhancementsUsed,
          responseType: 'interactive_question',
          tokenCount: response.content.length
        }
      };

    } catch (error) {
      console.error('[Enhanced Integration] Quick interactive response failed:', error);
      
      // Fallback to basic response
      const fallbackResponse = this.generateFallbackInteractiveResponse(context.interactiveContext);
      
      return {
        response: fallbackResponse,
        metadata: {
          model: 'fallback',
          duration: Date.now() - startTime,
          enhancementsUsed: ['fallback'],
          responseType: 'interactive_fallback'
        }
      };
    }
  }

  /**
   * Make quick API call optimized for speed
   */
  async makeQuickAPICall({ model, messages, maxTokens = 150, temperature = 0.3 }) {
    const apiKey = process.env.DEEPSEEK_API_KEY_1;
    
    if (!apiKey) {
      throw new Error('No DeepSeek API key available for quick response');
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content
    };
  }

  /**
   * Generate fallback interactive response when API fails
   */
  generateFallbackInteractiveResponse(interactiveContext) {
    if (!interactiveContext || !interactiveContext.analysis) {
      return "Right, let's start with the basics - what type of heating system are we dealing with? Combi, system, or regular boiler?";
    }

    const { analysis } = interactiveContext;

    switch (analysis.nextQuestion) {
      case 'systemType':
        return "What type of heating system is it? Combi boiler, system boiler (with separate cylinder), or regular boiler (with tanks)?";
      
      case 'makeModel':
        return `Got it, ${analysis.systemType} system. What make and model is the boiler? Check the data plate if you need to.`;
      
      case 'faultCodes':
        return `Right, ${analysis.manufacturer} ${analysis.model || 'boiler'}. Any fault codes showing on the display? Or what exactly is the problem?`;
      
      default:
        return "Let me know what specific issue you're seeing and I'll walk you through it step by step.";
    }
  }

  /**
   * Get multi-model statistics
   */
  getMultiModelStats() {
    if (this.services.multiModel) {
      return this.services.multiModel.getStatistics();
    }
    return null;
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown() {
    
    if (this.services.knowledgeMonitor) {
      this.services.knowledgeMonitor.stopMonitoring();
    }

    this.isInitialized = false;
    this.services = {};
    
  }
}

export default EnhancedIntegrationService;
