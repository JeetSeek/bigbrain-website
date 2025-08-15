/**
 * Natural Language Processing utilities for extracting information from user queries
 */

/**
 * Extract boiler information from user query
 * 
 * @param {string} text - User query text
 * @returns {Object} Extracted boiler information or null if none found
 */
export const extractBoilerInfo = (text) => {
  if (!text || typeof text !== 'string') return null;
  
  // Common boiler manufacturers
  const manufacturers = [
    'ideal', 'worcester', 'vaillant', 'baxi', 'glow-worm',
    'ariston', 'potterton', 'viessmann', 'alpha', 'ferroli'
  ];
  
  // Extract manufacturer
  const manufacturerPattern = new RegExp(`\\b(${manufacturers.join('|')})\\b`, 'i');
  const manufacturerMatch = text.match(manufacturerPattern);
  
  // Extract model number patterns (common formats)
  const modelPatterns = [
    /\b([A-Z]\d{1,3}[A-Z]?)\b/i, // E.g., C28, F30E
    /\b(\d{1,2}[A-Z]{1,2}\d{1,2})\b/i, // E.g., 24CDI, 30HE
    /\bcombi\s+(\d{1,2})\b/i, // E.g., Combi 25
    /\b(\w+)\s+(compact|combi|system|regular|heat|boiler)\b/i, // E.g., Logic Combi
  ];
  
  let modelMatch = null;
  for (const pattern of modelPatterns) {
    const match = text.match(pattern);
    if (match) {
      modelMatch = match;
      break;
    }
  }
  
  // If we found any information, return it
  if (manufacturerMatch || modelMatch) {
    return {
      manufacturer: manufacturerMatch ? manufacturerMatch[1].toLowerCase() : null,
      model: modelMatch ? modelMatch[1] : null
    };
  }
  
  return null;
};

/**
 * Extract boiler components from user query
 * 
 * @param {string} text - User query text
 * @returns {Array} Array of extracted component names or empty array if none found
 */
export const extractBoilerComponents = (text) => {
  if (!text || typeof text !== 'string') return [];
  
  // Common boiler components
  const components = [
    'pcb', 'pump', 'fan', 'gas valve', 'diverter valve', 'pressure sensor',
    'flow sensor', 'flame sensor', 'ignition electrode', 'heat exchanger',
    'expansion vessel', 'pressure relief valve', 'thermistor', 'temperature sensor',
    'overheat thermostat', 'flue', 'condense trap', 'burner', 'spark generator',
    'circuit board', 'pressure gauge', 'filling loop', 'bypass valve',
    'auto air vent', 'primary heat exchanger', 'secondary heat exchanger'
  ];
  
  // Look for components in text
  const foundComponents = components.filter(component => 
    text.toLowerCase().includes(component.toLowerCase())
  );
  
  return foundComponents;
};

/**
 * Extract boiler symptoms from user query
 * 
 * @param {string} text - User query text
 * @returns {Array} Array of extracted symptom descriptions or empty array if none found
 */
export const extractBoilerSymptoms = (text) => {
  if (!text || typeof text !== 'string') return [];
  
  // Common boiler symptom phrases
  const symptomPhrases = [
    'no hot water', 'no heating', 'low pressure', 'high pressure',
    'leaking', 'noise', 'banging', 'kettling', 'pilot light', 'keeps going off',
    'error code', 'fault code', 'lockout', 'won\'t turn on', 'won\'t turn off',
    'no power', 'display', 'blank', 'pressure dropping', 'losing pressure',
    'radiators cold', 'radiator not heating', 'thermostat', 'temperature',
    'overheating', 'too hot', 'not hot enough', 'intermittent', 'reset',
    'keeps failing', 'keeps shutting down', 'pilot light', 'flame'
  ];
  
  // Look for symptom phrases in text
  const foundSymptoms = symptomPhrases.filter(symptom => 
    text.toLowerCase().includes(symptom.toLowerCase())
  );
  
  return foundSymptoms;
};

export default {
  extractBoilerInfo,
  extractBoilerComponents,
  extractBoilerSymptoms
};
