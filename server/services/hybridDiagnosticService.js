/**
 * Hybrid Diagnostic Service
 * Combines structured database knowledge with LLM conversational abilities
 * for intelligent, context-aware boiler diagnostics
 */

import { createClient } from '@supabase/supabase-js';

class HybridDiagnosticService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }

  /**
   * Extract structured diagnostic context from user message and database
   * @param {string} message - User's diagnostic message
   * @param {Array} history - Chat history for context
   * @returns {Object} Enhanced context for LLM
   */
  async getDiagnosticContext(message, history = []) {
    const context = {
      faultCodes: [],
      boilerInfo: null,
      manufacturerInfo: null,
      relatedKnowledge: [],
      diagnosticSteps: [],
      safetyWarnings: []
    };

    // 1. Extract fault codes from message
    const faultCodeMatches = message.match(/\b[FELA]\d{1,3}\b/gi) || [];
    
    // 2. Extract boiler make/model mentions
    const boilerMentions = this.extractBoilerMentions(message, history);
    
    // 3. Get structured fault code data
    if (faultCodeMatches.length > 0) {
      context.faultCodes = await this.getFaultCodeData(faultCodeMatches, boilerMentions.manufacturer);
    }

    // 4. Get boiler-specific information
    if (boilerMentions.manufacturer || boilerMentions.model) {
      context.boilerInfo = await this.getBoilerModelData(boilerMentions);
      context.manufacturerInfo = await this.getManufacturerData(boilerMentions.manufacturer);
    }

    // 5. Get related knowledge through semantic search
    context.relatedKnowledge = await this.getRelatedKnowledge(message);

    // 6. Get safety warnings if applicable
    context.safetyWarnings = await this.getSafetyWarnings(faultCodeMatches, boilerMentions);

    return context;
  }

  /**
   * Extract boiler make/model mentions from message and history
   */
  extractBoilerMentions(message, history) {
    const fullText = [message, ...history.slice(-5).map(h => h.text)].join(' ').toLowerCase();
    
    // Common boiler manufacturers
    const manufacturers = [
      'ideal', 'worcester', 'vaillant', 'baxi', 'potterton', 'glow-worm', 
      'ferroli', 'alpha', 'ariston', 'biasi', 'grant', 'keston', 'main',
      'ravenheat', 'remeha', 'viessmann', 'intergas', 'hermann'
    ];

    const manufacturer = manufacturers.find(m => fullText.includes(m));
    
    // Extract model patterns (e.g., "Logic C24", "Greenstar 30i")
    const modelMatch = fullText.match(/\b([a-z]+\s*[a-z]*\s*\d+[a-z]*)\b/i);
    const model = modelMatch ? modelMatch[1] : null;

    return { manufacturer, model };
  }

  /**
   * Get structured fault code data from database
   */
  async getFaultCodeData(faultCodes, manufacturer = null) {
    try {
      let query = this.supabase
        .from('boiler_fault_codes')
        .select(`
          *
        `)
        .in('fault_code', faultCodes);

      if (manufacturer) {
        query = query.ilike('manufacturer', `%${manufacturer}%`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching fault codes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Database error in getFaultCodeData:', error);
      return [];
    }
  }

  /**
   * Get boiler model specific data
   */
  async getBoilerModelData(boilerMentions) {
    if (!boilerMentions.manufacturer && !boilerMentions.model) return null;

    try {
      let query = this.supabase
        .from('boiler_models')
        .select(`
          *,
          manufacturers(name, common_issues, support_info)
        `);

      if (boilerMentions.manufacturer) {
        query = query.eq('manufacturers.name', boilerMentions.manufacturer);
      }

      if (boilerMentions.model) {
        query = query.ilike('model_name', `%${boilerMentions.model}%`);
      }

      const { data, error } = await query.limit(3);
      
      if (error) {
        console.error('Error fetching boiler models:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Database error in getBoilerModelData:', error);
      return null;
    }
  }

  /**
   * Get manufacturer-specific information
   */
  async getManufacturerData(manufacturer) {
    if (!manufacturer) return null;

    try {
      const { data, error } = await this.supabase
        .from('manufacturers')
        .select('*')
        .ilike('name', `%${manufacturer}%`)
        .limit(1);

      if (error) {
        console.error('Error fetching manufacturer:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Database error in getManufacturerData:', error);
      return null;
    }
  }

  /**
   * Get related knowledge through semantic search
   */
  async getRelatedKnowledge(message) {
    try {
      // Use the existing knowledge embeddings for semantic search
      const { data, error } = await this.supabase
        .rpc('search_knowledge', {
          query_text: message,
          match_threshold: 0.7,
          match_count: 3
        });

      if (error) {
        console.error('Error in semantic search:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Database error in getRelatedKnowledge:', error);
      return [];
    }
  }

  /**
   * Get relevant safety warnings
   */
  async getSafetyWarnings(faultCodes, boilerMentions) {
    if (faultCodes.length === 0) return [];

    try {
      const { data, error } = await this.supabase
        .from('safety_warnings')
        .select('*')
        .or(`fault_codes.cs.{${faultCodes.join(',')}},applies_to_all.eq.true`);

      if (error) {
        console.error('Error fetching safety warnings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Database error in getSafetyWarnings:', error);
      return [];
    }
  }

  /**
   * Build enhanced system prompt with database context
   */
  buildEnhancedPrompt(basePrompt, diagnosticContext) {
    let enhancedPrompt = basePrompt;

    // Add fault code specific information
    if (diagnosticContext.faultCodes.length > 0) {
      enhancedPrompt += '\n\n**FAULT CODE DATABASE INFO:**\n';
      diagnosticContext.faultCodes.forEach(fault => {
        enhancedPrompt += `\n${fault.fault_code} (${fault.manufacturer}): ${fault.description}\n`;
        if (fault.solutions) {
          enhancedPrompt += `Solutions: ${fault.solutions}\n`;
        }
        if (fault.model_name) {
          enhancedPrompt += `Model: ${fault.model_name}\n`;
        }
      });
    }

    // Add boiler-specific information
    if (diagnosticContext.boilerInfo) {
      enhancedPrompt += '\n\n**BOILER SPECIFIC INFO:**\n';
      enhancedPrompt += `Model: ${diagnosticContext.boilerInfo.model_name}\n`;
      enhancedPrompt += `Type: ${diagnosticContext.boilerInfo.boiler_type}\n`;
      enhancedPrompt += `Fuel: ${diagnosticContext.boilerInfo.fuel_type}\n`;
      if (diagnosticContext.manufacturerInfo?.common_issues) {
        enhancedPrompt += `Known issues: ${diagnosticContext.manufacturerInfo.common_issues}\n`;
      }
    }

    // Add safety warnings
    if (diagnosticContext.safetyWarnings.length > 0) {
      enhancedPrompt += '\n\n**SAFETY ALERTS:**\n';
      diagnosticContext.safetyWarnings.forEach(warning => {
        enhancedPrompt += `⚠️ ${warning.warning_text}\n`;
      });
    }

    // Add related knowledge
    if (diagnosticContext.relatedKnowledge.length > 0) {
      enhancedPrompt += '\n\n**RELATED KNOWLEDGE:**\n';
      diagnosticContext.relatedKnowledge.forEach(knowledge => {
        enhancedPrompt += `- ${knowledge.content}\n`;
      });
    }

    enhancedPrompt += '\n\nUse this database information to give accurate, specific advice in your conversational engineer style.';

    return enhancedPrompt;
  }
}

export default HybridDiagnosticService;
