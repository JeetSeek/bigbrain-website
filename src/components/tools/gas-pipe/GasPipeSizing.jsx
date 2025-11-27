import React, { useState } from 'react';

/**
 * UK Gas Pipe Sizing Calculator
 * Based on BS 6891 and IGEM/UP/2 standards
 * Max 1 mbar drop from meter to appliance
 */
const GasPipeSizing = () => {
  // Unit selection
  const [inputUnit, setInputUnit] = useState('kW');
  
  // Appliances list
  const [appliances, setAppliances] = useState([{ id: 1, name: '', value: '' }]);
  
  // Pipe runs
  const [pipeRuns, setPipeRuns] = useState([{ id: 1, length: '', elbows: '', tees: '' }]);
  
  const [result, setResult] = useState(null);

  // UK Gas pipe sizing table (BS 6891)
  const copperTable = {
    3:  { 15: 3.96, 22: 14.80, 28: 33.50 },
    6:  { 15: 2.68, 22: 10.04, 28: 22.73 },
    9:  { 15: 2.14, 22: 8.00, 28: 18.12 },
    12: { 15: 1.82, 22: 6.82, 28: 15.44 },
    15: { 15: 1.61, 22: 6.03, 28: 13.66 },
    20: { 15: 1.37, 22: 5.14, 28: 11.64 },
    25: { 15: 1.21, 22: 4.54, 28: 10.28 },
    30: { 15: 1.09, 22: 4.10, 28: 9.28 },
  };

  // Conversions to m³/h
  const toM3h = (value, unit) => {
    const v = parseFloat(value) || 0;
    switch (unit) {
      case 'kW': return (v * 3.6) / 39.3;
      case 'BTU': return (v * 0.000293071) / 10.83; // BTU/h to m³/h
      case 'm³/h': return v;
      default: return v;
    }
  };

  // Interpolate between table values
  const interpolate = (length, data) => {
    const lengths = Object.keys(data).map(Number).sort((a, b) => a - b);
    if (length <= lengths[0]) return data[lengths[0]];
    if (length >= lengths[lengths.length - 1]) return data[lengths[lengths.length - 1]];
    
    let lower = lengths[0], upper = lengths[lengths.length - 1];
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
      result[size] = data[lower][size] - (data[lower][size] - data[upper][size]) * ratio;
    }
    return result;
  };

  // Add appliance
  const addAppliance = () => {
    setAppliances([...appliances, { id: Date.now(), name: '', value: '' }]);
  };

  // Remove appliance
  const removeAppliance = (id) => {
    if (appliances.length > 1) {
      setAppliances(appliances.filter(a => a.id !== id));
    }
  };

  // Update appliance
  const updateAppliance = (id, field, value) => {
    setAppliances(appliances.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  // Add pipe run
  const addPipeRun = () => {
    setPipeRuns([...pipeRuns, { id: Date.now(), length: '', elbows: '', tees: '' }]);
  };

  // Remove pipe run
  const removePipeRun = (id) => {
    if (pipeRuns.length > 1) {
      setPipeRuns(pipeRuns.filter(p => p.id !== id));
    }
  };

  // Update pipe run
  const updatePipeRun = (id, field, value) => {
    setPipeRuns(pipeRuns.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // Calculate
  const calculate = () => {
    // Total gas rate in m³/h
    const totalRate = appliances.reduce((sum, a) => sum + toM3h(a.value, inputUnit), 0);
    if (totalRate <= 0) return;

    // Calculate each pipe run
    const runResults = pipeRuns.map(run => {
      const length = parseFloat(run.length) || 0;
      const elbows = parseInt(run.elbows) || 0;
      const tees = parseInt(run.tees) || 0;
      const fittingsLength = (elbows * 0.5) + (tees * 0.6);
      const effectiveLength = length + fittingsLength;
      
      if (effectiveLength <= 0) return null;

      const capacities = interpolate(effectiveLength, copperTable);
      
      let recommended = 28;
      for (const size of [15, 22, 28]) {
        if (capacities[size] >= totalRate) {
          recommended = size;
          break;
        }
      }

      const estimatedDrop = (totalRate / capacities[recommended]) * 1;

      return {
        length,
        fittingsLength: fittingsLength.toFixed(1),
        effectiveLength: effectiveLength.toFixed(1),
        recommended,
        maxCapacity: capacities[recommended]?.toFixed(2),
        estimatedDrop: estimatedDrop.toFixed(2),
        isWithinLimit: estimatedDrop <= 1,
        capacities: {
          15: capacities[15]?.toFixed(2),
          22: capacities[22]?.toFixed(2),
          28: capacities[28]?.toFixed(2),
        },
      };
    }).filter(Boolean);

    setResult({
      totalRate: totalRate.toFixed(2),
      applianceCount: appliances.filter(a => parseFloat(a.value) > 0).length,
      runs: runResults,
    });
  };

  // Reset
  const resetAll = () => {
    setAppliances([{ id: 1, name: '', value: '' }]);
    setPipeRuns([{ id: 1, length: '', elbows: '', tees: '' }]);
    setResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-5 text-white">
          <h1 className="text-2xl font-bold">Gas Pipe Sizing</h1>
          <p className="text-yellow-100 text-sm mt-1">BS 6891 · Max 1 mbar drop</p>
        </div>

        <div className="p-5">
          {/* Unit Selector */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-500 mb-2">INPUT UNIT</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {['kW', 'BTU/h', 'm³/h'].map((unit) => (
                <button
                  key={unit}
                  className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                    inputUnit === unit.replace('/h', '')
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setInputUnit(unit.replace('/h', ''))}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          {/* Appliances */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">APPLIANCES</label>
              <button
                onClick={addAppliance}
                className="text-xs text-orange-600 font-medium hover:text-orange-700"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {appliances.map((app, idx) => (
                <div key={app.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={app.name}
                    onChange={(e) => updateAppliance(app.id, 'name', e.target.value)}
                    placeholder={`Appliance ${idx + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="number"
                    value={app.value}
                    onChange={(e) => updateAppliance(app.id, 'value', e.target.value)}
                    placeholder={inputUnit}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-xs text-gray-400 w-10">{inputUnit}</span>
                  {appliances.length > 1 && (
                    <button
                      onClick={() => removeAppliance(app.id)}
                      className="text-red-400 hover:text-red-600 text-lg px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pipe Runs */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">PIPE RUNS</label>
              <button
                onClick={addPipeRun}
                className="text-xs text-orange-600 font-medium hover:text-orange-700"
              >
                + Add Run
              </button>
            </div>
            <div className="space-y-3">
              {pipeRuns.map((run, idx) => (
                <div key={run.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Run {idx + 1}</span>
                    {pipeRuns.length > 1 && (
                      <button
                        onClick={() => removePipeRun(run.id)}
                        className="text-red-400 hover:text-red-600 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Length (m)</label>
                      <input
                        type="number"
                        value={run.length}
                        onChange={(e) => updatePipeRun(run.id, 'length', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Elbows</label>
                      <input
                        type="number"
                        value={run.elbows}
                        onChange={(e) => updatePipeRun(run.id, 'elbows', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Tees</label>
                      <input
                        type="number"
                        value={run.tees}
                        onChange={(e) => updatePipeRun(run.id, 'tees', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Elbow = 0.5m, Tee = 0.6m equiv.</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mb-5">
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
              {/* Total Load */}
              <div className="bg-orange-100 rounded-lg p-3 text-center mb-4">
                <div className="text-xs text-orange-700">Total Gas Load ({result.applianceCount} appliance{result.applianceCount !== 1 ? 's' : ''})</div>
                <div className="text-2xl font-bold text-orange-800">{result.totalRate} m³/h</div>
              </div>

              {/* Per-Run Results */}
              {result.runs.map((run, idx) => (
                <div key={idx} className="mb-4 last:mb-0">
                  {result.runs.length > 1 && (
                    <div className="text-xs font-medium text-gray-500 mb-2">RUN {idx + 1}</div>
                  )}
                  
                  {/* Length breakdown */}
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center text-sm">
                    <div className="bg-white rounded-lg p-2">
                      <div className="text-xs text-gray-400">Pipe</div>
                      <div className="font-bold text-gray-700">{run.length}m</div>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <div className="text-xs text-gray-400">Fittings</div>
                      <div className="font-bold text-gray-700">+{run.fittingsLength}m</div>
                    </div>
                    <div className="bg-white rounded-lg p-2">
                      <div className="text-xs text-gray-400">Total</div>
                      <div className="font-bold text-orange-600">{run.effectiveLength}m</div>
                    </div>
                  </div>

                  {/* Recommended Size */}
                  <div className={`rounded-lg p-4 text-center mb-3 ${run.isWithinLimit ? 'bg-green-100' : 'bg-red-100'}`}>
                    <div className="text-xs text-gray-600">Minimum Pipe Size</div>
                    <div className={`text-4xl font-bold ${run.isWithinLimit ? 'text-green-700' : 'text-red-700'}`}>
                      {run.recommended}mm
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {run.isWithinLimit ? `✓ ${run.estimatedDrop} mbar drop` : `✗ ${run.estimatedDrop} mbar exceeds limit`}
                    </div>
                  </div>

                  {/* All Sizes */}
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    {[15, 22, 28].map(size => (
                      <div key={size} className={`rounded p-2 ${parseFloat(run.capacities[size]) >= parseFloat(result.totalRate) ? 'bg-green-100' : 'bg-white'}`}>
                        <div className="font-bold text-gray-700">{size}mm</div>
                        <div className="text-xs text-gray-500">{run.capacities[size]} m³/h</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Reference */}
          <div className="mt-5 bg-yellow-50 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-yellow-700 mb-2">COMMON APPLIANCES</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">30kW Combi</span>
                <span className="font-mono text-yellow-700">2.75</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">35kW Combi</span>
                <span className="font-mono text-yellow-700">3.21</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Hob (4 ring)</span>
                <span className="font-mono text-yellow-700">0.80</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gas Fire</span>
                <span className="font-mono text-yellow-700">0.55</span>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-2 text-right">m³/h</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GasPipeSizing;
