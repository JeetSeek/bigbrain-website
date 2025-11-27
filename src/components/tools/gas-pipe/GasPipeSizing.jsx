import React, { useState } from 'react';

/**
 * UK Gas Pipe Sizing Calculator
 * Based on BS 6891 and IGEM/UP/2 standards
 * Max 1 mbar drop from meter to appliance
 */
const GasPipeSizing = () => {
  const [pipeLength, setPipeLength] = useState('');
  const [gasRate, setGasRate] = useState('');
  const [pipeMaterial, setPipeMaterial] = useState('copper');
  const [fittings, setFittings] = useState({ elbows: '', tees: '' });
  const [result, setResult] = useState(null);

  // UK Gas pipe sizing table (BS 6891)
  // Max m³/h for given pipe length to stay within 1 mbar drop
  // Copper pipe internal diameters: 15mm=13.6mm, 22mm=20.2mm, 28mm=26.2mm
  const copperTable = {
    // length (m): { pipeSize: maxM3h }
    3:  { 15: 3.96, 22: 14.80, 28: 33.50 },
    6:  { 15: 2.68, 22: 10.04, 28: 22.73 },
    9:  { 15: 2.14, 22: 8.00, 28: 18.12 },
    12: { 15: 1.82, 22: 6.82, 28: 15.44 },
    15: { 15: 1.61, 22: 6.03, 28: 13.66 },
    20: { 15: 1.37, 22: 5.14, 28: 11.64 },
    25: { 15: 1.21, 22: 4.54, 28: 10.28 },
    30: { 15: 1.09, 22: 4.10, 28: 9.28 },
  };

  // Equivalent length for fittings (copper)
  const fittingEquiv = {
    copper: { elbow: 0.5, tee: 0.6 },
  };

  // Appliance kW to m³/h conversion (natural gas CV 39.3 MJ/m³)
  const kwToM3h = (kw) => (kw * 3.6) / 39.3;

  // Interpolate between table values
  const interpolate = (length, data) => {
    const lengths = Object.keys(data).map(Number).sort((a, b) => a - b);
    
    if (length <= lengths[0]) return data[lengths[0]];
    if (length >= lengths[lengths.length - 1]) return data[lengths[lengths.length - 1]];
    
    let lower = lengths[0];
    let upper = lengths[lengths.length - 1];
    
    for (let i = 0; i < lengths.length - 1; i++) {
      if (length >= lengths[i] && length <= lengths[i + 1]) {
        lower = lengths[i];
        upper = lengths[i + 1];
        break;
      }
    }
    
    const ratio = (length - lower) / (upper - lower);
    const result = {};
    
    for (const size in data[lower]) {
      const lowerVal = data[lower][size];
      const upperVal = data[upper][size];
      result[size] = lowerVal - (lowerVal - upperVal) * ratio;
    }
    
    return result;
  };

  const calculate = () => {
    const length = parseFloat(pipeLength);
    const rate = parseFloat(gasRate);
    
    if (!length || !rate || length <= 0 || rate <= 0) return;

    // Add equivalent length for fittings
    const elbowCount = parseInt(fittings.elbows) || 0;
    const teeCount = parseInt(fittings.tees) || 0;
    const equiv = fittingEquiv[pipeMaterial];
    const fittingsLength = (elbowCount * equiv.elbow) + (teeCount * equiv.tee);
    const effectiveLength = length + fittingsLength;

    // Get max capacities for this length
    const table = pipeMaterial === 'copper' ? copperTable : copperTable;
    const capacities = interpolate(effectiveLength, table);

    // Find suitable pipe size
    let recommended = null;
    let pressureDropPercent = 0;
    const sizes = [15, 22, 28];

    for (const size of sizes) {
      if (capacities[size] >= rate) {
        recommended = size;
        pressureDropPercent = (rate / capacities[size]) * 100;
        break;
      }
    }

    // If no single pipe works, might need 28mm or larger
    if (!recommended) {
      recommended = 28;
      pressureDropPercent = (rate / capacities[28]) * 100;
    }

    // Calculate approx pressure drop (simplified)
    const maxCapacity = capacities[recommended];
    const estimatedDrop = (rate / maxCapacity) * 1; // 1 mbar is max at full capacity

    setResult({
      effectiveLength: effectiveLength.toFixed(1),
      fittingsLength: fittingsLength.toFixed(1),
      gasRateM3h: rate.toFixed(2),
      recommended,
      maxCapacity: capacities[recommended]?.toFixed(2) || 'N/A',
      estimatedDrop: estimatedDrop.toFixed(2),
      isWithinLimit: estimatedDrop <= 1,
      capacities: {
        15: capacities[15]?.toFixed(2),
        22: capacities[22]?.toFixed(2),
        28: capacities[28]?.toFixed(2),
      },
      oversized: pressureDropPercent < 50,
    });
  };

  const resetAll = () => {
    setPipeLength('');
    setGasRate('');
    setFittings({ elbows: '', tees: '' });
    setResult(null);
  };

  // Quick kW to m³/h converter
  const [kwInput, setKwInput] = useState('');
  const convertedRate = kwInput ? kwToM3h(parseFloat(kwInput)).toFixed(2) : '';

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-6 text-white">
          <h1 className="text-2xl font-bold">Gas Pipe Sizing</h1>
          <p className="text-yellow-100 text-sm mt-1">BS 6891 · Max 1 mbar drop</p>
        </div>

        <div className="p-6">
          {/* kW to m³/h Quick Convert */}
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-blue-600 mb-1">Appliance kW</label>
                <input
                  type="number"
                  value={kwInput}
                  onChange={(e) => setKwInput(e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-2xl text-blue-400">→</div>
              <div className="flex-1">
                <label className="block text-xs text-blue-600 mb-1">Gas Rate m³/h</label>
                <div className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-bold text-blue-700">
                  {convertedRate || '—'}
                </div>
              </div>
              <button
                onClick={() => convertedRate && setGasRate(convertedRate)}
                className="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
              >
                Use
              </button>
            </div>
          </div>

          {/* Main Inputs */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pipe Run (m)</label>
              <input
                type="number"
                value={pipeLength}
                onChange={(e) => setPipeLength(e.target.value)}
                placeholder="e.g. 10"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gas Rate (m³/h)</label>
              <input
                type="number"
                value={gasRate}
                onChange={(e) => setGasRate(e.target.value)}
                placeholder="e.g. 2.75"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Fittings */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Fittings</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 w-16">Elbows</span>
                <input
                  type="number"
                  value={fittings.elbows}
                  onChange={(e) => setFittings({ ...fittings, elbows: e.target.value })}
                  placeholder="0"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 w-16">Tees</span>
                <input
                  type="number"
                  value={fittings.tees}
                  onChange={(e) => setFittings({ ...fittings, tees: e.target.value })}
                  placeholder="0"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Elbow = 0.5m, Tee = 0.6m equiv.</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={calculate}
              className="flex-1 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
            >
              Calculate
            </button>
            <button
              onClick={resetAll}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="bg-gray-50 rounded-xl p-4">
              {/* Effective Length */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center text-sm">
                <div className="bg-white rounded-lg p-2">
                  <div className="text-xs text-gray-500">Pipe</div>
                  <div className="font-bold text-gray-700">{pipeLength}m</div>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <div className="text-xs text-gray-500">Fittings</div>
                  <div className="font-bold text-gray-700">+{result.fittingsLength}m</div>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <div className="text-xs text-gray-500">Effective</div>
                  <div className="font-bold text-orange-600">{result.effectiveLength}m</div>
                </div>
              </div>

              {/* Recommended Size */}
              <div className={`rounded-lg p-4 text-center mb-4 ${result.isWithinLimit ? 'bg-green-100' : 'bg-red-100'}`}>
                <div className="text-xs text-gray-600">Minimum Pipe Size</div>
                <div className={`text-4xl font-bold ${result.isWithinLimit ? 'text-green-700' : 'text-red-700'}`}>
                  {result.recommended}mm
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Max capacity: {result.maxCapacity} m³/h
                </div>
              </div>

              {/* Pressure Drop */}
              <div className={`rounded-lg p-3 text-center mb-4 ${result.isWithinLimit ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="text-xs text-gray-600">Est. Pressure Drop</div>
                <div className={`text-xl font-bold ${result.isWithinLimit ? 'text-green-700' : 'text-red-700'}`}>
                  {result.estimatedDrop} mbar
                </div>
                <div className="text-xs text-gray-500">
                  {result.isWithinLimit ? '✓ Within 1 mbar limit' : '✗ Exceeds 1 mbar limit'}
                </div>
              </div>

              {/* All Sizes Capacity */}
              <div className="bg-white rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-2 text-center">Max m³/h at {result.effectiveLength}m</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className={`rounded p-2 ${parseFloat(result.capacities[15]) >= parseFloat(gasRate) ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <div className="font-bold text-gray-700">15mm</div>
                    <div className="text-sm text-gray-600">{result.capacities[15]}</div>
                  </div>
                  <div className={`rounded p-2 ${parseFloat(result.capacities[22]) >= parseFloat(gasRate) ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <div className="font-bold text-gray-700">22mm</div>
                    <div className="text-sm text-gray-600">{result.capacities[22]}</div>
                  </div>
                  <div className={`rounded p-2 ${parseFloat(result.capacities[28]) >= parseFloat(gasRate) ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <div className="font-bold text-gray-700">28mm</div>
                    <div className="text-sm text-gray-600">{result.capacities[28]}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Reference */}
          <div className="mt-6 bg-yellow-50 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-yellow-700 mb-2">COMMON APPLIANCES</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">30kW Combi</span>
                <span className="font-mono text-yellow-700">2.75 m³/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">35kW Combi</span>
                <span className="font-mono text-yellow-700">3.21 m³/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hob (4 ring)</span>
                <span className="font-mono text-yellow-700">0.80 m³/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gas Fire</span>
                <span className="font-mono text-yellow-700">0.55 m³/h</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GasPipeSizing;
