/**
 * Utility functions for working with boiler fault codes
 */

/**
 * Extract fault codes from user query
 * 
 * @param {string} text - User query text
 * @returns {Array} Array of extracted fault codes or empty array if none found
 */
export const extractFaultCodes = (text) => {
  if (!text || typeof text !== 'string') return [];
  
  // Look for common fault code patterns
  // Examples: F1, E01, EA, H20, 0A, etc.
  const faultCodePatterns = [
    /\b([A-Z]\d{1,2})\b/i,             // E.g., F1, E01, H20
    /\b(\d{1,2}[A-Z])\b/i,             // E.g., 0A, 5F
    /fault\s+code\s+([A-Za-z0-9]{1,3})/i,  // E.g., "fault code F1"
    /error\s+code\s+([A-Za-z0-9]{1,3})/i,  // E.g., "error code E01"
    /code\s+([A-Za-z0-9]{1,3})/i       // E.g., "code H20"
  ];
  
  const foundCodes = [];
  
  // Check each pattern
  for (const pattern of faultCodePatterns) {
    const matches = [...text.matchAll(new RegExp(pattern, 'gi'))];
    matches.forEach(match => {
      if (match[1]) {
        // Standardize format to uppercase
        foundCodes.push(match[1].toUpperCase());
      }
    });
  }
  
  // Remove duplicates
  return [...new Set(foundCodes)];
};

/**
 * Find a fault code in a database
 * 
 * @param {string} code - Fault code to look up
 * @param {Array} database - Database of fault codes
 * @returns {Object|null} Fault code object if found, null otherwise
 */
export const findFaultCode = (code, database) => {
  if (!code || !database || !Array.isArray(database)) return null;
  
  // Normalize code for comparison
  const normalizedCode = code.toUpperCase();
  
  // Look for exact match
  const exactMatch = database.find(item => 
    item.fault_code && item.fault_code.toUpperCase() === normalizedCode
  );
  
  if (exactMatch) return exactMatch;
  
  // Look for range match (e.g., "H1-H9" should match "H3")
  const rangeMatches = database.filter(item => {
    if (!item.fault_code) return false;
    
    // Check if this is a range fault code (e.g., "H1 - H9")
    const rangeMatch = item.fault_code.match(/([A-Z])(\d+)\s*-\s*([A-Z])(\d+)/i);
    if (!rangeMatch) return false;
    
    // Ensure the letter prefix matches
    if (normalizedCode[0] !== rangeMatch[1].toUpperCase()) return false;
    
    // Extract the number part of the code
    const codeNumber = parseInt(normalizedCode.substring(1), 10);
    if (isNaN(codeNumber)) return false;
    
    // Check if number is in range
    const rangeStart = parseInt(rangeMatch[2], 10);
    const rangeEnd = parseInt(rangeMatch[4], 10);
    
    return codeNumber >= rangeStart && codeNumber <= rangeEnd;
  });
  
  if (rangeMatches.length > 0) return rangeMatches[0];
  
  // No matches found
  return null;
};

/**
 * Group fault codes by manufacturer
 * 
 * @param {Array} faultCodes - Array of fault code objects
 * @returns {Object} Fault codes grouped by manufacturer
 */
export const groupFaultCodesByManufacturer = (faultCodes) => {
  if (!faultCodes || !Array.isArray(faultCodes)) return {};
  
  return faultCodes.reduce((grouped, code) => {
    const manufacturer = code.manufacturer || 'unknown';
    
    if (!grouped[manufacturer]) {
      grouped[manufacturer] = [];
    }
    
    grouped[manufacturer].push(code);
    return grouped;
  }, {});
};

/**
 * Get standard solutions for common fault types
 * 
 * @param {string} faultType - Type of fault
 * @returns {Array} Array of standard solutions
 */
export const getStandardSolutions = (faultType) => {
  const solutionsByType = {
    'low pressure': [
      'Check system pressure (should be 1-1.5 bar)',
      'Repressurise system using filling loop',
      'Check for leaks in the system'
    ],
    'ignition failure': [
      'Check gas supply',
      'Check ignition electrode and lead',
      'Reset boiler',
      'If problem persists, call a professional'
    ],
    'overheat': [
      'Check pump operation',
      'Ensure radiators are bled properly',
      'Check for blockages in the heating system',
      'Reset boiler'
    ],
    'flame loss': [
      'Check gas supply',
      'Ensure there are no blockages in the flue',
      'Reset boiler'
    ],
    'sensor fault': [
      'Check sensor connections',
      'Reset boiler',
      'If problem persists, call a professional'
    ],
    'fan fault': [
      'Check fan connections',
      'Check for blockages in the flue',
      'Reset boiler'
    ],
    'pcb fault': [
      'Reset boiler',
      'Switch power off for 30 seconds, then back on',
      'If problem persists, call a professional'
    ]
  };
  
  return solutionsByType[faultType.toLowerCase()] || [
    'Reset the boiler if possible',
    'If the issue persists, contact a Gas Safe registered engineer'
  ];
};

export default {
  extractFaultCodes,
  findFaultCode,
  groupFaultCodesByManufacturer,
  getStandardSolutions
};
