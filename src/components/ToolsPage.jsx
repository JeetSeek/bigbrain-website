import React from 'react';
import { TAB_IDS } from '../utils/constants';

/**
 * Tools Page Component
 * Displays a grid of available engineering calculators and tools
 */
const ToolsPage = ({ onNavigate }) => {
  const calculators = [
    {
      id: TAB_IDS.GAS_RATE,
      title: 'Gas Rate Calculator',
      description: 'Calculate gas consumption and flow rates',
      icon: '🔥',
      color: 'from-orange-500 to-red-500',
      shadowColor: 'rgba(249, 115, 22, 0.25)',
    },
    {
      id: TAB_IDS.ROOM_BTU,
      title: 'Room BTU Calculator',
      description: 'Calculate heating requirements',
      icon: '🌡️',
      color: 'from-blue-500 to-cyan-500',
      shadowColor: 'rgba(59, 130, 246, 0.25)',
    },
    {
      id: TAB_IDS.GAS_PIPE,
      title: 'Gas Pipe Sizing',
      description: 'BS 6891 pipe sizing & pressure drop',
      icon: '📏',
      color: 'from-yellow-500 to-orange-500',
      shadowColor: 'rgba(234, 179, 8, 0.25)',
    },
    {
      id: TAB_IDS.GAS_DIVERSITY,
      title: 'Meter Diversity',
      description: 'Calculate diversified load & meter sizing',
      icon: '⚡',
      color: 'from-purple-500 to-indigo-500',
      shadowColor: 'rgba(168, 85, 247, 0.25)',
    },
    {
      id: TAB_IDS.VENTILATION,
      title: 'Ventilation Calculator',
      description: 'BS 5440 permanent ventilation sizing',
      icon: '💨',
      color: 'from-teal-500 to-emerald-500',
      shadowColor: 'rgba(20, 184, 166, 0.25)',
    },
    {
      id: TAB_IDS.PURGE_CALC,
      title: 'Purge & Tightness',
      description: 'Pipe volume, purge volume & test criteria',
      icon: '🔧',
      color: 'from-cyan-500 to-blue-500',
      shadowColor: 'rgba(6, 182, 212, 0.25)',
    },
    {
      id: TAB_IDS.RADIATOR_SIZING,
      title: 'Radiator Sizing',
      description: 'Calculate required BTU output per room',
      icon: '🔥',
      color: 'from-rose-500 to-pink-600',
      shadowColor: 'rgba(244, 63, 94, 0.25)',
    },
    {
      id: TAB_IDS.PRESSURE_CONVERTER,
      title: 'Pressure Converter',
      description: 'bar, mbar, psi, kPa, mH₂O — with reference chart',
      icon: '🔄',
      color: 'from-violet-500 to-purple-600',
      shadowColor: 'rgba(139, 92, 246, 0.25)',
    },
    {
      id: TAB_IDS.SYSTEM_VOLUME,
      title: 'System Volume',
      description: 'Water volume for inhibitor & antifreeze dosing',
      icon: '💧',
      color: 'from-sky-500 to-blue-600',
      shadowColor: 'rgba(14, 165, 233, 0.25)',
    },
  ];

  const forms = [
    {
      id: TAB_IDS.CP12_FORM,
      title: 'CP12 Gas Safety',
      description: 'Landlord Gas Safety Record',
      icon: '📋',
      color: 'from-blue-600 to-blue-700',
      shadowColor: 'rgba(37, 99, 235, 0.25)',
    },
    {
      id: TAB_IDS.GAS_SERVICE,
      title: 'Service Record',
      description: 'Annual gas appliance service record',
      icon: '🔧',
      color: 'from-emerald-500 to-teal-600',
      shadowColor: 'rgba(16, 185, 129, 0.25)',
    },
    {
      id: TAB_IDS.GAS_BREAKDOWN,
      title: 'Breakdown Record',
      description: 'Gas appliance breakdown & repair record',
      icon: '🔨',
      color: 'from-orange-500 to-red-500',
      shadowColor: 'rgba(249, 115, 22, 0.25)',
    },
    {
      id: TAB_IDS.INSTALLATION,
      title: 'Installation Record',
      description: 'Installation & commissioning checklist',
      icon: '🏗️',
      color: 'from-blue-600 to-indigo-600',
      shadowColor: 'rgba(37, 99, 235, 0.25)',
    },
    {
      id: TAB_IDS.WARNING_NOTICE,
      title: 'Warning Notice',
      description: 'ID / AR / NCS unsafe situation report',
      icon: '⚠️',
      color: 'from-red-600 to-red-700',
      shadowColor: 'rgba(220, 38, 38, 0.25)',
    },
    {
      id: TAB_IDS.BENCHMARK,
      title: 'Benchmark Checklist',
      description: 'Commissioning record for warranty registration',
      icon: '✅',
      color: 'from-emerald-600 to-teal-700',
      shadowColor: 'rgba(5, 150, 105, 0.25)',
    },
  ];

  const resources = [
    {
      id: TAB_IDS.FAULT_CODES,
      title: 'Fault Code Lookup',
      description: 'Search 13,800+ fault codes across all manufacturers',
      icon: '🔍',
      color: 'from-indigo-500 to-purple-600',
      shadowColor: 'rgba(99, 102, 241, 0.25)',
    },
    {
      id: TAB_IDS.HELPLINES,
      title: 'Tech Helplines',
      description: 'Manufacturer technical support — tap to call',
      icon: '📞',
      color: 'from-green-500 to-emerald-500',
      shadowColor: 'rgba(34, 197, 94, 0.25)',
    },
    {
      id: TAB_IDS.PARTS_FINDER,
      title: 'Parts Finder',
      description: 'Search boiler parts by GC number across suppliers',
      icon: '🔧',
      color: 'from-amber-500 to-orange-600',
      shadowColor: 'rgba(245, 158, 11, 0.25)',
    },
    {
      id: TAB_IDS.FLUE_GAS,
      title: 'Flue Gas Analyser',
      description: 'Import readings from Kane, TPI, Anton or enter manually',
      icon: '📊',
      color: 'from-indigo-500 to-violet-600',
      shadowColor: 'rgba(99, 102, 241, 0.25)',
    },
  ];

  const SectionHeader = ({ icon, title, count }) => (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-sm">{icon}</span>
      <h2 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider">{title}</h2>
      <span className="ml-auto text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
    </div>
  );

  const ToolCard = ({ item, index }) => (
    <button
      onClick={() => onNavigate(item.id)}
      className="group relative overflow-hidden rounded-2xl p-3.5 sm:p-4 text-left bg-white border border-gray-100 transition-all duration-300 hover:shadow-xl active:scale-[0.97]"
      style={{
        animationDelay: `${index * 50}ms`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Subtle gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />
      
      <div className="relative flex items-center gap-3.5">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-gradient-to-br ${item.color} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 flex-shrink-0`}
          style={{ boxShadow: `0 4px 12px ${item.shadowColor || 'rgba(0,0,0,0.15)'}` }}
        >
          {item.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[15px] text-gray-900 group-hover:text-gray-800 transition-colors">{item.title}</h3>
          <p className="text-[13px] text-gray-500 leading-snug mt-0.5 line-clamp-1">{item.description}</p>
        </div>
        <div className="text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </div>
    </button>
  );

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-5 sm:space-y-6 pb-8 max-w-3xl mx-auto">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#0051D5] p-4 sm:p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
            <img src="/brain-icon-nBG.png" alt="" className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-white">Engineering Tools</h1>
            <p className="text-[13px] text-white/70 mt-0.5">Gas calculations, forms & technical resources</p>
          </div>
        </div>
        <div className="relative flex gap-3 mt-4">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/60 bg-white/10 rounded-full px-2.5 py-1 backdrop-blur-sm">
            <span>🧮</span> {calculators.length} Calculators
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/60 bg-white/10 rounded-full px-2.5 py-1 backdrop-blur-sm">
            <span>📄</span> {forms.length} Forms
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/60 bg-white/10 rounded-full px-2.5 py-1 backdrop-blur-sm">
            <span>📚</span> {resources.length} Resources
          </div>
        </div>
      </div>

      {/* Calculators */}
      <section>
        <SectionHeader icon="🧮" title="Calculators" count={calculators.length} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {calculators.map((item, i) => (
            <ToolCard key={item.id} item={item} index={i} />
          ))}
        </div>
      </section>

      {/* Forms */}
      <section>
        <SectionHeader icon="📄" title="Forms & Documents" count={forms.length} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {forms.map((item, i) => (
            <ToolCard key={item.id} item={item} index={i} />
          ))}
        </div>
      </section>

      {/* Resources */}
      <section>
        <SectionHeader icon="📚" title="Resources" count={resources.length} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {resources.map((item, i) => (
            <ToolCard key={item.id} item={item} index={i} />
          ))}
        </div>
      </section>

      {/* Help section */}
      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/60">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">💬</span>
          </div>
          <div>
            <h3 className="font-semibold text-[15px] text-blue-900">Need Help?</h3>
            <p className="text-[13px] text-blue-600/80 mt-0.5 leading-relaxed">
              Use the Chat tab to ask BoilerBrain about any calculations or technical queries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsPage;
