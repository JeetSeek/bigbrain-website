import React from 'react';
import PropTypes from 'prop-types';

/**
 * Enhanced quick start prompts component with better categorization and visual design
 * 
 * @component
 * @param {Object} props
 * @param {Function} props.onSelectPrompt - Callback function when prompt is selected
 * @param {boolean} props.isVisible - Whether the component is visible
 * @returns {React.ReactElement} Quick start prompts UI
 */
const EnhancedQuickStartPrompts = ({ onSelectPrompt, isVisible }) => {
  // If not visible, don't render anything
  if (!isVisible) return null;
  
  // Categorized gas fault scenarios
  const prompts = [
    {
      title: "New Fault Call",
      text: "I've got a Worcester Bosch combi boiler with fault code F22 - no heating or hot water",
      icon: "🔧",
      category: "Common"
    },
    {
      title: "No Heating", 
      text: "My Vaillant ecoTEC has no heating but hot water works fine",
      icon: "🏠",
      category: "Common"
    },
    {
      title: "Fault Code Help",
      text: "I need help with fault code F28 on my Ideal Logic combi",
      icon: "⚠️",
      category: "Common"
    },
    {
      title: "No Hot Water",
      text: "Baxi 830 combi - no hot water but heating works",
      icon: "🚿",
      category: "Common"
    },
    {
      title: "Low Pressure",
      text: "Worcester Bosch Greenstar keeps losing pressure, dropping to 0.5 bar",
      icon: "📊",
      category: "Specific"
    },
    {
      title: "Ignition Failure",
      text: "Viessmann Vitodens 100 with F4 error - failing to ignite",
      icon: "🔥",
      category: "Specific"
    }
  ];

  // Group prompts by category
  const commonPrompts = prompts.filter(p => p.category === "Common");
  const specificPrompts = prompts.filter(p => p.category === "Specific");

  return (
    <div className="p-4 bg-blue-50 border-b border-blue-100">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-blue-800 mb-1">Quick Start - Common Issues:</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {commonPrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => onSelectPrompt(prompt)}
              className="flex items-center p-2.5 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
              aria-label={`Select quick start prompt: ${prompt.title}`}
            >
              <span className="text-xl mr-3">{prompt.icon}</span>
              <div>
                <div className="text-sm font-medium text-blue-700">{prompt.title}</div>
                <div className="text-xs text-gray-600 truncate max-w-[180px] md:max-w-[220px]">{prompt.text}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {specificPrompts.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-blue-700 mb-1">Specific Issues:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {specificPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => onSelectPrompt(prompt)}
                className="flex items-center p-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                aria-label={`Select quick start prompt: ${prompt.title}`}
              >
                <span className="text-lg mr-2">{prompt.icon}</span>
                <div>
                  <div className="text-xs font-medium text-blue-700">{prompt.title}</div>
                  <div className="text-xs text-gray-600 truncate max-w-[180px] md:max-w-[220px]">{prompt.text}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

EnhancedQuickStartPrompts.propTypes = {
  onSelectPrompt: PropTypes.func.isRequired,
  isVisible: PropTypes.bool.isRequired
};

export default EnhancedQuickStartPrompts;
