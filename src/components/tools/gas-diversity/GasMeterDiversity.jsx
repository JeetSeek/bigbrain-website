import React, { useState } from 'react';

/**
 * Gas Meter Diversity Calculator
 * Calculates diversified gas load per BS 6891 and determines meter sizing
 * 
 * Rules:
 * - 1st largest appliance: 100%
 * - 2nd largest appliance: 70%
 * - All remaining: 40%
 * - Convert kW to m³/h: kW ÷ 10.8
 * - U6 meter: max 6.0 m³/h (~65 kW)
 * - U16 meter: max 16.0 m³/h (~172 kW)
 */

const applianceTypes = [
  { type: 'Boiler - Combi', icon: '🔥', defaultKw: 30 },
  { type: 'Boiler - System', icon: '🔥', defaultKw: 24 },
  { type: 'Boiler - Regular', icon: '🔥', defaultKw: 18 },
  { type: 'Gas Fire', icon: '🔶', defaultKw: 5 },
  { type: 'Hob', icon: '🍳', defaultKw: 8 },
  { type: 'Cooker', icon: '🍳', defaultKw: 12 },
  { type: 'Range Cooker', icon: '🍳', defaultKw: 18 },
  { type: 'Water Heater', icon: '💧', defaultKw: 10 },
  { type: 'Tumble Dryer', icon: '👕', defaultKw: 3 },
  { type: 'Other', icon: '⚡', defaultKw: 10 },
];

// Constants
const CALORIFIC_VALUE = 10.8; // Industry average for Natural Gas Gross CV
const U6_LIMIT = 6.0;  // m³/h - Standard domestic meter
const U16_LIMIT = 16.0; // m³/h - Medium domestic meter

