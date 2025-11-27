import React, { useState } from 'react';

const PressureDropCalculator = () => {
  const [pipeSize, setPipeSize] = useState('22');
  const [pipeLength, setPipeLength] = useState('');
  const [flowRate, setFlowRate] = useState('');
  const [fittings, setFittings] = useState({
    elbows: '',
    tees: '',
    valves: '',
  });
  const [result, setResult] = useState(null);

  // Pressure drop per metre (mbar/m) at various flow rates - simplified
  // Based on copper pipe friction loss tables
  const frictionLoss = {
    15: { factor: 0.8, eqElbow: 0.5, eqTee: 0.7, eqValve: 0.3 },
    22: { factor: 0.25, eqElbow: 0.8, eqTee: 1.0, eqValve: 0.5 },
    28: { factor: 0.1, eqElbow: 1.0, eqTee: 1.3, eqValve: 0.6 },
    35: { factor: 0.05, eqElbow: 1.3, eqTee: 1.7, eqValve: 0.8 },
    42: { factor: 0.03, eqElbow: 1.5, eqTee: 2.0, eqValve: 1.0 },
    54: { factor: 0.015, eqElbow: 2.0, eqTee: 2.6, eqValve: 1.3 },
  };

  const calculatePressureDrop = () => {
    const length = parseFloat(pipeLength);
    const flow = parseFloat(flowRate);
    if (!length || !flow) return;

    const pipe = frictionLoss[pipeSize];
    if (!pipe) return;

    // Equivalent length for fittings
    const elbowCount = parseInt(fittings.elbows) || 0;
    const teeCount = parseInt(fittings.tees) || 0;
    const valveCount = parseInt(fittings.valves) || 0;

    const fittingsLength = 
      (elbowCount * pipe.eqElbow) + 
      (teeCount * pipe.eqTee) + 
      (valveCount * pipe.eqValve);

    const totalLength = length + fittingsLength;

    // Pressure drop calculation (simplified - actual varies with flow²)
    // Base factor × (flow/10)² for scaling
    const flowFactor = Math.pow(flow / 10, 2);
    const dropPerMetre = pipe.factor * flowFactor;
    const totalDrop = dropPerMetre * totalLength;

    // Convert to different units
    const dropKpa = totalDrop / 10;
    const dropMHead = totalDrop / 98.07;

    setResult({
      pipeLength: length,
      fittingsLength: fittingsLength.toFixed(1),
      totalLength: totalLength.toFixed(1),
      dropPerMetre: dropPerMetre.toFixed(3),
      totalMbar: totalDrop.toFixed(1),
      totalKpa: dropKpa.toFixed(2),
      totalMHead: dropMHead.toFixed(3),
      isAcceptable: dropPerMetre <= 0.4, // <400 Pa/m is generally acceptable
    });
  };

  const resetAll = () => {
    setPipeLength('');
    setFlowRate('');
    setFittings({ elbows: '', tees: '', valves: '' });
    setResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-6 text-white">
          <h1 className="text-2xl font-bold">Pressure Drop</h1>
          <p className="text-teal-100 text-sm mt-1">Calculate friction losses in pipework</p>
        </div>

        <div className="p-6">
          {/* Pipe Size */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Pipe Size</label>
            <div className="grid grid-cols-3 gap-2">
              {['15', '22', '28', '35', '42', '54'].map((size) => (
                <button
                  key={size}
                  className={`py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                    pipeSize === size
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setPipeSize(size)}
                >
                  {size}mm
                </button>
              ))}
            </div>
          </div>

          {/* Pipe Length & Flow Rate */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Length (m)</label>
              <input
                type="number"
                value={pipeLength}
                onChange={(e) => setPipeLength(e.target.value)}
                placeholder="e.g. 25"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Flow (l/min)</label>
              <input
                type="number"
                value={flowRate}
                onChange={(e) => setFlowRate(e.target.value)}
                placeholder="e.g. 15"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Fittings */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Fittings Count</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Elbows</label>
                <input
                  type="number"
                  value={fittings.elbows}
                  onChange={(e) => setFittings({ ...fittings, elbows: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tees</label>
                <input
                  type="number"
                  value={fittings.tees}
                  onChange={(e) => setFittings({ ...fittings, tees: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Valves</label>
                <input
                  type="number"
                  value={fittings.valves}
                  onChange={(e) => setFittings({ ...fittings, valves: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={calculatePressureDrop}
              className="flex-1 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors"
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
              {/* Length Summary */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center text-sm">
                <div className="bg-white rounded-lg p-2">
                  <div className="text-xs text-gray-500">Pipe</div>
                  <div className="font-bold text-gray-700">{result.pipeLength}m</div>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <div className="text-xs text-gray-500">Fittings Eq.</div>
                  <div className="font-bold text-gray-700">{result.fittingsLength}m</div>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="font-bold text-teal-600">{result.totalLength}m</div>
                </div>
              </div>

              {/* Main Result */}
              <div className={`rounded-lg p-4 text-center mb-4 ${result.isAcceptable ? 'bg-teal-100' : 'bg-yellow-100'}`}>
                <div className="text-xs text-gray-600">Total Pressure Drop</div>
                <div className={`text-3xl font-bold ${result.isAcceptable ? 'text-teal-700' : 'text-yellow-700'}`}>
                  {result.totalMbar} mbar
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {result.totalKpa} kPa · {result.totalMHead} m head
                </div>
              </div>

              {/* Per Metre */}
              <div className={`rounded-lg p-3 text-center ${result.isAcceptable ? 'bg-green-100' : 'bg-yellow-100'}`}>
                <div className="text-xs text-gray-600">Drop per metre</div>
                <div className={`text-lg font-bold ${result.isAcceptable ? 'text-green-700' : 'text-yellow-700'}`}>
                  {result.dropPerMetre} mbar/m
                </div>
                <div className="text-xs text-gray-500">Target: &lt;0.4 mbar/m</div>
              </div>
            </div>
          )}

          {/* Index Circuit Note */}
          <div className="mt-6 bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
            <span className="font-medium">Tip:</span> Calculate for your index circuit (longest run) first.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PressureDropCalculator;
