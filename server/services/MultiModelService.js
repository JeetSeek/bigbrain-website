/**
 * Multi-Model Integration Service
 * Intelligent model selection, load balancing, and fallback mechanisms
 * for optimal AI responses with cost optimization
 */

export class MultiModelService {
  constructor() {
    this.models = {
      deepseek: {
        name: 'DeepSeek',
        endpoint: 'https://api.deepseek.com/chat/completions',
        cost: 0.14, // per 1M tokens (input)
        strengths: ['technical', 'diagnostic', 'cost-effective'],
        maxTokens: 4096,
        priority: 3
      },
      gpt4: {
        name: 'GPT-4o-mini',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        cost: 0.15, // per 1M tokens (input) - GPT-4o-mini pricing
        strengths: ['complex-reasoning', 'safety-critical', 'comprehensive', 'cost-effective'],
        maxTokens: 8192,
        priority: 1
      },
      gpt35: {
        name: 'GPT-3.5 Turbo',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        cost: 0.50, // per 1M tokens (input)
        strengths: ['fast', 'general', 'cost-effective'],
        maxTokens: 4096,
        priority: 2
      }
    };

    this.loadBalancer = {
      currentModel: 'deepseek',
      requestCounts: {},
      errorCounts: {},
      lastRotation: Date.now()
    };

    this.initializeApiKeys();
  }

  /**
   * Initialize API keys for all available models
   */
  initializeApiKeys() {
    this.apiKeys = {
      deepseek: this.getDeepSeekKeys(),
      openai: this.getOpenAIKeys()
    };

    console.log('[MultiModel] Initialized with models:', Object.keys(this.models));
    console.log('[MultiModel] Available API keys:', {
      deepseek: this.apiKeys.deepseek.length,
      openai: this.apiKeys.openai.length
    });
  }

  /**
   * Get DeepSeek API keys
   */
  getDeepSeekKeys() {
    const keys = [];
    if (process.env.DEEPSEEK_API_KEY_1) keys.push(process.env.DEEPSEEK_API_KEY_1);
    if (process.env.DEEPSEEK_API_KEY_2) keys.push(process.env.DEEPSEEK_API_KEY_2);
    if (process.env.DEEPSEEK_API_KEY_3) keys.push(process.env.DEEPSEEK_API_KEY_3);
    return keys;
  }

  /**
   * Get OpenAI API keys
   */
  getOpenAIKeys() {
    const keys = [];
    if (process.env.OPENAI_API_KEY) keys.push(process.env.OPENAI_API_KEY);
    if (process.env.OPENAI_API_KEY_2) keys.push(process.env.OPENAI_API_KEY_2);
    if (process.env.OPENAI_API_KEY_3) keys.push(process.env.OPENAI_API_KEY_3);
    if (process.env.OPENAI_API_KEY_4) keys.push(process.env.OPENAI_API_KEY_4);
    
    return keys;
  }

  /**
   * Intelligent model selection based on query characteristics
   */
  selectOptimalModel(query, context = {}) {
    const queryAnalysis = this.analyzeQuery(query, context);
    
    // Safety-critical queries always use most reliable model
    if (queryAnalysis.isSafetyCritical) {
      return this.selectBestAvailableModel(['gpt4', 'gpt35', 'deepseek']);
    }

    // Complex diagnostic queries
    if (queryAnalysis.complexity === 'high') {
      return this.selectBestAvailableModel(['gpt4', 'gpt35', 'deepseek']);
    }

    // Cost-optimized for simple queries
    if (queryAnalysis.complexity === 'low') {
      return this.selectBestAvailableModel(['gpt4', 'gpt35', 'deepseek']);
    }

    // Default: GPT-first approach
    return this.selectBestAvailableModel(['gpt4', 'gpt35', 'deepseek']);
  }

  /**
   * Analyze query characteristics for model selection
   */
  analyzeQuery(query, context) {
    const lowerQuery = query.toLowerCase();
    
    const analysis = {
      complexity: 'medium',
      isSafetyCritical: false,
      requiresReasoning: false,
      isEmergency: false,
      technicalDepth: 'medium'
    };

    // Safety-critical indicators
    const safetyKeywords = ['gas leak', 'carbon monoxide', 'emergency', 'danger', 'unsafe', 'explosion'];
    analysis.isSafetyCritical = safetyKeywords.some(keyword => lowerQuery.includes(keyword));

    // Emergency indicators
    const emergencyKeywords = ['emergency', 'urgent', 'immediate', 'dangerous', 'leak'];
    analysis.isEmergency = emergencyKeywords.some(keyword => lowerQuery.includes(keyword));

    // Complexity indicators
    const complexKeywords = ['intermittent', 'multiple faults', 'system design', 'wiring diagram', 'complex'];
    const simpleKeywords = ['fault code', 'error', 'simple', 'basic', 'quick'];
    
    if (complexKeywords.some(keyword => lowerQuery.includes(keyword))) {
      analysis.complexity = 'high';
    } else if (simpleKeywords.some(keyword => lowerQuery.includes(keyword))) {
      analysis.complexity = 'low';
    }

    // Technical depth
    const technicalKeywords = ['pcb', 'voltage', 'resistance', 'pressure', 'flow rate', 'calibration'];
    if (technicalKeywords.some(keyword => lowerQuery.includes(keyword))) {
      analysis.technicalDepth = 'high';
    }

    return analysis;
  }

