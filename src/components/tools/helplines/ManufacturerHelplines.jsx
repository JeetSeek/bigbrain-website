import React, { useState, useMemo } from 'react';

/**
 * Manufacturer Technical Helpline Directory
 * One-tap phone numbers for boiler manufacturer technical support lines
 */

const HELPLINES = [
  { manufacturer: 'Alpha', phone: '0344 871 8760', hours: 'Mon-Fri 8am-6pm, Sat 8:30am-1pm', website: 'alpha-innovation.co.uk' },
  { manufacturer: 'Ariston', phone: '0344 871 1535', hours: 'Mon-Fri 8:30am-5:30pm', website: 'ariston.com/en-uk' },
  { manufacturer: 'ATAG', phone: '0800 804 6200', hours: 'Mon-Fri 8am-5pm', website: 'atagheating.co.uk' },
  { manufacturer: 'Baxi', phone: '0344 871 1545', hours: 'Mon-Fri 8am-6pm, Sat 8:30am-1pm', website: 'baxi.co.uk' },
  { manufacturer: 'Biasi', phone: '0345 268 0800', hours: 'Mon-Fri 9am-5pm', website: 'biasi.co.uk' },
  { manufacturer: 'Daikin', phone: '0345 619 0000', hours: 'Mon-Fri 8:30am-5:30pm', website: 'daikin.co.uk' },
  { manufacturer: 'Ferroli', phone: '0330 100 3572', hours: 'Mon-Fri 8:30am-5:30pm', website: 'ferroli.co.uk' },
  { manufacturer: 'Glow-worm', phone: '0344 871 1525', hours: 'Mon-Fri 8am-6pm, Sat 8:30am-1pm', website: 'glow-worm.co.uk' },
  { manufacturer: 'Grant', phone: '0800 999 4555', hours: 'Mon-Fri 8:30am-5pm', website: 'grantuk.com' },
  { manufacturer: 'Heatline', phone: '0344 871 1536', hours: 'Mon-Fri 8:30am-5pm', website: 'heatline.co.uk' },
  { manufacturer: 'Ideal', phone: '0344 544 0044', hours: 'Mon-Fri 8am-6pm, Sat 8:30am-12:30pm', website: 'idealheating.com' },
  { manufacturer: 'Intergas', phone: '0345 130 0121', hours: 'Mon-Fri 8am-5pm', website: 'intergasheating.co.uk' },
  { manufacturer: 'Johnson & Starley', phone: '01954 782 551', hours: 'Mon-Fri 8am-5pm', website: 'johnsonandstarley.co.uk' },
  { manufacturer: 'Keston', phone: '0208 462 0262', hours: 'Mon-Fri 8am-5pm', website: 'keston.co.uk' },
  { manufacturer: 'Main', phone: '0344 871 1545', hours: 'Mon-Fri 8am-6pm, Sat 8:30am-1pm', website: 'mainheating.co.uk' },
  { manufacturer: 'Navien', phone: '0345 130 0161', hours: 'Mon-Fri 8:30am-5pm', website: 'navien.co.uk' },
  { manufacturer: 'Potterton', phone: '0344 871 1525', hours: 'Mon-Fri 8am-6pm, Sat 8:30am-1pm', website: 'potterton.co.uk' },
  { manufacturer: 'Ravenheat', phone: '0114 257 2300', hours: 'Mon-Fri 8:30am-5pm', website: 'ravenheat.co.uk' },
  { manufacturer: 'Remeha', phone: '0118 978 3434', hours: 'Mon-Fri 8am-5:30pm', website: 'remeha.co.uk' },
  { manufacturer: 'Saunier Duval', phone: '0344 871 1525', hours: 'Mon-Fri 8am-6pm', website: 'saunierduval.co.uk' },
  { manufacturer: 'Vaillant', phone: '0344 693 5800', hours: 'Mon-Fri 8am-6pm, Sat 8:30am-1pm', website: 'vaillant.co.uk' },
  { manufacturer: 'Vaillant (Parts)', phone: '0344 693 5811', hours: 'Mon-Fri 8am-6pm', website: 'vaillant.co.uk' },
  { manufacturer: 'Viessmann', phone: '01952 675 000', hours: 'Mon-Fri 7:30am-5pm', website: 'viessmann.co.uk' },
  { manufacturer: 'Worcester Bosch', phone: '0330 123 3366', hours: 'Mon-Fri 7am-8pm, Sat 8am-4pm', website: 'worcester-bosch.co.uk' },
];

