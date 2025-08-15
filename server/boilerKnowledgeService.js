// Boiler Knowledge Service
// Provides structured data about boiler faults, models, and troubleshooting steps

// Basic structure for storing boiler knowledge
const boilerKnowledge = {
  // Common fault codes by manufacturer
  faultCodes: {
    "Worcester Bosch": {
      "EA": {
        description: "Flame detection issue",
        causes: ["Gas supply issue", "Flame sensing electrode dirty or damaged", "PCB fault"],
        troubleshooting: [
          "Check if gas supply is on and adequate",
          "Inspect flame sensing electrode for damage or carbon deposits",
          "Check wiring connections to flame sensor",
          "If all else fails, PCB may need replacement"
        ],
        safety: "Medium - If gas smell is present, turn off gas supply and call emergency"
      },
      "CE": {
        description: "No water flow detected",
        causes: ["Pump failure", "Air lock", "System blockage", "Flow sensor failure"],
        troubleshooting: [
          "Check if the pump is running - feel for vibration",
          "Check system pressure (should be 1-1.5 bar)",
          "Bleed radiators to remove air locks",
          "Check if valves are open throughout the system",
          "Try power cycling the boiler"
        ],
        safety: "Low - Primarily a mechanical issue"
      },
      "F1": {
        description: "PCB malfunction",
        causes: ["Electronic component failure", "Wiring issues", "Power supply problems"],
        troubleshooting: [
          "Check all wiring connections to the PCB",
          "Reset the boiler by turning off power for 30 seconds",
          "Check for water damage on PCB",
          "May require PCB replacement by a qualified engineer"
        ],
        safety: "Medium - Electrical components involved"
      },
      "E9": {
        description: "Overheat lockout",
        causes: ["Pump failure", "Heat exchanger blockage", "Air in system", "Faulty thermistor"],
        troubleshooting: [
          "Check if system is properly filled (1-1.5 bar)",
          "Ensure pump is operating correctly",
          "Bleed radiators to remove air",
          "Check for blockages in heat exchanger",
          "Test thermistor resistance values"
        ],
        safety: "Medium - Overheating can damage components"
      }
    },
    "Vaillant": {
      "F.22": {
        description: "Low water pressure",
        causes: ["System leaks", "Recent bleeding without refilling", "Expansion vessel failure"],
        troubleshooting: [
          "Check pressure gauge (should be 1-1.5 bar)",
          "Repressurise system using filling loop",
          "Inspect for leaks throughout system",
          "Check expansion vessel pre-charge pressure"
        ],
        safety: "Low - Basic maintenance issue"
      },
      "F.28": {
        description: "Ignition failure",
        causes: ["Gas supply issue", "Ignition electrode fault", "Ignition transformer failure"],
        troubleshooting: [
          "Check gas supply is on and meter is functioning",
          "Inspect ignition electrode for damage or carbon deposits",
          "Check ignition lead connections",
          "Test gas valve operation (professional only)"
        ],
        safety: "High - Gas safety related"
      },
      "F.75": {
        description: "Water pressure sensor/pump fault",
        causes: ["Faulty pressure sensor", "Pump failure", "Air lock", "Wiring issues"],
        troubleshooting: [
          "Check wiring to pressure sensor and pump",
          "Listen for pump operation on startup",
          "Bleed air from system",
          "Professional may need to test sensor resistance"
        ],
        safety: "Medium - Could lead to overheating"
      }
    },
    "Baxi": {
      "E133": {
        description: "Gas supply failure",
        causes: ["Gas supply interruption", "Gas valve fault", "Air in gas supply"],
        troubleshooting: [
          "Check gas supply is turned on",
          "Check other gas appliances are working",
          "Reset boiler to clear airlock in gas supply",
          "May require engineer to check gas valve"
        ],
        safety: "High - Gas safety related"
      },
      "E28": {
        description: "Flue blockage/fan issue",
        causes: ["Blocked flue terminal", "Faulty fan", "Pressure switch issue"],
        troubleshooting: [
          "Check external flue terminal for blockages",
          "Listen for fan operation during startup sequence",
          "Ensure all flue joints are secure",
          "Professional testing of pressure switch may be needed"
        ],
        safety: "High - Risk of carbon monoxide if flue is blocked"
      }
    },
    "Ideal": {
      "F1": {
        description: "Low water pressure",
        causes: ["System leaks", "Pressure relief valve operation", "Filling loop issue"],
        troubleshooting: [
          "Check pressure gauge (should be 1-1.5 bar)",
          "Repressurise system using filling loop",
          "Inspect for leaks",
          "Check pressure relief valve for weeping"
        ],
        safety: "Low - Basic maintenance issue"
      },
      "F2": {
        description: "Flame loss",
        causes: ["Gas supply interruption", "Flame sensor fault", "Draft affecting flame"],
        troubleshooting: [
          "Check gas supply",
          "Inspect flame sensing electrode",
          "Check flue for proper installation",
          "Look for signs of water ingress affecting electronics"
        ],
        safety: "Medium - Gas related but common issue"
      }
    }
  },
  
  // Common symptoms and possible causes
  symptoms: {
    "No heating": [
      {
        cause: "Thermostat issues",
        probability: "High",
        checks: [
          "Check if thermostat is set correctly",
          "Replace batteries in wireless thermostat",
          "Ensure thermostat is calling for heat (listen for click)"
        ]
      },
      {
        cause: "Diverter valve failure",
        probability: "High",
        checks: [
          "Check if hot water works while heating doesn't",
          "Listen for diverter valve movement during mode change",
          "Tap diverter valve gently to free if sticking"
        ]
      },
      {
        cause: "Pump failure",
        probability: "Medium",
        checks: [
          "Listen/feel for pump vibration when heating is on",
          "Check if pump is hot/warm during operation",
          "Try bleeding air from pump"
        ]
      },
      {
        cause: "Air lock",
        probability: "Medium",
        checks: [
          "Bleed radiators starting from lowest point",
          "Check system pressure after bleeding",
          "Consider power flush if system is old"
        ]
      }
    ],
    "No hot water": [
      {
        cause: "Diverter valve failure",
        probability: "High",
        checks: [
          "Check if heating works while hot water doesn't",
          "Listen for diverter valve movement during mode change",
          "Inspect for leaks around valve"
        ]
      },
      {
        cause: "DHW sensor failure",
        probability: "Medium",
        checks: [
          "Check for error codes related to hot water",
          "Professional can test sensor resistance"
        ]
      },
      {
        cause: "Scale buildup in plate heat exchanger",
        probability: "Medium",
        checks: [
          "Check if in hard water area",
          "Consider descaling if boiler is older",
          "Look for reduced flow rate at hot taps"
        ]
      }
    ],
    "Boiler noise": [
      {
        cause: "Kettling (limescale buildup)",
        probability: "High",
        checks: [
          "Listen for rumbling/whistling noise",
          "Check if in hard water area",
          "Consider power flush or descaling"
        ]
      },
      {
        cause: "Air in system",
        probability: "High",
        checks: [
          "Bleed radiators to remove air",
          "Check system pressure after bleeding",
          "Look for gurgling sounds in pipes"
        ]
      },
      {
        cause: "Pump issues",
        probability: "Medium",
        checks: [
          "Listen for grinding or whining from pump",
          "Check if pump is installed correctly",
          "May need pump replacement if bearings worn"
        ]
      }
    ],
    "Leaking boiler": [
      {
        cause: "Pressure relief valve operation",
        probability: "High",
        checks: [
          "Check if system pressure is too high (>2.5 bar)",
          "Look for discharge pipe running outside",
          "Reduce pressure if necessary"
        ]
      },
      {
        cause: "Heat exchanger leak",
        probability: "Medium",
        safety: "Medium - Could worsen and cause electrical short",
        checks: [
          "Look for drips from main heat exchanger area",
          "Check for signs of corrosion",
          "Professional repair likely needed"
        ]
      },
      {
        cause: "Connection leak",
        probability: "High",
        checks: [
          "Inspect all visible pipe connections",
          "Tighten any loose connections (when cool)",
          "Look for mineral deposits indicating slow leaks"
        ]
      }
    ],
    "Low pressure": [
      {
        cause: "System leak",
        probability: "High",
        checks: [
          "Check all visible pipework, radiators, and connections",
          "Look under radiators for signs of leaking",
          "Check boiler internal components for leaks"
        ]
      },
      {
        cause: "Recently bled radiators",
        probability: "High",
        checks: [
          "Repressurise system after bleeding radiators",
          "Use filling loop to restore 1-1.5 bar pressure"
        ]
      },
      {
        cause: "Expansion vessel failure",
        probability: "Medium",
        checks: [
          "Check if pressure rises when heating then drops when cool",
          "Expansion vessel may need repressurising or replacement"
        ]
      }
    ],
    "Radiator cold spots": [
      {
        cause: "Air in system",
        probability: "High",
        checks: [
          "Bleed affected radiators",
          "Start from lowest radiator when bleeding system"
        ]
      },
      {
        cause: "Sludge buildup",
        probability: "High",
        checks: [
          "Check if bottom of radiator colder than top",
          "Consider power flush of system",
          "Install magnetic filter if not present"
        ]
      },
      {
        cause: "Incorrect balance",
        probability: "Medium",
        checks: [
          "Adjust lockshield valves to balance flow",
          "Close valves on hot radiators slightly"
        ]
      }
    ]
  },
  
  // Safety warnings for specific scenarios
  safetyWarnings: {
    "Gas smell": {
      priority: "Emergency",
      instructions: [
        "Turn off gas supply at meter",
        "Open windows and doors",
        "Do not use electrical switches or naked flames",
        "Leave the property",
        "Call National Gas Emergency Service immediately on 0800 111 999",
        "Do not return until property declared safe"
      ]
    },
    "Carbon monoxide concerns": {
      priority: "Emergency",
      symptoms: [
        "Headaches", "Dizziness", "Nausea", "Breathlessness", 
        "Collapse", "Loss of consciousness"
      ],
      instructions: [
        "Turn off appliance immediately",
        "Open all windows and doors",
        "Leave the property",
        "Seek medical attention mentioning CO concerns",
        "Call Gas Emergency Service on 0800 111 999",
        "Do not use appliance until checked by Gas Safe engineer"
      ]
    },
    "Water leaking onto electrical": {
      priority: "High",
      instructions: [
        "Turn off electricity at consumer unit if safe to do so",
        "Turn off water supply at main stopcock",
        "Do not touch wet electrical components or switches",
        "Contact qualified electrician before restoring power"
      ]
    }
  },
  
  // Maintenance schedules and best practices
  maintenance: {
    "Annual service": {
      frequency: "Every 12 months",
      importance: "Critical - legal requirement for landlords",
      tasks: [
        "Gas safety checks",
        "Flue gas analysis",
        "Component inspection",
        "Cleaning of key parts",
        "Performance testing"
      ],
      benefits: [
        "Ensures safety",
        "Maintains efficiency",
        "Validates warranty",
        "Prevents breakdowns",
        "Extends boiler life"
      ]
    },
    "System pressure check": {
      frequency: "Monthly",
      importance: "High",
      diy: true,
      instructions: [
        "Check pressure gauge reads 1-1.5 bar when cold",
        "If low, repressurise using filling loop",
        "If repeatedly losing pressure, investigate for leaks"
      ]
    },
    "Radiator bleeding": {
      frequency: "As needed, usually once per heating season",
      importance: "Medium",
      diy: true,
      instructions: [
        "Turn heating off and let radiators cool",
        "Use radiator key to open bleed valve slightly",
        "Close valve when water appears",
        "Check system pressure after bleeding",
        "Top up pressure if needed"
      ]
    }
  }
};

