import React, { useState, useMemo } from 'react';

/**
 * Ventilation Calculator (BS 5440-2)
 * Calculates required permanent ventilation for gas appliances
 * Based on BS 5440-2:2000 and IGE/UP/10
 */

const APPLIANCE_TYPES = [
  { id: 'open_flue', label: 'Open Flue', ventRate: 5, unit: 'cm² per kW(net)', description: 'Natural draught open-flue appliance' },
  { id: 'flueless', label: 'Flueless', ventRate: 5, unit: 'cm² per kW(net)', description: 'Flueless space heater (max 6kW)' },
  { id: 'flueless_cooker', label: 'Flueless Cooker', ventRate: 0, unit: '', description: 'Room ≥10m³: no additional vent needed. Room 5–10m³: 100cm² permanent vent required. Room <5m³: not permitted (BS 5440-2).' },
  { id: 'flueless_water_heater', label: 'Flueless Water Heater', ventRate: 5, unit: 'cm² per kW(net)', description: 'Flueless instantaneous water heater (max 11kW)' },
  { id: 'room_sealed', label: 'Room Sealed (Balanced Flue)', ventRate: 0, unit: '', description: 'No additional ventilation required' },
  { id: 'open_flue_compartment', label: 'Open Flue (in Compartment)', ventRate: 10, unit: 'cm² per kW(net)', description: 'Open-flue appliance in a cupboard/compartment — high + low vents' },
  { id: 'room_sealed_compartment', label: 'Room Sealed (in Compartment)', ventRate: 5, unit: 'cm² per kW(net)', description: 'Room-sealed appliance in a cupboard/compartment for cooling' },
];

const VENT_TYPES = [
  { id: 'air_brick', label: 'Air Brick (215×65mm)', freeArea: 96, unit: 'cm²' },
  { id: 'air_brick_140', label: 'Air Brick (215×140mm)', freeArea: 168, unit: 'cm²' },
  { id: 'hit_miss', label: 'Hit & Miss Vent', freeArea: 50, unit: 'cm² (typical)' },
  { id: 'louvre', label: 'Louvred Vent (100mm duct)', freeArea: 50, unit: 'cm²' },
  { id: 'mushroom', label: 'Mushroom Vent', freeArea: 30, unit: 'cm²' },
  { id: 'custom', label: 'Custom Size', freeArea: 0, unit: 'cm²' },
];

