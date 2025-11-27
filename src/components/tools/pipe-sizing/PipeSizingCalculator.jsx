import React, { useState } from 'react';

const PipeSizingCalculator = () => {
  const [heatLoad, setHeatLoad] = useState('');
  const [systemType, setSystemType] = useState('heating');
  const [flowTemp, setFlowTemp] = useState('75');
  const [returnTemp, setReturnTemp] = useState('65');
  const [result, setResult] = useState(null);

  // Pipe sizing data (copper) - max kW at 10°C ΔT
  const pipeSizes = [
    { size: 8, maxKw: 2.5 },
    { size: 10, maxKw: 5 },
    { size: 15, maxKw: 12 },
    { size: 22, maxKw: 30 },
    { size: 28, maxKw: 55 },
    { size: 35, maxKw: 95 },
    { size: 42, maxKw: 150 },
    { size: 54, maxKw: 280 },
  ];

  const calculatePipeSize = () => {
    const load = parseFloat(heatLoad);
    if (!load || load <= 0) return;

    const deltaT = parseFloat(flowTemp) - parseFloat(returnTemp);
    if (deltaT <= 0) return;

    // Flow rate = kW / (4.18 × ΔT) in l/s
    const flowRate = load / (4.18 * deltaT);
    
    // Adjust max kW based on actual ΔT (reference is 10°C)
    const dtFactor = deltaT / 10;
    
    // Find suitable pipe size
    let recommended = null;
    let nextUp = null;
    
    for (let i = 0; i < pipeSizes.length; i++) {
      const adjustedMax = pipeSizes[i].maxKw * dtFactor;
      if (adjustedMax >= load && !recommended) {
        recommended = pipeSizes[i];
        nextUp = pipeSizes[i + 1] || null;
        break;
      }
    }

    if (!recommended) {
      recommended = pipeSizes[pipeSizes.length - 1];
    }

    // Velocity check
    const pipeArea = Math.PI * Math.pow((recommended.size / 2000), 2);
    const velocity = (flowRate / 1000) / pipeArea;

    setResult({
      flowRate: (flowRate * 60).toFixed(2),
      deltaT,
      recommended: recommended.size,
      nextSize: nextUp?.size || null,
      velocity: velocity.toFixed(2),
      velocityOk: velocity >= 0.5 && velocity <= 1.5,
    });
  };

  const resetAll = () => {
    setHeatLoad('');
    setFlowTemp('75');
    setReturnTemp('65');
    setResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-6 text-white">
          <h1 className="text-2xl font-bold">Pipe Sizing</h1>
          <p className="text-purple-100 text-sm mt-1">Copper pipe for heating systems</p>
        </div>

        <div className="p-6">
          {/* System Type */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-6">
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
                systemType === 'heating' ? 'bg-purple-500 text-white' : 'bg-white text-gray-700'
              }`}
              onClick={() => setSystemType('heating')}
            >
              Heating
            </button>
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all border-l ${
                systemType === 'dhw' ? 'bg-purple-500 text-white' : 'bg-white text-gray-700'
              }`}
              onClick={() => setSystemType('dhw')}
            >
              DHW
            </button>
          </div>

          {/* Heat Load */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Heat Load (kW)</label>
            <input
              type="number"
              value={heatLoad}
              onChange={(e) => setHeatLoad(e.target.value)}
              placeholder="e.g. 24"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Temperatures */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Flow °C</label>
              <input
                type="number"
                value={flowTemp}
                onChange={(e) => setFlowTemp(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Return °C</label>
              <input
                type="number"
                value={returnTemp}
                onChange={(e) => setReturnTemp(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={calculatePipeSize}
              className="flex-1 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
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
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">Flow Rate</div>
                  <div className="text-lg font-bold text-purple-600">{result.flowRate} l/min</div>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">ΔT</div>
                  <div className="text-lg font-bold text-purple-600">{result.deltaT}°C</div>
                </div>
              </div>

              <div className="bg-purple-100 rounded-lg p-4 text-center mb-4">
                <div className="text-xs text-purple-700">Recommended</div>
                <div className="text-3xl font-bold text-purple-800">{result.recommended}mm</div>
                {result.nextSize && (
                  <div className="text-xs text-purple-600 mt-1">Next up: {result.nextSize}mm</div>
                )}
              </div>

              <div className={`rounded-lg p-3 text-center ${result.velocityOk ? 'bg-green-100' : 'bg-yellow-100'}`}>
                <div className="text-xs text-gray-600">Velocity</div>
                <div className={`text-lg font-bold ${result.velocityOk ? 'text-green-700' : 'text-yellow-700'}`}>
                  {result.velocity} m/s
                </div>
                <div className="text-xs text-gray-500">Target: 0.5-1.5 m/s</div>
              </div>
            </div>
          )}

          {/* Quick Reference */}
          <div className="mt-6 bg-gray-50 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-gray-500 mb-3">QUICK REF @ 10°C ΔT</h4>
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              {[
                { size: '15mm', kw: '12kW' },
                { size: '22mm', kw: '30kW' },
                { size: '28mm', kw: '55kW' },
                { size: '35mm', kw: '95kW' },
              ].map((p) => (
                <div key={p.size} className="bg-white rounded p-2">
                  <div className="font-bold text-purple-600">{p.size}</div>
                  <div className="text-xs text-gray-500">{p.kw}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PipeSizingCalculator;
