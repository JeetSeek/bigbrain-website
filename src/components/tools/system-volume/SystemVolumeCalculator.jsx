import React, { useState, useMemo } from 'react';

/**
 * Central Heating System Volume Calculator
 * Calculates total system water volume for inhibitor/antifreeze dosing
 * Includes boiler, cylinder, radiators, and pipework volumes
 */

// Radiator volumes in litres (Type 21 double panel single convector — UK standard)
const RAD_VOLUMES = [
  { size: '600x400', litres: 3.1 },
  { size: '600x600', litres: 4.6 },
  { size: '600x800', litres: 6.2 },
  { size: '600x1000', litres: 7.7 },
  { size: '600x1200', litres: 9.3 },
  { size: '600x1400', litres: 10.8 },
  { size: '600x1600', litres: 12.4 },
  { size: '600x1800', litres: 13.9 },
  { size: '600x2000', litres: 15.5 },
  { size: '700x600', litres: 5.4 },
  { size: '700x800', litres: 7.2 },
  { size: '700x1000', litres: 9.0 },
  { size: '700x1200', litres: 10.8 },
  { size: '700x1400', litres: 12.6 },
  { size: '700x1600', litres: 14.4 },
  { size: '700x1800', litres: 16.2 },
  { size: '700x2000', litres: 18.0 },
];

// Pipe volumes in litres per metre
const PIPE_VOLUMES = [
  { size: '8mm (microbore)', litresPerM: 0.036 },
  { size: '10mm (microbore)', litresPerM: 0.055 },
  { size: '15mm', litresPerM: 0.145 },
  { size: '22mm', litresPerM: 0.320 },
  { size: '28mm', litresPerM: 0.539 },
  { size: '35mm', litresPerM: 0.855 },
  { size: '42mm', litresPerM: 1.232 },
];

// Typical boiler water contents
const BOILER_VOLUMES = [
  { type: 'Combi (typical)', litres: 2.0 },
  { type: 'System boiler', litres: 3.0 },
  { type: 'Regular boiler', litres: 4.0 },
  { type: 'Floor standing', litres: 8.0 },
];

// Inhibitor dosing rates
const INHIBITORS = [
  { name: 'Sentinel X100', dosePerLitre: 0.01, unit: 'litres', description: '1 litre per 100 litres system volume' },
  { name: 'Fernox F1 Protector', dosePerLitre: 0.01, unit: 'litres', description: '1 litre per 100 litres system volume' },
  { name: 'Adey MC1+', dosePerLitre: 0.005, unit: 'litres', description: '500ml per 100 litres system volume' },
  { name: 'Sentinel X500 Cleaner', dosePerLitre: 0.01, unit: 'litres', description: '1 litre per 100 litres (flush only)' },
  { name: 'Fernox F3 Cleaner', dosePerLitre: 0.01, unit: 'litres', description: '1 litre per 100 litres (flush only)' },
  { name: 'Sentinel R800 Antifreeze', dosePerLitre: 0.35, unit: 'litres', description: '35% concentration for -15°C protection' },
];

