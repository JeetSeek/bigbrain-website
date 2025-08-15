/**
 * Diagnostic Data Integration Service
 * Enhances LLM responses by integrating comprehensive diagnostic database
 * Feeds rich technical procedures, values, and manufacturer-specific data to LLM
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DiagnosticDataIntegrationService {
  constructor() {
    this.diagnosticData = {
      procedures: new Map(),
      components: new Map(),
      faultCodes: new Map(),
      manufacturers: new Map(),
      testingProcedures: new Map(),
      technicalValues: new Map()
    };
    this.isInitialized = false;
    this.dataPath = path.join(__dirname, '../fault finding copy/fault finding.cvs');
  }

  /**
   * Initialize and load all diagnostic data from CSV files
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      
      // Load all diagnostic CSV files
      await this.loadDiagnosticProcedures();
      await this.loadComponentDiagnostics();
      await this.loadTestingProcedures();
      await this.loadManufacturerData();
      
      this.isInitialized = true;
      console.log(`[DiagnosticData] Loaded: ${this.diagnosticData.procedures.size} procedures, ${this.diagnosticData.components.size} components`);
      
    } catch (error) {
      console.error('[DiagnosticData] Failed to initialize diagnostic data:', error);
      // Don't throw - allow partial operation
    }
  }

  /**
   * Load diagnostic procedures from CSV files
   */
  async loadDiagnosticProcedures() {
    const procedureFiles = [
      'boiler_fault_finding_guide.csv',
      'combustion_analysis_guide.csv',
      'heating_controls_diagnosis.csv',
      'gas_supply_diagnosis.csv',
      'flue_system_diagnostics.csv'
    ];

    for (const file of procedureFiles) {
      try {
        const filePath = path.join(this.dataPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const procedures = this.parseCSVContent(content);
        
        procedures.forEach(procedure => {
          this.diagnosticData.procedures.set(procedure.id || procedure.name, {
            ...procedure,
            source: file,
            category: this.getCategoryFromFilename(file)
          });
        });
        
      } catch (error) {
        console.warn(`[DiagnosticData] Could not load ${file}:`, error.message);
      }
    }
  }

  /**
   * Load component-specific diagnostics
   */
  async loadComponentDiagnostics() {
    const componentFiles = [
      'circulation_pump_diagnostics.csv',
      'expansion_vessel_diagnosis.csv',
      'heat_exchanger_leak_diagnosis.csv',
      'motorized_valve_diagnosis.csv',
      'hot_water_cylinder_diagnosis.csv'
    ];

    for (const file of componentFiles) {
      try {
        const filePath = path.join(this.dataPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const components = this.parseCSVContent(content);
        
        components.forEach(component => {
          this.diagnosticData.components.set(component.component || component.name, {
            ...component,
            source: file,
            diagnosticProcedures: component.procedures || component.steps,
            technicalSpecs: component.specifications || component.values
          });
        });
        
      } catch (error) {
        console.warn(`[DiagnosticData] Could not load ${file}:`, error.message);
      }
    }
  }

  /**
   * Load testing procedures and technical values
   */
  async loadTestingProcedures() {
    const testingFiles = [
      'analog_multimeter_boiler_testing.csv',
      'multimeter_testing_guide.csv',
      'water_quality_diagnosis.csv',
      'system_noise_diagnosis.csv'
    ];

    for (const file of testingFiles) {
      try {
        const filePath = path.join(this.dataPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const procedures = this.parseCSVContent(content);
        
        procedures.forEach(procedure => {
          this.diagnosticData.testingProcedures.set(procedure.test || procedure.name, {
            ...procedure,
            source: file,
            equipment: procedure.equipment || procedure.tools,
            expectedValues: procedure.values || procedure.ranges,
            interpretation: procedure.interpretation || procedure.results
          });
        });
        
      } catch (error) {
        console.warn(`[DiagnosticData] Could not load ${file}:`, error.message);
      }
    }
  }

  /**
   * Load manufacturer-specific data
   */
  async loadManufacturerData() {
    const manufacturerFiles = [
      'condensing_boiler_faults.csv',
      'non_condensing_boiler_components.csv',
      'hybrid_system_faults.csv'
    ];

    for (const file of manufacturerFiles) {
      try {
        const filePath = path.join(this.dataPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = this.parseCSVContent(content);
        
        data.forEach(item => {
          const manufacturer = item.manufacturer || item.make || 'general';
          if (!this.diagnosticData.manufacturers.has(manufacturer)) {
            this.diagnosticData.manufacturers.set(manufacturer, []);
          }
          this.diagnosticData.manufacturers.get(manufacturer).push({
            ...item,
            source: file
          });
        });
        
      } catch (error) {
        console.warn(`[DiagnosticData] Could not load ${file}:`, error.message);
      }
    }
  }

  /**
   * Get relevant diagnostic data for LLM context
   */
  async getRelevantDiagnosticData(userQuery, boilerInfo = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const relevantData = {
      procedures: [],
      components: [],
      testingSteps: [],
      technicalValues: [],
      manufacturerSpecific: [],
      safetyWarnings: []
    };

    try {
      // Extract key terms from user query
      const queryTerms = this.extractKeyTerms(userQuery);
      const { manufacturer, model, faultCodes, systemType } = boilerInfo;

      // Find relevant procedures
      relevantData.procedures = this.findRelevantProcedures(queryTerms, systemType);
      
      // Find component-specific diagnostics
      relevantData.components = this.findRelevantComponents(queryTerms);
      
      // Find testing procedures
      relevantData.testingSteps = this.findRelevantTestingProcedures(queryTerms);
      
      // Get manufacturer-specific data
      if (manufacturer) {
        relevantData.manufacturerSpecific = this.getManufacturerSpecificData(manufacturer, model);
      }
      
      // Get fault code specific data
      if (faultCodes && faultCodes.length > 0) {
        relevantData.faultCodeData = this.getFaultCodeSpecificData(faultCodes, manufacturer);
      }
      
      // Add safety warnings for specific scenarios
      relevantData.safetyWarnings = this.getSafetyWarnings(queryTerms, systemType);

    } catch (error) {
      console.error('[DiagnosticData] Error getting relevant data:', error);
    }

    return relevantData;
  }

  /**
   * Extract key diagnostic terms from user query
   */
  extractKeyTerms(query) {
    const lowerQuery = query.toLowerCase();
    
    const componentTerms = ['heat exchanger', 'pump', 'valve', 'thermostat', 'pcb', 'fan', 'ignition', 'gas valve', 'diverter'];
    const symptomTerms = ['no heating', 'no hot water', 'noise', 'leak', 'lockout', 'pressure', 'temperature'];
    const testTerms = ['multimeter', 'pressure test', 'combustion', 'gas rate', 'electrical'];
    
    return {
      components: componentTerms.filter(term => lowerQuery.includes(term)),
      symptoms: symptomTerms.filter(term => lowerQuery.includes(term)),
      tests: testTerms.filter(term => lowerQuery.includes(term)),
      faultCodes: this.extractFaultCodes(query)
    };
  }

  /**
   * Extract fault codes from query (F1, F22, E1, etc.)
   */
  extractFaultCodes(query) {
    const faultCodeRegex = /[FE]\d{1,3}/gi;
    return query.match(faultCodeRegex) || [];
  }

  /**
   * Find relevant diagnostic procedures
   */
  findRelevantProcedures(queryTerms, systemType) {
    const relevant = [];
    
    for (const [key, procedure] of this.diagnosticData.procedures) {
      let relevanceScore = 0;
      
      // Check component matches
      queryTerms.components.forEach(component => {
        if (procedure.description?.toLowerCase().includes(component) || 
            procedure.steps?.toLowerCase().includes(component)) {
          relevanceScore += 2;
        }
      });
      
      // Check symptom matches
      queryTerms.symptoms.forEach(symptom => {
        if (procedure.symptoms?.toLowerCase().includes(symptom) ||
            procedure.description?.toLowerCase().includes(symptom)) {
          relevanceScore += 3;
        }
      });
      
      // System type relevance
      if (systemType && procedure.appliesTo?.includes(systemType)) {
        relevanceScore += 1;
      }
      
      if (relevanceScore > 0) {
        relevant.push({ ...procedure, relevanceScore });
      }
    }
    
    return relevant.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
  }

  /**
   * Find relevant component diagnostics
   */
  findRelevantComponents(queryTerms) {
    const relevant = [];
    
    for (const [key, component] of this.diagnosticData.components) {
      if (queryTerms.components.some(term => key.toLowerCase().includes(term))) {
        relevant.push(component);
      }
    }
    
    return relevant.slice(0, 3);
  }

  /**
   * Find relevant testing procedures
   */
  findRelevantTestingProcedures(queryTerms) {
    const relevant = [];
    
    for (const [key, procedure] of this.diagnosticData.testingProcedures) {
      if (queryTerms.tests.some(term => key.toLowerCase().includes(term)) ||
          queryTerms.components.some(term => procedure.description?.toLowerCase().includes(term))) {
        relevant.push(procedure);
      }
    }
    
    return relevant.slice(0, 3);
  }

  /**
   * Get manufacturer-specific diagnostic data
   */
  getManufacturerSpecificData(manufacturer, model) {
    const manufacturerData = this.diagnosticData.manufacturers.get(manufacturer.toLowerCase()) || [];
    
    if (model) {
      return manufacturerData.filter(item => 
        item.model?.toLowerCase().includes(model.toLowerCase()) ||
        item.range?.toLowerCase().includes(model.toLowerCase())
      );
    }
    
    return manufacturerData.slice(0, 3);
  }

  /**
   * Get fault code specific diagnostic data
   */
  getFaultCodeSpecificData(faultCodes, manufacturer) {
    // This would integrate with the existing fault code database
    // For now, return structure for integration
    return {
      codes: faultCodes,
      manufacturer,
      diagnosticSteps: [],
      commonCauses: [],
      testingProcedures: []
    };
  }

  /**
   * Get safety warnings for specific scenarios
   */
  getSafetyWarnings(queryTerms, systemType) {
    const warnings = [];
    
    if (queryTerms.components.includes('gas valve') || queryTerms.tests.includes('gas rate')) {
      warnings.push('SAFETY: Gas isolation required. Ensure proper ventilation and gas detection equipment.');
    }
    
    if (queryTerms.symptoms.includes('leak')) {
      warnings.push('SAFETY: Check for gas leaks with approved detector. Isolate if leak detected.');
    }
    
    if (queryTerms.tests.includes('electrical') || queryTerms.tests.includes('multimeter')) {
      warnings.push('SAFETY: Isolate electrical supply before testing. Use appropriate PPE.');
    }
    
    return warnings;
  }

  /**
   * Parse CSV content into structured data
   */
  parseCSVContent(content) {
    try {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length < 2) return [];
      
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const item = {};
        
        headers.forEach((header, index) => {
          item[header] = values[index] || '';
        });
        
        if (Object.values(item).some(v => v)) { // Only add if not empty
          data.push(item);
        }
      }
      
      return data;
    } catch (error) {
      console.warn('[DiagnosticData] Error parsing CSV:', error);
      return [];
    }
  }

  /**
   * Get category from filename
   */
  getCategoryFromFilename(filename) {
    const categoryMap = {
      'boiler_fault_finding_guide.csv': 'general_diagnostics',
      'combustion_analysis_guide.csv': 'combustion_testing',
      'heating_controls_diagnosis.csv': 'controls_diagnostics',
      'gas_supply_diagnosis.csv': 'gas_supply',
      'circulation_pump_diagnostics.csv': 'pump_diagnostics',
      'heat_exchanger_leak_diagnosis.csv': 'heat_exchanger',
      'multimeter_testing_guide.csv': 'electrical_testing'
    };
    
    return categoryMap[filename] || 'general';
  }

  /**
   * Build enhanced LLM context from diagnostic data
   */
  buildLLMContext(relevantData) {
    let context = '\n## RELEVANT DIAGNOSTIC DATA:\n\n';
    
    // Add procedures
    if (relevantData.procedures.length > 0) {
      context += '### DIAGNOSTIC PROCEDURES:\n';
      relevantData.procedures.forEach(proc => {
        context += `- **${proc.name}**: ${proc.description}\n`;
        if (proc.steps) context += `  Steps: ${proc.steps}\n`;
        if (proc.expectedValues) context += `  Expected Values: ${proc.expectedValues}\n`;
      });
      context += '\n';
    }
    
    // Add component diagnostics
    if (relevantData.components.length > 0) {
      context += '### COMPONENT DIAGNOSTICS:\n';
      relevantData.components.forEach(comp => {
        context += `- **${comp.component || comp.name}**: ${comp.description}\n`;
        if (comp.diagnosticProcedures) context += `  Procedures: ${comp.diagnosticProcedures}\n`;
        if (comp.technicalSpecs) context += `  Technical Specs: ${comp.technicalSpecs}\n`;
      });
      context += '\n';
    }
    
    // Add testing procedures
    if (relevantData.testingSteps.length > 0) {
      context += '### TESTING PROCEDURES:\n';
      relevantData.testingSteps.forEach(test => {
        context += `- **${test.test || test.name}**: ${test.description}\n`;
        if (test.equipment) context += `  Equipment: ${test.equipment}\n`;
        if (test.expectedValues) context += `  Expected Values: ${test.expectedValues}\n`;
      });
      context += '\n';
    }
    
    // Add safety warnings
    if (relevantData.safetyWarnings.length > 0) {
      context += '### SAFETY WARNINGS:\n';
      relevantData.safetyWarnings.forEach(warning => {
        context += `⚠️ ${warning}\n`;
      });
      context += '\n';
    }
    
    return context;
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      isInitialized: this.isInitialized,
      proceduresLoaded: this.diagnosticData.procedures.size,
      componentsLoaded: this.diagnosticData.components.size,
      testingProceduresLoaded: this.diagnosticData.testingProcedures.size,
      manufacturersLoaded: this.diagnosticData.manufacturers.size
    };
  }
}

export default DiagnosticDataIntegrationService;
