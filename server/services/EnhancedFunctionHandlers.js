/**
 * Enhanced Function Handlers for Advanced Diagnostic Capabilities
 * Implements comprehensive function calling for Gas Safe diagnostic assistance
 */

import { createClient } from '@supabase/supabase-js';

export class EnhancedFunctionHandlers {
  constructor() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('supabaseKey is required.');
    }
    
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  /**
   * Handle all enhanced function calls
   */
  async handleFunctionCall(functionCall) {
    
    try {
      const args = JSON.parse(functionCall.arguments);
      
      switch(functionCall.name) {
        case 'getComponentSpecifications':
          return await this.getComponentSpecifications(args);
        case 'getDiagnosticProcedure':
          return await this.getDiagnosticProcedure(args);
        case 'getSafetyRequirements':
          return await this.getSafetyRequirements(args);
        case 'getTestProcedure':
          return await this.getTestProcedure(args);
        case 'getTroubleshootingGuide':
          return await this.getTroubleshootingGuide(args);
        case 'getPartInformation':
          return await this.getPartInformation(args);
        case 'getWiringDiagram':
          return await this.getWiringDiagram(args);
        case 'getMaintenanceSchedule':
          return await this.getMaintenanceSchedule(args);
        case 'getComplianceChecklist':
          return await this.getComplianceChecklist(args);
        case 'getErrorCodeHistory':
          return await this.getErrorCodeHistory(args);
        case 'getSystemDesignGuidance':
          return await this.getSystemDesignGuidance(args);
        case 'getEmergencyProcedures':
          return await this.getEmergencyProcedures(args);
        default:
          return this.createErrorResponse(functionCall.name, 'Unknown function');
      }
    } catch (error) {
      console.error(`[Enhanced Functions] Error handling ${functionCall.name}: ${error.message}`);
      return this.createErrorResponse(functionCall.name, error.message);
    }
  }

  /**
   * Get component specifications from database
   */
  async getComponentSpecifications(args) {
    const { manufacturer, model, component } = args;
    
    try {
      // Query technical specifications table
      const { data: specs, error } = await this.supabase
        .from('technical_specifications')
        .select('*')
        .ilike('manufacturer', `%${manufacturer}%`)
        .ilike('component_name', `%${component}%`);

      if (error) throw error;

      if (specs && specs.length > 0) {
        const spec = specs[0];
        return {
          role: 'function',
          name: 'getComponentSpecifications',
          content: JSON.stringify({
            component: spec.component_name,
            manufacturer: spec.manufacturer,
            specifications: {
              nominal_value: spec.nominal_value,
              unit: spec.unit,
              tolerance_min: spec.tolerance_min,
              tolerance_max: spec.tolerance_max,
              test_conditions: spec.test_conditions,
              test_equipment: spec.test_equipment,
              safety_notes: spec.safety_notes
            },
            part_number: spec.part_number,
            replacement_interval: spec.replacement_interval
          })
        };
      }

      // Fallback to general component knowledge
      return {
        role: 'function',
        name: 'getComponentSpecifications',
        content: JSON.stringify({
          component,
          manufacturer,
          general_specs: this.getGeneralComponentSpecs(component),
          note: "Specific manufacturer data not available. General specifications provided."
        })
      };

    } catch (error) {
      return this.createErrorResponse('getComponentSpecifications', error.message);
    }
  }

  /**
   * Get diagnostic procedure from database
   */
  async getDiagnosticProcedure(args) {
    const { faultCode, manufacturer, model } = args;

    try {
      // Query enhanced diagnostic procedures
      const { data: procedures, error } = await this.supabase
        .from('enhanced_diagnostic_procedures')
        .select('*')
        .eq('fault_code', faultCode)
        .ilike('manufacturer', `%${manufacturer}%`)
        .order('step_number');

      if (error) throw error;

      if (procedures && procedures.length > 0) {
        return {
          role: 'function',
          name: 'getDiagnosticProcedure',
          content: JSON.stringify({
            fault_code: faultCode,
            manufacturer,
            procedure_name: procedures[0].procedure_name,
            steps: procedures.map(p => ({
              step: p.step_number,
              description: p.step_description,
              expected_result: p.expected_result,
              tools_required: p.tools_required,
              safety_warnings: p.safety_warnings,
              estimated_time: p.estimated_time_minutes
            })),
            skill_level: procedures[0].skill_level_required,
            total_time: procedures.reduce((sum, p) => sum + (p.estimated_time_minutes || 0), 0)
          })
        };
      }

      // Fallback to basic fault code lookup
      const { data: basicFault, error: basicError } = await this.supabase
        .from('boiler_fault_codes')
        .select('*')
        .eq('code', faultCode)
        .ilike('manufacturer', `%${manufacturer}%`)
        .limit(1);

      if (!basicError && basicFault && basicFault.length > 0) {
        return {
          role: 'function',
          name: 'getDiagnosticProcedure',
          content: JSON.stringify({
            fault_code: faultCode,
            manufacturer,
            description: basicFault[0].description,
            solutions: basicFault[0].solutions,
            note: "Basic fault code information. Detailed procedure not available."
          })
        };
      }

      return this.createErrorResponse('getDiagnosticProcedure', 'Fault code not found in database');

    } catch (error) {
      return this.createErrorResponse('getDiagnosticProcedure', error.message);
    }
  }

  /**
   * Get safety requirements
   */
  async getSafetyRequirements(args) {
    const { operation, boilerType, location } = args;

    const safetyRequirements = {
      gas_work: {
        requirements: [
          "Gas Safe registration required for all gas work",
          "Use appropriate gas detection equipment (LEL detector)",
          "Follow Tightness Testing procedures (IGE/UP/1)",
          "Complete Gas Safety Record (GSR) documentation",
          "Verify adequate ventilation and air supply",
          "Check for gas leaks using approved detection methods"
        ],
        equipment: ["Gas detector", "Manometer", "Soap solution", "GSR forms"],
        regulations: ["Gas Safety (Installation and Use) Regulations 1998", "IGE/UP/1", "BS 6891"]
      },
      electrical_testing: {
        requirements: [
          "Isolate electrical supply before work",
          "Use GS38 compliant test equipment",
          "Check for live parts after isolation",
          "Verify earth continuity and insulation resistance",
          "Test RCD operation if applicable",
          "Complete electrical safety documentation"
        ],
        equipment: ["Multimeter (GS38)", "Insulation tester", "RCD tester", "Voltage indicator"],
        regulations: ["BS 7671", "Electricity at Work Regulations 1989"]
      },
      component_replacement: {
        requirements: [
          "Isolate all relevant supplies (gas, electric, water)",
          "Depressurize system before component removal",
          "Use appropriate PPE for hot water/chemicals",
          "Follow manufacturer's installation procedures",
          "Test operation after replacement",
          "Update system documentation"
        ],
        equipment: ["PPE", "System keys", "Pressure gauge", "Thermometer"],
        regulations: ["Manufacturer guidelines", "Gas Safe requirements"]
      }
    };

    const requirement = safetyRequirements[operation] || safetyRequirements.component_replacement;

    // Add boiler type specific requirements
    if (boilerType) {
      requirement.boiler_specific = this.getBoilerTypeRequirements(boilerType);
    }

    // Add location specific requirements
    if (location) {
      requirement.location_specific = this.getLocationRequirements(location);
    }

    return {
      role: 'function',
      name: 'getSafetyRequirements',
      content: JSON.stringify({
        operation,
        boiler_type: boilerType,
        location,
        safety_requirements: requirement
      })
    };
  }

  /**
   * Get test procedure
   */
  async getTestProcedure(args) {
    const { testType, component, manufacturer } = args;

    const testProcedures = {
      electrical_continuity: {
        procedure: [
          "Isolate electrical supply and confirm isolation",
          "Set multimeter to continuity/resistance mode",
          "Test between component terminals",
          "Record resistance values",
          "Compare with manufacturer specifications"
        ],
        expected_values: {
          "gas valve": "4-6kΩ (coil resistance)",
          "pump": "20-200Ω (motor windings)",
          "fan": "50-150Ω (motor windings)",
          "thermistor": "10kΩ at 25°C (varies with temperature)"
        },
        equipment: ["Digital multimeter (GS38)", "Test leads", "Temperature probe"]
      },
      gas_pressure: {
        procedure: [
          "Connect manometer to test point",
          "Turn on gas supply",
          "Check standing pressure (21mbar ±2mbar)",
          "Check working pressure with appliance running",
          "Record all readings"
        ],
        expected_values: {
          "standing_pressure": "21mbar ±2mbar",
          "working_pressure": "20mbar ±1mbar",
          "lock_up_pressure": "21mbar (within 1 minute)"
        },
        equipment: ["U-gauge manometer", "Gas test point adaptors", "Stopwatch"]
      }
    };

    const procedure = testProcedures[testType];
    if (!procedure) {
      return this.createErrorResponse('getTestProcedure', `Test type ${testType} not found`);
    }

    return {
      role: 'function',
      name: 'getTestProcedure',
      content: JSON.stringify({
        test_type: testType,
        component,
        manufacturer,
        procedure: procedure.procedure,
        expected_values: procedure.expected_values,
        equipment_required: procedure.equipment,
        safety_notes: [
          "Ensure proper isolation before testing",
          "Use appropriate PPE",
          "Follow manufacturer safety guidelines"
        ]
      })
    };
  }

  /**
   * Get troubleshooting guide
   */
  async getTroubleshootingGuide(args) {
    const { symptom, boilerType, manufacturer, additionalSymptoms = [] } = args;

    const troubleshootingGuides = {
      no_hot_water: {
        initial_checks: [
          "Check system pressure (1-1.5 bar for combis)",
          "Verify power supply to boiler",
          "Check for fault codes on display",
          "Test hot water demand (open hot tap)"
        ],
        systematic_diagnosis: [
          "Test diverter valve operation (combi boilers)",
          "Check DHW thermistor resistance",
          "Verify plate heat exchanger condition",
          "Test DHW flow sensor operation"
        ],
        common_causes: [
          "Diverter valve failure (60% of cases)",
          "Blocked plate heat exchanger (25%)",
          "DHW thermistor fault (10%)",
          "Flow sensor failure (5%)"
        ]
      },
      no_heating: {
        initial_checks: [
          "Check thermostat settings and operation",
          "Verify system pressure",
          "Check pump operation",
          "Test motorized valve operation (system boilers)"
        ],
        systematic_diagnosis: [
          "Test pump electrical supply and operation",
          "Check system circulation",
          "Verify boiler firing sequence",
          "Test room thermostat and controls"
        ],
        common_causes: [
          "Pump failure (40% of cases)",
          "Motorized valve issues (30%)",
          "Thermostat faults (20%)",
          "Air in system (10%)"
        ]
      }
    };

    const guide = troubleshootingGuides[symptom];
    if (!guide) {
      return this.createErrorResponse('getTroubleshootingGuide', `Symptom ${symptom} not found`);
    }

    return {
      role: 'function',
      name: 'getTroubleshootingGuide',
      content: JSON.stringify({
        symptom,
        boiler_type: boilerType,
        manufacturer,
        additional_symptoms: additionalSymptoms,
        troubleshooting_guide: guide,
        next_steps: [
          "Perform initial checks systematically",
          "Document all findings",
          "Proceed with systematic diagnosis",
          "Verify repair effectiveness"
        ]
      })
    };
  }

  /**
   * Get part information
   */
  async getPartInformation(args) {
    const { manufacturer, model, component, partNumber } = args;

    // This would typically query a parts database
    // For now, provide structured response format
    return {
      role: 'function',
      name: 'getPartInformation',
      content: JSON.stringify({
        manufacturer,
        model,
        component,
        search_criteria: { manufacturer, model, component, partNumber },
        note: "Part database integration required. Contact manufacturer for specific part numbers.",
        general_guidance: [
          "Use only manufacturer-approved parts",
          "Check warranty implications of part replacement",
          "Verify part compatibility with model/serial number",
          "Consider superseded part numbers"
        ],
        common_suppliers: [
          "Manufacturer direct",
          "Authorized distributors",
          "Specialist heating merchants"
        ]
      })
    };
  }

  /**
   * Get emergency procedures
   */
  async getEmergencyProcedures(args) {
    const { emergencyType, location, severity } = args;

    const emergencyProcedures = {
      gas_leak: {
        immediate_actions: [
          "DO NOT operate electrical switches or create sparks",
          "Extinguish all naked flames immediately",
          "Open doors and windows for ventilation",
          "Turn off gas supply at meter if safe to do so",
          "Evacuate the premises",
          "Call National Gas Emergency Service: 0800 111 999"
        ],
        safety_zone: "Establish 15-meter safety zone around leak",
        equipment_shutdown: "Do not use electrical equipment in affected area"
      },
      carbon_monoxide: {
        immediate_actions: [
          "Turn off gas appliance immediately",
          "Open doors and windows for ventilation",
          "Evacuate all persons from premises",
          "Seek fresh air and medical attention if symptoms present",
          "Do not re-enter until area is ventilated",
          "Call Gas Safe Register: 0800 408 5500"
        ],
        symptoms: "Headache, dizziness, nausea, fatigue, confusion",
        testing: "Use CO detector to verify safe levels before re-entry"
      }
    };

    const procedure = emergencyProcedures[emergencyType];
    if (!procedure) {
      return this.createErrorResponse('getEmergencyProcedures', `Emergency type ${emergencyType} not found`);
    }

    return {
      role: 'function',
      name: 'getEmergencyProcedures',
      content: JSON.stringify({
        emergency_type: emergencyType,
        location,
        severity,
        emergency_procedure: procedure,
        emergency_contacts: {
          "National Gas Emergency": "0800 111 999",
          "Gas Safe Register": "0800 408 5500",
          "Emergency Services": "999"
        }
      })
    };
  }

  /**
   * Helper methods
   */
  getGeneralComponentSpecs(component) {
    const specs = {
      "gas valve": {
        voltage: "24V DC",
        resistance: "4-6kΩ",
        operating_pressure: "20mbar",
        test_equipment: "Multimeter, manometer"
      },
      "pressure sensor": {
        output: "0-5V DC",
        range: "0-6 bar",
        accuracy: "±2%",
        test_equipment: "Multimeter, pressure source"
      },
      "thermistor": {
        resistance: "10kΩ at 25°C",
        tolerance: "±5%",
        temperature_coefficient: "Negative",
        test_equipment: "Multimeter, thermometer"
      }
    };

    return specs[component.toLowerCase()] || { note: "Specifications not available" };
  }

  getBoilerTypeRequirements(boilerType) {
    const requirements = {
      combi: ["Check DHW priority operation", "Verify plate heat exchanger condition"],
      system: ["Check expansion vessel", "Verify system pressure"],
      "heat-only": ["Check feed and expansion tank", "Verify gravity circulation"]
    };

    return requirements[boilerType] || [];
  }

  getLocationRequirements(location) {
    const requirements = {
      kitchen: ["Ensure adequate ventilation", "Check for gas isolation valve accessibility"],
      garage: ["Verify frost protection", "Check for adequate ventilation"],
      external: ["Check weather protection", "Verify freeze protection"]
    };

    return requirements[location] || [];
  }

  createErrorResponse(functionName, errorMessage) {
    return {
      role: 'function',
      name: functionName,
      content: JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      })
    };
  }
}

export default EnhancedFunctionHandlers;
