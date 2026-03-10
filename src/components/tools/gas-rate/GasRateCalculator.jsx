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
    <div className="p-3 sm:p-4 space-y-4 max-w-3xl mx-auto">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-4 sm:p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0">
            🔥
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white">Gas Rate Calculator</h1>
            <p className="text-sm text-white/70 mt-0.5">Professional gas consumption analysis</p>
          </div>
          <div className="text-right flex-shrink-0 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
            <div className="text-sm font-semibold text-white">{getCurrentGasType().name}</div>
            <div className="text-xs text-white/60">{getCurrentGasType().cvMJ} MJ/m³</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Unit Toggle */}
        <div className="flex rounded-xl bg-gray-100 p-1">
          <button
            className={`flex-1 py-2.5 px-4 text-[14px] font-semibold rounded-lg transition-all duration-200 ${
              activeTab === 'metric'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('metric')}
          >
            Metric Meter
          </button>
          <button
            className={`flex-1 py-2.5 px-4 text-[14px] font-semibold rounded-lg transition-all duration-200 ${
              activeTab === 'imperial'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('imperial')}
          >
            Imperial Dial
          </button>
        </div>

        {/* Gas Type Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Gas Type</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              className={`py-3 px-3 text-[13px] font-semibold rounded-xl transition-all active:scale-[0.97] ${
                gasType === 'natural'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => setGasType('natural')}
            >
              <span className="block">Natural</span>
              <span className="block text-[10px] opacity-70 mt-0.5">39.5 MJ/m³</span>
            </button>
            <button
              className={`py-3 px-3 text-[13px] font-semibold rounded-xl transition-all active:scale-[0.97] ${
                gasType === 'lpg'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-orange-300'
              }`}
              onClick={() => setGasType('lpg')}
            >
              <span className="block">LPG</span>
              <span className="block text-[10px] opacity-70 mt-0.5">95.0 MJ/m³</span>
            </button>
            <button
              className={`py-3 px-3 text-[13px] font-semibold rounded-xl transition-all active:scale-[0.97] ${
                gasType === 'butane'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-red-300'
              }`}
              onClick={() => setGasType('butane')}
            >
              <span className="block">Butane</span>
              <span className="block text-[10px] opacity-70 mt-0.5">121.0 MJ/m³</span>
            </button>
          </div>
        </div>

        {/* Input Fields */}
        {activeTab === 'metric' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Initial Reading</label>
                <input
                  type="number"
                  value={initialReading}
                  onChange={(e) => setInitialReading(e.target.value)}
                  placeholder="12345.678"
                  className="w-full px-4 py-3 min-h-[44px] border border-gray-200 rounded-xl text-[16px] text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Final Reading</label>
                <input
                  type="number"
                  value={finalReading}
                  onChange={(e) => setFinalReading(e.target.value)}
                  placeholder="12345.789"
                  className="w-full px-4 py-3 min-h-[44px] border border-gray-200 rounded-xl text-[16px] text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Timer */}
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Test Timer</p>
              <div className="text-3xl font-bold text-gray-900 font-mono tracking-wider mb-1">
                {formatTime(timeElapsed)}
              </div>
              <p className="text-[11px] text-gray-400 mb-3">mm:ss</p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={isTimerRunning ? pauseTimer : startTimer}
                  className={`px-5 py-2.5 min-h-[44px] text-white font-semibold rounded-xl transition-all active:scale-[0.97] text-sm ${
                    isTimerRunning 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isTimerRunning ? 'Stop' : 'Start'}
                </button>
                <button
                  onClick={resetAll}
                  className="px-5 py-2.5 min-h-[44px] bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all active:scale-[0.97] text-sm"
                >
                  Reset
                </button>
              </div>
            </div>

            <button
              onClick={handleCalculate}
              className="w-full py-3.5 min-h-[44px] bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              Calculate Gas Rate
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Meter Type Selection for Imperial */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Meter Type</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  className={`py-3 px-2 text-[13px] font-semibold rounded-xl transition-all active:scale-[0.97] ${
                    dialValue === '1.0'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-orange-300'
                  }`}
                  onClick={() => setDialValue('1.0')}
                >
                  <span className="block">&lt; U16</span>
                  <span className="block text-[10px] opacity-70 mt-0.5">1 CuFt Dial</span>
                </button>
                <button
                  className={`py-3 px-2 text-[13px] font-semibold rounded-xl transition-all active:scale-[0.97] ${
                    dialValue === '5.0'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-orange-300'
                  }`}
                  onClick={() => setDialValue('5.0')}
                >
                  <span className="block">U16</span>
                  <span className="block text-[10px] opacity-70 mt-0.5">5 CuFt Dial</span>
                </button>
                <button
                  className={`py-3 px-2 text-[13px] font-semibold rounded-xl transition-all active:scale-[0.97] ${
                    dialValue === '10.0'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-orange-300'
                  }`}
                  onClick={() => setDialValue('10.0')}
                >
                  <span className="block">&gt; U16</span>
                  <span className="block text-[10px] opacity-70 mt-0.5">10 CuFt Dial</span>
                </button>
              </div>
            </div>

            {/* Timer */}
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Test Timer</p>
              <div className="text-3xl font-bold text-gray-900 font-mono tracking-wider mb-1">
                {formatTime(timeElapsed)}
              </div>
              <p className="text-[11px] text-gray-400 mb-3">mm:ss</p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={isTimerRunning ? pauseTimer : startTimer}
                  className={`px-5 py-2.5 min-h-[44px] text-white font-semibold rounded-xl transition-all active:scale-[0.97] text-sm ${
                    isTimerRunning 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isTimerRunning ? 'Stop' : 'Start'}
                </button>
                <button
                  onClick={resetAll}
                  className="px-5 py-2.5 min-h-[44px] bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-all active:scale-[0.97] text-sm"
                >
                  Reset
                </button>
              </div>
            </div>

            <button
              onClick={handleCalculate}
              className="w-full py-3.5 min-h-[44px] bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              Calculate Gas Rate
            </button>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
            <h3 className="font-bold text-blue-900 text-base">Results</h3>
            <div className="bg-white rounded-xl overflow-hidden border border-blue-100">
              <div className="grid grid-cols-3 bg-blue-50 text-[13px] font-bold text-gray-600">
                <div className="px-3 py-2.5 text-center">Unit</div>
                <div className="px-3 py-2.5 text-center text-blue-600">Gross</div>
                <div className="px-3 py-2.5 text-center text-green-600">Net (90%)</div>
              </div>
              <div className="grid grid-cols-3">
                <div className="px-3 py-3 text-center font-semibold text-gray-900 text-sm">kW</div>
                <div className="px-3 py-3 text-center text-blue-600 font-bold text-xl">
                  {result.grossKW}
                </div>
                <div className="px-3 py-3 text-center text-green-600 font-bold text-xl">
                  {result.netKW}
                </div>
              </div>
              <div className="grid grid-cols-3 bg-gray-50 border-t border-gray-100">
                <div className="px-3 py-3 text-center font-semibold text-gray-900 text-sm">BTU/h</div>
                <div className="px-3 py-3 text-center text-blue-600 font-semibold text-sm">
                  {result.grossBtu}
                </div>
                <div className="px-3 py-3 text-center text-green-600 font-semibold text-sm">
                  {result.netBtu}
                </div>
              </div>
              <div className="grid grid-cols-3 border-t border-gray-100">
                <div className="px-3 py-2.5 text-center text-[13px] text-gray-500">Gas Rate</div>
                <div className="px-3 py-2.5 text-center text-[13px] text-gray-900 font-medium col-span-2">
                  {result.hourlyConsumption} m³/h
                </div>
              </div>
            </div>
            <div className="text-xs text-blue-800 bg-blue-100/50 rounded-lg p-3">
              <p><strong>Formula:</strong> kW = (m³/h × CV × CF) ÷ 3.6</p>
              <p className="mt-1">CV: {result.cvUsed} MJ/m³ | CF: {result.correctionFactor} | Net = Gross × 0.9</p>
            </div>
            <button
              onClick={() => {
                const gas = getCurrentGasType();
                const html = `<!DOCTYPE html><html><head><title>Gas Rate Report</title>
                  <style>body{font-family:-apple-system,sans-serif;padding:40px;max-width:600px;margin:0 auto}
                  h1{font-size:20px;color:#1e40af}table{width:100%;border-collapse:collapse;margin:16px 0}
                  th,td{border:1px solid #ddd;padding:10px;text-align:center}th{background:#eff6ff;font-size:13px}
                  .meta{color:#666;font-size:13px;margin-top:24px}.formula{background:#eff6ff;padding:12px;border-radius:8px;font-size:12px;margin-top:16px}</style>
                  </head><body>
                  <h1>BoilerBrain — Gas Rate Calculation</h1>
                  <p style="color:#666;font-size:13px">${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}</p>
                  <p><strong>Gas Type:</strong> ${gas.name}</p>
                  <table><tr><th>Unit</th><th>Gross</th><th>Net (90%)</th></tr>
                  <tr><td><strong>kW</strong></td><td>${result.grossKW}</td><td>${result.netKW}</td></tr>
                  <tr><td><strong>BTU/h</strong></td><td>${result.grossBtu}</td><td>${result.netBtu}</td></tr>
                  <tr><td><strong>Gas Rate</strong></td><td colspan="2">${result.hourlyConsumption} m³/h</td></tr></table>
                  <div class="formula"><strong>Formula:</strong> kW = (m³/h × CV × CF) ÷ 3.6<br/>
                  CV: ${result.cvUsed} MJ/m³ | CF: ${result.correctionFactor} | Net = Gross × 0.9</div>
                  <p class="meta">Generated by BoilerBrain Engineering Tools</p>
                  </body></html>`;
                const w = window.open('', '_blank');
                w.document.write(html);
                w.document.close();
                w.print();
              }}
              className="w-full mt-2 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              Export as PDF
            </button>
          </div>
        )}

        {/* Testing guidance */}
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 space-y-1">
          <p className="font-semibold text-blue-800">Testing Notes</p>
          <p>• <strong>Minimum test time: 2 minutes</strong> — longer tests give greater accuracy</p>
          <p>• UK appliances are rated in <strong>Gross CV</strong>. Always compare the Gross kW result to the appliance data plate, not the Net figure</p>
          <p>• Natural gas CV varies 38–41 MJ/m³ by region — 39.5 MJ/m³ is the UK standard average</p>
          <p>• Acceptable result: ± 5% of appliance data plate rating</p>
        </div>
      </div>
    </div>
  );
};

export default GasRateCalculator;
