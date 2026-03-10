/**
 * Flue Gas Analyser CSV Parser
 * Parses CSV exports from Kane LIVE, TPI View, and Anton Sprint Mobile apps
 * Normalises data into a common format for display in Boiler Brain
 */

// Standard field mapping for normalised output
const FIELD_LABELS = {
  o2: { label: 'O₂', unit: '%', category: 'core' },
  co: { label: 'CO', unit: 'ppm', category: 'core' },
  co2: { label: 'CO₂', unit: '%', category: 'core' },
  flueTemp: { label: 'Flue Temp', unit: '°C', category: 'core' },
  ambientTemp: { label: 'Ambient Temp', unit: '°C', category: 'core' },
  deltaT: { label: 'ΔT', unit: '°C', category: 'core' },
  efficiencyNet: { label: 'Efficiency (Net)', unit: '%', category: 'efficiency' },
  efficiencyGross: { label: 'Efficiency (Gross)', unit: '%', category: 'efficiency' },
  excessAir: { label: 'Excess Air', unit: '%', category: 'efficiency' },
  coAirFree: { label: 'CO Air-Free', unit: 'ppm', category: 'safety' },
  coCo2Ratio: { label: 'CO/CO₂ Ratio', unit: '', category: 'safety' },
  no: { label: 'NO', unit: 'ppm', category: 'extended' },
  nox: { label: 'NOx', unit: 'ppm', category: 'extended' },
  so2: { label: 'SO₂', unit: 'ppm', category: 'extended' },
  draught: { label: 'Draught', unit: 'Pa', category: 'extended' },
  pressure: { label: 'Pressure', unit: 'mbar', category: 'extended' },
};

// Safety thresholds for colour-coding readings
const SAFETY_THRESHOLDS = {
  co: { warning: 100, danger: 200 },
  coCo2Ratio: { warning: 0.004, danger: 0.008 },
  coAirFree: { warning: 200, danger: 350 },
  o2: { warning: 9, danger: 12 }, // Too high = too much excess air
};

/**
 * Parse a raw CSV string into rows of key-value pairs
 */
function csvToRows(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length < 2) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

/**
 * Try to parse a numeric value from a string, stripping units
 */
