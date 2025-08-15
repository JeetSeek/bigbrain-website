/**
 * Gas Rate Calculator Utility Functions
 * Contains all the core calculation logic for gas rate measurements
 */

/**
 * Constants for calculation
 */
export const CONSTANTS = {
  // Conversion factors
  CUBIC_FEET_TO_CUBIC_METERS: 35.315, // 1 cubic meter = 35.315 cubic feet
  KW_TO_BTU_PER_HOUR: 3412, // 1 kW = 3412 BTU/h
  SECONDS_PER_HOUR: 3600,
  
  // Efficiency factors
  NET_EFFICIENCY: 0.9, // Net kW is ~90% of gross kW due to latent heat losses
  
  // Default calorific values (kWh/m³)
  DEFAULT_CV: {
    NATURAL_GAS: 10.91,
    LPG: 25.71
  }
};

/**
 * Calculate gas rate from metric meter readings
 * 
 * @param {number} initialReading - Initial meter reading in cubic meters
 * @param {number} finalReading - Final meter reading in cubic meters
 * @param {number} durationSeconds - Test duration in seconds
 * @param {number} calorificValue - Gas calorific value in kWh/m³
 * @returns {Object} Calculation results or null if inputs are invalid
 */
export const calculateMetricRate = (initialReading, finalReading, durationSeconds, calorificValue) => {
  // Validate inputs
  if (
    typeof initialReading !== 'number' || 
    typeof finalReading !== 'number' || 
    typeof durationSeconds !== 'number' ||
    typeof calorificValue !== 'number' ||
    isNaN(initialReading) ||
    isNaN(finalReading) ||
    isNaN(durationSeconds) ||
    isNaN(calorificValue) ||
    durationSeconds === 0
  ) {
    return null;
  }
  
  // Calculate cubic meters per hour
  // m³/h = (final_reading − initial_reading) × 3600 / seconds
  const cubicMetersPerHour = ((finalReading - initialReading) * 
    CONSTANTS.SECONDS_PER_HOUR) / durationSeconds;
  
  return calculateFromCubicMetersPerHour(cubicMetersPerHour, calorificValue);
};

/**
 * Calculate gas rate from imperial dial readings
 * 
 * @param {number} dialRevs - Number of dial revolutions
 * @param {number} dialValue - Value of each dial revolution in cubic feet
 * @param {number} durationSeconds - Test duration in seconds
 * @param {number} calorificValue - Gas calorific value in kWh/m³
 * @returns {Object} Calculation results or null if inputs are invalid
 */
export const calculateImperialRate = (dialRevs, dialValue, durationSeconds, calorificValue) => {
  // Validate inputs
  if (
    typeof dialRevs !== 'number' || 
    typeof dialValue !== 'number' || 
    typeof durationSeconds !== 'number' ||
    typeof calorificValue !== 'number' ||
    isNaN(dialRevs) ||
    isNaN(dialValue) ||
    isNaN(durationSeconds) ||
    isNaN(calorificValue) ||
    durationSeconds === 0
  ) {
    return null;
  }
  
  // Convert cubic feet to cubic meters
  const cubicFeet = dialRevs * dialValue;
  const cubicMeters = cubicFeet / CONSTANTS.CUBIC_FEET_TO_CUBIC_METERS;
  
  // Calculate cubic meters per hour
  // m³/h = cubic meters × 3600 / seconds
  const cubicMetersPerHour = (cubicMeters * CONSTANTS.SECONDS_PER_HOUR) / durationSeconds;
  
  return calculateFromCubicMetersPerHour(cubicMetersPerHour, calorificValue);
};

/**
 * Calculate heat input values from cubic meters per hour
 * 
 * @param {number} cubicMetersPerHour - Gas flow rate in cubic meters per hour
 * @param {number} calorificValue - Gas calorific value in kWh/m³
 * @returns {Object} Calculation results with formatted values
 */
export const calculateFromCubicMetersPerHour = (cubicMetersPerHour, calorificValue) => {
  // Gross kW = m³/h × CV
  const grossKW = cubicMetersPerHour * calorificValue;
  
  // Net kW = Gross kW × 0.9
  const netKW = grossKW * CONSTANTS.NET_EFFICIENCY;
  
  // BTU/h = Gross kW × 3412
  const btuPerHour = grossKW * CONSTANTS.KW_TO_BTU_PER_HOUR;
  
  return {
    cubicMetersPerHour: formatNumber(cubicMetersPerHour, 2),
    grossKW: formatNumber(grossKW, 2),
    netKW: formatNumber(netKW, 2),
    btuPerHour: Math.round(btuPerHour).toString()
  };
};

/**
 * Format a number to a specific number of decimal places
 * 
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number as string
 */
export const formatNumber = (value, decimals = 2) => {
  return value.toFixed(decimals);
};

export default {
  CONSTANTS,
  calculateMetricRate,
  calculateImperialRate,
  calculateFromCubicMetersPerHour,
  formatNumber
};
