import React, { useState, useEffect, useRef } from 'react';
import { FaCalculator } from 'react-icons/fa';

const GasRateCalculator = () => {
  // State variables
  const [activeTab, setActiveTab] = useState('metric');
  const [gasType, setGasType] = useState('natural');
  const [initialReading, setInitialReading] = useState('');
  const [finalReading, setFinalReading] = useState('');
  const [dialValue, setDialValue] = useState('1.0');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [result, setResult] = useState(null);
  
  const timerRef = useRef(null);

  // Gas type configurations (UK Standard Values)
  // CV in MJ/m³ - Natural gas range is 38-41, using 39.5 as standard average
  // Correction factor 1.02264 accounts for temperature/pressure
  const CORRECTION_FACTOR = 1.02264;
  
  const gasTypes = {
    natural: { name: 'Natural Gas', cvMJ: 39.5, cvKWh: 10.97, color: 'blue' },
    lpg: { name: 'LPG (Propane)', cvMJ: 95.0, cvKWh: 26.39, color: 'orange' },
    butane: { name: 'Butane', cvMJ: 121.0, cvKWh: 33.61, color: 'red' }
  };

  const getCurrentGasType = () => gasTypes[gasType];

  // Timer functions
  const startTimer = () => {
    if (!isTimerRunning) {
      setIsTimerRunning(true);
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimeElapsed(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const resetAll = () => {
    // Reset timer
    setIsTimerRunning(false);
    setTimeElapsed(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Reset all input fields
    setInitialReading('');
    setFinalReading('');
    setDialValue('');
    
    // Clear results
    setResult(null);
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculation functions
  const calculateGasRate = () => {
    let consumption = 0;
    let timeInHours = 0;

    if (activeTab === 'metric') {
      const initial = parseFloat(initialReading) || 0;
      const final = parseFloat(finalReading) || 0;
      consumption = final - initial; // m³
      timeInHours = timeElapsed / 3600; // Convert seconds to hours
    } else {
      const dial = parseFloat(dialValue) || 0;
      consumption = dial * 0.0283168; // Convert ft³ to m³
      timeInHours = timeElapsed / 3600;
    }

    if (timeInHours === 0) return null;

    const gasTypeConfig = getCurrentGasType();
    const hourlyConsumption = consumption / timeInHours; // m³/hour
    
    // UK Formula: kW = (m³/h × CV in MJ/m³ × Correction Factor) ÷ 3.6
    // Using MJ/m³ values for accuracy per GOV.UK guidance
    const grossKW = (hourlyConsumption * gasTypeConfig.cvMJ * CORRECTION_FACTOR) / 3.6;
    
    // Net = Gross × 0.9 (Gross includes latent heat of water vapour, Net excludes it)
    // UK appliances and Gas Safe use Gross, Europe uses Net
    const netKW = grossKW * 0.9;
    
    // BTU conversion: 1 kW = 3412.14 BTU/h
    const grossBtu = grossKW * 3412.14;
    const netBtu = netKW * 3412.14;

    return {
      consumption: consumption.toFixed(4),
      hourlyConsumption: hourlyConsumption.toFixed(4),
      grossKW: grossKW.toFixed(2),
      netKW: netKW.toFixed(2),
      grossBtu: grossBtu.toFixed(0),
      netBtu: netBtu.toFixed(0),
      gasType: gasTypeConfig.name,
      cvUsed: gasTypeConfig.cvMJ,
      correctionFactor: CORRECTION_FACTOR,
      testDuration: timeElapsed,
      timestamp: new Date().toLocaleString()
    };
  };

  const handleCalculate = () => {
    const calculationResult = calculateGasRate();
    if (calculationResult) {
      setResult(calculationResult);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 rounded-t-lg">
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">Gas Rate Calculator</h1>
              <p className="text-blue-100 text-xs sm:text-sm">Professional gas consumption analysis</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs opacity-75 hidden sm:block">Current Gas Type</div>
              <div className="text-sm sm:text-lg font-semibold">{getCurrentGasType().name}</div>
              <div className="text-[10px] sm:text-xs opacity-75">{getCurrentGasType().cvMJ} MJ/m³</div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Unit Toggle */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-6">
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
                activeTab === 'metric'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('metric')}
            >
              Metric Meter
            </button>
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all border-l border-gray-200 ${
                activeTab === 'imperial'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('imperial')}
            >
              Imperial Dial
            </button>
          </div>

          {/* Gas Type Selection */}
          <div className="mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Gas Type</h3>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:rounded-xl sm:border sm:border-gray-200 sm:overflow-hidden sm:gap-0">
              <button
                className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-all rounded-lg sm:rounded-none sm:flex-1 ${
                  gasType === 'natural'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 sm:bg-white text-gray-700 hover:bg-blue-50'
                }`}
                onClick={() => setGasType('natural')}
              >
                <span className="block">Natural</span>
                <span className="block text-[10px] sm:text-xs opacity-75 mt-0.5">39.5 MJ/m³</span>
              </button>
              <button
                className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-all rounded-lg sm:rounded-none sm:border-l sm:border-gray-200 sm:flex-1 ${
                  gasType === 'lpg'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 sm:bg-white text-gray-700 hover:bg-orange-50'
                }`}
                onClick={() => setGasType('lpg')}
              >
                <span className="block">LPG</span>
                <span className="block text-[10px] sm:text-xs opacity-75 mt-0.5">95.0 MJ/m³</span>
              </button>
              <button
                className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-all rounded-lg sm:rounded-none sm:border-l sm:border-gray-200 sm:flex-1 ${
                  gasType === 'butane'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 sm:bg-white text-gray-700 hover:bg-red-50'
                }`}
                onClick={() => setGasType('butane')}
              >
                <span className="block">Butane</span>
                <span className="block text-[10px] sm:text-xs opacity-75 mt-0.5">121.0 MJ/m³</span>
              </button>
            </div>
          </div>

          {/* Input Fields */}
          {activeTab === 'metric' ? (
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Initial Reading</label>
                  <input
                    type="number"
                    value={initialReading}
                    onChange={(e) => setInitialReading(e.target.value)}
                    placeholder="example 12345.678"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Final Reading</label>
                  <input
                    type="number"
                    value={finalReading}
                    onChange={(e) => setFinalReading(e.target.value)}
                    placeholder="example 12345.789"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Timer Display for Metric Mode */}
              <div className="text-center mb-6">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Test Timer</h4>
                  <div className="text-2xl font-light text-gray-900 mb-2">
                    {formatTime(timeElapsed)}
                  </div>
                  <div className="text-xs text-gray-500 mb-3">mm:ss</div>
                  
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={isTimerRunning ? pauseTimer : startTimer}
                      className={`px-4 py-1.5 text-white font-medium rounded transition-colors text-xs ${
                        isTimerRunning 
                          ? 'bg-red-500 hover:bg-red-600' 
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      {isTimerRunning ? 'Stop' : 'Start'}
                    </button>
                    <button
                      onClick={resetAll}
                      className="px-4 py-1.5 bg-gray-500 text-white font-medium rounded hover:bg-gray-600 transition-colors text-xs"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={handleCalculate}
                  className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Calculate
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              {/* Meter Type Selection for Imperial */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Meter Type</h3>
                <div className="flex rounded-xl border border-orange-300 overflow-hidden">
                  <button
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
                      dialValue === '1.0'
                        ? 'bg-orange-400 text-white'
                        : 'bg-white text-gray-700 hover:bg-orange-50'
                    }`}
                    onClick={() => setDialValue('1.0')}
                  >
                    Less than U16
                    <div className="text-xs opacity-75 mt-1">1 CuFt Test Dial</div>
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-all border-l border-orange-300 ${
                      dialValue === '5.0'
                        ? 'bg-orange-400 text-white'
                        : 'bg-white text-gray-700 hover:bg-orange-50'
                    }`}
                    onClick={() => setDialValue('5.0')}
                  >
                    U16
                    <div className="text-xs opacity-75 mt-1">5 CuFt Test Dial</div>
                  </button>
                  <button
                    className={`flex-1 py-3 px-4 text-sm font-medium transition-all border-l border-orange-300 ${
                      dialValue === '10.0'
                        ? 'bg-orange-400 text-white'
                        : 'bg-white text-gray-700 hover:bg-orange-50'
                    }`}
                    onClick={() => setDialValue('10.0')}
                  >
                    Greater U16
                    <div className="text-xs opacity-75 mt-1">10 CuFt Test Dial</div>
                  </button>
                </div>
              </div>

              {/* Timer Display */}
              <div className="text-center mb-6">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Test Timer</h4>
                  <div className="text-2xl font-light text-gray-900 mb-2">
                    {formatTime(timeElapsed)}
                  </div>
                  <div className="text-xs text-gray-500 mb-3">mm:ss</div>
                  
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={isTimerRunning ? pauseTimer : startTimer}
                      className={`px-4 py-1.5 text-white font-medium rounded transition-colors text-xs ${
                        isTimerRunning 
                          ? 'bg-red-500 hover:bg-red-600' 
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      {isTimerRunning ? 'Stop' : 'Start'}
                    </button>
                    <button
                      onClick={resetAll}
                      className="px-4 py-1.5 bg-gray-500 text-white font-medium rounded hover:bg-gray-600 transition-colors text-xs"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleCalculate}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Calculate
                </button>
              </div>
            </div>
          )}

          {/* Results Section */}
          {result && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Results</h3>
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                <div className="grid grid-cols-3 bg-gray-200 text-sm font-semibold text-gray-700">
                  <div className="px-4 py-3 text-center">Unit</div>
                  <div className="px-4 py-3 text-center text-blue-600">Gross</div>
                  <div className="px-4 py-3 text-center text-green-600">Net (90%)</div>
                </div>
                <div className="grid grid-cols-3 bg-white">
                  <div className="px-4 py-4 text-center font-semibold text-gray-900">kW</div>
                  <div className="px-4 py-4 text-center text-blue-600 font-bold text-xl">
                    {result.grossKW}
                  </div>
                  <div className="px-4 py-4 text-center text-green-600 font-bold text-xl">
                    {result.netKW}
                  </div>
                </div>
                <div className="grid grid-cols-3 bg-gray-50">
                  <div className="px-4 py-4 text-center font-semibold text-gray-900">BTU/h</div>
                  <div className="px-4 py-4 text-center text-blue-600 font-semibold">
                    {result.grossBtu}
                  </div>
                  <div className="px-4 py-4 text-center text-green-600 font-semibold">
                    {result.netBtu}
                  </div>
                </div>
                <div className="grid grid-cols-3 bg-white border-t">
                  <div className="px-4 py-3 text-center text-sm text-gray-600">Gas Rate</div>
                  <div className="px-4 py-3 text-center text-sm text-gray-900 font-medium col-span-2">
                    {result.hourlyConsumption} m³/h
                  </div>
                </div>
              </div>
              {/* Formula info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
                <p><strong>Formula:</strong> kW = (m³/h × CV × CF) ÷ 3.6</p>
                <p className="mt-1">CV: {result.cvUsed} MJ/m³ | CF: {result.correctionFactor} | Net = Gross × 0.9</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GasRateCalculator;
