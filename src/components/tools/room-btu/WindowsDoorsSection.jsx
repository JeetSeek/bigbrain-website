import React from 'react';
import { WINDOW_TYPES } from './calc';

/**
 * Windows and Doors Section Component
 * Collects information about windows, exterior doors and patio doors
 * Enhanced with visual indicators and better organization
 */
const WindowsDoorsSection = ({
  windowCount,
  setWindowCount,
  windowType,
  setWindowType,
  windowArea,
  setWindowArea,
  exteriorDoors,
  setExteriorDoors,
  patioDoors,
  setPatioDoors,
  unit
}) => {
  // Helper function to get window efficiency score (1-5)
  const getWindowEfficiencyScore = () => {
    const typeScore = windowType === 'SINGLE' ? 1 : windowType === 'DOUBLE' ? 3 : 5;
    const areaImpact = Math.min(5, Math.max(1, Math.ceil((parseFloat(windowArea) || 0) / (unit === 'imperial' ? 10 : 1))));
    return Math.max(1, 6 - ((typeScore + (5 - areaImpact)) / 2));
  };
  
  // Get efficiency level label
  const getEfficiencyLabel = (score) => {
    if (score <= 1.5) return "Excellent";
    if (score <= 2.5) return "Good";
    if (score <= 3.5) return "Average";
    if (score <= 4.5) return "Poor";
    return "Very Poor";
  };
  
  // Calculate window heat loss impact
  const windowEfficiency = getWindowEfficiencyScore();
  const efficiencyLabel = getEfficiencyLabel(windowEfficiency);
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 transition-all duration-300 hover:shadow-md">
      <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
        <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        Windows & Doors
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
              <rect x="3" y="7" width="10" height="12" rx="2" stroke="currentColor" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 11h.01M8 15h.01" />
            </svg>
            Window Details
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">
                Number of Windows
              </label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={windowCount}
                  onChange={(e) => setWindowCount(e.target.value)}
                  placeholder="e.g. 2"
                  className="flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md text-gray-900 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-base"
                />
              </div>
              
              {/* Window count indicators */}
              <div className="flex mt-2 gap-1">
                {Array.from({length: 5}, (_, i) => (
                  <div 
                    key={i} 
                    className={`h-4 w-4 rounded-sm ${parseInt(windowCount) > i ? 'bg-blue-500' : 'bg-gray-200'}`} 
                    title={`${i+1} window${i !== 0 ? 's' : ''}`}
                  />
                ))}
                <span className="ml-1 text-xs text-gray-500">{windowCount || 0} window{windowCount !== '1' ? 's' : ''}</span>
              </div>
            </div>
            
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">
                Window Type
              </label>
              <div className="relative">
                <select
                  value={windowType}
                  onChange={(e) => setWindowType(e.target.value)}
                  className="block w-full pl-10 p-3 text-gray-900 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  {Object.keys(WINDOW_TYPES).map(key => (
                    <option key={key} value={key}>
                      {WINDOW_TYPES[key].name} - {WINDOW_TYPES[key].description}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                </div>
              </div>
              
              {/* Glazing type visual */}
              <div className="mt-2 flex items-center">
                <div className="flex">
                  {windowType === 'SINGLE' && (
                    <div className="h-5 w-1 bg-blue-400 mr-2" title="Single glazing" />
                  )}
                  {windowType === 'DOUBLE' && (
                    <>
                      <div className="h-5 w-1 bg-blue-400 mr-0.5" />
                      <div className="h-5 w-1 bg-blue-500 mr-2" />
                    </>
                  )}
                  {windowType === 'TRIPLE' && (
                    <>
                      <div className="h-5 w-1 bg-blue-400 mr-0.5" />
                      <div className="h-5 w-1 bg-blue-500 mr-0.5" />
                      <div className="h-5 w-1 bg-blue-600" />
                    </>
                  )}
                  <span className="text-xs text-gray-500 ml-1">{WINDOW_TYPES[windowType].name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Window Specifications
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">
                Total Window Area ({unit === 'imperial' ? 'ft²' : 'm²'})
              </label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={windowArea}
                  onChange={(e) => setWindowArea(e.target.value)}
                  placeholder={`e.g. ${unit === 'imperial' ? '15' : '1.5'}`}
                  className="flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md text-gray-900 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-base"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Typical window: {unit === 'imperial' ? '10-15 ft²' : '1-1.5 m²'}</p>
              
              {/* Window efficiency indicator */}
              {windowArea && windowCount > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>High Efficiency</span>
                    <span>Low Efficiency</span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${windowEfficiency <= 1.5 ? 'bg-green-500' : 
                                          windowEfficiency <= 2.5 ? 'bg-green-400' : 
                                          windowEfficiency <= 3.5 ? 'bg-yellow-400' : 
                                          windowEfficiency <= 4.5 ? 'bg-orange-400' : 'bg-red-500'}`}
                      style={{ width: `${(windowEfficiency / 5) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs mt-1 font-medium" style={{ 
                    color: windowEfficiency <= 1.5 ? '#10b981' : 
                           windowEfficiency <= 2.5 ? '#34d399' : 
                           windowEfficiency <= 3.5 ? '#fbbf24' : 
                           windowEfficiency <= 4.5 ? '#fb923c' : '#ef4444' 
                  }}>
                    Window efficiency rating: <strong>{efficiencyLabel}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Exterior Doors
          </h4>
          
          <div className="space-y-2">
            <label className="block mb-2 text-sm font-medium text-gray-900">
              Number of Standard Exterior Doors
            </label>
            <div className="flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={exteriorDoors}
                onChange={(e) => setExteriorDoors(e.target.value)}
                placeholder="e.g. 1"
                className="flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md text-gray-900 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>
            
            {/* Exterior door indicators */}
            <div className="mt-3 flex">
              {Array.from({length: 3}, (_, i) => (
                <div 
                  key={i}
                  className={`relative ${i > 0 ? 'ml-2' : ''}`}
                >
                  <div 
                    className={`h-8 w-4 ${parseInt(exteriorDoors) > i ? 'bg-blue-500' : 'bg-gray-200'}`} 
                    title={`${i+1} door${i !== 0 ? 's' : ''}`}
                  />
                </div>
              ))}
              {parseInt(exteriorDoors) > 3 && (
                <span className="ml-1 text-xs flex items-center text-gray-700">+{parseInt(exteriorDoors) - 3} more</span>
              )}
              {parseInt(exteriorDoors) <= 3 && exteriorDoors !== '' && (
                <span className="ml-2 text-xs flex items-center text-gray-500">{exteriorDoors} door{exteriorDoors !== '1' ? 's' : ''}</span>
              )}
            </div>
            
            <p className="text-xs text-gray-500 mt-2 italic">Standard exterior doors have significant heat loss compared to insulated walls.</p>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9h8M8 13h8m-8 4h8M3 3h18v18H3V3z" />
            </svg>
            Patio Doors
          </h4>
          
          <div className="space-y-2">
            <label className="block mb-2 text-sm font-medium text-gray-900">
              Number of Patio/Sliding Glass Doors
            </label>
            <div className="flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="12" y1="3" x2="12" y2="21" />
                  <line x1="3" y1="12" x2="12" y2="12" />
                </svg>
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={patioDoors}
                onChange={(e) => setPatioDoors(e.target.value)}
                placeholder="e.g. 0"
                className="flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md text-gray-900 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-base"
              />
            </div>
            
            {/* Patio door visualization */}
            {parseInt(patioDoors) > 0 && (
              <div className="mt-3 flex items-center">
                <div className="relative h-8 flex items-center">
                  <div className="h-8 w-6 bg-blue-400 mr-0.5" />
                  <div className="h-8 w-6 bg-blue-300" />
                </div>
                <span className="ml-2 text-xs text-gray-500">{patioDoors} patio door{patioDoors !== '1' ? 's' : ''}</span>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-2 italic">Patio doors have large glass areas that can significantly increase heat loss.</p>
          </div>
        </div>
      </div>
      
      {windowCount > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-blue-700">
            <strong>Window Impact:</strong> {windowCount} {windowType === 'SINGLE' ? 'single-glazed' : windowType === 'DOUBLE' ? 'double-glazed' : 'triple-glazed'} windows 
            with a total area of {windowArea} {unit === 'imperial' ? 'ft²' : 'm²'}.
            {windowType === 'SINGLE' && ' Single glazing has significant heat loss.'}
            {windowType === 'TRIPLE' && ' Triple glazing offers excellent insulation.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default WindowsDoorsSection;
