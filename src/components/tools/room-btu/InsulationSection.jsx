import React from 'react';
import { INSULATION_QUALITY, FLOOR_TYPES } from './calc';

/**
 * Insulation Section Component
 * Collects information about wall and ceiling insulation quality, floor type, and room orientation
 * Enhanced with visual cues and better organization
 */
const InsulationSection = ({
  exteriorWalls,
  setExteriorWalls,
  wallInsulation,
  setWallInsulation,
  ceilingInsulation,
  setCeilingInsulation,
  floorType,
  setFloorType,
  roomOrientation,
  setRoomOrientation
}) => {
  // Helper function to get insulation quality level for visual indicators
  const getInsulationLevel = (insulationType) => {
    const levels = {
      POOR: 1,
      AVERAGE: 2,
      GOOD: 3,
      EXCELLENT: 4
    };
    return levels[insulationType] || 2;
  };

  // Get color based on insulation quality
  const getInsulationColor = (insulationType) => {
    const colors = {
      POOR: 'bg-red-400',
      AVERAGE: 'bg-yellow-400',
      GOOD: 'bg-green-400',
      EXCELLENT: 'bg-green-600'
    };
    return colors[insulationType] || 'bg-yellow-400';
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 transition-all duration-300 hover:shadow-md">
      <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
        <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        Room Construction & Orientation
      </h3>
      
      {/* Wall layout and orientation section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Room Layout
          </h4>
          
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-900">
              Number of Exterior Walls
            </label>
            <div className="relative">
              <select
                value={exteriorWalls}
                onChange={(e) => setExteriorWalls(e.target.value)}
                className="block w-full pl-10 p-3 text-gray-900 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="0">None (interior room)</option>
                <option value="1">One exterior wall</option>
                <option value="2">Two exterior walls (corner)</option>
                <option value="3">Three exterior walls</option>
                <option value="4">Four exterior walls (free-standing)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
            </div>
            
            {/* Visual indicator for exterior walls */}
            <div className="mt-3 flex gap-1 justify-center">
              {Array.from({length: 4}, (_, i) => (
                <div 
                  key={i} 
                  className={`w-6 h-6 border ${parseInt(exteriorWalls) > i ? 'bg-blue-500 border-blue-600' : 'bg-gray-100 border-gray-300'}`} 
                  title={`${i + 1} exterior wall${i > 0 ? 's' : ''}`}
                />
              ))}
            </div>
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900">
              Room Orientation
            </label>
            <div className="relative">
              <select
                value={roomOrientation}
                onChange={(e) => setRoomOrientation(e.target.value)}
                className="block w-full pl-10 p-3 text-gray-900 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="NORTH">North-facing</option>
                <option value="SOUTH">South-facing</option>
                <option value="EAST">East-facing</option>
                <option value="WEST">West-facing</option>
                <option value="MULTIPLE">Multiple orientations</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
            </div>
            
            {/* Compass indicator */}
            <div className="relative h-16 w-16 mx-auto mt-3" title="Room orientation">
              <div className="absolute inset-0 rounded-full border-2 border-gray-300">
                <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${roomOrientation === 'NORTH' ? 'bg-blue-600' : 'bg-gray-400'}`} />
                <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full ${roomOrientation === 'SOUTH' ? 'bg-blue-600' : 'bg-gray-400'}`} />
                <div className={`absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${roomOrientation === 'EAST' ? 'bg-blue-600' : 'bg-gray-400'}`} />
                <div className={`absolute top-1/2 left-0 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${roomOrientation === 'WEST' ? 'bg-blue-600' : 'bg-gray-400'}`} />
                <div className="absolute inset-2 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-700">{roomOrientation === 'MULTIPLE' ? 'MULTI' : roomOrientation[0]}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        

      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-900">
            Wall Insulation Quality
          </label>
          <select
            value={wallInsulation}
            onChange={(e) => setWallInsulation(e.target.value)}
            className="block w-full p-3 text-gray-900 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.keys(INSULATION_QUALITY).map(key => (
              <option key={key} value={key}>
                {INSULATION_QUALITY[key].name} - {INSULATION_QUALITY[key].description}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-900">
            Ceiling Insulation Quality
          </label>
          <select
            value={ceilingInsulation}
            onChange={(e) => setCeilingInsulation(e.target.value)}
            className="block w-full p-3 text-gray-900 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.keys(INSULATION_QUALITY).map(key => (
              <option key={key} value={key}>
                {INSULATION_QUALITY[key].name} - {INSULATION_QUALITY[key].description}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-900">
            Floor Type
          </label>
          <select
            value={floorType}
            onChange={(e) => setFloorType(e.target.value)}
            className="block w-full p-3 text-gray-900 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.keys(FLOOR_TYPES).map(key => (
              <option key={key} value={key}>
                {FLOOR_TYPES[key].name} - {FLOOR_TYPES[key].description}
              </option>
            ))}
          </select>
        </div>
      </div>
      

    </div>
  );
};

export default InsulationSection;
