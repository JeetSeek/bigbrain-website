/**
 * Boiler Knowledge Data Exporter
 * 
 * This module re-exports the raw boiler knowledge data
 * for use in embedding scripts.
 */

// Get the raw boiler knowledge data
// This is directly accessing the constant from boilerKnowledgeService.js
// Note: This approach is intended for script use only, not in the main app

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
      }
    },
    "Vaillant": {
      "F.22": {
        description: "Water pressure low",
        causes: ["System leaks", "Recent bleeding", "Expansion vessel issue"],
        troubleshooting: [
          "Top up system pressure to 1-1.5 bar",
          "Check for visible leaks",
          "Check expansion vessel pressure (should be 0.8-1 bar)",
          "If problem persists, call engineer"
        ],
        safety: "Low - Mainly affects performance"
      },
      "F.28": {
        description: "Ignition failure",
        causes: ["Gas supply issue", "Ignition electrode fault", "Gas valve problem"],
        troubleshooting: [
          "Check gas supply is on",
          "Hold reset button for 10 seconds",
          "If problem persists, call engineer"
        ],
        safety: "Medium - May indicate gas supply issues"
      }
    }
  },
  
  // Common symptoms and possible causes
  symptoms: {
    "No heating": [
      {
        cause: "Thermostat issues",
        probability: "High",
        checks: ["Check thermostat settings", "Replace batteries", "Check wiring"],
        repair: ["Adjust settings", "Replace thermostat"]
      },
      {
        cause: "Air in system",
        probability: "Medium",
        checks: ["Check system pressure", "Feel radiators for cold spots"],
        repair: ["Bleed radiators", "Top up system pressure"]
      },
      {
        cause: "Pump failure",
        probability: "Medium",
        checks: ["Listen for pump noise", "Feel pump for vibration"],
        repair: ["Replace pump", "Clean pump"]
      }
    ],
    "No hot water": [
      {
        cause: "Diverter valve failure",
        probability: "High",
        checks: ["Check if heating works but hot water doesn't"],
        repair: ["Replace diverter valve", "Clean diverter valve"]
      },
      {
        cause: "Thermal cut-out tripped",
        probability: "Medium",
        checks: ["Check reset button", "Look for error codes"],
        repair: ["Reset cut-out", "Check for underlying issues"]
      }
    ]
  },
  
  // Safety warnings for specific scenarios
  safetyWarnings: {
    "Gas smell": {
      severity: "High",
      immediateActions: [
        "Open windows and doors",
        "Don't use electrical switches or naked flames",
        "Turn off gas at the meter if possible",
        "Call emergency gas number"
      ],
      additionalGuidance: "Leave the property and call from outside if smell is strong"
    },
    "Carbon monoxide symptoms": {
      severity: "Critical",
      immediateActions: [
        "Open windows and doors",
        "Turn off the boiler",
        "Move to fresh air",
        "Seek medical attention",
        "Call emergency services"
      ],
      additionalGuidance: "Symptoms include headache, dizziness, nausea, fatigue, confusion, and shortness of breath"
    }
  }
};

export default boilerKnowledge;
