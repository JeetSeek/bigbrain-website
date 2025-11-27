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
    },
    {
      id: TAB_IDS.ROOM_BTU,
      title: 'Room BTU Calculator',
      description: 'Calculate heating requirements',
      icon: '🌡️',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: TAB_IDS.GAS_PIPE,
      title: 'Gas Pipe Sizing',
      description: 'BS 6891 pipe sizing & pressure drop',
      icon: '📏',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      id: TAB_IDS.GAS_DIVERSITY,
      title: 'Meter Diversity',
      description: 'Calculate diversified load & meter sizing',
      icon: '⚡',
      color: 'from-purple-500 to-indigo-500',
    },
  ];

  const forms = [
    {
      id: TAB_IDS.CP12_FORM,
      title: 'CP12 Gas Safety',
      description: 'Landlord Gas Safety Record',
      icon: '📋',
      color: 'from-blue-600 to-blue-700',
    },
    {
      id: TAB_IDS.WARNING_NOTICE,
      title: 'Warning Notice',
      description: 'ID / AR / NCS defect notices',
      icon: '⚠️',
      color: 'from-red-500 to-red-600',
    },
  ];

  const ToolCard = ({ item }) => (
    <button
      onClick={() => onNavigate(item.id)}
      className="relative overflow-hidden rounded-xl p-4 text-left bg-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br ${item.color} shadow-lg`}>
          {item.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{item.title}</h3>
          <p className="text-sm text-gray-600">{item.description}</p>
        </div>
        <div className="text-gray-400 text-xl self-center">→</div>
      </div>
    </button>
  );

  return (
    <div className="p-4 space-y-6">
      {/* Calculators */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 mb-3">CALCULATORS</h2>
        <div className="grid grid-cols-1 gap-3">
          {calculators.map((item) => (
            <ToolCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* Forms */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 mb-3">FORMS & DOCUMENTS</h2>
        <div className="grid grid-cols-1 gap-3">
          {forms.map((item) => (
            <ToolCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* Help section */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-semibold text-blue-900">Need Help?</h3>
            <p className="text-sm text-blue-700 mt-1">
              Use the Chat tab to ask BoilerBrain about any calculations or technical queries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsPage;
