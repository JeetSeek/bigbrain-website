import React, { useState, useEffect, useMemo } from 'react';
import { calculateRoomBtu } from './calc';
import RoomDimensions from './RoomDimensions';
import InsulationSection from './InsulationSection';
import WindowsDoorsSection from './WindowsDoorsSection';
import EnvironmentSection from './EnvironmentSection';
import ResultsDisplay from './ResultsDisplay';
import useLocalStorage from '../../../hooks/useLocalStorage';

/**
 * Room BTU Calculator Component
 * A detailed calculator for determining room heating requirements
 * based on various factors including room dimensions, insulation,
 * windows, doors, and climate conditions
 */
const RoomBtuCalculator = () => {
  // Unified room state object
  const [room, setRoom] = useState({
    // Initial room state with reasonable defaults
    length: '',
    width: '',
    height: '8',
    unit: 'imperial',
    insulation: 'average',
    exteriorWalls: '2',
    wallInsulation: 'AVERAGE',
    ceilingInsulation: 'AVERAGE',
    floorType: 'UNHEATED',
    roomOrientation: 'SOUTH',
    windowCount: '1',
    windowType: 'DOUBLE',
    windowArea: '15',
    exteriorDoors: '1',
    patioDoors: '0',
    windows: [],
    doors: [],
    outsideWalls: 1,
    climateZone: 'COLD',
    roomUsage: 'LIVING',
    occupants: '2',
    desiredTemp: 70
  });
  
  // Track whether user has started entering data
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Maintain backward compatibility with individual state variables
  const unit = room.unit;
  const length = room.length;
  const width = room.width;
  const height = room.height;
  const exteriorWalls = room.exteriorWalls;
  const wallInsulation = room.wallInsulation;
  const ceilingInsulation = room.ceilingInsulation;
  const floorType = room.floorType;
  const roomOrientation = room.roomOrientation;
  const windowCount = room.windowCount;
  const windowType = room.windowType;
  const windowArea = room.windowArea;
  const exteriorDoors = room.exteriorDoors;
  const patioDoors = room.patioDoors;
  const climateZone = room.climateZone;
  const roomUsage = room.roomUsage;
  const occupants = room.occupants;
  
  // Store calculation results
  const [result, setResult] = useState(null);
  
  // Store calculation history
  const [calculationHistory, setCalculationHistory] = useLocalStorage('room_btu_history', []);
  
  // Determine progress through calculator sections
  const progress = useMemo(() => {
    let score = 0;
    let total = 5; // Total number of sections to complete
    
    // Room dimensions section
    if (room.length && room.width && room.height) score += 1;
    
    // Insulation section
    if (room.wallInsulation && room.ceilingInsulation) score += 1;
    
    // Windows & Doors section
    if (room.windowCount && room.exteriorDoors) score += 1;
    
    // Environment section
    if (room.climateZone && room.roomUsage) score += 1;
    
    // Temperature & occupants section
    if (room.desiredTemp > 0) score += 1;
    
    return Math.round((score / total) * 100);
  }, [room]);
  
  // Unit conversion functions
  const handleUnitChange = (newUnit) => {
    setHasInteracted(true);
    
    if (newUnit === room.unit) return; // No change needed
    
    setRoom(prevRoom => {
      // Create a new room object with the updated unit
      const newRoom = { ...prevRoom, unit: newUnit };
      
      if (newUnit === 'metric' && prevRoom.unit === 'imperial') {
        // Convert feet to meters
        if (prevRoom.length) newRoom.length = (parseFloat(prevRoom.length) * 0.3048).toFixed(2);
        if (prevRoom.width) newRoom.width = (parseFloat(prevRoom.width) * 0.3048).toFixed(2);
        if (prevRoom.height) newRoom.height = (parseFloat(prevRoom.height) * 0.3048).toFixed(2);
        if (prevRoom.windowArea) newRoom.windowArea = (parseFloat(prevRoom.windowArea) * 0.0929).toFixed(2);
        
        // Convert temperature from F to C
        if (prevRoom.desiredTemp) newRoom.desiredTemp = Math.round((prevRoom.desiredTemp - 32) * 5 / 9);
        
        // Convert any windows and doors dimensions
        if (prevRoom.windows && prevRoom.windows.length > 0) {
          newRoom.windows = prevRoom.windows.map(window => ({
            ...window,
            width: window.width ? (window.width * 0.3048).toFixed(2) : window.width,
            height: window.height ? (window.height * 0.3048).toFixed(2) : window.height,
          }));
        }
        
        if (prevRoom.doors && prevRoom.doors.length > 0) {
          newRoom.doors = prevRoom.doors.map(door => ({
            ...door,
            width: door.width ? (door.width * 0.3048).toFixed(2) : door.width,
            height: door.height ? (door.height * 0.3048).toFixed(2) : door.height,
          }));
        }
      } 
      else if (newUnit === 'imperial' && prevRoom.unit === 'metric') {
        // Convert meters to feet
        if (prevRoom.length) newRoom.length = (parseFloat(prevRoom.length) / 0.3048).toFixed(2);
        if (prevRoom.width) newRoom.width = (parseFloat(prevRoom.width) / 0.3048).toFixed(2);
        if (prevRoom.height) newRoom.height = (parseFloat(prevRoom.height) / 0.3048).toFixed(2);
        if (prevRoom.windowArea) newRoom.windowArea = (parseFloat(prevRoom.windowArea) / 0.0929).toFixed(2);
        
        // Convert temperature from C to F
        if (prevRoom.desiredTemp) newRoom.desiredTemp = Math.round((prevRoom.desiredTemp * 9 / 5) + 32);
        
        // Convert any windows and doors dimensions
        if (prevRoom.windows && prevRoom.windows.length > 0) {
          newRoom.windows = prevRoom.windows.map(window => ({
            ...window,
            width: window.width ? (window.width / 0.3048).toFixed(2) : window.width,
            height: window.height ? (window.height / 0.3048).toFixed(2) : window.height,
          }));
        }
        
        if (prevRoom.doors && prevRoom.doors.length > 0) {
          newRoom.doors = prevRoom.doors.map(door => ({
            ...door,
            width: door.width ? (door.width / 0.3048).toFixed(2) : door.width,
            height: door.height ? (door.height / 0.3048).toFixed(2) : door.height,
          }));
        }
      }
      
      return newRoom;
    });
  };
  
  // Helper function to update a specific field in the room state
  const handleRoomDataChange = (field, value) => {
    setHasInteracted(true);
    setRoom(prevRoom => ({ ...prevRoom, [field]: value }));
  };
  
  // Helper function to update arrays in the room state (windows, doors)
  const handleArrayChange = (arrayName, newArray) => {
    setHasInteracted(true);
    setRoom(prevRoom => ({ ...prevRoom, [arrayName]: newArray }));
  };
  
  // Calculate BTU requirements based on room state
  const handleCalculate = () => {
    // Validate required inputs
    if (!room.length || !room.width || !room.height) {
      alert('Please enter room dimensions to calculate BTU requirements');
      return;
    }
    
    try {
      // Prepare room data for calculation
      const calculationParams = {
        ...room,
        // Convert string values to numbers where needed
        length: parseFloat(room.length),
        width: parseFloat(room.width),
        height: parseFloat(room.height),
        outsideWalls: parseInt(room.outsideWalls || room.exteriorWalls),
        occupants: parseInt(room.occupants),
        windowCount: parseInt(room.windowCount || '0'),
        windowArea: parseFloat(room.windowArea || '0'),
        exteriorDoors: parseInt(room.exteriorDoors || '0'),
        patioDoors: parseInt(room.patioDoors || '0'),
        desiredTemp: parseInt(room.desiredTemp),
      };
      
      // Calculate BTU requirements
      const calculationResult = calculateRoomBtu(calculationParams);
      setResult(calculationResult);
      
      // Format room name for history
      const unitSuffix = room.unit === 'imperial' ? 'ft' : 'm';
      const roomName = `${room.length}${unitSuffix} × ${room.width}${unitSuffix} ${room.roomUsage.toLowerCase()} room`;
      
      // Add to history
      const newHistoryEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        roomName: roomName,
        btu: calculationResult.btu,
        kilowatts: calculationResult.kilowatts,
        unit: room.unit,
        params: { ...room } // Store a copy of all parameters
      };
      
      setCalculationHistory(prev => {
        const updatedHistory = [newHistoryEntry, ...prev];
        // Keep only latest 10 entries
        return updatedHistory.slice(0, 10);
      });
    } catch (error) {
      console.error('Error during BTU calculation:', error);
      alert('There was an error calculating BTU requirements. Please check your inputs.');
    }
  };
  
  // Clear form fields and reset to defaults
  const handleClearForm = () => {
    setRoom({
      // Reset to initial defaults
      length: '',
      width: '',
      height: '8',
      unit: room.unit, // Keep current unit selection
      insulation: 'average',
      exteriorWalls: '2',
      wallInsulation: 'AVERAGE',
      ceilingInsulation: 'AVERAGE',
      floorType: 'UNHEATED',
      roomOrientation: 'SOUTH',
      windowCount: '1',
      windowType: 'DOUBLE',
      windowArea: '15',
      exteriorDoors: '1',
      patioDoors: '0',
      windows: [],
      doors: [],
      outsideWalls: 1,
      climateZone: 'COLD',
      roomUsage: 'LIVING',
      occupants: '2',
      desiredTemp: room.unit === 'imperial' ? 70 : 21
    });
    setResult(null);
    setHasInteracted(false);
  };
  
  // Share calculation results
  const handleShareResult = () => {
    if (!result) return;
    
    const unitSuffix = room.unit === 'imperial' ? 'ft' : 'm';
    const tempUnit = room.unit === 'imperial' ? 'F' : 'C';
    
    const shareText = `Room Heating Requirements:
${result.btu.toLocaleString()} BTU/hr
${result.kilowatts} kW
Room Size: ${room.length}${unitSuffix} × ${room.width}${unitSuffix} × ${room.height}${unitSuffix}
Room Type: ${room.roomUsage}
Desired Temp: ${room.desiredTemp}°${tempUnit}
Calculated with Boiler Brain Room BTU Calculator
`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Room BTU Calculation',
        text: shareText
      }).catch(console.error);
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(shareText)
        .then(() => alert('Results copied to clipboard!'))
        .catch(console.error);
    }
  };

  // Define system size based on BTU requirements
  const getSystemSize = (btu) => {
    if (btu <= 5000) return { name: 'Small System', color: 'green' };
    if (btu <= 20000) return { name: 'Medium System', color: 'blue' };
    if (btu <= 40000) return { name: 'Large System', color: 'orange' };
    return { name: 'Central System', color: 'red' };
  };

  // Calculate system size if we have a result
  const systemSize = result ? getSystemSize(result.btu) : { name: 'Pending', color: 'gray' };
  
  // Define a function to format numbers nicely
  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return num.toLocaleString();
  };
  
  return (
    <div className="p-3 sm:p-4 space-y-4 max-w-3xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 p-4 sm:p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0">
            🌡️
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white">Room BTU Calculator</h1>
            <p className="text-sm text-white/70 mt-0.5">Professional heating requirement calculations</p>
          </div>
          <div className="text-right flex-shrink-0 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
            <div className="text-lg font-bold text-white">{progress}%</div>
            <div className="text-xs text-white/60">complete</div>
          </div>
        </div>
        {/* Progress bar inside hero */}
        <div className="relative mt-3 bg-white/20 rounded-full h-2">
          <div 
            className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Unit Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Measurement Unit</label>
        <div className="flex rounded-xl bg-gray-100 p-1">
          <button
            className={`flex-1 py-2.5 text-[14px] font-semibold rounded-lg transition-all duration-200 ${
              room.unit === 'imperial' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleUnitChange('imperial')}
          >
            Imperial (ft, °F)
          </button>
          <button
            className={`flex-1 py-2.5 text-[14px] font-semibold rounded-lg transition-all duration-200 ${
              room.unit === 'metric' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleUnitChange('metric')}
          >
            Metric (m, °C)
          </button>
        </div>
      </div>

        {/* Calculator Sections */}
        <div className="space-y-8">
          {/* Welcome message for first-time users */}
          {!hasInteracted && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Getting Started</h3>
              <p className="text-gray-600">
                Enter your room dimensions and characteristics to calculate the BTU requirements for proper heating.
              </p>
            </div>
          )}
          
          {/* Room dimensions section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <RoomDimensions
              length={room.length}
              setLength={(value) => handleRoomDataChange('length', value)}
              width={room.width}
              setWidth={(value) => handleRoomDataChange('width', value)}
              height={room.height}
              setHeight={(value) => handleRoomDataChange('height', value)}
              unit={room.unit}
              progress={progress}
            />
          </div>
          
          {/* Insulation section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <InsulationSection
              wallInsulation={room.wallInsulation}
              setWallInsulation={(value) => handleRoomDataChange('wallInsulation', value)}
              ceilingInsulation={room.ceilingInsulation}
              setCeilingInsulation={(value) => handleRoomDataChange('ceilingInsulation', value)}
              floorType={room.floorType}
              setFloorType={(value) => handleRoomDataChange('floorType', value)}
              exteriorWalls={room.exteriorWalls}
              setExteriorWalls={(value) => handleRoomDataChange('exteriorWalls', value)}
              roomOrientation={room.roomOrientation}
              setRoomOrientation={(value) => handleRoomDataChange('roomOrientation', value)}
              unit={room.unit}
              progress={progress}
            />
          </div>
          
          {/* Windows and doors section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <WindowsDoorsSection
              windowCount={room.windowCount}
              setWindowCount={(value) => handleRoomDataChange('windowCount', value)}
              windowType={room.windowType}
              setWindowType={(value) => handleRoomDataChange('windowType', value)}
              windowArea={room.windowArea}
              setWindowArea={(value) => handleRoomDataChange('windowArea', value)}
              exteriorDoors={room.exteriorDoors}
              setExteriorDoors={(value) => handleRoomDataChange('exteriorDoors', value)}
              patioDoors={room.patioDoors}
              setPatioDoors={(value) => handleRoomDataChange('patioDoors', value)}
              windows={room.windows}
              setWindows={(value) => handleArrayChange('windows', value)}
              doors={room.doors}
              setDoors={(value) => handleArrayChange('doors', value)}
              unit={room.unit}
              progress={progress}
            />
          </div>
          
          {/* Environment section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <EnvironmentSection
              roomUsage={room.roomUsage}
              setRoomUsage={(value) => handleRoomDataChange('roomUsage', value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <button
              className="px-6 sm:px-8 py-3 sm:py-4 min-h-[44px] bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 text-sm sm:text-base"
              onClick={handleCalculate}
            >
              Calculate BTU
            </button>
            <button
              className="px-6 sm:px-8 py-3 sm:py-4 min-h-[44px] bg-white text-gray-700 font-semibold rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:bg-gray-50 active:scale-[0.98] transition-all duration-200 text-sm sm:text-base"
              onClick={handleClearForm}
            >
              Clear Form
            </button>
            {result && (
              <button
                className="px-6 sm:px-8 py-3 sm:py-4 min-h-[44px] bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 text-sm sm:text-base"
                onClick={handleShareResult}
              >
                Share Results
              </button>
            )}
          </div>

          {/* Results display with enhanced recommendations */}
          {result && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <ResultsDisplay
                result={result}
                roomData={room}
                onShare={handleShareResult}
                systemSize={systemSize}
                unit={room.unit}
                formattedBTU={formatNumber(result.btu)}
                formattedKW={result.kilowatts}
              />
            </div>
          )}
        </div>

        {/* History section */}
        {calculationHistory.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <div className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg mr-3">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Recent Calculations
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 sm:px-8 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-3 sm:px-8 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Room
                    </th>
                    <th scope="col" className="px-3 sm:px-8 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      BTU/hr
                    </th>
                    <th scope="col" className="px-3 sm:px-8 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      kW
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {calculationHistory.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-3 sm:px-8 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="px-3 sm:px-8 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {entry.roomName}
                      </td>
                      <td className="px-3 sm:px-8 py-3 sm:py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                        {entry.btu.toLocaleString()}
                      </td>
                      <td className="px-3 sm:px-8 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.kilowatts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
};

export default RoomBtuCalculator;
