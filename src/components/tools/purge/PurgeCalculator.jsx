import React, { useState, useMemo } from 'react';

/**
 * Gas Purge Volume & Tightness Test Calculator
 * Calculates purge volumes based on pipe diameter and length
 * and let-by test durations per IGE/UP/1B and BS 6891
 */

const PIPE_SIZES = [
  { id: '15', label: '15mm (½")', diameterMm: 15, internalMm: 13.6 },
  { id: '22', label: '22mm (¾")', diameterMm: 22, internalMm: 20.2 },
  { id: '28', label: '28mm (1")', diameterMm: 28, internalMm: 26.2 },
  { id: '35', label: '35mm (1¼")', diameterMm: 35, internalMm: 33.0 },
  { id: '42', label: '42mm (1½")', diameterMm: 42, internalMm: 39.6 },
  { id: '54', label: '54mm (2")', diameterMm: 54, internalMm: 51.6 },
];

// Tightness test criteria per BS 6891
const TIGHTNESS_CRITERIA = {
  small: {
    label: 'Domestic (≤0.035m³)',
    testPressure: 20, // mbar
    duration: 2, // minutes
    permittedDrop: 0, // mbar - no perceptible drop
    description: 'Pressurize to 20mbar. No perceptible drop in 2 minutes.',
  },
  medium: {
    label: 'Medium Install (0.035–0.14m³)',
    testPressure: 20,
    duration: 2,
    permittedDrop: 4,
    description: 'Pressurize to 20mbar. Max 4mbar drop in 2 minutes, then re-test — no further drop in 1 minute.',
  },
  large: {
    label: 'Large Install (>0.14m³)',
    testPressure: 20,
    duration: 0,
    permittedDrop: 0,
    description: 'For installations >0.14m³, consult IGE/UP/1B for specific test procedures and durations.',
  },
};

