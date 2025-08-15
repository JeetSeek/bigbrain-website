import React, { useState, useEffect } from 'react';

/**
 * Room Dimensions Form Section
 * Collects room length, width, and height data with visual representation
 */
const RoomDimensions = ({ 
  length, 
  setLength, 
  width, 
  setWidth, 
  height, 
  setHeight,
  unit
}) => {
  // Calculate room volume
  const [volume, setVolume] = useState(0);
  
  useEffect(() => {
    if (length && width && height) {
      const calculatedVolume = (parseFloat(length || 0) * parseFloat(width || 0) * parseFloat(height || 0)).toFixed(1);
      setVolume(calculatedVolume);
    }
  }, [length, width, height]);
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 transition-all duration-300 hover:shadow-md">
      <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
        <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Room Dimensions
        <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">Required</span>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input fields */}
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900">
              Room Length ({unit === 'imperial' ? 'ft' : 'm'})
            </label>
            <div className="relative rounded-md">
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8v8m0 0l3-3m-3 3l-3-3m18-3v8m0 0l-3-3m3 3l3-3" />
                  </svg>
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder={`e.g. ${unit === 'imperial' ? '12' : '3.6'}`}
                  className="flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md text-gray-900 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-base"
                  aria-describedby="length-description"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500" id="length-description">
                {unit === 'imperial' ? 'Typical room: 10-20 feet' : 'Typical room: 3-6 meters'}
              </p>
            </div>
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900">
              Room Width ({unit === 'imperial' ? 'ft' : 'm'})
            </label>
            <div className="relative rounded-md">
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8m0 0l-3-3m3 3l-3 3m-8 14h8m0 0l-3-3m3 3l-3 3" />
                  </svg>
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder={`e.g. ${unit === 'imperial' ? '10' : '3'}`}
                  className="flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md text-gray-900 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-base"
                  aria-describedby="width-description"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500" id="width-description">
                {unit === 'imperial' ? 'Typical room: 8-16 feet' : 'Typical room: 2.5-5 meters'}
              </p>
            </div>
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900">
              Ceiling Height ({unit === 'imperial' ? 'ft' : 'm'})
            </label>
            <div className="relative rounded-md">
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m0 0l-3-3m3 3l3-3M4 4h16M4 20h16" />
                  </svg>
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder={`e.g. ${unit === 'imperial' ? '8' : '2.4'}`}
                  className="flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md text-gray-900 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-base"
                  aria-describedby="height-description"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500" id="height-description">
                {unit === 'imperial' ? 'Standard ceiling: 8-10 feet' : 'Standard ceiling: 2.4-3 meters'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Room volume display - simplified */}
        {length && width && height && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="text-center">
              <span className="text-blue-800 font-medium">Room Volume: </span>
              <span className="text-blue-900 font-bold">
                {volume} {unit === 'imperial' ? 'ft³' : 'm³'}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {length && width && height && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-blue-700 font-medium">
            Room Volume: {(parseFloat(length || 0) * parseFloat(width || 0) * parseFloat(height || 0)).toFixed(1)} {unit === 'imperial' ? 'ft³' : 'm³'}
          </p>
        </div>
      )}
    </div>
  );
};

export default RoomDimensions;
