/**
 * Enhanced Fault Code Service for LLM Integration
 * 
 * Optimized database queries and content enrichment for professional diagnostic responses
 */

import { supabase } from '../supabaseClient.js';

class EnhancedFaultCodeService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Extract manufacturer, model, and fault code from user input
   */
  extractFaultInfo(userInput) {
    const text = userInput.toLowerCase();

    const manufacturerPatterns = {
      'ideal': /\b(ideal)\b/i,
      'worcester': /\b(worcester|worcester bosch)\b/i,
      'vaillant': /\b(vaillant)\b/i,
      'baxi': /\b(baxi)\b/i,
      'glow-worm': /\b(glow ?worm)\b/i,
      'potterton': /\b(potterton)\b/i,
      'viessmann': /\b(viessmann)\b/i,
      'ariston': /\b(ariston)\b/i,
      'ferroli': /\b(ferroli)\b/i,
      'alpha': /\b(alpha)\b/i,
      'ravenheat': /\b(ravenheat)\b/i,
      'intergas': /\b(intergas)\b/i
    };

    let manufacturer = null;
    for (const [mfg, pattern] of Object.entries(manufacturerPatterns)) {
      if (pattern.test(text)) {
        manufacturer = mfg;
        break;
      }
    }

    const faultCodePatterns = [
      /\b([a-z][0-9]{1,3})\b/i,                 // F22, E9, L2
      /\b([a-z]\.[0-9]{1,3})\b/i,              // F.22, E.9
      /(fault|error|code)\s*([a-z]?[0-9]{1,3})/i // fault 24, code F22, error 133
    ];

    let faultCode = null;
    for (const pattern of faultCodePatterns) {
      const match = text.match(pattern);
      if (match) {
        faultCode = (match[2] || match[1]);
        break;
      }
    }

    // Canonicalize known formats
    if (!faultCode && /\bworcester|worcester\s*bosch\b/i.test(text)) {
      const ea = text.match(/\bea\+?\b/i);
      if (ea) faultCode = 'EA';
    }
    if (faultCode) {
      // Strip dots (e.g., F.75 -> F75)
      const dot = faultCode.match(/([a-z])\.(\d{1,3})/i);
      if (dot) faultCode = `${dot[1]}${dot[2]}`;
      // Remove trailing plus in codes like EA+
      faultCode = faultCode.replace(/\+$/,'');
      faultCode = faultCode.toUpperCase();
    }

    let model = null;
    let systemType = null;
    if (/\blogic\b/i.test(text)) {
      if (/\bcombi\b/i.test(text)) { model = 'Logic Combi'; systemType = 'combi'; }
      else if (/\bsystem\b/i.test(text)) { model = 'Logic System'; systemType = 'system'; }
      else if (/\bheat\b|\bregular\b/i.test(text)) { model = 'Logic Heat'; systemType = 'heat'; }
      else model = 'Logic';
      const m = text.match(/logic\s*(?:combi|system|heat)?\s*(\d{2,3})([a-z])?/i);
      if (m && model) model = `${model} ${m[1]}${m[2] ? m[2].toLowerCase() : ''}`.trim();
    } else if (/\bgreenstar\b/i.test(text)) {
      model = 'Greenstar';
      if (/\bcombi\b/i.test(text)) systemType = 'combi';
      else if (/\bsystem\b/i.test(text)) systemType = 'system';
      else if (/\bheat\b|\bregular\b/i.test(text)) systemType = 'heat';
      const m = text.match(/greenstar\s*(\d{2,3}[a-z]?)/i);
      if (m && model) model = `${model} ${m[1].toLowerCase()}`;
    } else if (/\beco\s*tec\b/i.test(text)) {
      model = /\beco\s*tec\s*plus\b/i.test(text) ? 'ecoTEC Plus' : (/\beco\s*tec\s*pro\b/i.test(text) ? 'ecoTEC Pro' : 'ecoTEC');
      if (/\bcombi\b/i.test(text)) systemType = 'combi';
      else if (/\bsystem\b/i.test(text)) systemType = 'system';
      else if (/\bheat\b|\bregular\b/i.test(text)) systemType = 'heat';
      const m = text.match(/eco\s*tec(?:\s*plus|\s*pro)?\s*(\d{2,3})/i);
      if (m && model) model = `${model} ${m[1]}`;
    } else if (/\bduo[-\s]?tec\b/i.test(text)) {
      model = 'Duo-tec';
      if (/\bcombi\b/i.test(text)) systemType = 'combi';
      else if (/\bsystem\b/i.test(text)) systemType = 'system';
      const m = text.match(/duo[-\s]?tec\s*(\d{2,3})/i);
      if (m && model) model = `${model} ${m[1]}`;
    } else if (/\be[-\s]?tec\b/i.test(text)) {
      model = 'E-Tec';
      if (/\bcombi\b/i.test(text)) systemType = 'combi';
      else if (/\bsystem\b/i.test(text)) systemType = 'system';
      const m = text.match(/e[-\s]?tec\s*(\d{2,3})/i);
      if (m && model) model = `${model} ${m[1]}`;
    } else if (/\bvitodens\b/i.test(text)) {
      model = 'Vitodens';
      if (/\bcombi\b/i.test(text)) systemType = 'combi';
      else if (/\bsystem\b/i.test(text)) systemType = 'system';
      else if (/\bheat\b|\bregular\b/i.test(text)) systemType = 'heat';
      const m = text.match(/vitodens\s*(\d{2,3})/i);
      if (m && model) model = `${model} ${m[1]}`;
    } else if (/\bbetacom\b/i.test(text)) {
      model = 'Betacom';
      if (/\bcombi\b/i.test(text)) systemType = 'combi';
      const m = text.match(/betacom\s*(\d{2,3})/i);
      if (m && model) model = `${model} ${m[1]}`;
    } else if (/\bplatinum\b/i.test(text)) {
      model = 'Platinum';
      if (/\bcombi\b/i.test(text)) systemType = 'combi';
      const m = text.match(/platinum\s*(\d{2,3})/i);
      if (m && model) model = `${model} ${m[1]}`;
    } else if (/\bgold\b/i.test(text)) {
      model = 'Gold';
      if (/\bcombi\b/i.test(text)) systemType = 'combi';
      const m = text.match(/gold\s*(\d{2,3})/i);
      if (m && model) model = `${model} ${m[1]}`;
    } else if (/\bmain\s*eco\b/i.test(text)) {
      model = 'Main Eco';
      if (/\bcombi\b/i.test(text)) systemType = 'combi';
      else if (/\bsystem\b/i.test(text)) systemType = 'system';
      const m = text.match(/main\s*eco\s*(\d{2,3})/i);
      if (m && model) model = `${model} ${m[1]}`;
    } else if (/\bultimate\b/i.test(text)) {
      model = 'Ultimate';
      if (/\bcombi\b/i.test(text)) systemType = 'combi';
      else if (/\bsystem\b/i.test(text)) systemType = 'system';
      const m = text.match(/ultimate\s*(\d{2,3})/i);
      if (m && model) model = `${model} ${m[1]}`;
    }

    return { manufacturer, faultCode, model, systemType };
  }

  /**
   * Get comprehensive fault code information from all relevant tables
   */
  async getFaultCodeData(manufacturer, faultCode) {
    const cacheKey = `${manufacturer || 'any'}_${faultCode}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const queries = [];

      // Query 1: Basic fault codes
      queries.push(
        supabase
          .from('boiler_fault_codes')
          .select('*')
          .eq('fault_code', faultCode)
          .then(result => ({ source: 'boiler_fault_codes', ...result }))
      );

      // Query 2: Diagnostic fault codes
      queries.push(
        supabase
          .from('diagnostic_fault_codes')
          .select('*')
          .eq('fault_code', faultCode)
          .then(result => ({ source: 'diagnostic_fault_codes', ...result }))
      );

      // Query 3: Enhanced procedures
      queries.push(
        supabase
          .from('enhanced_diagnostic_procedures')
          .select('*')
          .eq('fault_code', faultCode)
          .then(result => ({ source: 'enhanced_diagnostic_procedures', ...result }))
      );

      // If manufacturer specified, add manufacturer-specific queries
      if (manufacturer) {
        queries.push(
          supabase
            .from('boiler_fault_codes')
            .select('*')
            .eq('fault_code', faultCode)
            .ilike('manufacturer', `%${manufacturer}%`)
            .then(result => ({ source: 'manufacturer_specific', ...result }))
        );
      }

      const results = await Promise.all(queries);
      
      // Combine and structure results
      const combinedData = {
        faultCode,
        manufacturer,
        basicInfo: results[0].data || [],
        diagnosticInfo: results[1].data || [],
        procedures: results[2].data || [],
        manufacturerSpecific: manufacturer ? (results[3]?.data || []) : []
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: combinedData,
        timestamp: Date.now()
      });

      return combinedData;

    } catch (error) {
      console.error('Error fetching fault code data:', error);
      return null;
    }
  }

  /**
   * Build enriched context for LLM response
   */
  buildFaultCodeContext(faultData) {
    if (!faultData) return '';

    let context = '';
    const { faultCode, manufacturer, basicInfo, diagnosticInfo, procedures, manufacturerSpecific } = faultData;

    // Prioritize manufacturer-specific information
    const primaryInfo = manufacturerSpecific.length > 0 ? manufacturerSpecific[0] : 
                       basicInfo.length > 0 ? basicInfo[0] : 
                       diagnosticInfo.length > 0 ? diagnosticInfo[0] : null;

    if (primaryInfo) {
      context += `\n\nFAULT CODE INFORMATION:\n`;
      context += `Code: ${faultCode}\n`;
      
      if (manufacturer) {
        context += `Manufacturer: ${manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1)}\n`;
      }

      // Add description
      const description = primaryInfo.description || primaryInfo.fault_description;
      if (description) {
        context += `Description: ${description}\n`;
      }

      // Add root causes if available (from diagnostic_fault_codes)
      if (primaryInfo.root_causes) {
        const causes = primaryInfo.root_causes;
        if (causes.primary_causes && Array.isArray(causes.primary_causes)) {
          context += `\nPRIMARY CAUSES:\n`;
          causes.primary_causes.forEach(cause => {
            context += `- ${cause}\n`;
          });
        }
      }

      // Add solutions/troubleshooting
      const solutions = primaryInfo.solutions;
      if (solutions) {
        context += `\nTROUBLESHOOTING STEPS:\n${solutions}\n`;
      }

      // Add expected values if available
      if (primaryInfo.expected_values) {
        context += `\nEXPECTED VALUES:\n`;
        const values = primaryInfo.expected_values;
        if (values.gas_pressure) {
          context += `Gas Pressure: ${values.gas_pressure.nominal} (${values.gas_pressure.min}-${values.gas_pressure.max})\n`;
        }
        if (values.electrical_supply) {
          context += `Electrical Supply: ${values.electrical_supply.voltage} at ${values.electrical_supply.frequency}\n`;
        }
      }

      // Add safety information if available
      if (primaryInfo.safety_precautions) {
        const safety = primaryInfo.safety_precautions;
        context += `\nSAFETY PRECAUTIONS:\n`;
        if (safety.before_work && Array.isArray(safety.before_work)) {
          context += `Before work:\n`;
          safety.before_work.forEach(step => context += `- ${step}\n`);
        }
        if (safety.during_work && Array.isArray(safety.during_work)) {
          context += `During work:\n`;
          safety.during_work.forEach(step => context += `- ${step}\n`);
        }
      }

      // Add diagnostic procedures if available
      if (procedures.length > 0) {
        context += `\nDETAILED PROCEDURES:\n`;
        procedures.slice(0, 3).forEach((proc, index) => {
          if (proc.step_description) {
            context += `${index + 1}. ${proc.step_description}\n`;
          }
        });
      }

      // Add severity level if available
      if (primaryInfo.severity_level) {
        context += `\nSeverity: ${primaryInfo.severity_level}\n`;
      }

      // Add gas safe category if available
      if (primaryInfo.gas_safe_category) {
        context += `Gas Safe Category: ${primaryInfo.gas_safe_category}\n`;
      }
    }

    return context;
  }

  /**
   * Check if fault code requires immediate safety attention
   */
  isSafetyCritical(faultData) {
    if (!faultData) return false;

    const { basicInfo, diagnosticInfo, manufacturerSpecific } = faultData;
    const allInfo = [...basicInfo, ...diagnosticInfo, ...manufacturerSpecific];

    return allInfo.some(info => {
      const text = (info.description || info.fault_description || info.solutions || '').toLowerCase();
      return text.includes('gas leak') || 
             text.includes('carbon monoxide') || 
             text.includes('immediate') ||
             text.includes('danger') ||
             text.includes('emergency') ||
             info.severity_level === 'critical' ||
             info.safety_critical === true;
    });
  }

  /**
   * Get related fault codes for additional context
   */
  async getRelatedFaultCodes(manufacturer, faultCode) {
    if (!manufacturer) return [];

    try {
      const { data, error } = await supabase
        .from('boiler_fault_codes')
        .select('fault_code, description')
        .ilike('manufacturer', `%${manufacturer}%`)
        .neq('fault_code', faultCode)
        .limit(5);

      return data || [];
    } catch (error) {
      console.error('Error fetching related fault codes:', error);
      return [];
    }
  }

  /**
   * Main method to get comprehensive fault code information for LLM
   */
  async getComprehensiveFaultInfo(userInput) {
    const { manufacturer, faultCode, model, systemType } = this.extractFaultInfo(userInput);
    
    if (!faultCode) {
      return null;
    }

    const faultData = await this.getFaultCodeData(manufacturer, faultCode);
    const context = this.buildFaultCodeContext(faultData);
    const isSafetyCritical = this.isSafetyCritical(faultData);
    const relatedCodes = await this.getRelatedFaultCodes(manufacturer, faultCode);

    return {
      manufacturer,
      model,
      systemType,
      faultCode,
      context,
      isSafetyCritical,
      relatedCodes,
      rawData: faultData
    };
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache() {
    this.cache.clear();
  }
}

export default new EnhancedFaultCodeService();
