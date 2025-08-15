/**
 * Enhanced System Automated Testing Suite
 * Comprehensive testing for MCP/GPT enhancements and diagnostic accuracy
 */

import { jest } from '@jest/globals';
import PromptEngineeringService from '../server/services/PromptEngineeringService.js';
import EnhancedFunctionHandlers from '../server/services/EnhancedFunctionHandlers.js';
import MultiModelService from '../server/services/MultiModelService.js';
import RealTimeKnowledgeMonitor from '../server/services/RealTimeKnowledgeMonitor.js';
import { ENHANCED_FUNCTION_DECLARATIONS } from '../server/constants/enhancedFunctionDeclarations.js';

describe('Enhanced System Integration Tests', () => {
  let promptService;
  let functionHandlers;
  let multiModelService;
  let knowledgeMonitor;

  beforeAll(async () => {
    // Mock environment variables
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.DEEPSEEK_API_KEY_1 = 'test-deepseek-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    // Initialize services
    promptService = new PromptEngineeringService();
    functionHandlers = new EnhancedFunctionHandlers();
    multiModelService = new MultiModelService();
    knowledgeMonitor = new RealTimeKnowledgeMonitor();
  });

  afterAll(async () => {
    // Cleanup
    if (knowledgeMonitor.monitoringActive) {
      knowledgeMonitor.stopMonitoring();
    }
  });

  describe('Prompt Engineering Service', () => {
    test('should build dynamic prompts with context', () => {
      const context = {
        manufacturer: 'Ideal',
        faultCodes: ['L2'],
        boilerType: 'combi',
        expertiseLevel: 'intermediate',
        diagnosticStage: 'initial'
      };

      const prompt = promptService.buildDynamicPrompt(context);
      
      expect(prompt).toContain('Ideal');
      expect(prompt).toContain('L2');
      expect(prompt).toContain('combi');
      expect(prompt).toContain('intermediate');
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });

    test('should adapt prompts for different expertise levels', () => {
      const baseContext = {
        manufacturer: 'Worcester Bosch',
        faultCodes: ['F28'],
        boilerType: 'system'
      };

      const beginnerPrompt = promptService.buildDynamicPrompt({
        ...baseContext,
        expertiseLevel: 'beginner'
      });

      const expertPrompt = promptService.buildDynamicPrompt({
        ...baseContext,
        expertiseLevel: 'expert'
      });

      expect(beginnerPrompt).toContain('basic');
      expect(expertPrompt).toContain('advanced');
      expect(beginnerPrompt.length).toBeLessThan(expertPrompt.length);
    });

    test('should include safety warnings for critical faults', () => {
      const context = {
        manufacturer: 'Baxi',
        faultCodes: ['F1'], // Gas supply fault
        boilerType: 'combi',
        expertiseLevel: 'intermediate'
      };

      const prompt = promptService.buildDynamicPrompt(context);
      
      expect(prompt.toLowerCase()).toMatch(/safety|gas|danger|warning/);
    });

    test('should handle manufacturer-specific context', () => {
      const idealContext = {
        manufacturer: 'Ideal',
        faultCodes: ['L2'],
        boilerType: 'combi'
      };

      const vaillantContext = {
        manufacturer: 'Vaillant',
        faultCodes: ['F28'],
        boilerType: 'system'
      };

      const idealPrompt = promptService.buildDynamicPrompt(idealContext);
      const vaillantPrompt = promptService.buildDynamicPrompt(vaillantContext);

      expect(idealPrompt).toContain('Ideal');
      expect(vaillantPrompt).toContain('Vaillant');
      expect(idealPrompt).not.toContain('Vaillant');
      expect(vaillantPrompt).not.toContain('Ideal');
    });
  });

  describe('Enhanced Function Declarations', () => {
    test('should have all required function declarations', () => {
      const expectedFunctions = [
        'getComponentSpecifications',
        'getDiagnosticProcedure',
        'getSafetyRequirements',
        'getTestProcedure',
        'getTroubleshootingGuide',
        'getPartInformation',
        'getWiringDiagram',
        'getMaintenanceSchedule',
        'getComplianceChecklist',
        'getErrorCodeHistory',
        'getSystemDesignGuidance',
        'getEmergencyProcedures'
      ];

      expectedFunctions.forEach(functionName => {
        const declaration = ENHANCED_FUNCTION_DECLARATIONS.find(f => f.name === functionName);
        expect(declaration).toBeDefined();
        expect(declaration.description).toBeDefined();
        expect(declaration.parameters).toBeDefined();
      });
    });

    test('should have proper parameter schemas', () => {
      const componentSpecsFunction = ENHANCED_FUNCTION_DECLARATIONS.find(
        f => f.name === 'getComponentSpecifications'
      );

      expect(componentSpecsFunction.parameters.properties).toHaveProperty('componentType');
      expect(componentSpecsFunction.parameters.properties).toHaveProperty('manufacturer');
      expect(componentSpecsFunction.parameters.required).toContain('componentType');
    });
  });

  describe('Enhanced Function Handlers', () => {
    beforeEach(() => {
      // Mock Supabase client
      functionHandlers.supabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      };
    });

    test('should handle component specifications request', async () => {
      const result = await functionHandlers.getComponentSpecifications({
        componentType: 'gas_valve',
        manufacturer: 'Ideal',
        modelNumber: 'Logic 24'
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.toLowerCase()).toContain('gas valve');
    });

    test('should handle diagnostic procedure request', async () => {
      const result = await functionHandlers.getDiagnosticProcedure({
        faultCode: 'L2',
        manufacturer: 'Ideal',
        boilerModel: 'Logic 24'
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.toLowerCase()).toContain('diagnostic');
    });

    test('should handle safety requirements request', async () => {
      const result = await functionHandlers.getSafetyRequirements({
        operationType: 'gas_valve_replacement',
        manufacturer: 'Worcester Bosch'
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.toLowerCase()).toMatch(/safety|gas safe|isolation/);
    });

    test('should handle emergency procedures request', async () => {
      const result = await functionHandlers.getEmergencyProcedures({
        emergencyType: 'gas_leak',
        location: 'domestic'
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.toLowerCase()).toMatch(/emergency|gas emergency|0800 111 999/);
    });
  });

  describe('Multi-Model Service', () => {
    test('should initialize with available models', () => {
      expect(multiModelService.models).toBeDefined();
      expect(multiModelService.models.deepseek).toBeDefined();
      expect(multiModelService.models.gpt4).toBeDefined();
      expect(multiModelService.models.gpt35).toBeDefined();
    });

    test('should select optimal model based on query analysis', () => {
      const safetyQuery = 'gas leak emergency procedure';
      const simpleQuery = 'F22 fault code meaning';
      const complexQuery = 'intermittent multiple fault codes system design issue';

      const safetyModel = multiModelService.selectOptimalModel(safetyQuery);
      const simpleModel = multiModelService.selectOptimalModel(simpleQuery);
      const complexModel = multiModelService.selectOptimalModel(complexQuery);

      expect(typeof safetyModel).toBe('string');
      expect(typeof simpleModel).toBe('string');
      expect(typeof complexModel).toBe('string');
    });

    test('should analyze query characteristics correctly', () => {
      const safetyQuery = 'gas leak emergency danger';
      const analysis = multiModelService.analyzeQuery(safetyQuery);

      expect(analysis.isSafetyCritical).toBe(true);
      expect(analysis.isEmergency).toBe(true);
    });

    test('should check model availability', () => {
      const deepseekAvailable = multiModelService.isModelAvailable('deepseek');
      const gpt4Available = multiModelService.isModelAvailable('gpt4');

      expect(typeof deepseekAvailable).toBe('boolean');
      expect(typeof gpt4Available).toBe('boolean');
    });

    test('should get fallback models', () => {
      const fallbacks = multiModelService.getFallbackModels('deepseek');
      
      expect(Array.isArray(fallbacks)).toBe(true);
      expect(fallbacks).not.toContain('deepseek');
    });

    test('should estimate costs correctly', () => {
      const messages = [{ content: 'Test message for cost estimation' }];
      const response = 'Test response for cost estimation';
      
      const cost = multiModelService.estimateCost('deepseek', messages, response);
      
      expect(typeof cost).toBe('number');
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('Real-Time Knowledge Monitor', () => {
    test('should initialize with manufacturer sources', () => {
      expect(knowledgeMonitor.manufacturerSources).toBeDefined();
      expect(Array.isArray(knowledgeMonitor.manufacturerSources)).toBe(true);
      expect(knowledgeMonitor.manufacturerSources.length).toBeGreaterThan(0);
    });

    test('should calculate source reliability scores', () => {
      const manufacturerSource = {
        type: 'manufacturer',
        priority: 'high'
      };

      const regulatorySource = {
        type: 'regulatory',
        priority: 'critical'
      };

      const manufacturerScore = knowledgeMonitor.calculateSourceReliability(manufacturerSource);
      const regulatoryScore = knowledgeMonitor.calculateSourceReliability(regulatorySource);

      expect(typeof manufacturerScore).toBe('number');
      expect(typeof regulatoryScore).toBe('number');
      expect(regulatoryScore).toBeGreaterThan(manufacturerScore);
      expect(regulatoryScore).toBeLessThanOrEqual(100);
    });

    test('should validate knowledge items', async () => {
      const testItem = {
        id: 'test-id',
        content: 'Test knowledge content',
        source_url: 'https://example.com/test',
        reliability_score: 75,
        created_at: new Date().toISOString()
      };

      const validation = await knowledgeMonitor.validateKnowledgeItem(testItem);

      expect(validation).toBeDefined();
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('confidence');
      expect(validation).toHaveProperty('issues');
      expect(Array.isArray(validation.issues)).toBe(true);
    });

    test('should get monitoring statistics', () => {
      const stats = knowledgeMonitor.getStatistics();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('checksPerformed');
      expect(stats).toHaveProperty('updatesFound');
      expect(stats).toHaveProperty('errorsEncountered');
      expect(stats).toHaveProperty('isActive');
      expect(stats).toHaveProperty('sourcesMonitored');
    });

    test('should update monitoring configuration', () => {
      const newConfig = {
        checkInterval: 60 * 60 * 1000, // 1 hour
        batchSize: 20
      };

      knowledgeMonitor.updateConfig(newConfig);

      expect(knowledgeMonitor.monitoringConfig.checkInterval).toBe(60 * 60 * 1000);
      expect(knowledgeMonitor.monitoringConfig.batchSize).toBe(20);
    });
  });

  describe('Integration Tests', () => {
    test('should integrate prompt engineering with function handlers', async () => {
      const context = {
        manufacturer: 'Ideal',
        faultCodes: ['L2'],
        boilerType: 'combi',
        expertiseLevel: 'intermediate'
      };

      const prompt = promptService.buildDynamicPrompt(context);
      
      // Mock function call based on prompt context
      const componentSpecs = await functionHandlers.getComponentSpecifications({
        componentType: 'ignition_system',
        manufacturer: context.manufacturer,
        modelNumber: 'Logic 24'
      });

      expect(prompt).toContain('Ideal');
      expect(componentSpecs).toBeDefined();
      expect(typeof componentSpecs).toBe('string');
    });

    test('should handle end-to-end diagnostic workflow', async () => {
      // Simulate complete diagnostic workflow
      const userQuery = 'Ideal Logic 24 combi showing L2 fault code';
      
      // 1. Analyze query for model selection
      const queryAnalysis = multiModelService.analyzeQuery(userQuery);
      expect(queryAnalysis).toBeDefined();

      // 2. Build enhanced prompt
      const context = {
        manufacturer: 'Ideal',
        faultCodes: ['L2'],
        boilerType: 'combi',
        expertiseLevel: 'intermediate'
      };
      
      const prompt = promptService.buildDynamicPrompt(context);
      expect(prompt).toContain('L2');

      // 3. Get diagnostic procedure
      const procedure = await functionHandlers.getDiagnosticProcedure({
        faultCode: 'L2',
        manufacturer: 'Ideal',
        boilerModel: 'Logic 24'
      });
      
      expect(procedure).toBeDefined();
      expect(typeof procedure).toBe('string');
    });

    test('should handle safety-critical scenarios', async () => {
      const emergencyQuery = 'gas leak detected during boiler service';
      
      // Should select most reliable model for safety
      const selectedModel = multiModelService.selectOptimalModel(emergencyQuery);
      expect(typeof selectedModel).toBe('string');

      // Should provide emergency procedures
      const emergencyProcedure = await functionHandlers.getEmergencyProcedures({
        emergencyType: 'gas_leak',
        location: 'domestic'
      });

      expect(emergencyProcedure).toBeDefined();
      expect(emergencyProcedure.toLowerCase()).toMatch(/emergency|gas emergency|evacuate|0800 111 999/);
    });
  });

  describe('Performance Tests', () => {
    test('should handle multiple concurrent requests', async () => {
      const requests = Array(10).fill().map((_, i) => 
        functionHandlers.getComponentSpecifications({
          componentType: 'gas_valve',
          manufacturer: 'Ideal',
          modelNumber: `Test-${i}`
        })
      );

      const results = await Promise.all(requests);
      
      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(typeof result).toBe('string');
      });
    });

    test('should complete prompt generation quickly', () => {
      const startTime = Date.now();
      
      const context = {
        manufacturer: 'Worcester Bosch',
        faultCodes: ['F28', 'F22'],
        boilerType: 'system',
        expertiseLevel: 'expert'
      };

      const prompt = promptService.buildDynamicPrompt(context);
      
      const duration = Date.now() - startTime;
      
      expect(prompt).toBeDefined();
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle missing parameters gracefully', async () => {
      const result = await functionHandlers.getComponentSpecifications({});
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.toLowerCase()).toContain('component');
    });

    test('should handle invalid manufacturer gracefully', async () => {
      const result = await functionHandlers.getDiagnosticProcedure({
        faultCode: 'INVALID',
        manufacturer: 'NonExistentManufacturer',
        boilerModel: 'InvalidModel'
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    test('should handle model selection with no available models', () => {
      // Temporarily remove API keys
      const originalKeys = multiModelService.apiKeys;
      multiModelService.apiKeys = { deepseek: [], openai: [] };

      expect(() => {
        multiModelService.getFirstAvailableModel();
      }).toThrow('No models available');

      // Restore keys
      multiModelService.apiKeys = originalKeys;
    });
  });
});

// Additional test utilities
export const testUtils = {
  /**
   * Create mock diagnostic context
   */
  createMockContext: (overrides = {}) => ({
    manufacturer: 'Ideal',
    faultCodes: ['L2'],
    boilerType: 'combi',
    expertiseLevel: 'intermediate',
    diagnosticStage: 'initial',
    ...overrides
  }),

  /**
   * Validate diagnostic response quality
   */
  validateDiagnosticResponse: (response) => {
    const checks = {
      hasContent: response && response.length > 50,
      hasTechnicalInfo: /fault|code|procedure|test|check/i.test(response),
      hasSafetyInfo: /safety|gas safe|isolation|danger/i.test(response),
      isProfessional: !/diy|amateur|basic/i.test(response)
    };

    return {
      isValid: Object.values(checks).every(check => check),
      checks,
      score: Object.values(checks).filter(check => check).length / Object.keys(checks).length * 100
    };
  },

  /**
   * Mock Supabase responses
   */
  mockSupabaseResponse: (data = null, error = null) => ({
    data,
    error,
    status: error ? 400 : 200,
    statusText: error ? 'Bad Request' : 'OK'
  })
};

export default testUtils;