const SystemVolumeCalculator = () => {
  const [boilerVolume, setBoilerVolume] = useState('2.0');
  const [cylinderVolume, setCylinderVolume] = useState('0');
  const [rads, setRads] = useState([{ id: 1, size: '600x1000', qty: 1 }]);
  const [pipes, setPipes] = useState([{ id: 1, size: '15mm', length: '' }]);
  const [extraVolume, setExtraVolume] = useState('');

  const addRad = () => setRads(prev => [...prev, { id: Date.now(), size: '600x1000', qty: 1 }]);
  const removeRad = (id) => { if (rads.length > 1) setRads(prev => prev.filter(r => r.id !== id)); };
  const updateRad = (id, field, value) => setRads(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

  const addPipe = () => setPipes(prev => [...prev, { id: Date.now(), size: '15mm', length: '' }]);
  const removePipe = (id) => { if (pipes.length > 1) setPipes(prev => prev.filter(p => p.id !== id)); };
  const updatePipe = (id, field, value) => setPipes(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

  const results = useMemo(() => {
    const boiler = parseFloat(boilerVolume) || 0;
    const cylinder = parseFloat(cylinderVolume) || 0;
    const extra = parseFloat(extraVolume) || 0;

    // Radiator volumes
    const radTotal = rads.reduce((sum, r) => {
      const rv = RAD_VOLUMES.find(v => v.size === r.size);
      return sum + (rv ? rv.litres * (parseInt(r.qty) || 0) : 0);
    }, 0);

    // Pipe volumes
    const pipeTotal = pipes.reduce((sum, p) => {
      const pv = PIPE_VOLUMES.find(v => v.size === p.size);
      const len = parseFloat(p.length) || 0;
      return sum + (pv ? pv.litresPerM * len : 0);
    }, 0);

    const totalVolume = boiler + cylinder + radTotal + pipeTotal + extra;

    // Dosing calculations
    const dosing = INHIBITORS.map(inh => ({
      ...inh,
      required: totalVolume * inh.dosePerLitre,
    }));

    return {
      boiler,
      cylinder,
      radTotal: Math.round(radTotal * 10) / 10,
      pipeTotal: Math.round(pipeTotal * 10) / 10,
      extra,
      totalVolume: Math.round(totalVolume * 10) / 10,
      dosing,
    };
  }, [boilerVolume, cylinderVolume, rads, pipes, extraVolume]);

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-3xl mx-auto pb-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 p-4 sm:p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0">
            💧
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">System Volume</h1>
            <p className="text-sm text-white/70 mt-0.5">Calculate water volume for inhibitor & antifreeze dosing</p>
          </div>
        </div>
      </div>

      {/* Boiler & Cylinder */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Boiler & Cylinder</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Boiler Volume (litres)</label>
            <select
              value={boilerVolume}
              onChange={(e) => setBoilerVolume(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-sm text-gray-900 bg-white"
            >
              {BOILER_VOLUMES.map(b => (
                <option key={b.type} value={b.litres}>{b.type} ({b.litres}L)</option>
              ))}
              <option value="0">None / Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">HW Cylinder (litres)</label>
            <select
              value={cylinderVolume}
              onChange={(e) => setCylinderVolume(e.target.value)}
              className="w-full px-3 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-sm text-gray-900 bg-white"
            >
              <option value="0">None (Combi)</option>
              <option value="6">Indirect coil (~6L)</option>
              <option value="10">Large indirect coil (~10L)</option>
              <option value="15">Thermal store (~15L)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Radiators */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Radiators (Type 21)</h2>
          <button onClick={addRad} className="text-xs font-medium text-blue-600 hover:text-blue-700">+ Add Size</button>
        </div>
        <div className="space-y-2">
          {rads.map((rad) => (
            <div key={rad.id} className="flex items-center gap-2">
              <select
                value={rad.size}
                onChange={(e) => updateRad(rad.id, 'size', e.target.value)}
                className="flex-1 px-3 py-2 min-h-[44px] border border-gray-200 rounded-xl text-sm text-gray-900 bg-white"
              >
                {RAD_VOLUMES.map(rv => {
                  const [h, w] = rv.size.split('x');
                  return <option key={rv.size} value={rv.size}>{h}mm × {w}mm ({rv.litres}L each)</option>;
                })}
              </select>
              <div className="w-16">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={rad.qty}
                  onChange={(e) => updateRad(rad.id, 'qty', e.target.value)}
                  className="w-full px-2 py-2 min-h-[44px] border border-gray-200 rounded-xl text-sm text-center text-gray-900"
                  placeholder="Qty"
                />
              </div>
              {rads.length > 1 && (
                <button onClick={() => removeRad(rad.id)} className="text-red-400 hover:text-red-600 px-1 text-lg">×</button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Pipework */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pipework (estimated)</h2>
          <button onClick={addPipe} className="text-xs font-medium text-blue-600 hover:text-blue-700">+ Add Run</button>
        </div>
        <div className="space-y-2">
          {pipes.map((pipe) => (
            <div key={pipe.id} className="flex items-center gap-2">
              <select
                value={pipe.size}
                onChange={(e) => updatePipe(pipe.id, 'size', e.target.value)}
                className="flex-1 px-3 py-2 min-h-[44px] border border-gray-200 rounded-xl text-sm text-gray-900 bg-white"
              >
                {PIPE_VOLUMES.map(pv => (
                  <option key={pv.size} value={pv.size}>{pv.size} ({pv.litresPerM}L/m)</option>
                ))}
              </select>
              <div className="w-20">
                <input
                  type="number"
                  inputMode="decimal"
                  value={pipe.length}
                  onChange={(e) => updatePipe(pipe.id, 'length', e.target.value)}
                  placeholder="metres"
                  className="w-full px-2 py-2 min-h-[44px] border border-gray-200 rounded-xl text-sm text-center text-gray-900"
                />
              </div>
              {pipes.length > 1 && (
                <button onClick={() => removePipe(pipe.id)} className="text-red-400 hover:text-red-600 px-1 text-lg">×</button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400">Tip: Typical 3-bed house has ~50m of 15mm and ~20m of 22mm pipe</p>
      </section>

      {/* Extra */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Additional Volume (litres)</label>
        <input
          type="number"
          inputMode="decimal"
          value={extraVolume}
          onChange={(e) => setExtraVolume(e.target.value)}
          placeholder="Buffer vessel, UFH manifold, etc."
          className="w-full px-3 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-sm text-gray-900"
        />
      </section>

      {/* Results */}
      {results.totalVolume > 0 && (
        <section className="space-y-3">
          {/* Total Volume */}
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-5 text-white">
            <div className="text-sm text-white/70 mb-1">Total System Volume</div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{results.totalVolume}</span>
              <span className="text-lg text-white/80">litres</span>
            </div>
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-white/20 text-sm text-white/60">
              <div>Boiler: {results.boiler}L</div>
              <div>Cylinder: {results.cylinder}L</div>
              <div>Rads: {results.radTotal}L</div>
              <div>Pipes: {results.pipeTotal}L</div>
              {results.extra > 0 && <div>Extra: {results.extra}L</div>}
            </div>
          </div>

          {/* Dosing Table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-green-50 border-b border-green-100">
              <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider">Dosing Requirements</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {results.dosing.map((d, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{d.name}</div>
                    <div className="text-xs text-gray-400">{d.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-600 font-mono">
                      {d.required >= 1 ? d.required.toFixed(1) : (d.required * 1000).toFixed(0) + 'ml'}
                      {d.required >= 1 ? 'L' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Info */}
      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-600">
        <p className="font-semibold mb-1">Notes</p>
        <ul className="list-disc pl-4 space-y-0.5 text-blue-500">
          <li>Radiator volumes are based on Type 21 (P+) — the most common UK panel radiator</li>
          <li>Type 11 rads hold roughly 60% of Type 21 volume; Type 22 holds about 130%</li>
          <li>Always dose inhibitor after a full system flush with cleaner</li>
          <li>Antifreeze protects to approx -15°C at 35% concentration</li>
          <li>Check manufacturer instructions for exact dosing — values shown are typical</li>
        </ul>
      </div>
    </div>
  );
};

export default SystemVolumeCalculator;