// Helper function to search for fault codes
function findFaultCode(manufacturer, code) {
  // Standardize manufacturer name to match our database
  const manufacturers = {
    "worcester": "Worcester Bosch",
    "worcester bosch": "Worcester Bosch",
    "vaillant": "Vaillant",
    "baxi": "Baxi",
    "ideal": "Ideal",
    "glow worm": "Glow Worm",
    "glowworm": "Glow Worm"
    // Add more manufacturer aliases as needed
  };
  
  const standardManufacturer = manufacturers[manufacturer.toLowerCase()] || manufacturer;
  
  // Check if we have data for this manufacturer
  if (!boilerKnowledge.faultCodes[standardManufacturer]) {
    return null;
  }
  
  // Try exact match first
  if (boilerKnowledge.faultCodes[standardManufacturer][code]) {
    return {
      manufacturer: standardManufacturer,
      code,
      ...boilerKnowledge.faultCodes[standardManufacturer][code]
    };
  }
  
  // Try case-insensitive match with different formats
  const codeWithoutPrefix = code.replace(/^[A-Za-z]\./i, ''); // Remove letter prefix and dot
  
  for (const [storedCode, info] of Object.entries(boilerKnowledge.faultCodes[standardManufacturer])) {
    // Compare without prefix and case-insensitive
    if (storedCode.replace(/^[A-Za-z]\./i, '').toLowerCase() === codeWithoutPrefix.toLowerCase()) {
      return {
        manufacturer: standardManufacturer,
        code: storedCode,
        ...info
      };
    }
  }
  
  return null;
}

// Helper function to get troubleshooting for symptoms
function getSymptomHelp(symptom) {
  return boilerKnowledge.symptoms[symptom] || null;
}

// Helper function to get safety warnings
function getSafetyWarning(concern) {
  return boilerKnowledge.safetyWarnings[concern] || null;
}

// Helper function to get maintenance advice
function getMaintenanceAdvice(type) {
  return boilerKnowledge.maintenance[type] || null;
}

// Export the database and helper functions
export default {
  findFaultCode,
  getSymptomHelp,
  getSafetyWarning,
  getMaintenanceAdvice,
  
  // Add method to get all known manufacturers
  getManufacturers() {
    return Object.keys(boilerKnowledge.faultCodes);
  },
  
  // Add method to get all known symptoms
  getSymptoms() {
    return Object.keys(boilerKnowledge.symptoms);
  }
};
