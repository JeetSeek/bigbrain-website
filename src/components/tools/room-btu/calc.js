/**
 * Room BTU Calculator utility functions
 * Provides calculation logic for determining BTU requirements for room heating
 */

/**
 * Climate zone adjustment factors
 * Represents how climate affects BTU requirements
 */
export const CLIMATE_ZONES = {
  SUBARCTIC: { name: "Subarctic", factor: 1.5, description: "Very extreme cold (below -20°F/-29°C)" },
  VERY_COLD: { name: "Very Cold", factor: 1.3, description: "Regularly below 0°F/-18°C" },
  COLD: { name: "Cold", factor: 1.1, description: "Winters typically below freezing" },
  COOL: { name: "Cool", factor: 1.0, description: "Mild winters, occasional freezing" },
  WARM: { name: "Warm", factor: 0.9, description: "Minimal heating requirements" }
};

/**
 * Insulation quality adjustment factors
 */
export const INSULATION_QUALITY = {
  POOR: { name: "Poor", factor: 1.5, description: "Old building, minimal insulation" },
  AVERAGE: { name: "Average", factor: 1.2, description: "Standard insulation for age" },
  GOOD: { name: "Good", factor: 1.0, description: "Modern insulation standards" },
  EXCELLENT: { name: "Excellent", factor: 0.8, description: "High-performance insulation" }
};

/**
 * Window type adjustment factors
 */
export const WINDOW_TYPES = {
  SINGLE: { name: "Single Glazed", factor: 1.5, description: "Single pane glass" },
  DOUBLE: { name: "Double Glazed", factor: 1.0, description: "Standard double glazing" },
  TRIPLE: { name: "Triple Glazed", factor: 0.7, description: "High-efficiency triple glazing" }
};

/**
 * Room usage adjustment factors
 * Different room types have different heating requirements
 */
export const ROOM_USAGE = {
  LIVING: { name: "Living Room", factor: 1.0, description: "Standard living space" },
  BEDROOM: { name: "Bedroom", factor: 0.9, description: "Typically lower temperature" },
  KITCHEN: { name: "Kitchen", factor: 0.8, description: "Additional heat from appliances" },
  BATHROOM: { name: "Bathroom", factor: 1.1, description: "Higher temperature requirement" },
  OFFICE: { name: "Office/Study", factor: 1.0, description: "Standard working environment" }
};

/**
 * Floor type adjustment factors
 */
export const FLOOR_TYPES = {
  CONCRETE: { name: "Concrete Slab", factor: 1.2, description: "Direct contact with ground" },
  UNHEATED: { name: "Over Unheated Space", factor: 1.1, description: "Over garage or basement" },
  HEATED: { name: "Over Heated Space", factor: 0.9, description: "Over another heated room" }
};

/**
 * Calculate base BTU requirements for a room based on volume
 * 
 * @param {number} length - Room length in feet
 * @param {number} width - Room width in feet
 * @param {number} height - Room ceiling height in feet
 * @returns {number} Base BTU requirement
 */
export const calculateBaseBtu = (length, width, height) => {
  // Standard calculation: 20 BTU per cubic foot as base value
  const volumeInCubicFeet = length * width * height;
  const baseBtu = volumeInCubicFeet * 20;
  return baseBtu;
};

/**
 * Apply adjustment factors to base BTU calculation
 * 
 * @param {Object} params - Parameters for BTU calculation
 * @returns {Object} Detailed BTU calculation with factors and final result
 */