const GasMeterDiversity = () => {
  const [appliances, setAppliances] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);

  const createAppliance = () => ({
    id: Date.now(),
    type: '',
    kw: '',
    icon: '⚡',
  });

  const addAppliance = () => {
    setAppliances(prev => [...prev, createAppliance()]);
    setShowResults(false);
  };

  const removeAppliance = (id) => {
    setAppliances(prev => prev.filter(a => a.id !== id));
    setShowResults(false);
  };

  const updateAppliance = (id, field, value) => {
    setAppliances(prev => prev.map(a => {
      if (a.id !== id) return a;
      if (field === 'type') {
        const typeInfo = applianceTypes.find(t => t.type === value);
        return { ...a, type: value, icon: typeInfo?.icon || '⚡', kw: typeInfo?.defaultKw || '' };
      }
      return { ...a, [field]: value };
    }));
    setShowResults(false);
  };

  const calculate = () => {
    if (appliances.length === 0 || appliances.some(a => !a.kw || !a.type)) {
      alert('Please add appliances with kW ratings');
      return;
    }

    // Sort appliances by kW (highest first)
    const sorted = [...appliances]
      .map(a => ({ ...a, kw: parseFloat(a.kw) }))
      .sort((a, b) => b.kw - a.kw);

    // Calculate total connected load
    const totalConnected = sorted.reduce((sum, a) => sum + a.kw, 0);

    // Apply diversity percentages
    const diversified = sorted.map((a, i) => {
      let percentage;
      if (i === 0) percentage = 1.0;      // 100% for largest
      else if (i === 1) percentage = 0.7; // 70% for second
      else percentage = 0.4;               // 40% for rest
      
      return {
        ...a,
        percentage: percentage * 100,
        diversifiedKw: a.kw * percentage,
      };
    });

    // Sum diversified load
    const totalDiversified = diversified.reduce((sum, a) => sum + a.diversifiedKw, 0);

    // Convert to m³/h
    const gasRate = totalDiversified / CALORIFIC_VALUE;

    // Determine meter status
    let status, message, recommendation;
    if (gasRate <= U6_LIMIT) {
      status = 'green';
      message = 'Standard U6 Meter is Sufficient';
      recommendation = 'The existing standard domestic meter (U6/G4) can handle this load. No upgrade required.';
    } else if (gasRate <= U16_LIMIT) {
      status = 'amber';
      message = 'Requires U16 Meter Upgrade';
      recommendation = 'The standard U6 meter is undersized. A U16/G10 meter is required. This is a medium domestic meter typically used for properties with multiple high-demand appliances like multiple boilers, large range cookers, or commercial-style kitchens in residential settings.';
    } else {
      status = 'red';
      message = 'Exceeds Domestic Meter Capacity';
      recommendation = `The calculated gas rate of ${gasRate.toFixed(2)} m³/h exceeds even the U16 meter capacity. This installation may require a commercial meter or multiple supply points. Consult with the gas transporter (e.g., Cadent, SGN) for options.`;
    }

    setResults({
      sorted: diversified,
      totalConnected: totalConnected.toFixed(1),
      totalDiversified: totalDiversified.toFixed(1),
      gasRate: gasRate.toFixed(2),
      status,
      message,
      recommendation,
      u6Limit: U6_LIMIT,
      u16Limit: U16_LIMIT,
    });
    setShowResults(true);
  };

  const resetCalculation = () => {
    setShowResults(false);
  };

  // Input styles
  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const selectClass = "w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500";

  // Results Screen
  if (showResults && results) {
    return (
      <div className="max-w-lg mx-auto bg-gray-50 min-h-screen pb-24">
        {/* Header */}
        <div className="bg-slate-700 text-white px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <button onClick={resetCalculation} className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-xl">←</span>
            </button>
            <h1 className="text-lg font-medium">Diversity Results</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Traffic Light Status */}
          <div className={`rounded-2xl p-6 text-center ${
            results.status === 'green' ? 'bg-green-100 border-2 border-green-500' :
            results.status === 'amber' ? 'bg-amber-100 border-2 border-amber-500' :
            'bg-red-100 border-2 border-red-500'
          }`}>
            <div className={`text-6xl mb-3 ${
              results.status === 'green' ? 'text-green-600' :
              results.status === 'amber' ? 'text-amber-600' :
              'text-red-600'
            }`}>
              {results.status === 'green' ? '✓' : results.status === 'amber' ? '⚠️' : '✗'}
            </div>
            <h2 className={`text-xl font-bold mb-2 ${
              results.status === 'green' ? 'text-green-800' :
              results.status === 'amber' ? 'text-amber-800' :
              'text-red-800'
            }`}>
              {results.message}
            </h2>
            <p className={`text-sm ${
              results.status === 'green' ? 'text-green-700' :
              results.status === 'amber' ? 'text-amber-700' :
              'text-red-700'
            }`}>
              {results.recommendation}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Total Connected</div>
              <div className="text-2xl font-bold text-gray-900">{results.totalConnected}</div>
              <div className="text-xs text-gray-500">kW</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Diversified Load</div>
              <div className="text-2xl font-bold text-blue-600">{results.totalDiversified}</div>
              <div className="text-xs text-gray-500">kW</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Gas Rate</div>
              <div className="text-2xl font-bold text-emerald-600">{results.gasRate}</div>
              <div className="text-xs text-gray-500">m³/h</div>
            </div>
          </div>

          {/* Meter Comparison */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-3">Meter Capacity Check</h3>
            
            {/* U6 Meter Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">U6 Meter (Standard)</span>
                <span className="text-gray-500">{results.u6Limit} m³/h max</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    parseFloat(results.gasRate) <= results.u6Limit ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((parseFloat(results.gasRate) / results.u6Limit) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {parseFloat(results.gasRate) <= results.u6Limit 
                  ? `✓ ${((parseFloat(results.gasRate) / results.u6Limit) * 100).toFixed(0)}% utilized`
                  : `✗ ${((parseFloat(results.gasRate) / results.u6Limit) * 100).toFixed(0)}% - Exceeds capacity`
                }
              </div>
            </div>

            {/* U16 Meter Bar */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">U16 Meter (Medium)</span>
                <span className="text-gray-500">{results.u16Limit} m³/h max</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    parseFloat(results.gasRate) <= results.u16Limit ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((parseFloat(results.gasRate) / results.u16Limit) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {parseFloat(results.gasRate) <= results.u16Limit 
                  ? `✓ ${((parseFloat(results.gasRate) / results.u16Limit) * 100).toFixed(0)}% utilized`
                  : `✗ ${((parseFloat(results.gasRate) / results.u16Limit) * 100).toFixed(0)}% - Exceeds capacity`
                }
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 font-bold text-gray-900 text-sm border-b">
              Diversity Breakdown (Sorted by Load)
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-700">#</th>
                  <th className="px-3 py-2 text-left text-gray-700">Appliance</th>
                  <th className="px-3 py-2 text-center text-gray-700">kW</th>
                  <th className="px-3 py-2 text-center text-gray-700">%</th>
                  <th className="px-3 py-2 text-right text-gray-700">Result</th>
                </tr>
              </thead>
              <tbody>
                {results.sorted.map((app, i) => (
                  <tr key={app.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2">
                      <span className="mr-1">{app.icon}</span>
                      <span className="text-gray-900">{app.type}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-900">{app.kw}</td>
                    <td className={`px-3 py-2 text-center font-medium ${
                      app.percentage === 100 ? 'text-green-600' :
                      app.percentage === 70 ? 'text-amber-600' : 'text-blue-600'
                    }`}>
                      {app.percentage}%
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">
                      {app.diversifiedKw.toFixed(1)} kW
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                <tr>
                  <td colSpan="4" className="px-3 py-2 text-right font-bold text-gray-700">
                    Diversified Total:
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-blue-600">
                    {results.totalDiversified} kW
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h4 className="font-bold text-blue-900 mb-2">📚 BS 6891 Diversity Rule</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><span className="font-medium">• 1st Largest:</span> Count at 100%</p>
              <p><span className="font-medium">• 2nd Largest:</span> Count at 70%</p>
              <p><span className="font-medium">• All Others:</span> Count at 40%</p>
              <p className="mt-2 text-xs">This accounts for the fact that domestic appliances rarely all run simultaneously at full capacity.</p>
            </div>
          </div>

          {/* Meter Types Info */}
          <div className="bg-gray-100 rounded-xl p-4">
            <h4 className="font-bold text-gray-900 mb-2">Meter Types</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">U6 / G4 (Standard Domestic)</span>
                <span className="font-medium text-gray-900">≤ 6 m³/h (~65 kW)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">U16 / G10 (Medium Domestic)</span>
                <span className="font-medium text-gray-900">≤ 16 m³/h (~172 kW)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-10">
          <div className="max-w-lg mx-auto">
            <button onClick={resetCalculation} className="w-full py-3 bg-blue-500 text-white font-medium rounded-lg">
              ← Modify Appliances
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Input Screen
  return (
    <div className="max-w-lg mx-auto bg-gray-50 min-h-screen pb-32">
      {/* Header */}
      <div className="bg-slate-700 text-white px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-medium text-center">Gas Meter Diversity</h1>
        <p className="text-xs text-center text-slate-300 mt-1">BS 6891 Diversity Calculation</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Info Banner */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-bold">Add all gas appliances</span> at the property. The calculator will apply BS 6891 diversity rules to determine if a meter upgrade is required.
          </p>
        </div>

        {/* Appliances List */}
        {appliances.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border-2 border-dashed border-gray-300">
            <div className="text-4xl mb-2">🔥</div>
            <p className="text-gray-500">No appliances added yet</p>
            <p className="text-sm text-gray-400">Tap the button below to add your first appliance</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appliances.map((app, idx) => (
              <div key={app.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{app.icon}</span>
                    <span className="font-medium text-gray-700">Appliance {idx + 1}</span>
                  </div>
                  <button onClick={() => removeAppliance(app.id)} className="text-red-500 text-sm font-medium">
                    Remove
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <div className="relative">
                      <select
                        value={app.type}
                        onChange={(e) => updateAppliance(app.id, 'type', e.target.value)}
                        className={selectClass}
                      >
                        <option value="">Select appliance type...</option>
                        {applianceTypes.map(t => (
                          <option key={t.type} value={t.type}>{t.icon} {t.type}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Input Rating (kW)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={app.kw}
                      onChange={(e) => updateAppliance(app.id, 'kw', e.target.value)}
                      placeholder="e.g. 30"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Button */}
        <button
          onClick={addAppliance}
          className="w-full py-4 bg-blue-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 shadow-lg"
        >
          <span className="text-xl">+</span> Add Appliance
        </button>

        {/* Quick Stats */}
        {appliances.length > 0 && appliances.some(a => a.kw) && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Connected:</span>
              <span className="text-xl font-bold text-gray-900">
                {appliances.reduce((sum, a) => sum + (parseFloat(a.kw) || 0), 0).toFixed(1)} kW
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Calculate Button */}
      {appliances.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-10">
          <div className="max-w-lg mx-auto">
            <button
              onClick={calculate}
              disabled={appliances.length === 0 || appliances.some(a => !a.kw || !a.type)}
              className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              Calculate Diversity
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GasMeterDiversity;
