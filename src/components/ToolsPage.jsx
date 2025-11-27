import React from 'react';
import { TAB_IDS } from '../utils/constants';

/**
 * Tools Page Component
 * Displays a grid of available engineering calculators and tools
 */
const ToolsPage = ({ onNavigate }) => {
  const tools = [
    {
      id: TAB_IDS.GAS_RATE,
      title: 'Gas Rate Calculator',
      description: 'Calculate gas consumption and flow rates for boiler installations',
      icon: '🔥',
      color: 'from-orange-500 to-red-500',
    },
    {
      id: TAB_IDS.ROOM_BTU,
      title: 'Room BTU Calculator',
      description: 'Calculate heating requirements based on room dimensions',
      icon: '🌡️',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'pipeSizing',
      title: 'Pipe Sizing Guide',
      description: 'Coming soon - Calculate pipe sizes for heating systems',
      icon: '📏',
      color: 'from-gray-400 to-gray-500',
      disabled: true,
    },
    {
      id: 'pressureDrop',
      title: 'Pressure Drop Calculator',
      description: 'Coming soon - Calculate pressure drops in heating circuits',
      icon: '📉',
      color: 'from-gray-400 to-gray-500',
      disabled: true,
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Engineering Tools</h1>
        <p className="text-gray-600 mt-1">Calculators and utilities for gas engineers</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => !tool.disabled && onNavigate(tool.id)}
            disabled={tool.disabled}
            className={`
              relative overflow-hidden rounded-xl p-4 text-left
              transition-all duration-200
              ${tool.disabled 
                ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                : 'bg-white shadow-md hover:shadow-lg active:scale-[0.98]'
              }
            `}
          >
            <div className="flex items-start gap-4">
              {/* Icon with gradient background */}
              <div className={`
                w-14 h-14 rounded-xl flex items-center justify-center text-2xl
                bg-gradient-to-br ${tool.color} shadow-lg
              `}>
                {tool.icon}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {tool.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {tool.description}
                </p>
                {tool.disabled && (
                  <span className="inline-block mt-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>

              {/* Arrow indicator */}
              {!tool.disabled && (
                <div className="text-gray-400 text-xl self-center">
                  →
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Help section */}
      <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
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