export const calculateRoomBtu = ({
  length,
  width,
  height,
  exteriorWalls,
  windowCount,
  windowType,
  windowArea,
  exteriorDoors,
  patioDoors,
  roomOrientation,
  floorType,
  wallInsulation,
  ceilingInsulation,
  roomUsage,
  // Climate zone and occupants removed from UI but defaults provided here
}) => {
  // Default values for removed UI elements
  const climateZone = 'COLD'; // Default to COLD climate
  const occupants = 2; // Default to 2 occupants

  // Calculate base BTU requirement
  const roomVolume = length * width * height;
  const baseBtu = calculateBaseBtu(length, width, height);
  
  // Base factors
  const insulationFactor = INSULATION_QUALITY[wallInsulation].factor;
  const windowTypeFactor = WINDOW_TYPES[windowType].factor;
  const climateFactor = CLIMATE_ZONES[climateZone].factor;
  const usageFactor = ROOM_USAGE[roomUsage].factor;
  const floorFactor = FLOOR_TYPES[floorType].factor;
  
  // Calculate exterior wall adjustment
  const totalWallCount = 4; // Assuming rectangular room
  const exteriorWallFactor = 1 + (0.1 * exteriorWalls);
  
  // Window and door adjustments
  // Each window adds 1000 BTU/hr heat loss on average, adjusted by window type
  const windowAdjustment = windowCount * windowArea * 15 * windowTypeFactor;
  
  // Each exterior door adds about 1000 BTU/hr heat loss
  const doorAdjustment = exteriorDoors * 1000;
  
  // Patio doors add about 1500 BTU/hr heat loss per door
  const patioDoorAdjustment = patioDoors * 1500;
  
  // Occupant adjustment: each person adds body heat (negative BTU requirement)
  // We use the default occupants value (2) since this field was removed from UI
  const occupantAdjustment = occupants * -400;
  
  // Room orientation adjustment
  let orientationFactor = 1.0;
  if (roomOrientation === 'NORTH') {
    orientationFactor = 1.1; // North-facing rooms are cooler
  } else if (roomOrientation === 'SOUTH') {
    orientationFactor = 0.9; // South-facing rooms get more solar gain
  }
  
  // Calculate total BTU requirement
  const adjustedBtu = baseBtu * insulationFactor * climateFactor * usageFactor * exteriorWallFactor * floorFactor * orientationFactor;
  
  // Add/subtract the specific adjustments
  const totalBtu = adjustedBtu + windowAdjustment + doorAdjustment + patioDoorAdjustment + occupantAdjustment;
  
  // Round to nearest 1000 BTU (common practice for heating appliances)
  const roundedBtu = Math.round(totalBtu / 1000) * 1000;
  
  // Create a detailed breakdown for educational purposes
  const breakdown = {
    roomVolume: roomVolume,
    baseBtu: Math.round(baseBtu),
    insulationAdjustment: Math.round(baseBtu * (insulationFactor - 1)),
    climateAdjustment: Math.round(baseBtu * insulationFactor * (climateFactor - 1)),
    exteriorWallsAdjustment: Math.round(baseBtu * insulationFactor * climateFactor * (exteriorWallFactor - 1)),
    floorAdjustment: Math.round(baseBtu * insulationFactor * climateFactor * exteriorWallFactor * (floorFactor - 1)),
    usageAdjustment: Math.round(baseBtu * insulationFactor * climateFactor * exteriorWallFactor * floorFactor * (usageFactor - 1)),
    orientationAdjustment: Math.round(baseBtu * insulationFactor * climateFactor * exteriorWallFactor * floorFactor * usageFactor * (orientationFactor - 1)),
    windowAdjustment: Math.round(windowAdjustment),
    doorAdjustment: Math.round(doorAdjustment),
    patioDoorAdjustment: Math.round(patioDoorAdjustment),
    occupantAdjustment: Math.round(occupantAdjustment),
    totalBtu: Math.round(totalBtu),
    roundedBtu: roundedBtu,
    kilowatts: Math.round(roundedBtu / 3412 * 100) / 100, // Convert BTU to kW for reference
  };
  
  return {
    btu: roundedBtu,
    kilowatts: Math.round(roundedBtu / 3412 * 100) / 100,
    breakdown: breakdown
  };
};

/**
 * Format numbers for display
 * @param {number} num - Number to format
 * @returns {string} Formatted number with commas
 */
