import React, { useState, useMemo } from 'react';

/**
 * Radiator BTU/Output Calculator
 * Calculates required radiator output based on room dimensions and heat loss factors
 * Uses standard UK BTU calculation method with correction factors
 */

const ROOM_TYPES = [
  { id: 'living', label: 'Living Room', baseFactor: 1.0 },
  { id: 'bedroom', label: 'Bedroom', baseFactor: 0.9 },
  { id: 'kitchen', label: 'Kitchen', baseFactor: 0.95 },
  { id: 'bathroom', label: 'Bathroom', baseFactor: 1.1 },
  { id: 'hallway', label: 'Hallway / Landing', baseFactor: 1.05 },
  { id: 'conservatory', label: 'Conservatory', baseFactor: 1.3 },
  { id: 'dining', label: 'Dining Room', baseFactor: 1.0 },
  { id: 'utility', label: 'Utility Room', baseFactor: 0.95 },
];

const WINDOW_TYPES = [
  { id: 'double', label: 'Double Glazed', factor: 1.0 },
  { id: 'single', label: 'Single Glazed', factor: 1.2 },
  { id: 'triple', label: 'Triple Glazed', factor: 0.9 },
];

const WALL_TYPES = [
  { id: 'cavity_insulated', label: 'Cavity Wall (Insulated)', factor: 1.0 },
  { id: 'cavity_uninsulated', label: 'Cavity Wall (Uninsulated)', factor: 1.15 },
  { id: 'solid_insulated', label: 'Solid Wall (Insulated)', factor: 1.1 },
  { id: 'solid_uninsulated', label: 'Solid Wall (Uninsulated)', factor: 1.3 },
];

const FLOOR_TYPES = [
  { id: 'ground', label: 'Ground Floor', factor: 1.1 },
  { id: 'upper', label: 'Upper Floor', factor: 1.0 },
  { id: 'over_garage', label: 'Above Garage / Unheated', factor: 1.2 },
];

const EXPOSURE = [
  { id: 'sheltered', label: 'Sheltered (Terraced)', factor: 0.95 },
  { id: 'normal', label: 'Normal (Semi-detached)', factor: 1.0 },
  { id: 'exposed', label: 'Exposed (Detached)', factor: 1.1 },
  { id: 'very_exposed', label: 'Very Exposed (Hilltop)', factor: 1.2 },
];

const NORTH_FACING = [
  { id: 'no', label: 'No', factor: 1.0 },
  { id: 'yes', label: 'Yes (N/NE/NW)', factor: 1.15 },
];

const EXTERIOR_WALLS = [
  { id: '1', label: '1 wall', factor: 1.0 },
  { id: '2', label: '2 walls', factor: 1.1 },
  { id: '3', label: '3 walls', factor: 1.2 },
];

// Common radiator sizes (Type 21 double panel single convector — most popular UK rad)
const COMMON_RADS = [
  { size: '600x600', btu: 1778, watts: 521 },
  { size: '600x800', btu: 2370, watts: 695 },
  { size: '600x1000', btu: 2963, watts: 868 },
  { size: '600x1200', btu: 3556, watts: 1042 },
  { size: '600x1400', btu: 4148, watts: 1216 },
  { size: '600x1600', btu: 4741, watts: 1389 },
  { size: '600x1800', btu: 5333, watts: 1563 },
  { size: '600x2000', btu: 5926, watts: 1736 },
  { size: '700x600', btu: 2074, watts: 607 },
  { size: '700x800', btu: 2765, watts: 810 },
  { size: '700x1000', btu: 3456, watts: 1013 },
  { size: '700x1200', btu: 4148, watts: 1216 },
  { size: '700x1400', btu: 4839, watts: 1418 },
  { size: '700x1600', btu: 5530, watts: 1620 },
  { size: '700x1800', btu: 6222, watts: 1824 },
  { size: '700x2000', btu: 6913, watts: 2026 },
];