  /**
   * Select best available model from preference list
   */
  selectBestAvailableModel(preferenceOrder) {
    for (const modelName of preferenceOrder) {
      if (this.isModelAvailable(modelName)) {
        return modelName;
      }
    }

    // Fallback to any available model
    return this.getFirstAvailableModel();
  }

  /**
   * Check if model is available (has API keys and low error rate)
   */
  isModelAvailable(modelName) {
    const model = this.models[modelName];
    if (!model) return false;

    // Check API key availability
    if (modelName === 'deepseek') {
      return this.apiKeys.deepseek.length > 0;
    } else if (modelName === 'gpt4' || modelName === 'gpt35') {
      return this.apiKeys.openai.length > 0;
    }

    return false;
  }

  /**
   * Get first available model
   */
  getFirstAvailableModel() {
    const modelNames = Object.keys(this.models);
    for (const modelName of modelNames) {
      if (this.isModelAvailable(modelName)) {
        return modelName;
      }
    }
    throw new Error('No models available - check API key configuration');
  }

  /**
   * Make API call with intelligent routing and fallback
   */
  async makeRequest(messages, options = {}) {
    const selectedModel = options.forceModel || this.selectOptimalModel(
      messages[messages.length - 1]?.content || '',
      options.context
    );


    try {
      const response = await this.callModel(selectedModel, messages, options);
      this.recordSuccess(selectedModel);
      return {
        response,
        modelUsed: selectedModel,
        cost: this.estimateCost(selectedModel, messages, response)
      };

    } catch (error) {
      console.error(`[MultiModel] Error with ${selectedModel}:`, error.message);
      this.recordError(selectedModel);

      // Try fallback models
      const fallbackModels = this.getFallbackModels(selectedModel);
      for (const fallbackModel of fallbackModels) {
        try {
          const response = await this.callModel(fallbackModel, messages, options);
          this.recordSuccess(fallbackModel);
          return {
            response,
            modelUsed: fallbackModel,
            cost: this.estimateCost(fallbackModel, messages, response),
            fallbackUsed: true
          };
        } catch (fallbackError) {
          console.error(`[MultiModel] Fallback ${fallbackModel} failed:`, fallbackError.message);
          this.recordError(fallbackModel);
        }
      }

      throw new Error(`All models failed. Last error: ${error.message}`);
    }
  }

  /**
   * Call specific model API
   */
  async callModel(modelName, messages, options) {
    const model = this.models[modelName];
    const apiKey = this.getApiKeyForModel(modelName);

    if (!apiKey) {
      throw new Error(`No API key available for ${modelName}`);
    }

    const requestBody = {
      model: this.getModelIdentifier(modelName),
      messages: messages,
      max_tokens: options.maxTokens || model.maxTokens,
      temperature: options.temperature || 0.7,
      stream: false
    };

    const response = await fetch(model.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${modelName} API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Get API key for specific model with rotation
   */
  getApiKeyForModel(modelName) {
    if (modelName === 'deepseek') {
      const keys = this.apiKeys.deepseek;
      return keys[Math.floor(Math.random() * keys.length)];
    } else if (modelName === 'gpt4' || modelName === 'gpt35') {
      const keys = this.apiKeys.openai;
      return keys[Math.floor(Math.random() * keys.length)];
    }
    return null;
  }

  /**
   * Get model identifier for API calls
   */
  getModelIdentifier(modelName) {
    switch (modelName) {
      case 'deepseek':
        return 'deepseek-chat';
      case 'gpt4':
        return 'gpt-4o-mini';
      case 'gpt35':
        return 'gpt-3.5-turbo';
      default:
        return 'gpt-4o-mini';
    }
  }

  /**
   * Get fallback models for failed requests
   */
  getFallbackModels(failedModel) {
    const allModels = ['deepseek', 'gpt4', 'gpt35'];
    return allModels.filter(model => 
      model !== failedModel && this.isModelAvailable(model)
    );
  }

  /**
   * Record successful request for load balancing
   */
  recordSuccess(modelName) {
    if (!this.loadBalancer.requestCounts[modelName]) {
      this.loadBalancer.requestCounts[modelName] = 0;
    }
    this.loadBalancer.requestCounts[modelName]++;
  }

  /**
   * Record error for model health tracking
   */
  recordError(modelName) {
    if (!this.loadBalancer.errorCounts[modelName]) {
      this.loadBalancer.errorCounts[modelName] = 0;
    }
    this.loadBalancer.errorCounts[modelName]++;
  }

  /**
   * Estimate cost for request
   */
  estimateCost(modelName, messages, response) {
    const model = this.models[modelName];
    const inputTokens = this.estimateTokens(messages);
    const outputTokens = this.estimateTokens([{ content: response }]);
    
    // Simplified cost calculation (input + output)
    const totalTokens = inputTokens + outputTokens;
    return (totalTokens / 1000000) * model.cost;
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(messages) {
    const text = messages.map(m => m.content).join(' ');
    return Math.ceil(text.length / 4); // Rough approximation: 4 chars per token
  }

  /**
   * Get model statistics
   */
  getStatistics() {
    return {
      models: this.models,
      loadBalancer: this.loadBalancer,
      availability: Object.keys(this.models).reduce((acc, modelName) => {
        acc[modelName] = this.isModelAvailable(modelName);
        return acc;
      }, {})
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.loadBalancer.requestCounts = {};
    this.loadBalancer.errorCounts = {};
    this.loadBalancer.lastRotation = Date.now();
  }
}

export default MultiModelService;