export const formatNumber = (num) => {
  if (typeof num !== 'number') return '0';
  return num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

/**
 * Calculate recommended radiator size for standard wet systems (e.g., Stelrad)
 * Based on BTU requirement and standard radiator heights
 * Ensures recommendations always meet or exceed the required BTU
 * 
 * @param {number} btu - BTU requirement
 * @returns {Object} Recommended radiator configuration
 */
export const calculateRadiatorSize = (btu) => {
  // Standard radiator output rates per type (BTU/hr)
  // Based on common 600mm high radiator output at delta T of 50°C
  const outputRates = {
    // Width in mm: BTU output
    400: 1500,
    600: 2300,
    800: 3050,
    1000: 3800,
    1200: 4600,
    1400: 5300,
    1600: 6100,
    1800: 6850,
    2000: 7600
  };
  
  // Height adjustment factors (multiply by these to get output for different heights)
  const heightFactors = {
    300: 0.55, // 300mm high radiator outputs ~55% of 600mm equivalent
    400: 0.7,  // 400mm high radiator outputs ~70% of 600mm equivalent
    500: 0.85, // 500mm high radiator outputs ~85% of 600mm equivalent
    600: 1.0,  // Base reference
    700: 1.15, // 700mm high radiator outputs ~115% of 600mm equivalent
    900: 1.4   // 900mm high radiator outputs ~140% of 600mm equivalent
  };
  
  // Calculate radiator configuration
  let recommendations = [];
  
  // First try standard 600mm height (most common)
  const standardHeight = 600;
  let remainingBtu = btu;
  let standardHeightRads = [];
  
  // Choose largest possible radiators first to minimize number of units
  const availableWidths = Object.keys(outputRates).map(Number).sort((a, b) => b - a);
  
  for (const width of availableWidths) {
    const outputPerRad = outputRates[width];
    const numRads = Math.floor(remainingBtu / outputPerRad);
    
    if (numRads > 0) {
      standardHeightRads.push({
        height: standardHeight,
        width: width,
        quantity: numRads,
        btuEach: outputPerRad,
        btuTotal: outputPerRad * numRads
      });
      
      remainingBtu -= (outputPerRad * numRads);
    }
  }
  
  // If we still have significant remaining BTU, add one more radiator
  if (remainingBtu > 0) {
    // Find the smallest radiator that can handle remaining BTU
    let radiatorAdded = false;
    
    for (const width of [...availableWidths].sort((a, b) => a - b)) {
      if (outputRates[width] >= remainingBtu) {
        standardHeightRads.push({
          height: standardHeight,
          width: width,
          quantity: 1,
          btuEach: outputRates[width],
          btuTotal: outputRates[width]
        });
        remainingBtu = 0;
        radiatorAdded = true;
        break;
      }
    }
    
    // If no single radiator can handle it, add the largest available
    if (!radiatorAdded) {
      const largestWidth = availableWidths[0];
      standardHeightRads.push({
        height: standardHeight,
        width: largestWidth,
        quantity: 1,
        btuEach: outputRates[largestWidth],
        btuTotal: outputRates[largestWidth]
      });
      remainingBtu -= outputRates[largestWidth];
      
      // If we still don't meet the BTU requirement, add another radiator
      if (remainingBtu > 0) {
        standardHeightRads.push({
          height: standardHeight,
          width: largestWidth,
          quantity: 1,
          btuEach: outputRates[largestWidth],
          btuTotal: outputRates[largestWidth]
        });
        remainingBtu -= outputRates[largestWidth];
        
        // Continue adding radiators until we meet or exceed the requirement
        while (remainingBtu > 0) {
          standardHeightRads.push({
            height: standardHeight,
            width: largestWidth,
            quantity: 1,
            btuEach: outputRates[largestWidth],
            btuTotal: outputRates[largestWidth]
          });
          remainingBtu -= outputRates[largestWidth];
        }
      }
    }
  }
  
  const standardTotalBtu = standardHeightRads.reduce((sum, rad) => sum + rad.btuTotal, 0);
  
  recommendations.push({
    title: "Standard Height Radiators (600mm)",
    radiators: standardHeightRads,
    totalBtu: standardTotalBtu
  });
  
  // If BTU requirement is very high (over 15000), also suggest taller radiators
  if (btu > 15000) {
    const tallerHeight = 700; // Suggest taller radiators for high BTU rooms
    const heightFactor = heightFactors[tallerHeight];
    let tallerHeightRads = [];
    let remainingBtuTaller = btu;
    
    for (const width of availableWidths) {
      const adjustedOutput = Math.round(outputRates[width] * heightFactor);
      const numRads = Math.floor(remainingBtuTaller / adjustedOutput);
      
      if (numRads > 0) {
        tallerHeightRads.push({
          height: tallerHeight,
          width: width,
          quantity: numRads,
          btuEach: adjustedOutput,
          btuTotal: adjustedOutput * numRads
        });
        
        remainingBtuTaller -= (adjustedOutput * numRads);
      }
    }
    
    // Add one more if needed to meet or exceed the requirement
    if (remainingBtuTaller > 0) {
      let radiatorAdded = false;
      
      for (const width of [...availableWidths].sort((a, b) => a - b)) {
        const adjustedOutput = Math.round(outputRates[width] * heightFactor);
        if (adjustedOutput >= remainingBtuTaller) {
          tallerHeightRads.push({
            height: tallerHeight,
            width: width,
            quantity: 1,
            btuEach: adjustedOutput,
            btuTotal: adjustedOutput
          });
          radiatorAdded = true;
          break;
        }
      }
      
      // If no single radiator can meet the requirement, add largest available
      if (!radiatorAdded) {
        const largestWidth = availableWidths[0];
        const largestOutput = Math.round(outputRates[largestWidth] * heightFactor);
        
        // Add as many as needed to meet or exceed the BTU requirement
        while (remainingBtuTaller > 0) {
          tallerHeightRads.push({
            height: tallerHeight,
            width: largestWidth,
            quantity: 1,
            btuEach: largestOutput,
            btuTotal: largestOutput
          });
          remainingBtuTaller -= largestOutput;
        }
      }
    }
    
    const tallerTotalBtu = tallerHeightRads.reduce((sum, rad) => sum + rad.btuTotal, 0);
    
    // Only add this recommendation if it meets or exceeds the BTU requirement
    if (tallerTotalBtu >= btu) {
      recommendations.push({
        title: `Taller Radiators (${tallerHeight}mm)`,
        radiators: tallerHeightRads,
        totalBtu: tallerTotalBtu
      });
    }
  }
  
  // We no longer suggest smaller radiators as per requirement to always meet BTU needs
  // The standard or taller radiators will always be recommended to meet or exceed BTU requirements
  
  return {
    recommendations,
    totalBtuRequired: btu
  };
};