const RadiatorSizing = () => {
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('2.4');
  const [roomType, setRoomType] = useState('living');
  const [windowType, setWindowType] = useState('double');
  const [wallType, setWallType] = useState('cavity_insulated');
  const [floorType, setFloorType] = useState('ground');
  const [exposure, setExposure] = useState('normal');
  const [northFacing, setNorthFacing] = useState('no');
  const [exteriorWalls, setExteriorWalls] = useState('1');

  const results = useMemo(() => {
    const l = parseFloat(length);
    const w = parseFloat(width);
    const h = parseFloat(height);
    if (!l || !w || !h || l <= 0 || w <= 0 || h <= 0) return null;

    const volume = l * w * h; // m³
    
    // Base BTU: 153 BTU per m³ (standard UK heating to 21°C from -1°C ΔT=22°C)
    const baseBtu = volume * 153;

    // Apply all correction factors
    const roomF = ROOM_TYPES.find(r => r.id === roomType)?.baseFactor || 1.0;
    const windowF = WINDOW_TYPES.find(w => w.id === windowType)?.factor || 1.0;
    const wallF = WALL_TYPES.find(w => w.id === wallType)?.factor || 1.0;
    const floorF = FLOOR_TYPES.find(f => f.id === floorType)?.factor || 1.0;
    const exposureF = EXPOSURE.find(e => e.id === exposure)?.factor || 1.0;
    const northF = NORTH_FACING.find(n => n.id === northFacing)?.factor || 1.0;
    const extWallF = EXTERIOR_WALLS.find(e => e.id === exteriorWalls)?.factor || 1.0;

    const totalFactor = roomF * windowF * wallF * floorF * exposureF * northF * extWallF;
    const requiredBtu = Math.round(baseBtu * totalFactor);
    const requiredWatts = Math.round(requiredBtu * 0.293);

    // Find suitable radiators
    const suitable = COMMON_RADS.filter(r => r.btu >= requiredBtu)
      .sort((a, b) => a.btu - b.btu)
      .slice(0, 3);

    return {
      volume: volume.toFixed(1),
      baseBtu: Math.round(baseBtu),
      totalFactor: totalFactor.toFixed(2),
      requiredBtu,
      requiredWatts,
      suitable,
    };
  }, [length, width, height, roomType, windowType, wallType, floorType, exposure, northFacing, exteriorWalls]);

  const SelectField = ({ label, value, onChange, options }) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-3xl mx-auto pb-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-4 sm:p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0">
            🔥
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Radiator Sizing</h1>
            <p className="text-sm text-white/70 mt-0.5">Calculate required BTU output per room</p>
          </div>
        </div>
      </div>

      {/* Room Dimensions */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Room Dimensions (metres)</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Length</label>
            <input
              type="number"
              inputMode="decimal"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="e.g. 5.0"
              className="w-full px-3 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Width</label>
            <input
              type="number"
              inputMode="decimal"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="e.g. 4.0"
              className="w-full px-3 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Height</label>
            <input
              type="number"
              inputMode="decimal"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="2.4"
              className="w-full px-3 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Room Factors */}
      <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Room Factors</h2>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Room Type" value={roomType} onChange={setRoomType} options={ROOM_TYPES} />
          <SelectField label="Glazing" value={windowType} onChange={setWindowType} options={WINDOW_TYPES} />
          <SelectField label="Wall Type" value={wallType} onChange={setWallType} options={WALL_TYPES} />
          <SelectField label="Floor Level" value={floorType} onChange={setFloorType} options={FLOOR_TYPES} />
          <SelectField label="Exposure" value={exposure} onChange={setExposure} options={EXPOSURE} />
          <SelectField label="North Facing" value={northFacing} onChange={setNorthFacing} options={NORTH_FACING} />
          <SelectField label="Exterior Walls" value={exteriorWalls} onChange={setExteriorWalls} options={EXTERIOR_WALLS} />
        </div>
      </section>

      {/* Results */}
      {results && (
        <section className="space-y-3">
          {/* Primary Result */}
          <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-5 text-white">
            <div className="text-sm text-white/70 mb-1">Required Radiator Output</div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold">{results.requiredBtu.toLocaleString()}</span>
              <span className="text-lg text-white/80">BTU/h</span>
            </div>
            <div className="text-sm text-white/70 mt-1">{results.requiredWatts.toLocaleString()} Watts</div>
            <div className="flex gap-4 mt-4 pt-3 border-t border-white/20 text-sm text-white/60">
              <div>Room: {results.volume}m³</div>
              <div>Base: {results.baseBtu.toLocaleString()} BTU</div>
              <div>Factor: ×{results.totalFactor}</div>
            </div>
          </div>

          {/* Suggested Radiators */}
          {results.suitable.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Suitable Radiators (Type 21 — Double Panel Single Convector)
              </h3>
              <div className="space-y-2">
                {results.suitable.map((rad, i) => {
                  const [h, w] = rad.size.split('x');
                  const isFirst = i === 0;
                  return (
                    <div
                      key={rad.size}
                      className={`flex items-center justify-between p-3 rounded-xl ${isFirst ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}
                    >
                      <div>
                        <div className="font-semibold text-sm text-gray-900">
                          {h}mm × {w}mm
                          {isFirst && <span className="ml-2 text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Best fit</span>}
                        </div>
                        <div className="text-xs text-gray-500">{rad.watts}W / {rad.btu.toLocaleString()} BTU</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${isFirst ? 'text-green-600' : 'text-gray-600'}`}>
                          +{Math.round(((rad.btu - results.requiredBtu) / results.requiredBtu) * 100)}%
                        </div>
                        <div className="text-xs text-gray-400">headroom</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Outputs based on Type 21 (P+) radiators at <strong>ΔT50 (75/65/20°C)</strong>. Modern condensing boilers running at lower flow temps (e.g. 70/50°C = ΔT40) will produce <strong>~20% less output</strong>. Upsize radiators accordingly. Always verify against manufacturer data sheets.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Info */}
      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-600">
        <p className="font-semibold mb-1">Calculation Notes</p>
        <ul className="list-disc pl-4 space-y-0.5 text-blue-500">
          <li>Based on standard UK design conditions: 21°C room temp, -1°C outside (ΔT = 22°C)</li>
          <li>153 BTU/m³ base rate with correction factors for insulation, exposure, etc.</li>
          <li>Always allow 10-15% extra for rooms with large windows or poor insulation</li>
          <li>For underfloor heating areas, reduce requirement by 20%</li>
        </ul>
      </div>
    </div>
  );
};

export default RadiatorSizing;
