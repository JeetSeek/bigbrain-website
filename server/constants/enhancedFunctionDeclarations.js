/**
 * Enhanced Function Declarations for Advanced Diagnostic Capabilities
 * Provides comprehensive function calling for Gas Safe diagnostic assistance
 */

export const ENHANCED_FUNCTION_DECLARATIONS = [
  {
    name: "getComponentSpecifications",
    description: "Get detailed technical specifications for specific boiler components including electrical values, operating parameters, and test procedures",
    parameters: {
      type: "object",
      properties: {
        manufacturer: {
          type: "string",
          description: "Boiler manufacturer (e.g., Ideal, Baxi, Worcester Bosch)"
        },
        model: {
          type: "string",
          description: "Specific boiler model (e.g., Logic 24, Duo-tec 28)"
        },
        component: {
          type: "string",
          description: "Component name (e.g., gas valve, pressure sensor, diverter valve, PCB)"
        }
      },
      required: ["manufacturer", "component"]
    }
  },
  {
    name: "getDiagnosticProcedure",
    description: "Get step-by-step diagnostic procedure for specific fault codes with safety requirements and test equipment needed",
    parameters: {
      type: "object",
      properties: {
        faultCode: {
          type: "string",
          description: "Fault code (e.g., F22, E133, EA)"
        },
        manufacturer: {
          type: "string",
          description: "Boiler manufacturer"
        },
        model: {
          type: "string",
          description: "Boiler model (optional for more specific procedures)"
        }
      },
      required: ["faultCode", "manufacturer"]
    }
  },
  {
    name: "getSafetyRequirements",
    description: "Get Gas Safe compliance requirements and safety procedures for specific operations",
    parameters: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          description: "Type of operation (e.g., gas_work, electrical_testing, component_replacement, system_commissioning)"
        },
        boilerType: {
          type: "string",
          description: "Type of boiler system (combi, system, heat-only, back-boiler)"
        },
        location: {
          type: "string",
          description: "Installation location (kitchen, utility, garage, external) - affects ventilation requirements"
        }
      },
      required: ["operation"]
    }
  },
  {
    name: "getTestProcedure",
    description: "Get specific test procedures with expected values and tolerances for component verification",
    parameters: {
      type: "object",
      properties: {
        testType: {
          type: "string",
          description: "Type of test (electrical_continuity, gas_pressure, water_pressure, combustion_analysis, safety_device)"
        },
        component: {
          type: "string",
          description: "Component being tested"
        },
        manufacturer: {
          type: "string",
          description: "Boiler manufacturer"
        }
      },
      required: ["testType", "component"]
    }
  },
  {
    name: "getTroubleshootingGuide",
    description: "Get systematic troubleshooting guide for specific symptoms with decision tree approach",
    parameters: {
      type: "object",
      properties: {
        symptom: {
          type: "string",
          description: "Primary symptom (e.g., no_hot_water, no_heating, intermittent_operation, noise, leaking)"
        },
        boilerType: {
          type: "string",
          description: "Type of boiler system"
        },
        manufacturer: {
          type: "string",
          description: "Boiler manufacturer"
        },
        additionalSymptoms: {
          type: "array",
          items: { type: "string" },
          description: "Additional symptoms to help narrow diagnosis"
        }
      },
      required: ["symptom"]
    }
  },
  {
    name: "getPartInformation",
    description: "Get part numbers, specifications, and availability information for replacement components",
    parameters: {
      type: "object",
      properties: {
        manufacturer: {
          type: "string",
          description: "Boiler manufacturer"
        },
        model: {
          type: "string",
          description: "Boiler model"
        },
        component: {
          type: "string",
          description: "Component name or description"
        },
        partNumber: {
          type: "string",
          description: "Existing part number if known"
        }
      },
      required: ["manufacturer", "component"]
    }
  },
  {
    name: "getWiringDiagram",
    description: "Get wiring diagram information and electrical connection details for specific components",
    parameters: {
      type: "object",
      properties: {
        manufacturer: {
          type: "string",
          description: "Boiler manufacturer"
        },
        model: {
          type: "string",
          description: "Boiler model"
        },
        component: {
          type: "string",
          description: "Component or circuit (e.g., gas_valve, pump, fan, controls)"
        }
      },
      required: ["manufacturer", "model", "component"]
    }
  },
  {
    name: "getMaintenanceSchedule",
    description: "Get recommended maintenance procedures and schedules for specific boiler models",
    parameters: {
      type: "object",
      properties: {
        manufacturer: {
          type: "string",
          description: "Boiler manufacturer"
        },
        model: {
          type: "string",
          description: "Boiler model"
        },
        installationAge: {
          type: "number",
          description: "Age of installation in years"
        },
        usageType: {
          type: "string",
          description: "Usage type (domestic, commercial, high_demand)"
        }
      },
      required: ["manufacturer", "model"]
    }
  },
  {
    name: "getComplianceChecklist",
    description: "Get Gas Safe compliance checklist for installation, commissioning, or service work",
    parameters: {
      type: "object",
      properties: {
        workType: {
          type: "string",
          description: "Type of work (installation, service, repair, commissioning, safety_check)"
        },
        boilerType: {
          type: "string",
          description: "Type of boiler system"
        },
        location: {
          type: "string",
          description: "Installation location"
        },
        flueType: {
          type: "string",
          description: "Flue type (room_sealed, open_flue, balanced_flue)"
        }
      },
      required: ["workType"]
    }
  },
  {
    name: "getErrorCodeHistory",
    description: "Get historical error code patterns and common causes for specific boiler models",
    parameters: {
      type: "object",
      properties: {
        manufacturer: {
          type: "string",
          description: "Boiler manufacturer"
        },
        model: {
          type: "string",
          description: "Boiler model"
        },
        errorCodes: {
          type: "array",
          items: { type: "string" },
          description: "List of error codes to analyze"
        },
        timeframe: {
          type: "string",
          description: "Timeframe for pattern analysis (recent, seasonal, intermittent)"
        }
      },
      required: ["manufacturer", "errorCodes"]
    }
  },
  {
    name: "getSystemDesignGuidance",
    description: "Get system design recommendations and requirements for boiler installations",
    parameters: {
      type: "object",
      properties: {
        boilerOutput: {
          type: "number",
          description: "Boiler output in kW"
        },
        propertyType: {
          type: "string",
          description: "Property type (house, flat, commercial)"
        },
        systemType: {
          type: "string",
          description: "Desired system type (combi, system, heat-only)"
        },
        existingSystem: {
          type: "string",
          description: "Existing system details if conversion"
        }
      },
      required: ["boilerOutput", "systemType"]
    }
  },
  {
    name: "getEmergencyProcedures",
    description: "Get emergency procedures for gas leaks, carbon monoxide, or other safety incidents",
    parameters: {
      type: "object",
      properties: {
        emergencyType: {
          type: "string",
          description: "Type of emergency (gas_leak, carbon_monoxide, fire, explosion_risk, water_damage)"
        },
        location: {
          type: "string",
          description: "Location of incident"
        },
        severity: {
          type: "string",
          description: "Severity level (immediate_danger, potential_risk, precautionary)"
        }
      },
      required: ["emergencyType"]
    }
  }
];

export default ENHANCED_FUNCTION_DECLARATIONS;
