/**
 * Server-side Constants
 * Centralized configuration values for the BoilerBrain backend
 */

// Server configuration
export const SERVER = {
  PORT: process.env.PORT || 3204,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
};

// AI service configuration
export const AI = {
  // Conversation settings
  CONVERSATION_SUMMARY_LENGTH: 12, // Summarize after this many turns
  MAX_TOKENS: 800, // Maximum tokens for AI response (increased for web search enhanced responses)
  
  // OpenAI settings
  OPENAI_MODELS: {
    CHAT: process.env.OPENAI_MODEL || 'gpt-4o-mini', // Use environment variable or default to gpt-4o-mini
    EMBEDDINGS: 'text-embedding-ada-002',
  },
  
  // DeepSeek settings
  DEEPSEEK_MODELS: {
    CHAT: 'deepseek-chat',
    SUMMARY: 'deepseek-chat',
  },
  SUMMARY_TEMPERATURE: 0.3,
  SUMMARY_MAX_TOKENS: 150,
  CHAT_TEMPERATURE: 0.4,
};

// Vector search configuration
export const VECTOR_SEARCH = {
  SIMILARITY_THRESHOLD: 0.75, // Minimum similarity score for vector matches
  MAX_KNOWLEDGE_SNIPPETS: 5, // Maximum knowledge snippets to inject
};

// Regular expressions for information extraction
export const PATTERNS = {
  MANUFACTURER: /\b(worcester|bosch|vaillant|baxi|ideal|glow\s*worm|potterton|viessmann|ariston|navien|alpha|ferroli)\b/gi,
  MODEL: /\b([a-z][0-9]{1,3}|[a-z0-9]+-[a-z0-9]+|ecomax|ecotec|logic|vogue|combi|system|greenstar|i\d+|cdi|si|ri)\b/gi,
  FAULT_CODES: [
    /\b([a-z][0-9]{1,2}|[a-z]\.?[0-9]{1,2})\b/gi,
    /fault(?:\s+code)?\s+([a-z0-9][a-z0-9\.\-]{1,6})/gi,
    /error(?:\s+code)?\s+([a-z0-9][a-z0-9\.\-]{1,6})/gi
  ],
  SAFETY_CONCERNS: [
    /\b(gas smell|smell gas|carbon monoxide|co alarm|co detector|headache|dizzy|alarm beeping)\b/i
  ],
  // Heating system type identification patterns
  HEATING_SYSTEM_TYPES: {
    COMBI: /\b(combi|combination|instant hot water|no cylinder|no tank)\b/i,
    SYSTEM: /\b(system boiler|pressurised system|unvented cylinder|sealed system)\b/i,
    HEAT_ONLY: /\b(heat[\s-]*only|conventional|regular|traditional|vented cylinder|header tank|feed and expansion|f&e tank|cold water tank)\b/i,
    BACK_BOILER: /\b(back boiler|behind fireplace)\b/i
  },
  // Water and heating components
  SYSTEM_COMPONENTS: {
    CYLINDER: /\b(cylinder|hot water tank|immersion heater)\b/i,
    PUMP: /\b(pump|circulator)\b/i,
    DIVERTER_VALVE: /\b(diverter|3[\s-]*way valve|three[\s-]*way valve)\b/i,
    PLATE_HEAT_EXCHANGER: /\b(plate heat exchanger|PHE)\b/i,
    EXPANSION_VESSEL: /\b(expansion vessel|expansion tank)\b/i
  }
};

// Function call definitions for AI function calling
export const FUNCTION_DECLARATIONS = [
  {
    name: "getFaultCodeInfo",
    description: "Get information about a specific fault code for a particular boiler manufacturer",
    parameters: {
      type: "object",
      properties: {
        manufacturer: {
          type: "string",
          description: "The boiler manufacturer (e.g., Worcester, Vaillant, Baxi)"
        },
        faultCode: {
          type: "string",
          description: "The fault code to look up (e.g., EA, F.22, E133)"
        }
      },
      required: ["manufacturer", "faultCode"]
    }
  },
  {
    name: "getSymptomInfo",
    description: "Get information about a specific boiler symptom",
    parameters: {
      type: "object",
      properties: {
        symptom: {
          type: "string",
          description: "The symptom to look up information for",
          enum: ["No heating", "No hot water", "Boiler noise", "Leaking boiler", "Low pressure", "Radiator cold spots"]
        }
      },
      required: ["symptom"]
    }
  },
  {
    name: "getHeatingSystemTypeInfo",
    description: "Get detailed information about a specific type of heating system to help with diagnostics",
    parameters: {
      type: "object",
      properties: {
        systemType: {
          type: "string",
          description: "The type of heating system",
          enum: ["combi", "system", "heat-only", "back boiler"]
        }
      },
      required: ["systemType"]
    }
  },
  {
    name: "getSafetyInformation",
    description: "Get safety information for a specific concern",
    parameters: {
      type: "object",
      properties: {
        concern: {
          type: "string",
          description: "The safety concern to get information about",
          enum: ["Gas smell", "Carbon monoxide concerns"]
        }
      },
      required: ["concern"]
    }
  }
];

export default {
  SERVER,
  AI,
  VECTOR_SEARCH,
  PATTERNS,
  FUNCTION_DECLARATIONS
};
