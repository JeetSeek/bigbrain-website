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
 * Room usage BTU factors per cubic metre (UK Standard)
 * Based on typical UK room temperatures:
 * - Living Room: 21°C (70°F)
 * - Bathroom: 22°C (72°F) 
 * - Kitchen: 18°C (64°F)
 * - Bedroom: 16-18°C (61-64°F)
 * - Hallway: 15-18°C (59-64°F)
 * 
 * Factors derived from Viessmann UK, CIBSE, and industry calculators
 */
export const ROOM_USAGE = {
  LIVING: { name: "Living Room", btuPerM3: 135, btuPerFt3: 3.82, description: "21°C target temperature" },
  BEDROOM: { name: "Bedroom", btuPerM3: 108, btuPerFt3: 3.06, description: "16-18°C for comfortable sleep" },
  KITCHEN: { name: "Kitchen", btuPerM3: 100, btuPerFt3: 2.83, description: "18°C - heat from appliances" },
  BATHROOM: { name: "Bathroom", btuPerM3: 153, btuPerFt3: 4.33, description: "22°C - highest temperature" },
  OFFICE: { name: "Office/Study", btuPerM3: 120, btuPerFt3: 3.40, description: "20°C working environment" }
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
 * Calculate base BTU requirements for a room based on volume and room type
 * Uses UK standard BTU per cubic foot/metre values
 * 
 * @param {number} length - Room length (in feet for imperial, metres for metric)
 * @param {number} width - Room width
 * @param {number} height - Room ceiling height
 * @param {string} roomUsage - Room type (LIVING, BEDROOM, KITCHEN, BATHROOM, OFFICE)
 * @param {string} unit - 'imperial' (feet) or 'metric' (metres)
 * @returns {number} Base BTU requirement
 */
export const calculateBaseBtu = (length, width, height, roomUsage = 'LIVING', unit = 'imperial') => {
  const roomConfig = ROOM_USAGE[roomUsage] || ROOM_USAGE.LIVING;
  const volume = length * width * height;
  
  if (unit === 'metric') {
    // Volume in cubic metres × BTU per m³
    return volume * roomConfig.btuPerM3;
  } else {
    // Volume in cubic feet × BTU per ft³
    return volume * roomConfig.btuPerFt3;
  }
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
  unit = 'imperial', // Add unit parameter for correct calculation
  // Climate zone and occupants removed from UI but defaults provided here
}) => {
  // Default values for removed UI elements
  const climateZone = 'COLD'; // Default to COLD climate (UK)
  const occupants = 2; // Default to 2 occupants

  // Calculate room volume
  const roomVolume = length * width * height;
  
  // Calculate base BTU using UK standard room-type-specific factors
  const baseBtu = calculateBaseBtu(length, width, height, roomUsage, unit);
  
  // Adjustment factors
  const insulationFactor = INSULATION_QUALITY[wallInsulation]?.factor || 1.0;
  const windowTypeFactor = WINDOW_TYPES[windowType]?.factor || 1.0;
  const climateFactor = CLIMATE_ZONES[climateZone]?.factor || 1.0;
  const floorFactor = FLOOR_TYPES[floorType]?.factor || 1.0;
  
  // Calculate exterior wall adjustment (10% increase per external wall)
  const exteriorWallFactor = 1 + (0.1 * (parseInt(exteriorWalls) || 1));
  
  // Window heat loss adjustments
  // UK standard: ~100 BTU per sq ft for single glazing, scaled by window type
  const windowSqFt = unit === 'metric' ? windowArea * 10.764 : windowArea;
  const windowAdjustment = windowCount * windowSqFt * 40 * windowTypeFactor;
  
  // Door adjustments (UK standards)
  // Exterior door: ~500 BTU heat loss
  const doorAdjustment = exteriorDoors * 500;
  
  // Patio doors: ~800 BTU heat loss per door (larger glass area)
  const patioDoorAdjustment = patioDoors * 800;
  
  // Occupant adjustment: each person adds ~400 BTU body heat (reduces requirement)
  const occupantAdjustment = occupants * -400;
  
  // Room orientation adjustment
  let orientationFactor = 1.0;
  if (roomOrientation === 'NORTH') {
    orientationFactor = 1.1; // North-facing rooms are cooler (10% more heat needed)
  } else if (roomOrientation === 'SOUTH') {
    orientationFactor = 0.95; // South-facing rooms get solar gain (5% less heat)
  } else if (roomOrientation === 'EAST' || roomOrientation === 'WEST') {
    orientationFactor = 1.0; // Neutral
  }
  
  // Calculate total BTU requirement
  // Apply multiplicative factors to base BTU
  const adjustedBtu = baseBtu * insulationFactor * climateFactor * exteriorWallFactor * floorFactor * orientationFactor;
  
  // Add/subtract the specific heat loss adjustments
  const totalBtu = adjustedBtu + windowAdjustment + doorAdjustment + patioDoorAdjustment + occupantAdjustment;
  
  // Round to nearest 1000 BTU (common practice for heating appliances)
  const roundedBtu = Math.round(totalBtu / 1000) * 1000;
  
  // Create a detailed breakdown for educational purposes
  const roomConfig = ROOM_USAGE[roomUsage] || ROOM_USAGE.LIVING;
  const breakdown = {
    roomVolume: roomVolume,
    unit: unit,
    roomType: roomConfig.name,
    btuPerUnit: unit === 'metric' ? roomConfig.btuPerM3 : roomConfig.btuPerFt3,
    baseBtu: Math.round(baseBtu),
    insulationFactor: insulationFactor,
    insulationAdjustment: Math.round(baseBtu * (insulationFactor - 1)),
    climateFactor: climateFactor,
    climateAdjustment: Math.round(baseBtu * insulationFactor * (climateFactor - 1)),
    exteriorWalls: exteriorWalls,
    exteriorWallsAdjustment: Math.round(baseBtu * insulationFactor * climateFactor * (exteriorWallFactor - 1)),
    floorFactor: floorFactor,
    floorAdjustment: Math.round(baseBtu * insulationFactor * climateFactor * exteriorWallFactor * (floorFactor - 1)),
    orientationFactor: orientationFactor,
    orientationAdjustment: Math.round(baseBtu * insulationFactor * climateFactor * exteriorWallFactor * floorFactor * (orientationFactor - 1)),
    windowCount: windowCount,
    windowAdjustment: Math.round(windowAdjustment),
    doorAdjustment: Math.round(doorAdjustment),
    patioDoorAdjustment: Math.round(patioDoorAdjustment),
    occupantAdjustment: Math.round(occupantAdjustment),
    adjustedBtu: Math.round(adjustedBtu),
    totalBtu: Math.round(totalBtu),
    roundedBtu: roundedBtu,
    kilowatts: Math.round(roundedBtu / 3412 * 100) / 100, // Convert BTU to kW (1 kW = 3412 BTU/h)
  };
  
  // Ensure minimum of 1000 BTU for any heated space
  const finalBtu = Math.max(roundedBtu, 1000);
  
  return {
    btu: finalBtu,
    kilowatts: Math.round(finalBtu / 3412 * 100) / 100,
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