function parseNum(val) {
  if (!val || val === '' || val === '-' || val === 'N/A') return null;
  const cleaned = val.replace(/[^0-9.\-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Detect manufacturer from CSV content
 */
export function detectManufacturer(csvText) {
  const lower = csvText.toLowerCase();
  if (lower.includes('kane') || lower.includes('kane live')) return 'kane';
  if (lower.includes('tpi') || lower.includes('tpi view') || lower.includes('dc710') || lower.includes('dc711')) return 'tpi';
  if (lower.includes('anton') || lower.includes('sprint pro') || lower.includes('sprint mobile')) return 'anton';
  if (lower.includes('testo')) return 'testo';
  // Try to detect by field names
  if (lower.includes('co af') || lower.includes('co/co2') || lower.includes('excess air')) return 'generic';
  return 'unknown';
}

/**
 * Normalise a key name to our standard field names
 * Handles variations across manufacturers
 */
function normaliseKey(key) {
  const k = key.toLowerCase().trim();

  // O2
  if (k === 'o2' || k === 'o2 %' || k === 'oxygen' || k === 'o2(%)') return 'o2';
  // CO
  if (k === 'co' || k === 'co ppm' || k === 'co(ppm)' || k === 'carbon monoxide') return 'co';
  // CO2
  if (k === 'co2' || k === 'co2 %' || k === 'co2(%)' || k === 'carbon dioxide') return 'co2';
  // Flue temp
  if (k.includes('flue') && k.includes('temp') || k === 'ft' || k === 'ft(°c)' || k === 'flue temp' || k === 'flue temperature' || k === 't-flue' || k === 'tflue') return 'flueTemp';
  // Ambient temp
  if (k.includes('ambient') || k.includes('air temp') || k === 'at' || k === 'at(°c)' || k === 'room temp' || k === 't-air' || k === 'tair') return 'ambientTemp';
  // Delta T
  if (k.includes('delta') || k === 'dt' || k === 'dt(°c)' || k === 'Δt') return 'deltaT';
  // Efficiency Net
  if (k.includes('eff') && (k.includes('net') || k.includes('nt'))) return 'efficiencyNet';
  // Efficiency Gross
  if (k.includes('eff') && (k.includes('gross') || k.includes('gr'))) return 'efficiencyGross';
  // Generic efficiency
  if (k === 'eff' || k === 'efficiency' || k === 'eff(%)' || k === 'efficiency %') return 'efficiencyNet';
  // Excess air
  if (k.includes('excess') && k.includes('air') || k === 'ea' || k === 'ea(%)' || k === 'lambda') return 'excessAir';
  // CO air-free
  if (k.includes('co') && (k.includes('af') || k.includes('air free') || k.includes('air-free'))) return 'coAirFree';
  // CO/CO2 ratio
  if (k.includes('co/co2') || k.includes('co:co2') || k === 'ratio') return 'coCo2Ratio';
  // NO
  if (k === 'no' || k === 'no(ppm)' || k === 'nitric oxide') return 'no';
  // NOx
  if (k === 'nox' || k === 'nox(ppm)' || k === 'nitrogen oxides') return 'nox';
  // SO2
  if (k === 'so2' || k === 'so2(ppm)' || k === 'sulphur dioxide') return 'so2';
  // Draught
  if (k.includes('draught') || k.includes('draft') || k.includes('stack')) return 'draught';
  // Pressure
  if (k.includes('pressure') && !k.includes('diff')) return 'pressure';
  // Fuel type
  if (k.includes('fuel')) return '_fuelType';
  // Date/time
  if (k.includes('date') || k.includes('time') || k.includes('timestamp')) return '_timestamp';
  // Test type
  if (k.includes('test') && k.includes('type') || k.includes('high') || k.includes('low')) return '_testType';

  return null; // Unknown field
}

/**
 * Parse CSV from any supported manufacturer
 * Returns normalised readings array
 */
export function parseFlueGasCSV(csvText) {
  const manufacturer = detectManufacturer(csvText);
  const rows = csvToRows(csvText);

  if (rows.length === 0) {
    throw new Error('No valid data found in CSV file. Please check the format.');
  }

  const readings = rows.map((row, index) => {
    const reading = {
      id: `reading-${Date.now()}-${index}`,
      manufacturer,
      timestamp: new Date().toISOString(),
      testType: 'unknown',
      fuelType: 'natural gas',
      values: {},
    };

    Object.entries(row).forEach(([key, value]) => {
      const normKey = normaliseKey(key);
      if (!normKey) return;

      if (normKey === '_timestamp') {
        reading.timestamp = value || reading.timestamp;
      } else if (normKey === '_testType') {
        reading.testType = value || reading.testType;
      } else if (normKey === '_fuelType') {
        reading.fuelType = value || reading.fuelType;
      } else {
        const numVal = parseNum(value);
        if (numVal !== null) {
          reading.values[normKey] = numVal;
        }
      }
    });

    // Calculate derived values if missing
    if (reading.values.flueTemp && reading.values.ambientTemp && !reading.values.deltaT) {
      reading.values.deltaT = Math.round((reading.values.flueTemp - reading.values.ambientTemp) * 10) / 10;
    }

    if (reading.values.co && reading.values.co2 && !reading.values.coCo2Ratio) {
      // CO in ppm, CO2 in %. Convert CO to % first: ppm / 10000 = %
      reading.values.coCo2Ratio = Math.round((reading.values.co / 10000 / reading.values.co2) * 10000) / 10000;
    }

    return reading;
  });

  return readings.filter(r => Object.keys(r.values).length > 0);
}

/**
 * Get safety status for a reading value
 * Returns 'safe', 'warning', or 'danger'
 */
export function getSafetyStatus(fieldKey, value) {
  const threshold = SAFETY_THRESHOLDS[fieldKey];
  if (!threshold || value === null || value === undefined) return 'safe';

  if (value >= threshold.danger) return 'danger';
  if (value >= threshold.warning) return 'warning';
  return 'safe';
}

/**
 * Create a manual reading entry from form data
 */
export function createManualReading(formData) {
  const reading = {
    id: `manual-${Date.now()}`,
    manufacturer: 'manual',
    timestamp: new Date().toISOString(),
    testType: formData.testType || 'manual',
    fuelType: formData.fuelType || 'natural gas',
    values: {},
  };

  Object.entries(formData).forEach(([key, value]) => {
    if (key === 'testType' || key === 'fuelType') return;
    const numVal = parseNum(String(value));
    if (numVal !== null) {
      reading.values[key] = numVal;
    }
  });

  // Calculate derived values
  if (reading.values.flueTemp && reading.values.ambientTemp && !reading.values.deltaT) {
    reading.values.deltaT = Math.round((reading.values.flueTemp - reading.values.ambientTemp) * 10) / 10;
  }
  if (reading.values.co && reading.values.co2 && !reading.values.coCo2Ratio) {
    reading.values.coCo2Ratio = Math.round((reading.values.co / 10000 / reading.values.co2) * 10000) / 10000;
  }

  return reading;
}

/**
 * Generate a sample CSV for testing
 */
export function generateSampleCSV(manufacturer = 'kane') {
  if (manufacturer === 'kane') {
    return `Date,Time,O2 %,CO ppm,CO2 %,Flue Temp,Ambient Temp,Efficiency Net,Efficiency Gross,Excess Air,CO AF,CO/CO2,Fuel
2026-03-01,14:30:00,5.2,42,9.8,127,21,92.3,84.1,32.8,58,0.0004,Natural Gas
2026-03-01,14:35:00,4.8,38,10.1,131,21,93.1,85.2,29.5,51,0.0003,Natural Gas`;
  }
  if (manufacturer === 'tpi') {
    return `Timestamp,O2(%),CO(ppm),CO2(%),FT(°C),AT(°C),Eff Net,Eff Gross,EA(%),CO AF,Ratio,Fuel Type
01/03/2026 14:30,5.2,42,9.8,127,21,92.3,84.1,32.8,58,0.0004,Natural Gas`;
  }
  return `Date,O2,CO,CO2,Flue Temperature,Air Temp,Net Efficiency,Gross Efficiency,Excess Air,CO Air-Free,CO/CO2 Ratio
2026-03-01,5.2,42,9.8,127,21,92.3,84.1,32.8,58,0.0004`;
}

export { FIELD_LABELS, SAFETY_THRESHOLDS };