const PurgeCalculator = () => {
  const [pipes, setPipes] = useState([{ id: 1, size: '22', length: '' }]);

  const addPipe = () => {
    setPipes(prev => [...prev, { id: Date.now(), size: '22', length: '' }]);
  };

  const removePipe = (id) => {
    if (pipes.length > 1) {
      setPipes(prev => prev.filter(p => p.id !== id));
    }
  };

  const updatePipe = (id, field, value) => {
    setPipes(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const results = useMemo(() => {
    let totalVolumeLitres = 0;
    const pipeResults = [];

    for (const pipe of pipes) {
      const length = parseFloat(pipe.length);
      if (!length || length <= 0) continue;

      const pipeInfo = PIPE_SIZES.find(p => p.id === pipe.size);
      if (!pipeInfo) continue;

      // Volume = π × r² × length (convert mm to m)
      const radiusM = (pipeInfo.internalMm / 2) / 1000;
      const lengthM = length;
      const volumeM3 = Math.PI * radiusM * radiusM * lengthM;
      const volumeLitres = volumeM3 * 1000;

      totalVolumeLitres += volumeLitres;
      pipeResults.push({
        ...pipe,
        pipeInfo,
        lengthM,
        volumeLitres: volumeLitres.toFixed(3),
        volumeM3: volumeM3.toFixed(6),
      });
    }

    if (pipeResults.length === 0) return null;

    const totalVolumeM3 = totalVolumeLitres / 1000;

    // Purge volume = 5× pipe volume (industry standard for safe purge)
    const purgeVolumeLitres = totalVolumeLitres * 5;

    // Determine tightness test category
    let testCategory;
    if (totalVolumeM3 <= 0.035) {
      testCategory = TIGHTNESS_CRITERIA.small;
    } else if (totalVolumeM3 <= 0.14) {
      testCategory = TIGHTNESS_CRITERIA.medium;
    } else {
      testCategory = TIGHTNESS_CRITERIA.large;
    }

    return {
      pipes: pipeResults,
      totalVolumeLitres: totalVolumeLitres.toFixed(3),
      totalVolumeM3: totalVolumeM3.toFixed(6),
      purgeVolumeLitres: purgeVolumeLitres.toFixed(1),
      testCategory,
    };
  }, [pipes]);

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-3xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-4 sm:p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0">
            🔧
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Purge & Tightness Test</h1>
            <p className="text-sm text-white/70 mt-0.5">Pipe volume, purge volume & test criteria (BS 6891)</p>
          </div>
        </div>
      </div>

      {/* Pipe sections */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700">Pipe Sections</label>
        {pipes.map((pipe, index) => (
          <div key={pipe.id} className="flex items-center gap-2">
            <select
              value={pipe.size}
              onChange={(e) => updatePipe(pipe.id, 'size', e.target.value)}
              className="flex-1 px-3 py-3 min-h-[44px] border border-gray-200 rounded-xl text-[16px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {PIPE_SIZES.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={pipe.length}
              onChange={(e) => updatePipe(pipe.id, 'length', e.target.value)}
              placeholder="Length (m)"
              className="w-28 px-3 py-3 min-h-[44px] border border-gray-200 rounded-xl text-[16px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            {pipes.length > 1 && (
              <button
                onClick={() => removePipe(pipe.id)}
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-200 active:scale-95 transition-transform"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addPipe}
          className="w-full py-3 min-h-[44px] border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-cyan-400 hover:text-cyan-600 active:scale-[0.98] transition-all"
        >
          + Add Pipe Section
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-3">
          {/* Volume results */}
          <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-xl space-y-3">
            <h3 className="font-bold text-cyan-900 text-base">Pipe Volume & Purge</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-cyan-700">{results.totalVolumeLitres}</p>
                <p className="text-xs text-gray-500 mt-1">litres total volume</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-cyan-700">{results.purgeVolumeLitres}</p>
                <p className="text-xs text-gray-500 mt-1">litres purge volume (5×)</p>
              </div>
            </div>

            {/* Per-pipe breakdown */}
            {results.pipes.length > 1 && (
              <div className="text-xs text-cyan-800 bg-cyan-100/50 rounded-lg p-3 space-y-1">
                <p className="font-semibold">Breakdown:</p>
                {results.pipes.map((p, i) => (
                  <p key={p.id}>
                    {p.pipeInfo.label} × {p.lengthM}m = {p.volumeLitres}L
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Tightness test criteria */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <h3 className="font-bold text-amber-900 text-base">Tightness Test (BS 6891)</h3>
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm font-semibold text-amber-800">{results.testCategory.label}</p>
              <p className="text-sm text-amber-700 mt-1">{results.testCategory.description}</p>
              <p className="text-xs text-gray-500 mt-2">
                Total installation volume: {results.totalVolumeM3} m³
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reference */}
      <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-600">Quick Reference (IGE/UP/1B &amp; BS 6891)</p>
        <p>• <strong>Purge volume:</strong> 5× total pipe volume (natural gas)</p>
        <p>• <strong>≤0.035m³:</strong> 20mbar, no perceptible drop in 2 mins</p>
        <p>• <strong>0.035–0.14m³:</strong> 20mbar, max 4mbar drop in 2 mins, then stabilise 1 min</p>
        <p>• <strong>Always purge at each appliance</strong> until gas is detected at the outlet</p>
        <p>• Ensure all open ends are capped before tightness testing</p>
      </div>
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
        <p className="font-semibold">⚠️ LPG Systems — Different Procedure Required</p>
        <p>LPG (propane/butane) is <strong>heavier than air</strong> and accumulates in low-lying areas. Do NOT use this calculator for LPG purge volumes. Consult IGE/UP/1 Edition 2 and the relevant supplier/network procedure for LPG purging. Ensure adequate ventilation at low level before and during purging.</p>
      </div>
    </div>
  );
};

export default PurgeCalculator;
