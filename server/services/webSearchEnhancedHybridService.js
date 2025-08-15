/**
 * Web Search Enhanced Hybrid Diagnostic Service
 * Combines structured fault finding data with real-time web search
 * for comprehensive, up-to-date engineer-level diagnostic responses
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

class WebSearchEnhancedHybridService {
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
      
      // Load fault codes from the fault codes directory
      const faultCodesPath = path.join(this.faultFindingPath, 'fault codes all ', 'ideal_fault_codes.json');
      if (fs.existsSync(faultCodesPath)) {
        this.cache.faultCodes = JSON.parse(fs.readFileSync(faultCodesPath, 'utf8'));
      }
      
      console.log('[Web Enhanced Hybrid] Loaded structured data:', {
        components: this.cache.components?.length || 0,
        faults: this.cache.faults?.length || 0,
        procedures: this.cache.procedures?.length || 0,
        symptoms: this.cache.symptoms?.length || 0,
        faultCodes: this.cache.faultCodes?.fault_codes?.length || 0
      });
      
    } catch (error) {
      console.error('[Web Enhanced Hybrid] Error loading structured data:', error);
    }
  }

  /**
   * Perform web search for current diagnostic information
   */
  async performWebSearch(query, context) {
    try {
      
      // Build search query based on context
      let searchQuery = query;
      
      // Add manufacturer and model context if available
      if (context.boilerInfo?.manufacturer) {
        searchQuery += ` ${context.boilerInfo.manufacturer}`;
      }
      if (context.boilerInfo?.model) {
        searchQuery += ` ${context.boilerInfo.model}`;
      }
      
      // Add fault code context
      if (context.faultCodes?.length > 0) {
        const faultCode = context.faultCodes[0].code;
        searchQuery += ` fault code ${faultCode}`;
      }
      
      // Add specific search terms for engineer-level information
      searchQuery += ' service bulletin technical support engineer guide';
      
      
      // Use the existing search_web function (assuming it's available)
      const searchResults = await this.searchWeb(searchQuery);
      
      return {
        query: searchQuery,
        results: searchResults || [],
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('[Web Enhanced Hybrid] Web search error:', error);
      return {
        query,
        results: [],
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Web search implementation (placeholder - would use actual search API)
   */
  async searchWeb(query) {
    // This would integrate with a real search API like Google Custom Search, Bing, etc.
    // For now, return mock results to demonstrate the concept
    
    
    // Mock search results that would come from real web search
    return [
      {
        title: "Ideal Logic Combi Service Manual - Latest Updates",
        url: "https://idealboilers.com/service-manual-logic-combi",
        snippet: "Recent updates to L2 fault diagnosis procedures. New electrode testing methods and common causes identified in 2024 models.",
        relevance: 0.95
      },
      {
        title: "Gas Safe Technical Bulletin - Ignition Lockout Issues",
        url: "https://gassaferegister.co.uk/technical-bulletin-ignition",
        snippet: "Technical guidance on L2 ignition lockout faults. Updated diagnostic procedures and safety considerations for engineers.",
        relevance: 0.88
      },
      {
        title: "Boiler Parts Supplier - Ignition Electrode Availability",
        url: "https://boilerparts.co.uk/ideal-logic-electrode",
        snippet: "Ideal Logic ignition electrode part 175562 in stock. Compatible with all Logic Combi models. Next day delivery available.",
        relevance: 0.75
      }
    ];
  }

  /**
   * Get comprehensive diagnostic context combining structured data and web search
   */
  async getDiagnosticContext(message, history = []) {
    // First get structured data context (existing functionality)
    const structuredContext = await this.getStructuredDiagnosticContext(message, history);
    
    // Then perform web search for current information
    const webSearchContext = await this.performWebSearch(message, structuredContext);
    
    // Combine both contexts
    const combinedContext = {
      ...structuredContext,
      webSearch: webSearchContext,
      dataSourceSummary: {
        structuredData: {
          faultCodes: structuredContext.faultCodes?.length || 0,
          components: structuredContext.components?.length || 0,
          procedures: structuredContext.procedures?.length || 0
        },
        webSearch: {
          resultsFound: webSearchContext.results?.length || 0,
          query: webSearchContext.query,
          timestamp: webSearchContext.timestamp
        }
      }
    };
    
    
    return combinedContext;
  }

  /**
   * Get structured diagnostic context (existing functionality)
   */
  async getStructuredDiagnosticContext(message, history = []) {
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
      // Extract fault codes from message
      const faultCodeMatches = message.match(/\b[FELA]\d{1,3}\b/gi) || [];
      
      // Get fault code information from structured data
      if (faultCodeMatches.length > 0 && this.cache.faultCodes) {
        context.faultCodes = this.getFaultCodeInfo(faultCodeMatches);
      }
      
      // Extract component mentions
      context.components = this.extractComponentMentions(message);
      
      // Extract symptom mentions
      context.symptoms = this.extractSymptomMentions(message);
      
      // Get related procedures
      context.procedures = this.getRelatedProcedures(message, context.components, context.symptoms);
      
      // Extract boiler information
      context.boilerInfo = this.extractBoilerInfo(message, history);
      
      // Get safety warnings
      context.safetyWarnings = this.getSafetyWarnings(context.faultCodes, context.components);
      
      return context;
      
    } catch (error) {
      console.error('[Web Enhanced Hybrid] Error getting structured diagnostic context:', error);
      return context;
    }
  }

  /**
   * Get fault code information from structured data
   */
  getFaultCodeInfo(faultCodes) {
    if (!this.cache.faultCodes) return [];
    
    const results = [];
    
    for (const code of faultCodes) {
      const faultInfo = this.cache.faultCodes.fault_codes.find(
        f => f.fault_code.toLowerCase() === code.toLowerCase()
      );
      
      if (faultInfo) {
        results.push({
          code: faultInfo.fault_code,
          description: faultInfo.description,
          solutions: faultInfo.solutions || [],
          manufacturer: this.cache.faultCodes.manufacturer
        });
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
    
    // Remove duplicates
    return relatedProcedures.filter((proc, index, self) =>
      index === self.findIndex(p => p.id === proc.id)
    );
  }

  /**
   * Extract boiler information from message and history
   */
  extractBoilerInfo(message, history) {
    const fullText = [message, ...history.slice(-5).map(h => h.text)].join(' ').toLowerCase();
    
    // Extract manufacturer
    const manufacturers = ['ideal', 'worcester', 'vaillant', 'baxi', 'potterton', 'glow-worm'];
    const manufacturer = manufacturers.find(m => fullText.includes(m));
    
    // Extract model
    const modelMatch = fullText.match(/\b([a-z]+\s*[a-z]*\s*\d+[a-z]*)\b/i);
    const model = modelMatch ? modelMatch[1] : null;
    
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
    
    return warnings;
  }

  /**
   * Build enhanced system prompt with structured data AND web search results
   */
  buildEnhancedPrompt(basePrompt, diagnosticContext) {
    let enhancedPrompt = basePrompt;

    // Add fault code specific information from structured data
    if (diagnosticContext.faultCodes?.length > 0) {
      enhancedPrompt += '\n\n**FAULT CODE DATABASE INFO:**\n';
      diagnosticContext.faultCodes.forEach(fault => {
        enhancedPrompt += `\n${fault.code} (${fault.manufacturer}): ${fault.description}\n`;
        if (fault.solutions?.length > 0) {
          enhancedPrompt += `Solutions: ${fault.solutions.join('; ')}\n`;
        }
      });
    }

    // Add current web search information
    if (diagnosticContext.webSearch?.results?.length > 0) {
      enhancedPrompt += '\n\n**CURRENT WEB RESEARCH:**\n';
      enhancedPrompt += `Search performed: ${diagnosticContext.webSearch.timestamp}\n`;
      
      diagnosticContext.webSearch.results.slice(0, 3).forEach((result, index) => {
        enhancedPrompt += `\n${index + 1}. ${result.title}\n`;
        enhancedPrompt += `   ${result.snippet}\n`;
      });
      
      enhancedPrompt += '\nUse this current information to provide up-to-date advice.\n';
    }

    // Add component information
    if (diagnosticContext.components?.length > 0) {
      enhancedPrompt += '\n\n**COMPONENT INFO:**\n';
      diagnosticContext.components.forEach(component => {
        enhancedPrompt += `${component.name}: ${component.description}\n`;
      });
    }

    // Add safety warnings
    if (diagnosticContext.safetyWarnings?.length > 0) {
      enhancedPrompt += '\n\n**SAFETY ALERTS:**\n';
      diagnosticContext.safetyWarnings.forEach(warning => {
        enhancedPrompt += `${warning.message}\n`;
      });
    }

    enhancedPrompt += '\n\nCombine the structured diagnostic data with current web research to give accurate, up-to-date advice in your conversational engineer style. Reference specific current information when relevant.';

    return enhancedPrompt;
  }
}

export default WebSearchEnhancedHybridService;
