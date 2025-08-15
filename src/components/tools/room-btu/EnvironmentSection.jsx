import React from 'react';
import { ROOM_USAGE } from './calc';

/**
 * Simplified Environment Section Component
 * Only shows room usage selection as requested by user
 * Climate zone and occupancy options removed for simplicity
 */
const EnvironmentSection = ({
  roomUsage,
  setRoomUsage
}) => {
  // Get room icon based on usage
  const getRoomIcon = (usage) => {
    switch (usage) {
      case 'LIVING':
        return (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10V6a2 2 0 012-2h2a2 2 0 012 2v4M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'BEDROOM':
        return (
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        );
      case 'BATHROOM':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11h.01M12 11h.01M9 11h.01M6 11h.01" />
          </svg>
        );
      case 'KITCHEN':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h18v7H3V3zm0 11h6v7H3v-7zm10 0h8v7h-8v-7z" />
          </svg>
        );
      case 'OFFICE':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
          </svg>
        );
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 transition-all duration-300 hover:shadow-md">
      <h3 className="text-lg font-semibold mb-5 flex items-center text-gray-800">
        <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
        </svg>
        Room Type
      </h3>
      
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
          </svg>
          Room Usage
        </h4>
        
        <div className="relative">
          <div className="flex rounded-md shadow-sm">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
              {getRoomIcon(roomUsage)}
            </span>
            <select
              value={roomUsage}
              onChange={(e) => setRoomUsage(e.target.value)}
              className="flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md text-gray-900 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-base"
            >
              {Object.keys(ROOM_USAGE).map(key => (
                <option key={key} value={key}>
                  {ROOM_USAGE[key].name} - {ROOM_USAGE[key].description}
                </option>
              ))}
            </select>
          </div>
          
          {/* Room usage visualization */}
          <div className="mt-3 p-3 rounded-md border bg-blue-50 border-blue-200">
            <div className="flex items-center">
              {getRoomIcon(roomUsage)}
              <span className="ml-2 text-sm font-medium text-blue-800">{ROOM_USAGE[roomUsage]?.name || 'Standard Room'}</span>
            </div>
            <p className="text-xs mt-2 text-blue-700">{ROOM_USAGE[roomUsage]?.description || 'Standard living environment'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentSection;
