import React, { useState, useMemo } from 'react';

/**
 * Pressure Unit Converter
 * Converts between bar, mbar, psi, kPa, metres head (mH2O), and mmHg
 * Includes common reference pressures for gas engineers
 */

const UNITS = [
  { id: 'mbar', label: 'mbar', fullName: 'Millibar', toMbar: 1 },
  { id: 'bar', label: 'bar', fullName: 'Bar', toMbar: 1000 },
  { id: 'psi', label: 'psi', fullName: 'Pounds per sq inch', toMbar: 68.9476 },
  { id: 'kpa', label: 'kPa', fullName: 'Kilopascal', toMbar: 10 },
  { id: 'pa', label: 'Pa', fullName: 'Pascal', toMbar: 0.01 },
  { id: 'mh2o', label: 'mH₂O', fullName: 'Metres head', toMbar: 98.0665 },
  { id: 'mmhg', label: 'mmHg', fullName: 'Millimetres mercury', toMbar: 1.33322 },
  { id: 'inwc', label: 'inWC', fullName: 'Inches water column', toMbar: 2.4884 },
];

const REFERENCE_PRESSURES = [
  { label: 'Natural gas supply (normal)', value: '21 mbar', category: 'gas' },
  { label: 'Natural gas supply (min)', value: '19.15 mbar', category: 'gas' },
  { label: 'Natural gas supply (max)', value: '23 mbar', category: 'gas' },
  { label: 'LPG supply (propane)', value: '37 mbar', category: 'gas' },
  { label: 'LPG supply (butane)', value: '28 mbar', category: 'gas' },
  { label: 'Tightness test pressure', value: '20 mbar', category: 'gas' },
  { label: 'Combi boiler (typical)', value: '1.0–1.5 bar', category: 'water' },
  { label: 'System boiler (typical)', value: '1.0–2.0 bar', category: 'water' },
  { label: 'Mains water (typical)', value: '2–4 bar', category: 'water' },
  { label: 'Unvented cylinder (max)', value: '3.5 bar', category: 'water' },
  { label: 'PRV setting (standard)', value: '3.0 bar', category: 'water' },
  { label: 'Expansion vessel pre-charge', value: '0.5–1.0 bar', category: 'water' },
];

const PressureConverter = () => {
  const [inputValue, setInputValue] = useState('');
  const [fromUnit, setFromUnit] = useState('bar');
  const [showRef, setShowRef] = useState(false);

  const conversions = useMemo(() => {
    const val = parseFloat(inputValue);
    if (!val && val !== 0) return null;

    const from = UNITS.find(u => u.id === fromUnit);
    if (!from) return null;

    const mbarValue = val * from.toMbar;

    return UNITS.map(u => ({
      ...u,
      converted: mbarValue / u.toMbar,
      isCurrent: u.id === fromUnit,
    }));
  }, [inputValue, fromUnit]);

  const formatNumber = (num) => {
    if (Math.abs(num) >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
    if (Math.abs(num) >= 1) return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
    if (Math.abs(num) >= 0.001) return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
    return num.toExponential(3);
  };

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-3xl mx-auto pb-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 sm:p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0">
            🔄
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Pressure Converter</h1>
            <p className="text-sm text-white/70 mt-0.5">bar, mbar, psi, kPa, mH₂O & more</p>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Value</label>
            <input
              type="number"
              inputMode="decimal"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter pressure..."
              className="w-full px-3 py-3 min-h-[44px] border border-gray-200 rounded-xl text-lg font-semibold text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="w-full px-3 py-3 min-h-[44px] border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 bg-white focus:ring-2 focus:ring-violet-500"
            >
              {UNITS.map(u => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: '1 bar', unit: 'bar', val: '1' },
            { label: '21 mbar', unit: 'mbar', val: '21' },
            { label: '1.5 bar', unit: 'bar', val: '1.5' },
            { label: '3 bar', unit: 'bar', val: '3' },
            { label: '20 mbar', unit: 'mbar', val: '20' },
          ].map(p => (
            <button
              key={p.label}
              onClick={() => { setInputValue(p.val); setFromUnit(p.unit); }}
              className="px-2.5 py-1 text-xs font-medium bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 active:scale-95 transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {conversions && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Conversions</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {conversions.filter(c => !c.isCurrent).map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div>
                  <span className="text-sm font-semibold text-gray-900">{c.label}</span>
                  <span className="text-xs text-gray-400 ml-1.5">({c.fullName})</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-violet-600 font-mono">{formatNumber(c.converted)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reference Pressures Toggle */}
      <button
        onClick={() => setShowRef(!showRef)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span className="flex items-center gap-2">
          <span>📋</span> Common Reference Pressures
        </span>
        <span className="text-gray-400">{showRef ? '▲' : '▼'}</span>
      </button>

      {showRef && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Gas pressures */}
          <div className="px-4 py-2 bg-orange-50 border-b border-orange-100">
            <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider">Gas Pressures</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {REFERENCE_PRESSURES.filter(r => r.category === 'gas').map((ref, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-700">{ref.label}</span>
                <span className="text-sm font-semibold text-orange-600 font-mono">{ref.value}</span>
              </div>
            ))}
          </div>
          {/* Water pressures */}
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 border-t">
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Water / Heating Pressures</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {REFERENCE_PRESSURES.filter(r => r.category === 'water').map((ref, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-gray-700">{ref.label}</span>
                <span className="text-sm font-semibold text-blue-600 font-mono">{ref.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PressureConverter;
