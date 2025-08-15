/**
 * Enhanced Hybrid Diagnostic Service
 * Combines Supabase database with comprehensive structured fault finding data
 * for intelligent, context-aware boiler diagnostics
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

class EnhancedHybridDiagnosticService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Load structured fault finding data
    this.faultFindingPath = '/Users/markburrows/Desktop/fault finding';
    this.structuredDataPath = path.join(this.faultFindingPath, 'structured_data');
    
    // Cache for loaded data
    this.cache = {
      components: null,
      faults: null,
      procedures: null,
      symptoms: null,
      relationships: null,
      faultCodes: null
    };
    
    this.loadStructuredData();
  }

  /**
   * Load all structured diagnostic data from JSON files
   */
  loadStructuredData() {
    try {
      
      // Load structured JSON data
      if (fs.existsSync(path.join(this.structuredDataPath, 'components.json'))) {
        this.cache.components = JSON.parse(fs.readFileSync(path.join(this.structuredDataPath, 'components.json'), 'utf8'));
      }
      
      if (fs.existsSync(path.join(this.structuredDataPath, 'faults.json'))) {
        this.cache.faults = JSON.parse(fs.readFileSync(path.join(this.structuredDataPath, 'faults.json'), 'utf8'));
      }
      
      if (fs.existsSync(path.join(this.structuredDataPath, 'procedures.json'))) {
        this.cache.procedures = JSON.parse(fs.readFileSync(path.join(this.structuredDataPath, 'procedures.json'), 'utf8'));
      }
      
      if (fs.existsSync(path.join(this.structuredDataPath, 'symptoms.json'))) {
        this.cache.symptoms = JSON.parse(fs.readFileSync(path.join(this.structuredDataPath, 'symptoms.json'), 'utf8'));
      }
      
      if (fs.existsSync(path.join(this.structuredDataPath, 'relationships.json'))) {
        this.cache.relationships = JSON.parse(fs.readFileSync(path.join(this.structuredDataPath, 'relationships.json'), 'utf8'));
      }
      
      // Load ALL manufacturer fault codes from the fault codes directory
      this.cache.faultCodes = [];
      const faultCodesDir = path.join(this.faultFindingPath, 'fault codes all ');
      
      if (fs.existsSync(faultCodesDir)) {
        const faultCodeFiles = fs.readdirSync(faultCodesDir).filter(file => file.endsWith('_fault_codes.json'));
        
        for (const file of faultCodeFiles) {
          try {
            const filePath = path.join(faultCodesDir, file);
            const manufacturerData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            this.cache.faultCodes.push(manufacturerData);
          } catch (error) {
            console.error(`[Enhanced Hybrid] Error loading ${file}:`, error.message);
          }
        }
      }
      
      // Calculate total fault codes across all manufacturers
      const totalFaultCodes = this.cache.faultCodes.reduce((total, manufacturer) => {
        return total + (manufacturer.fault_codes?.length || 0);
      }, 0);
      
      console.log('[Enhanced Hybrid] Loaded structured data:', {
        components: this.cache.components?.length || 0,
        faults: this.cache.faults?.length || 0,
        procedures: this.cache.procedures?.length || 0,
        symptoms: this.cache.symptoms?.length || 0,
        manufacturers: this.cache.faultCodes?.length || 0,
        totalFaultCodes: totalFaultCodes
      });
      
    } catch (error) {
      console.error('[Enhanced Hybrid] Error loading structured data:', error);
    }
  }

  /**
   * Process a diagnostic query with comprehensive context analysis
   * @param {string} message - User's diagnostic query
   * @param {Array} history - Conversation history
   * @returns {Object} Processed diagnostic context and recommendations
   */
  async processQuery(message, history = []) {
    try {
      // Get comprehensive diagnostic context
      const diagnosticContext = this.getDiagnosticContext(message, history);
      
      // Query Supabase for additional database information
      const databaseContext = await this.querySupabaseForContext(diagnosticContext);
      
      // Combine structured data with database results
      const enhancedContext = {
        ...diagnosticContext,
        databaseResults: databaseContext,
        processedAt: new Date().toISOString(),
        confidence: this.calculateConfidence(diagnosticContext, databaseContext)
      };
      
      return enhancedContext;
    } catch (error) {
      console.error('[Enhanced Hybrid] Error processing query:', error);
      throw error;
    }
  }

  /**
   * Query Supabase database for additional diagnostic context
   * @private
   */
  async querySupabaseForContext(diagnosticContext) {
    try {
      const results = {};
      
      // Query fault codes from database
      if (diagnosticContext.faultCodes.length > 0) {
        const { data: dbFaultCodes } = await this.supabase
          .from('boiler_fault_codes')
          .select('*')
          .in('fault_code', diagnosticContext.faultCodes.map(fc => fc.code));
        
        results.databaseFaultCodes = dbFaultCodes || [];
      }
      
      // Query manufacturer-specific data
      if (diagnosticContext.boilerInfo?.manufacturer) {
        const { data: manufacturerData } = await this.supabase
          .from('boiler_models')
          .select('*')
          .ilike('manufacturer', `%${diagnosticContext.boilerInfo.manufacturer}%`);
        
        results.manufacturerData = manufacturerData || [];
      }
      
      // Query knowledge base for similar issues
      if (diagnosticContext.symptoms.length > 0) {
        const { data: knowledgeData } = await this.supabase
          .from('knowledge_base')
          .select('*')
          .textSearch('content', diagnosticContext.symptoms.join(' | '))
          .limit(5);
        
        results.relatedKnowledge = knowledgeData || [];
      }
      
      return results;
    } catch (error) {
      console.error('[Enhanced Hybrid] Error querying Supabase:', error);
      return {};
    }
  }

  /**
   * Calculate confidence score for diagnostic context
   * @private
   */
  calculateConfidence(diagnosticContext, databaseContext) {
    let confidence = 0;
    
    // Base confidence from structured data matches
    if (diagnosticContext.faultCodes.length > 0) confidence += 30;
    if (diagnosticContext.components.length > 0) confidence += 20;
    if (diagnosticContext.symptoms.length > 0) confidence += 15;
    if (diagnosticContext.boilerInfo?.manufacturer) confidence += 15;
    if (diagnosticContext.boilerInfo?.model) confidence += 10;
    
    // Boost from database matches
    if (databaseContext.databaseFaultCodes?.length > 0) confidence += 10;
    if (databaseContext.manufacturerData?.length > 0) confidence += 5;
    if (databaseContext.relatedKnowledge?.length > 0) confidence += 5;
    
    return Math.min(confidence, 100);
  }

  /**
   * Extract comprehensive diagnostic context from user message
   */
  async getDiagnosticContext(message, history = []) {
    const context = {
      faultCodes: [],
      components: [],
      symptoms: [],
      procedures: [],
      relationships: [],
      boilerInfo: null,
      safetyWarnings: [],
      diagnosticSteps: []
    };

    try {
      // 1. Extract fault codes from message
      const faultCodeMatches = message.match(/\b[FELA]\d{1,3}\b/gi) || [];
      
      // 1.5. Extract boiler information first (needed for manufacturer-specific fault code lookup)
      context.boilerInfo = this.extractBoilerInfo(message, history);
      
      // 2. Get fault code information from structured data with manufacturer context
      if (faultCodeMatches.length > 0) {
        const manufacturer = context.boilerInfo?.manufacturer;
        context.faultCodes = await this.getFaultCodeInfo(faultCodeMatches, manufacturer);
      }
      
      // 3. Extract component mentions
      context.components = this.extractComponentMentions(message);
      
      // 4. Extract symptom mentions
      context.symptoms = this.extractSymptomMentions(message);
      
      // 5. Get related procedures
      context.procedures = this.getRelatedProcedures(message, context.components, context.symptoms);
      
      // 6. Get component relationships
      context.relationships = this.getComponentRelationships(context.components);
      
      // 7. Get safety warnings
      context.safetyWarnings = this.getSafetyWarnings(context.faultCodes, context.components);
      
      // 9. Generate diagnostic steps
      context.diagnosticSteps = this.generateDiagnosticSteps(context);
      
      console.log('[Enhanced Hybrid] Diagnostic context:', {
        faultCodes: context.faultCodes.length,
        components: context.components.length,
        symptoms: context.symptoms.length,
        procedures: context.procedures.length
      });
      
      return context;
      
    } catch (error) {
      console.error('[Enhanced Hybrid] Error getting diagnostic context:', error);
      return context;
    }
  }

  /**
   * Get fault code information from structured data with manufacturer filtering
   */
  async getFaultCodeInfo(faultCodes, manufacturer = null) {
    const results = [];
    
    console.log(`[Enhanced Hybrid] Looking up fault codes: ${faultCodes.join(', ')} for manufacturer: ${manufacturer || 'any'}`);
    
    for (const code of faultCodes) {
      let found = false;
      
      // First, search local JSON files with manufacturer preference
      if (this.cache.faultCodes && this.cache.faultCodes.length > 0) {
        // Try manufacturer-specific search first if manufacturer is specified
        if (manufacturer) {
          const specificManufacturerData = this.cache.faultCodes.find(
            mfg => mfg.manufacturer.toLowerCase() === manufacturer.toLowerCase()
          );
          
          if (specificManufacturerData) {
            const faultInfo = specificManufacturerData.fault_codes?.find(
              f => f.fault_code.toLowerCase() === code.toLowerCase()
            );
            
            if (faultInfo) {
              results.push({
                code: faultInfo.fault_code,
                description: faultInfo.description,
                solutions: faultInfo.solutions || [],
                manufacturer: specificManufacturerData.manufacturer
              });
              found = true;
            }
          }
        }
        
        // If not found with specific manufacturer, search all manufacturers
        if (!found) {
          for (const manufacturerData of this.cache.faultCodes) {
            const faultInfo = manufacturerData.fault_codes?.find(
              f => f.fault_code.toLowerCase() === code.toLowerCase()
            );
            
            if (faultInfo) {
              results.push({
                code: faultInfo.fault_code,
                description: faultInfo.description,
                solutions: faultInfo.solutions || [],
                manufacturer: manufacturerData.manufacturer
              });
              found = true;
              break;
            }
          }
        }
      }
      
      // If not found in local files, query Supabase database with manufacturer filtering
      if (!found) {
        try {
          let query = this.supabase
            .from('boiler_fault_codes')
            .select('*')
            .eq('fault_code', code);
          
          // Add manufacturer filter if specified
          if (manufacturer) {
            query = query.ilike('manufacturer', `%${manufacturer}%`);
          }
          
          const { data, error } = await query;
          
          if (!error && data && data.length > 0) {
            const dbFault = data[0];
            results.push({
              code: dbFault.fault_code,
              description: dbFault.description,
              solutions: dbFault.solutions ? dbFault.solutions.split('\n') : [],
              manufacturer: dbFault.manufacturer,
              model: dbFault.model_name
            });
            found = true;
          }
        } catch (error) {
          console.error(`[Enhanced Hybrid] Database query error for ${code}:`, error);
        }
      }
      
      if (!found) {
        console.log(`[Enhanced Hybrid] No fault code data found for ${code} (manufacturer: ${manufacturer || 'any'})`);
      }
    }
    
    return results;
  }

  /**
   * Extract component mentions from message
   */
  extractComponentMentions(message) {
    if (!this.cache.components) return [];
    
    const lowerMessage = message.toLowerCase();
    const mentionedComponents = [];
    
    for (const component of this.cache.components) {
      const componentName = component.name.toLowerCase();
      if (lowerMessage.includes(componentName) || 
          lowerMessage.includes(componentName.replace(/\s+/g, ''))) {
        mentionedComponents.push(component);
      }
    }
    
    return mentionedComponents;
  }

  /**
   * Extract symptom mentions from message
   */
  extractSymptomMentions(message) {
    if (!this.cache.symptoms) return [];
    
    const lowerMessage = message.toLowerCase();
    const mentionedSymptoms = [];
    
    for (const symptom of this.cache.symptoms) {
      const symptomName = symptom.name.toLowerCase();
      if (lowerMessage.includes(symptomName)) {
        mentionedSymptoms.push(symptom);
      }
    }
    
    return mentionedSymptoms;
  }

  /**
   * Get related diagnostic procedures
   */
  getRelatedProcedures(message, components, symptoms) {
    if (!this.cache.procedures) return [];
    
    const relatedProcedures = [];
    const lowerMessage = message.toLowerCase();
    
    // Find procedures related to mentioned components
    for (const component of components) {
      const componentProcedures = this.cache.procedures.filter(proc => 
        proc.name.toLowerCase().includes(component.name.toLowerCase()) ||
        proc.purpose.toLowerCase().includes(component.name.toLowerCase())
      );
      relatedProcedures.push(...componentProcedures);
    }
    
    // Find procedures related to mentioned symptoms
    for (const symptom of symptoms) {
      const symptomProcedures = this.cache.procedures.filter(proc =>
        proc.purpose.toLowerCase().includes(symptom.name.toLowerCase())
      );
      relatedProcedures.push(...symptomProcedures);
    }
    
    // Find procedures mentioned directly in message
    const directProcedures = this.cache.procedures.filter(proc =>
      lowerMessage.includes(proc.name.toLowerCase())
    );
    relatedProcedures.push(...directProcedures);
    
    // Remove duplicates
    return relatedProcedures.filter((proc, index, self) =>
      index === self.findIndex(p => p.id === proc.id)
    );
  }

  /**
   * Get component relationships
   */
  getComponentRelationships(components) {
    if (!this.cache.relationships || components.length === 0) return [];
    
    const relationships = [];
    
    for (const component of components) {
      const componentRelationships = this.cache.relationships.filter(rel =>
        rel.component_a === component.id || rel.component_b === component.id
      );
      relationships.push(...componentRelationships);
    }
    
    return relationships;
  }

  /**
   * Extract boiler information from message and history
   */
  extractBoilerInfo(message, history) {
    const fullText = [message, ...history.slice(-5).map(h => h.text)].join(' ').toLowerCase();
    
    // Extract manufacturer - comprehensive list matching all fault code manufacturers
    const manufacturers = [
      'ideal', 'worcester', 'worcester bosch', 'vaillant', 'baxi', 'potterton', 
      'glow-worm', 'glow worm', 'viessmann', 'ariston', 'ferroli', 'intergas',
      'johnson and starley', 'johnson & starley', 'main', 'ravenheat', 
      'siemens', 'sime', 'vokera', 'acv', 'alpha', 'danfoss'
    ];
    
    // Find manufacturer with priority for longer matches (e.g., "worcester bosch" over "worcester")
    const sortedManufacturers = manufacturers.sort((a, b) => b.length - a.length);
    const manufacturer = sortedManufacturers.find(m => fullText.includes(m));
    
    // Extract model with improved pattern matching
    const modelPatterns = [
      /\b(logic\s*combi?\s*\d+[a-z]*)/i,
      /\b(ecotec\s*\d+[a-z]*)/i,
      /\b(combi?\s*\d+[a-z]*)/i,
      /\b([a-z]+\s*\d+[a-z]*)/i
    ];
    
    let model = null;
    for (const pattern of modelPatterns) {
      const match = fullText.match(pattern);
      if (match) {
        model = match[1];
        break;
      }
    }
    
    return { manufacturer, model };
  }

  /**
   * Get safety warnings based on context
   */
  getSafetyWarnings(faultCodes, components) {
    const warnings = [];
    
    // Add safety warnings for specific fault codes
    for (const fault of faultCodes) {
      if (fault.code.startsWith('L') || fault.description.toLowerCase().includes('lockout')) {
        warnings.push({
          type: 'lockout',
          message: '⚠️ Boiler lockout detected - ensure safe isolation before investigation'
        });
      }
    }
    
    // Add safety warnings for specific components
    for (const component of components) {
      if (component.name.toLowerCase().includes('gas')) {
        warnings.push({
          type: 'gas_safety',
          message: '⚠️ Gas work detected - ensure Gas Safe registration and proper isolation'
        });
      }
    }
    
    return warnings;
  }

  /**
   * Generate diagnostic steps based on context
   */
  generateDiagnosticSteps(context) {
    const steps = [];
    
    // Add fault code specific steps
    for (const fault of context.faultCodes) {
      steps.push({
        type: 'fault_code',
        description: `Diagnose ${fault.code}: ${fault.description}`,
        actions: fault.solutions
      });
    }
    
    // Add component specific steps
    for (const component of context.components) {
      const relatedProcedures = context.procedures.filter(proc =>
        proc.name.toLowerCase().includes(component.name.toLowerCase())
      );
      
      if (relatedProcedures.length > 0) {
        steps.push({
          type: 'component',
          description: `Test ${component.name}`,
          actions: relatedProcedures[0].steps?.map(s => s.instruction) || []
        });
      }
    }
    
    return steps;
  }

  /**
   * Build enhanced system prompt with comprehensive diagnostic context
   */
  buildEnhancedPrompt(basePrompt, diagnosticContext) {
    let enhancedPrompt = basePrompt;

    // Add manufacturer-specific guidance even without fault codes
    if (diagnosticContext.boilerInfo?.manufacturer) {
      const manufacturerData = this.cache.faultCodes.find(m => 
        m.manufacturer.toLowerCase().includes(diagnosticContext.boilerInfo.manufacturer.toLowerCase())
      );
      
      if (manufacturerData) {
        enhancedPrompt += `\n\n**MANUFACTURER-SPECIFIC TECHNICAL DATA:**\n`;
        enhancedPrompt += `Boiler: ${manufacturerData.manufacturer}${diagnosticContext.boilerInfo.model ? ' ' + diagnosticContext.boilerInfo.model : ''}\n`;
        enhancedPrompt += `Database contains ${manufacturerData.fault_codes?.length || 0} manufacturer-specific fault codes and diagnostic procedures.\n`;
        enhancedPrompt += `Apply ${manufacturerData.manufacturer}-specific service manual procedures and technical bulletins.\n`;
        enhancedPrompt += `Reference manufacturer wiring diagrams and component specifications for this model.\n`;
      }
    }

    // Add comprehensive fault code information with professional diagnostic procedures
    if (diagnosticContext.faultCodes.length > 0) {
      enhancedPrompt += '\n\n**FAULT CODE DIAGNOSTIC DATABASE:**\n';
      diagnosticContext.faultCodes.forEach(fault => {
        enhancedPrompt += `\n**${fault.code}** (${fault.manufacturer}): ${fault.description}\n`;
        if (fault.solutions?.length > 0) {
          enhancedPrompt += `Professional diagnostic procedures:\n`;
          fault.solutions.forEach((solution, index) => {
            enhancedPrompt += `${index + 1}. ${solution}\n`;
          });
        }
        enhancedPrompt += `Required test equipment: Multimeter, manometer, gas analyzer as appropriate\n`;
        enhancedPrompt += `Safety isolation: Follow Gas Safe procedures before testing\n`;
      });
    }

    // Add detailed component technical information
    if (diagnosticContext.components.length > 0) {
      enhancedPrompt += '\n\n**COMPONENT TECHNICAL SPECIFICATIONS:**\n';
      diagnosticContext.components.forEach(component => {
        enhancedPrompt += `**${component.name}**: ${component.description}\n`;
        enhancedPrompt += `Primary function: ${component.function}\n`;
        enhancedPrompt += `Testing requirements: Electrical continuity, operational parameters, safety interlocks\n`;
        enhancedPrompt += `Common failure modes: Consider wear patterns, environmental factors, age-related degradation\n`;
      });
    }

    // Add professional diagnostic procedures with technical depth
    if (diagnosticContext.procedures.length > 0) {
      enhancedPrompt += '\n\n**PROFESSIONAL DIAGNOSTIC PROCEDURES:**\n';
      diagnosticContext.procedures.slice(0, 3).forEach(procedure => {
        enhancedPrompt += `**${procedure.name}**: ${procedure.purpose}\n`;
        if (procedure.steps && procedure.steps.length > 0) {
          enhancedPrompt += `Systematic procedure:\n`;
          procedure.steps.slice(0, 5).forEach((step, index) => {
            enhancedPrompt += `${index + 1}. ${step.instruction}\n`;
          });
        }
        enhancedPrompt += `Expected test values and tolerances must be referenced from manufacturer data\n`;
      });
    }

    // Add comprehensive safety warnings with Gas Safe compliance
    if (diagnosticContext.safetyWarnings.length > 0) {
      enhancedPrompt += '\n\n**GAS SAFE COMPLIANCE AND SAFETY ALERTS:**\n';
      diagnosticContext.safetyWarnings.forEach(warning => {
        enhancedPrompt += `⚠️ **CRITICAL**: ${warning.message}\n`;
      });
      enhancedPrompt += getBaseSystemPrompt();
      enhancedPrompt += '\n\n**PROFESSIONAL DIAGNOSTIC PROTOCOL:**\n';
      enhancedPrompt += '1. ALWAYS reference the manufacturer-specific technical data provided above\n';
      enhancedPrompt += '2. Provide systematic diagnostic procedures with specific test equipment requirements\n';
      enhancedPrompt += '3. Include expected values, tolerances, and decision criteria for each test\n';
      enhancedPrompt += '4. Reference relevant wiring diagrams, component locations, and access procedures\n';
      enhancedPrompt += '5. Emphasize safety isolation and Gas Safe compliance throughout\n';
      enhancedPrompt += '6. Consider system interactions and secondary effects in fault diagnosis\n';
      enhancedPrompt += '7. Provide time estimates based on professional diagnostic procedures\n';
      enhancedPrompt += '8. If manufacturer data is unavailable, clearly state this and provide general professional guidance\n';

      enhancedPrompt += '\n\nDELIVER EXPERT-LEVEL TECHNICAL GUIDANCE: Use the comprehensive diagnostic database above to provide the detailed, safety-focused, and technically accurate advice that Gas Safe engineers expect from senior colleagues. Reference specific fault codes, test procedures, and manufacturer data in your responses.';
    }

    return enhancedPrompt;
  }
}

export default EnhancedHybridDiagnosticService;