const EMERGENCY_NUMBERS = [
  { name: 'Gas Emergency (National Grid / Cadent)', phone: '0800 111 999', description: 'Gas leak / smell of gas — 24/7, FREE, all UK regions', color: 'red' },
  { name: 'Gas Safe Register', phone: '0800 408 5500', description: 'Registration queries, ID verification & reporting unsafe work', color: 'yellow' },
  { name: 'HSE Infoline (UK)', phone: '0300 003 1747', description: 'Health & Safety Executive — incidents, concerns & technical advice', color: 'blue' },
  { name: 'RIDDOR Reporting (ICC)', phone: '0345 300 9923', description: 'Report dangerous gas fittings & work-related incidents', color: 'orange' },
  { name: 'IGEM Technical Queries', phone: '01509 678 150', description: 'Institution of Gas Engineers & Managers — standards & technical guidance', color: 'green' },
  { name: 'Energy Ombudsman', phone: '0330 440 1624', description: 'Consumer complaints about energy suppliers (customer-facing)', color: 'purple' },
];

const ManufacturerHelplines = () => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return HELPLINES;
    const q = search.toLowerCase();
    return HELPLINES.filter(h => h.manufacturer.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-3xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-4 sm:p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0">
            📞
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Tech Helplines</h1>
            <p className="text-sm text-white/70 mt-0.5">Emergency, regulatory & manufacturer support</p>
          </div>
        </div>
      </div>

      {/* Emergency & Regulatory Numbers — always visible */}
      <section>
        <h2 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <span>🚨</span> Emergency & Regulatory
        </h2>
        <div className="space-y-2">
          {EMERGENCY_NUMBERS.map((item, i) => {
            const bgMap = { red: 'bg-red-50 border-red-200', yellow: 'bg-yellow-50 border-yellow-200', blue: 'bg-blue-50 border-blue-200', orange: 'bg-orange-50 border-orange-200', green: 'bg-green-50 border-green-200', purple: 'bg-purple-50 border-purple-200' };
            const btnMap = { red: 'bg-red-600 hover:bg-red-700', yellow: 'bg-yellow-600 hover:bg-yellow-700', blue: 'bg-blue-600 hover:bg-blue-700', orange: 'bg-orange-600 hover:bg-orange-700', green: 'bg-green-600 hover:bg-green-700', purple: 'bg-purple-600 hover:bg-purple-700' };
            return (
              <div key={i} className={`rounded-xl border p-3 flex items-center gap-3 ${bgMap[item.color] || 'bg-gray-50 border-gray-200'}`}>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                </div>
                <a
                  href={`tel:${item.phone.replace(/\s/g, '')}`}
                  className={`flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-white font-semibold text-sm rounded-xl active:scale-95 transition-all whitespace-nowrap ${btnMap[item.color] || 'bg-gray-600'}`}
                >
                  📞 {item.phone}
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* Manufacturer Section Header */}
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
        <span>🏭</span> Manufacturer Tech Support
      </h2>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search manufacturer..."
        className="w-full px-4 py-3 min-h-[44px] border border-gray-200 rounded-xl text-[16px] text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />

      {/* List */}
      <div className="space-y-2">
        {filtered.map((h, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm">{h.manufacturer}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{h.hours}</p>
            </div>
            <a
              href={`tel:${h.phone.replace(/\s/g, '')}`}
              className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-green-600 text-white font-semibold text-sm rounded-xl hover:bg-green-700 active:scale-95 transition-all whitespace-nowrap"
            >
              📞 {h.phone}
            </a>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">No manufacturers found matching "{search}"</p>
        )}
      </div>

      {/* Disclaimer */}
      <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-400">
        <p>Phone numbers are provided for convenience and may change. Always verify with the manufacturer's website for the most current contact details.</p>
      </div>
    </div>
  );
};

export default ManufacturerHelplines;