const VentilationCalculator = () => {
  const [applianceType, setApplianceType] = useState('open_flue');
  const [inputKw, setInputKw] = useState('');
  const [selectedVent, setSelectedVent] = useState('air_brick');
  const [customFreeArea, setCustomFreeArea] = useState('');
  const [ducted, setDucted] = useState(false);

  const selectedAppliance = useMemo(
    () => APPLIANCE_TYPES.find(a => a.id === applianceType),
    [applianceType]
  );

  const ventInfo = useMemo(
    () => VENT_TYPES.find(v => v.id === selectedVent),
    [selectedVent]
  );

  const results = useMemo(() => {
    const kw = parseFloat(inputKw);
    if (!kw || kw <= 0 || !selectedAppliance) return null;

    const rate = selectedAppliance.ventRate;
    let requiredArea = rate * kw; // cm²

    // If ducted, increase by 50% per BS 5440-2 Table 2 Note 1
    if (ducted && requiredArea > 0) {
      requiredArea *= 1.5;
    }

    // Room sealed appliances need no vent (unless in compartment)
    if (applianceType === 'room_sealed') {
      return {
        requiredArea: 0,
        note: 'Room-sealed appliances draw combustion air from outside. No room ventilation is required.',
        ventsNeeded: 0,
      };
    }

    if (applianceType === 'flueless_cooker') {
      return {
        requiredArea: 0,
        note: 'BS 5440-2: Room ≥10m³ — no additional permanent ventilation required. Room 5–10m³ — 100cm² permanent vent required. Room <5m³ — installation NOT permitted. Always verify room volume before proceeding.',
        ventsNeeded: 0,
      };
    }

    const ventFreeArea = selectedVent === 'custom'
      ? parseFloat(customFreeArea) || 0
      : ventInfo?.freeArea || 0;

    const ventsNeeded = ventFreeArea > 0 ? Math.ceil(requiredArea / ventFreeArea) : 0;

    return {
      requiredArea: Math.round(requiredArea),
      rate,
      ducted,
      ductedMultiplier: ducted ? 1.5 : 1,
      baseArea: Math.round(rate * kw),
      ventsNeeded,
      ventFreeArea,
      note: applianceType.includes('compartment')
        ? 'For compartment installations, provide vents at both high and low level. Each vent should provide at least half the total requirement.'
        : null,
    };
  }, [inputKw, applianceType, selectedVent, customFreeArea, ducted, selectedAppliance, ventInfo]);

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-3xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 p-4 sm:p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0">
            💨
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Ventilation Calculator</h1>
            <p className="text-sm text-white/70 mt-0.5">BS 5440-2 — Permanent ventilation sizing</p>
          </div>
        </div>
      </div>

      {/* Appliance type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Appliance Type</label>
        <select
          value={applianceType}
          onChange={(e) => setApplianceType(e.target.value)}
          className="w-full px-4 py-3 min-h-[44px] border border-gray-200 rounded-xl text-[16px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        >
          {APPLIANCE_TYPES.map(a => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
        {selectedAppliance && (
          <p className="text-xs text-gray-500 mt-1">{selectedAppliance.description}</p>
        )}
      </div>

      {/* Heat input */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Appliance Net Heat Input (kW)</label>
        <input
          type="text"
          inputMode="decimal"
          value={inputKw}
          onChange={(e) => setInputKw(e.target.value)}
          placeholder="e.g. 30"
          className="w-full px-4 py-3 min-h-[44px] border border-gray-200 rounded-xl text-[16px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Ducted option */}
      {selectedAppliance?.ventRate > 0 && (
        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={ducted}
            onChange={(e) => setDucted(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-900">Ducted ventilation</span>
            <p className="text-xs text-gray-500">Add 50% to free area if air ducted to/from outside</p>
          </div>
        </label>
      )}

      {/* Vent type selector */}
      {selectedAppliance?.ventRate > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Vent Type</label>
          <select
            value={selectedVent}
            onChange={(e) => setSelectedVent(e.target.value)}
            className="w-full px-4 py-3 min-h-[44px] border border-gray-200 rounded-xl text-[16px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            {VENT_TYPES.map(v => (
              <option key={v.id} value={v.id}>{v.label} — {v.freeArea > 0 ? `${v.freeArea}cm²` : 'enter size'}</option>
            ))}
          </select>
          {selectedVent === 'custom' && (
            <input
              type="text"
              inputMode="decimal"
              value={customFreeArea}
              onChange={(e) => setCustomFreeArea(e.target.value)}
              placeholder="Free area in cm²"
              className="w-full mt-2 px-4 py-3 min-h-[44px] border border-gray-200 rounded-xl text-[16px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          )}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-3">
          <h3 className="font-bold text-teal-900 text-base">Ventilation Requirement</h3>
          
          {results.requiredArea > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-teal-700">{results.requiredArea}</p>
                  <p className="text-xs text-gray-500 mt-1">cm² free area required</p>
                </div>
                {results.ventsNeeded > 0 && (
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-teal-700">{results.ventsNeeded}</p>
                    <p className="text-xs text-gray-500 mt-1">vent{results.ventsNeeded !== 1 ? 's' : ''} needed</p>
                  </div>
                )}
              </div>

              {/* Calculation breakdown */}
              <div className="text-xs text-teal-800 space-y-1 bg-teal-100/50 rounded-lg p-3">
                <p><strong>Calculation:</strong> {inputKw} kW × {results.rate} cm²/kW = {results.baseArea} cm²</p>
                {results.ducted && (
                  <p><strong>Ducted adjustment:</strong> {results.baseArea} cm² × 1.5 = {results.requiredArea} cm²</p>
                )}
                {results.ventsNeeded > 0 && (
                  <p><strong>Vents:</strong> {results.requiredArea} cm² ÷ {results.ventFreeArea} cm² = {results.ventsNeeded} vent{results.ventsNeeded !== 1 ? 's' : ''}</p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg p-3">
              <p className="text-sm text-teal-800">✅ No additional permanent ventilation required.</p>
            </div>
          )}

          {results.note && (
            <div className="flex items-start gap-2 text-xs text-teal-700">
              <span className="text-sm mt-0.5">ℹ️</span>
              <p>{results.note}</p>
            </div>
          )}
        </div>
      )}

      {/* Reference */}
      <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-600">Quick Reference (BS 5440-2)</p>
        <p>• Open flue in room: <strong>5 cm² per kW(net)</strong></p>
        <p>• Open flue in compartment: <strong>10 cm² per kW(net)</strong> (high + low)</p>
        <p>• Room sealed in compartment: <strong>5 cm² per kW(net)</strong> (cooling)</p>
        <p>• Flueless heater: <strong>5 cm² per kW(net)</strong></p>
        <p>• Add <strong>50%</strong> if ventilation air is ducted</p>
        <p>• Flueless cooker \u226510m\u00b3: <strong>No vent.</strong> 5\u201310m\u00b3: <strong>100cm\u00b2.</strong> &lt;5m\u00b3: <strong>Not permitted</strong></p>
        <p>• Room sealed (not in compartment): <strong>No vent required</strong></p>
      </div>
    </div>
  );
};

export default VentilationCalculator;
