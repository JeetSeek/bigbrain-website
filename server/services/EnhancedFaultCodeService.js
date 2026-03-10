/**
 * Enhanced Fault Code Service for LLM Integration
 * 
 * Queries ALL diagnostic tables for comprehensive fault-finding context:
 * - gc_fault_codes (13,876 rows) — manufacturer-specific fault codes with cause/remedy
 * - gc_procedures (22,901 rows) — step-by-step procedures with tools/warnings
 * - fault_finding_guides (839 rows) — possible causes, components, reset types
 * - manual_sections (6,921 rows) — full manual text for RAG fallback
 * - boiler_fault_codes (760 rows) — generic fault codes
 * - diagnostic_fault_codes (175 rows) — structured diagnostic data
 * - enhanced_diagnostic_procedures (75 rows) — detailed procedures
 */

import { supabase } from '../supabaseClient.js';

class EnhancedFaultCodeService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

    // Manufacturer alias map for ILIKE searches across inconsistent naming
    this.manufacturerAliases = {
      'ideal':     ['ideal', 'ideal-domestic', 'ideal-commercial', 'boilermanuals_ideal'],
      'worcester': ['worcester', 'worcester bosch', 'worcester-bosch'],
      'vaillant':  ['vaillant'],
      'baxi':      ['baxi', 'baxi heating'],
      'glow-worm': ['glow-worm', 'glowworm', 'glow worm'],
      'potterton': ['potterton'],
      'viessmann': ['viessmann'],
      'ariston':   ['ariston'],
      'ferroli':   ['ferroli'],
      'alpha':     ['alpha'],
      'ravenheat': ['ravenheat'],
      'intergas':  ['intergas'],
      'atag':      ['atag'],
      'biasi':     ['biasi', 'biasi uk'],
      'remeha':    ['remeha', 'broag'],
      'chaffoteaux': ['chaffoteaux', 'chaffotea', 'chaffoteaux & maury', 'chaffoteaux et maury'],
      'main':      ['main'],
      'sime':      ['sime'],
      'vokera':    ['vokera'],
      'navien':    ['navien']
    };
  }

  /**
   * Get all ILIKE patterns for a manufacturer to handle inconsistent naming
   */
  getManufacturerSearchTerms(manufacturer) {
    if (!manufacturer) return [];
    const key = manufacturer.toLowerCase();
    return this.manufacturerAliases[key] || [key];
  }

  /**
   * Get fault code search variants (F22, F.22, 22) for broader matching
   */
  getFaultCodeVariants(faultCode) {
    if (!faultCode) return [];
    const variants = new Set([faultCode]);
    
    // If code is like F22, also search F.22 and just 22
    const letterNum = faultCode.match(/^([A-Z])(\d+)$/i);
    if (letterNum) {
      variants.add(`${letterNum[1]}.${letterNum[2]}`);  // F.22
      variants.add(letterNum[2]);                         // 22
      variants.add(`${letterNum[1]}${letterNum[2]}`);     // F22 (already there)
    }
    
    // If code is like EA, keep as-is
    // If code is just numbers like 227, also try with common prefixes
    // BUT only for 3+ digit codes — short codes (1-2 digits) like "4" must NOT become "F4"
    // because different manufacturers use incompatible numbering systems
    const pureNum = faultCode.match(/^(\d+)$/);
    if (pureNum && pureNum[1].length >= 3) {
      variants.add(`E${pureNum[1]}`);
      variants.add(`F${pureNum[1]}`);
      variants.add(`E.${pureNum[1]}`);
      variants.add(`F.${pureNum[1]}`);
    }

    return [...variants];
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
      'intergas': /\b(intergas)\b/i,
      'atag': /\b(atag)\b/i,
      'biasi': /\b(biasi)\b/i,
      'remeha': /\b(remeha)\b/i,
      'chaffoteaux': /\b(chaffoteaux)\b/i,
      'main': /\b(main)\b/i,
      'sime': /\b(sime)\b/i,
      'vokera': /\b(vokera)\b/i,
      'navien': /\b(navien)\b/i
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
   * Build a Supabase OR filter for manufacturer aliases
   */
  buildManufacturerFilter(aliases) {
    return aliases.map(a => `manufacturer.ilike.%${a}%`).join(',');
  }

  /**
   * Get comprehensive fault code information from ALL relevant tables
   */
  async getFaultCodeData(manufacturer, faultCode, model) {
    const cacheKey = `${manufacturer || 'any'}_${faultCode}_${model || 'any'}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const queries = [];
      const faultVariants = this.getFaultCodeVariants(faultCode);
      const mfgAliases = this.getManufacturerSearchTerms(manufacturer);

      // Build fault code OR filter for Supabase (works across all tables)
      const faultOrFilter = faultVariants
        .map(v => `fault_code.ilike.${v}`)
        .join(',');
      const faultOrFilterWithDisplay = faultVariants
        .flatMap(v => [`fault_code.ilike.${v}`, `display_code.ilike.${v}`])
        .join(',');

      // Build combined manufacturer OR filter for single-query approach
      const mfgOrFilter = manufacturer ? this.buildManufacturerFilter(mfgAliases) : null;

      // ============================================================
      // TIER 1: Rich structured tables (highest value)
      // ============================================================

      // Query 1a: gc_fault_codes WITH manufacturer filter (most specific)
      if (mfgOrFilter) {
        queries.push(
          supabase
            .from('gc_fault_codes')
            .select('fault_code, display_code, manufacturer, model_name, description, cause, remedy, page_reference, severity')
            .or(faultOrFilterWithDisplay)
            .or(mfgOrFilter)
            .limit(10)
            .then(result => ({ source: 'gc_fault_codes', ...result }))
            .catch(err => ({ source: 'gc_fault_codes', data: [], error: err }))
        );
      }

      // Query 1b: gc_fault_codes WITHOUT manufacturer (cross-manufacturer fallback)
      queries.push(
        supabase
          .from('gc_fault_codes')
          .select('fault_code, display_code, manufacturer, model_name, description, cause, remedy, page_reference, severity')
          .or(faultOrFilterWithDisplay)
          .limit(15)
          .then(result => ({ source: 'gc_fault_codes', ...result }))
          .catch(err => ({ source: 'gc_fault_codes', data: [], error: err }))
      );

      // Query 2: fault_finding_guides (combined manufacturer + fallback)
      if (mfgOrFilter) {
        queries.push(
          supabase
            .from('fault_finding_guides')
            .select('manufacturer, model_name, fault_code, description, cause_codes, reset_type, possible_causes, components, solutions, page_numbers')
            .or(faultOrFilter)
            .or(mfgOrFilter)
            .limit(10)
            .then(result => ({ source: 'fault_finding_guides', ...result }))
            .catch(err => ({ source: 'fault_finding_guides', data: [], error: err }))
        );
      }
      queries.push(
        supabase
          .from('fault_finding_guides')
          .select('manufacturer, model_name, fault_code, description, cause_codes, reset_type, possible_causes, components, solutions, page_numbers')
          .or(faultOrFilter)
          .limit(10)
          .then(result => ({ source: 'fault_finding_guides', ...result }))
          .catch(err => ({ source: 'fault_finding_guides', data: [], error: err }))
      );

      // Query 3: gc_procedures — step-by-step procedures
      if (mfgOrFilter) {
        queries.push(
          supabase
            .from('gc_procedures')
            .select('procedure_name, category, manufacturer, model_name, steps, warnings, tools_required, parts_required, difficulty, page_reference')
            .or(mfgOrFilter)
            .in('category', ['fault-finding', 'repair', 'maintenance'])
            .limit(8)
            .then(result => ({ source: 'gc_procedures', ...result }))
            .catch(err => ({ source: 'gc_procedures', data: [], error: err }))
        );
      }

      // ============================================================
      // TIER 2: Original tables — use fault variants instead of exact match
      // ============================================================

      // Query 4: boiler_fault_codes (760 rows)
      queries.push(
        supabase
          .from('boiler_fault_codes')
          .select('*')
          .or(faultOrFilter)
          .then(result => ({ source: 'boiler_fault_codes', ...result }))
          .catch(err => ({ source: 'boiler_fault_codes', data: [], error: err }))
      );

      // Query 5: diagnostic_fault_codes (175 rows)
      queries.push(
        supabase
          .from('diagnostic_fault_codes')
          .select('*')
          .or(faultOrFilter)
          .then(result => ({ source: 'diagnostic_fault_codes', ...result }))
          .catch(err => ({ source: 'diagnostic_fault_codes', data: [], error: err }))
      );

      // Query 6: enhanced_diagnostic_procedures (75 rows)
      queries.push(
        supabase
          .from('enhanced_diagnostic_procedures')
          .select('*')
          .or(faultOrFilter)
          .then(result => ({ source: 'enhanced_diagnostic_procedures', ...result }))
          .catch(err => ({ source: 'enhanced_diagnostic_procedures', data: [], error: err }))
      );

      // Query 7: Manufacturer-specific from boiler_fault_codes
      if (mfgOrFilter) {
        queries.push(
          supabase
            .from('boiler_fault_codes')
            .select('*')
            .or(faultOrFilter)
            .or(mfgOrFilter)
            .then(result => ({ source: 'manufacturer_specific', ...result }))
            .catch(err => ({ source: 'manufacturer_specific', data: [], error: err }))
        );
      }

      // ============================================================
      // TIER 3: Manual sections RAG fallback
      // ============================================================
      if (mfgOrFilter) {
        queries.push(
          supabase
            .from('manual_sections')
            .select('gc_number, manufacturer, model_name, section_title, content')
            .or(mfgOrFilter)
            .or('section_title.ilike.%fault%,section_title.ilike.%troubleshoot%,section_title.ilike.%diagnos%,section_title.ilike.%error%')
            .limit(3)
            .then(result => ({ source: 'manual_sections', ...result }))
            .catch(err => ({ source: 'manual_sections', data: [], error: err }))
        );
      }

      const results = await Promise.all(queries);
      
      // Organize results by source
      const gcFaultCodes = [];
      const faultFindingGuides = [];
      const gcProcedures = [];
      const manualSections = [];
      const basicInfo = [];
      const diagnosticInfo = [];
      const procedures = [];
      const manufacturerSpecific = [];

      for (const result of results) {
        const data = result.data || [];
        if (data.length === 0) continue;
        
        switch (result.source) {
          case 'gc_fault_codes':
            gcFaultCodes.push(...data);
            break;
          case 'fault_finding_guides':
            faultFindingGuides.push(...data);
            break;
          case 'gc_procedures':
            gcProcedures.push(...data);
            break;
          case 'manual_sections':
            manualSections.push(...data);
            break;
          case 'boiler_fault_codes':
            basicInfo.push(...data);
            break;
          case 'diagnostic_fault_codes':
            diagnosticInfo.push(...data);
            break;
          case 'enhanced_diagnostic_procedures':
            procedures.push(...data);
            break;
          case 'manufacturer_specific':
            manufacturerSpecific.push(...data);
            break;
        }
      }

      // Deduplicate gc_fault_codes by fault_code + manufacturer + model_name
      const seenGc = new Set();
      const uniqueGcFaultCodes = gcFaultCodes.filter(row => {
        const key = `${row.fault_code}_${row.manufacturer}_${row.model_name}`;
        if (seenGc.has(key)) return false;
        seenGc.add(key);
        return true;
      });

      // Deduplicate fault_finding_guides
      const seenFfg = new Set();
      const uniqueFfg = faultFindingGuides.filter(row => {
        const key = `${row.fault_code}_${row.manufacturer}_${row.model_name}`;
        if (seenFfg.has(key)) return false;
        seenFfg.add(key);
        return true;
      });

      const combinedData = {
        faultCode,
        manufacturer,
        // NEW rich data sources
        gcFaultCodes: uniqueGcFaultCodes.slice(0, 8),
        faultFindingGuides: uniqueFfg.slice(0, 5),
        gcProcedures: gcProcedures.slice(0, 5),
        manualSections: manualSections.slice(0, 2),
        // Original sources
        basicInfo,
        diagnosticInfo,
        procedures,
        manufacturerSpecific
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: combinedData,
        timestamp: Date.now()
      });

      console.log(`[EnhancedFaultCodeService] Data found — gc_fault_codes: ${uniqueGcFaultCodes.length}, fault_finding_guides: ${uniqueFfg.length}, gc_procedures: ${gcProcedures.length}, manual_sections: ${manualSections.length}, basic: ${basicInfo.length}, diagnostic: ${diagnosticInfo.length}, procedures: ${procedures.length}, mfg_specific: ${manufacturerSpecific.length}`);

      return combinedData;

    } catch (error) {
      console.error('Error fetching fault code data:', error);
      return null;
    }
  }

  /**
   * Build enriched context for LLM response — uses ALL data sources
   */
  buildFaultCodeContext(faultData) {
    if (!faultData) return '';

    let context = '';
    const { 
      faultCode, manufacturer, 
      gcFaultCodes, faultFindingGuides, gcProcedures, manualSections,
      basicInfo, diagnosticInfo, procedures, manufacturerSpecific 
    } = faultData;

    const mfgLabel = manufacturer ? manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1) : 'Unknown';

    // ============================================================
    // SECTION 1: Primary fault code definition
    // ============================================================
    context += `\n\nFAULT CODE: ${faultCode}`;
    if (manufacturer) context += ` (${mfgLabel})`;
    context += `\n`;

    // PRIORITY ORDER for description: manufacturer_specific > gc_fault_codes > fault_finding_guides > basicInfo > diagnosticInfo
    // manufacturer_specific is boiler_fault_codes filtered BY manufacturer (most reliable for top UK brands)
    let bestDescription = null;
    let bestCause = null;
    let bestRemedy = null;
    let bestSeverity = null;
    let bestModel = null;

    // Filter fault_finding_guides to only include manufacturer-matching entries
    const mfgFilteredGuides = manufacturer && faultFindingGuides ? 
      faultFindingGuides.filter(g => g.manufacturer?.toLowerCase().includes(manufacturer.toLowerCase()) || manufacturer.toLowerCase().includes(g.manufacturer?.toLowerCase())) : 
      faultFindingGuides || [];

    // 1st priority: manufacturer_specific from boiler_fault_codes (most reliable for top UK brands)
    if (manufacturerSpecific?.length > 0) {
      const best = manufacturerSpecific[0];
      bestDescription = best.description;
      bestModel = best.model_name;
      if (best.description) context += `Description: ${best.description}\n`;
      if (best.model_name) context += `Model: ${best.model_name}\n`;
    }

    // 2nd priority: gc_fault_codes (richest table but may lack top UK manufacturers)
    if (!bestDescription && gcFaultCodes?.length > 0) {
      const best = gcFaultCodes[0];
      bestDescription = best.description;
      bestCause = best.cause;
      bestRemedy = best.remedy;
      bestSeverity = best.severity;
      bestModel = best.model_name;
      
      if (best.description) context += `Description: ${best.description}\n`;
      if (best.model_name) context += `Applicable model(s): ${best.model_name}\n`;
      if (best.severity) context += `Severity: ${best.severity}\n`;
      if (best.display_code && best.display_code !== best.fault_code) {
        context += `Display code: ${best.display_code}\n`;
      }
    }

    // 3rd priority: manufacturer-filtered fault_finding_guides
    if (mfgFilteredGuides.length > 0) {
      const guide = mfgFilteredGuides[0];
      if (!bestDescription && guide.description) {
        bestDescription = guide.description;
        context += `Description: ${guide.description}\n`;
      }
      if (guide.model_name && !bestModel) {
        bestModel = guide.model_name;
        context += `Model: ${guide.model_name}\n`;
      }
      if (guide.reset_type) {
        context += `Reset type: ${guide.reset_type}\n`;
      }
    }

    // 4th priority: fallback to generic basicInfo / diagnosticInfo
    if (!bestDescription) {
      const fallbackInfo = basicInfo?.length > 0 ? basicInfo[0] :
                           diagnosticInfo?.length > 0 ? diagnosticInfo[0] : null;
      if (fallbackInfo) {
        const desc = fallbackInfo.description || fallbackInfo.fault_description;
        if (desc) {
          bestDescription = desc;
          context += `Description: ${desc}\n`;
        }
      }
    }

    // ============================================================
    // SECTION 2: Causes (from multiple sources, deduplicated)
    // ============================================================
    const allCauses = new Set();
    
    // From gc_fault_codes
    if (gcFaultCodes) {
      gcFaultCodes.forEach(row => {
        if (row.cause) allCauses.add(row.cause.trim());
      });
    }

    // From manufacturer-filtered fault_finding_guides.possible_causes
    if (mfgFilteredGuides.length > 0) {
      mfgFilteredGuides.forEach(guide => {
        if (guide.possible_causes && Array.isArray(guide.possible_causes)) {
          guide.possible_causes.forEach(c => { if (c) allCauses.add(c.trim()); });
        }
      });
    }

    // From diagnostic_fault_codes.root_causes
    if (diagnosticInfo) {
      diagnosticInfo.forEach(info => {
        if (info.root_causes?.primary_causes && Array.isArray(info.root_causes.primary_causes)) {
          info.root_causes.primary_causes.forEach(c => { if (c) allCauses.add(c.trim()); });
        }
      });
    }

    if (allCauses.size > 0) {
      context += `\nPOSSIBLE CAUSES:\n`;
      [...allCauses].slice(0, 8).forEach(cause => {
        context += `- ${cause}\n`;
      });
    }

    // ============================================================
    // SECTION 3: Remedy / Solutions
    // ============================================================
    const allRemedies = new Set();

    // From gc_fault_codes.remedy
    if (gcFaultCodes) {
      gcFaultCodes.forEach(row => {
        if (row.remedy) allRemedies.add(row.remedy.trim());
      });
    }

    // From boiler_fault_codes.solutions (manufacturer-specific first)
    if (manufacturerSpecific) {
      manufacturerSpecific.forEach(info => {
        if (info.solutions) allRemedies.add(info.solutions.trim());
      });
    }
    if (basicInfo) {
      basicInfo.forEach(info => {
        if (info.solutions) allRemedies.add(info.solutions.trim());
      });
    }

    // From fault_finding_guides.solutions (JSONB — may be a string or object)
    if (mfgFilteredGuides.length > 0) {
      mfgFilteredGuides.forEach(guide => {
        if (guide.solutions && guide.solutions !== 'null') {
          let solText = guide.solutions;
          // Handle JSONB string wrapping
          if (typeof solText === 'string') {
            try { solText = JSON.parse(solText); } catch { /* keep as-is */ }
          }
          if (typeof solText === 'string' && solText.trim()) {
            allRemedies.add(solText.trim());
          } else if (typeof solText === 'object' && solText !== null) {
            // Could be an object or array
            const text = JSON.stringify(solText);
            if (text.length > 5) allRemedies.add(text);
          }
        }
      });
    }

    if (allRemedies.size > 0) {
      context += `\nREMEDY / SOLUTION:\n`;
      [...allRemedies].slice(0, 5).forEach(remedy => {
        context += `- ${remedy}\n`;
      });
    }

    // ============================================================
    // SECTION 4: Affected components
    // ============================================================
    const allComponents = new Set();
    if (mfgFilteredGuides.length > 0) {
      mfgFilteredGuides.forEach(guide => {
        if (guide.components && Array.isArray(guide.components)) {
          guide.components.forEach(c => { if (c) allComponents.add(c.trim()); });
        }
      });
    }
    if (allComponents.size > 0) {
      context += `\nAFFECTED COMPONENTS: ${[...allComponents].join(', ')}\n`;
    }

    // ============================================================
    // SECTION 5: Step-by-step procedures (from gc_procedures)
    // ============================================================
    if (gcProcedures && gcProcedures.length > 0) {
      // Prioritize fault-finding procedures
      const faultProcs = gcProcedures.filter(p => p.category === 'fault-finding');
      const repairProcs = gcProcedures.filter(p => p.category === 'repair');
      const bestProcs = faultProcs.length > 0 ? faultProcs : repairProcs.length > 0 ? repairProcs : gcProcedures;
      
      const proc = bestProcs[0];
      if (proc.steps) {
        let steps;
        try {
          steps = typeof proc.steps === 'string' ? JSON.parse(proc.steps) : proc.steps;
        } catch { steps = []; }

        if (Array.isArray(steps) && steps.length > 1) {
          context += `\nPROCEDURE: ${proc.procedure_name || 'Fault Finding'}`;
          if (proc.model_name) context += ` (${proc.model_name})`;
          if (proc.difficulty) context += ` [${proc.difficulty}]`;
          context += `\n`;
          
          steps.slice(0, 12).forEach((step, i) => {
            const stepText = typeof step === 'string' ? step : (step.description || step.text || JSON.stringify(step));
            context += `${i + 1}. ${stepText}\n`;
          });
        }
      }

      // Add warnings
      const allWarnings = [];
      bestProcs.forEach(p => {
        if (p.warnings && Array.isArray(p.warnings)) allWarnings.push(...p.warnings);
      });
      if (allWarnings.length > 0) {
        context += `\n⚠️ WARNINGS:\n`;
        [...new Set(allWarnings)].slice(0, 4).forEach(w => {
          context += `- ${w}\n`;
        });
      }

      // Add tools required
      const allTools = new Set();
      bestProcs.forEach(p => {
        if (p.tools_required && Array.isArray(p.tools_required)) {
          p.tools_required.forEach(t => { if (t) allTools.add(t); });
        }
      });
      if (allTools.size > 0) {
        context += `\nTOOLS REQUIRED: ${[...allTools].join(', ')}\n`;
      }

      // Add parts required
      const allParts = new Set();
      bestProcs.forEach(p => {
        if (p.parts_required && Array.isArray(p.parts_required)) {
          p.parts_required.forEach(t => { if (t) allParts.add(t); });
        }
      });
      if (allParts.size > 0) {
        context += `PARTS THAT MAY BE NEEDED: ${[...allParts].join(', ')}\n`;
      }
    }

    // ============================================================
    // SECTION 6: Enhanced diagnostic procedures (from original table)
    // ============================================================
    if (procedures && procedures.length > 0) {
      context += `\nDETAILED DIAGNOSTIC STEPS:\n`;
      procedures.slice(0, 5).forEach((proc, index) => {
        if (proc.step_description) {
          context += `${index + 1}. ${proc.step_description}`;
          if (proc.expected_result) context += ` → Expected: ${proc.expected_result}`;
          context += `\n`;
        }
      });
    }

    // ============================================================
    // SECTION 7: Structured diagnostic data (from diagnostic_fault_codes)
    // ============================================================
    if (diagnosticInfo && diagnosticInfo.length > 0) {
      const diag = diagnosticInfo[0];
      
      // Expected values
      if (diag.expected_values) {
        context += `\nEXPECTED VALUES:\n`;
        const values = diag.expected_values;
        if (values.gas_pressure) {
          context += `Gas Pressure: ${values.gas_pressure.nominal || '20mbar'} (tolerance: ${values.gas_pressure.tolerance || '±1mbar'})\n`;
        }
        if (values.electrical_supply) {
          context += `Electrical Supply: ${values.electrical_supply.voltage || '230V'} at ${values.electrical_supply.frequency || '50Hz'}\n`;
        }
        if (values.combustion_analysis) {
          const ca = values.combustion_analysis;
          if (ca.co_max) context += `CO max: ${ca.co_max}\n`;
          if (ca.co2_range) context += `CO2 range: ${ca.co2_range}\n`;
        }
      }

      // Safety precautions
      if (diag.safety_precautions) {
        const safety = diag.safety_precautions;
        context += `\nSAFETY PRECAUTIONS:\n`;
        if (safety.before_work && Array.isArray(safety.before_work)) {
          context += `Before work:\n`;
          safety.before_work.forEach(step => context += `- ${step}\n`);
        }
        if (safety.during_work && Array.isArray(safety.during_work)) {
          context += `During work:\n`;
          safety.during_work.forEach(step => context += `- ${step}\n`);
        }
        if (safety.after_work && Array.isArray(safety.after_work)) {
          context += `After work:\n`;
          safety.after_work.forEach(step => context += `- ${step}\n`);
        }
      }

      // Severity and Gas Safe category
      if (diag.severity_level) context += `\nSeverity: ${diag.severity_level}\n`;
      if (diag.gas_safe_category) context += `Gas Safe Category: ${diag.gas_safe_category}\n`;
    }

    // ============================================================
    // SECTION 8: Manual section content (RAG fallback)
    // ============================================================
    if (manualSections && manualSections.length > 0 && !gcFaultCodes?.length && !faultFindingGuides?.length) {
      // Only use manual sections if we didn't find structured data
      const section = manualSections[0];
      if (section.content && section.content.length > 100) {
        context += `\nMANUAL REFERENCE (${section.manufacturer} ${section.model_name || ''} — ${section.section_title}):\n`;
        // Truncate to ~2000 chars to avoid overwhelming the context
        const truncated = section.content.length > 2000 
          ? section.content.substring(0, 2000) + '...[truncated]' 
          : section.content;
        context += truncated + '\n';
      }
    }

    // ============================================================
    // SECTION 9: Additional gc_fault_codes for same manufacturer (related codes)
    // ============================================================
    if (gcFaultCodes && gcFaultCodes.length > 1) {
      const additionalModels = [...new Set(gcFaultCodes.map(r => r.model_name).filter(Boolean))];
      if (additionalModels.length > 1) {
        context += `\nThis fault code appears across models: ${additionalModels.slice(0, 5).join(', ')}\n`;
      }
    }

    // ============================================================
    // SECTION 10: Page references for manual lookup
    // ============================================================
    const pageRefs = new Set();
    if (gcFaultCodes) gcFaultCodes.forEach(r => { if (r.page_reference) pageRefs.add(r.page_reference); });
    if (faultFindingGuides) faultFindingGuides.forEach(r => { 
      if (r.page_numbers && Array.isArray(r.page_numbers)) r.page_numbers.forEach(p => pageRefs.add(p)); 
    });
    if (pageRefs.size > 0) {
      context += `\nManual page reference(s): ${[...pageRefs].sort((a,b) => a-b).join(', ')}\n`;
    }

    return context;
  }

  /**
   * Check if fault code requires immediate safety attention
   */
  isSafetyCritical(faultData) {
    if (!faultData) return false;

    const { basicInfo, diagnosticInfo, manufacturerSpecific, gcFaultCodes, faultFindingGuides } = faultData;
    const allInfo = [
      ...(basicInfo || []), 
      ...(diagnosticInfo || []), 
      ...(manufacturerSpecific || []),
      ...(gcFaultCodes || []),
      ...(faultFindingGuides || [])
    ];

    return allInfo.some(info => {
      const text = (
        info.description || info.fault_description || info.solutions || 
        info.cause || info.remedy || ''
      ).toLowerCase();
      return text.includes('gas leak') || 
             text.includes('carbon monoxide') || 
             text.includes('immediate') ||
             text.includes('danger') ||
             text.includes('emergency') ||
             info.severity_level === 'critical' ||
             info.severity === 'critical' ||
             info.safety_critical === true;
    });
  }

  /**
   * Get related fault codes for additional context — uses gc_fault_codes (richest source)
   */
  async getRelatedFaultCodes(manufacturer, faultCode) {
    if (!manufacturer) return [];

    try {
      // Try gc_fault_codes first (richest), fall back to boiler_fault_codes
      const mfgAliases = this.getManufacturerSearchTerms(manufacturer);
      
      const { data: gcData } = await supabase
        .from('gc_fault_codes')
        .select('fault_code, description, severity')
        .or(this.buildManufacturerFilter(mfgAliases))
        .neq('fault_code', faultCode)
        .limit(8);

      if (gcData && gcData.length > 0) {
        // Deduplicate by fault_code
        const seen = new Set();
        return gcData.filter(r => {
          if (seen.has(r.fault_code)) return false;
          seen.add(r.fault_code);
          return true;
        }).slice(0, 5);
      }

      // Fallback to boiler_fault_codes
      const { data } = await supabase
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

    // Run both queries in parallel to reduce latency
    const [faultData, relatedCodes] = await Promise.all([
      this.getFaultCodeData(manufacturer, faultCode, model),
      this.getRelatedFaultCodes(manufacturer, faultCode)
    ]);
    const context = this.buildFaultCodeContext(faultData);
    const isSafetyCritical = this.isSafetyCritical(faultData);

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
