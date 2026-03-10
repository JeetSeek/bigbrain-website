import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  parseFlueGasCSV,
  detectManufacturer,
  createManualReading,
  getSafetyStatus,
  generateSampleCSV,
  FIELD_LABELS,
} from './fgaParser';
import {
  isBleSupported,
  getBleUnsupportedReason,
  getBleManager,
} from './bleManager';

/**
 * Flue Gas Analyser Integration
 * Supports CSV import from Kane LIVE, TPI View, Anton Sprint Mobile
 * Plus manual entry for engineers without BLE-capable analysers
 */
const FlueGasAnalyser = () => {
  const [activeView, setActiveView] = useState('import'); // 'import' | 'manual' | 'history' | 'bluetooth'
  const [readings, setReadings] = useState(() => {
    try {
      const saved = localStorage.getItem('bb_fga_readings');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [currentReading, setCurrentReading] = useState(null);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Bluetooth state
  const [bleState, setBleState] = useState('disconnected'); // disconnected | scanning | connecting | connected | error
  const [bleDevice, setBleDevice] = useState(null);
  const [bleDeviceInfo, setBleDeviceInfo] = useState({});
  const [bleServices, setBleServices] = useState([]);
  const [bleBattery, setBleBattery] = useState(null);
  const [bleError, setBleError] = useState(null);
  const [bleLiveData, setBleLiveData] = useState({});
  const [bleRawLog, setBleRawLog] = useState([]);
  const [bleSubscribed, setBleSubscribed] = useState(false);
  const [showRawLog, setShowRawLog] = useState(false);
  const bleManagerRef = useRef(null);

  // Initialise BLE manager
  useEffect(() => {
    const mgr = getBleManager();
    bleManagerRef.current = mgr;

    mgr.onStateChange = (state, device, info) => {
      setBleState(state);
      if (device) setBleDevice({ name: device?.name, id: device?.id });
      if (info) setBleDeviceInfo(prev => ({ ...prev, ...info }));
    };

    mgr.onRawMessage = (text) => {
      setBleRawLog(prev => [
        { time: new Date().toLocaleTimeString('en-GB'), msg: text },
        ...prev.slice(0, 99),
      ]);
    };

    mgr.onDataReceived = (parsed) => {
      setBleLiveData(prev => ({ ...prev, ...parsed }));
    };

    return () => {
      mgr.onStateChange = null;
      mgr.onRawMessage = null;
      mgr.onDataReceived = null;
    };
  }, []);

  // BLE: Scan for analyser
  const handleBleScan = useCallback(async (scanAll = false) => {
    setBleError(null);
    setBleServices([]);
    setBleLiveData({});
    setBleRawLog([]);
    setBleSubscribed(false);
    setBleBattery(null);
    try {
      const mgr = bleManagerRef.current;
      const device = scanAll ? await mgr.scanAll() : await mgr.scan();
      if (!device) return; // user cancelled
      setBleDeviceInfo(mgr.deviceInfo);
    } catch (err) {
      setBleError(err.message);
    }
  }, []);

  // BLE: Connect to selected device
  const handleBleConnect = useCallback(async () => {
    setBleError(null);
    try {
      const mgr = bleManagerRef.current;
      await mgr.connect();
      setBleDeviceInfo({ ...mgr.deviceInfo });

      // Try reading battery
      const batt = await mgr.getBatteryLevel();
      setBleBattery(batt);
    } catch (err) {
      setBleError(err.message);
    }
  }, []);

  // BLE: Discover services
  const handleBleDiscover = useCallback(async () => {
    setBleError(null);
    try {
      const mgr = bleManagerRef.current;
      const discovered = await mgr.discoverAll();
      setBleServices(discovered);
    } catch (err) {
      setBleError(err.message);
    }
  }, []);

  // BLE: Subscribe to UART notifications
  const handleBleSubscribe = useCallback(async () => {
    setBleError(null);
    try {
      const mgr = bleManagerRef.current;
      const ok = await mgr.subscribeToUART((parsed) => {
        setBleLiveData(prev => ({ ...prev, ...parsed }));
      });
      if (ok) {
        setBleSubscribed(true);
      } else {
        setBleError('UART service not available on this device. Try subscribing to a specific characteristic below.');
      }
    } catch (err) {
      setBleError(err.message);
    }
  }, []);

  // BLE: Subscribe to a specific characteristic
  const handleBleSubscribeChar = useCallback(async (charUuid) => {
    setBleError(null);
    try {
      const mgr = bleManagerRef.current;
      await mgr.subscribeToCharacteristic(charUuid, ({ text, bytes }) => {
        // Try to merge parsed numeric data
        const nums = {};
        const pairs = text.match(/(\w+)[=:]([-\d.]+)/g);
        if (pairs) {
          pairs.forEach(p => {
            const [k, v] = p.split(/[=:]/);
            const n = parseFloat(v);
            if (!isNaN(n)) nums[k.trim().toLowerCase()] = n;
          });
        }
        if (Object.keys(nums).length > 0) {
          setBleLiveData(prev => ({ ...prev, ...nums }));
        }
      });
      setBleSubscribed(true);
    } catch (err) {
      setBleError(err.message);
    }
  }, []);

  // BLE: Save live data as a reading
  const handleBleSaveReading = useCallback(() => {
    if (Object.keys(bleLiveData).length === 0) return;
    const reading = {
      id: `ble-${Date.now()}`,
      manufacturer: bleDeviceInfo.manufacturer || 'bluetooth',
      timestamp: new Date().toISOString(),
      testType: 'bluetooth-live',
      fuelType: 'natural gas',
      values: { ...bleLiveData },
    };
    const updated = [reading, ...readings];
    saveReadings(updated);
    setCurrentReading(reading);
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 4000);
  }, [bleLiveData, bleDeviceInfo, readings, saveReadings]);

  // BLE: Disconnect
  const handleBleDisconnect = useCallback(() => {
    const mgr = bleManagerRef.current;
    mgr.disconnect();
    setBleServices([]);
    setBleLiveData({});
    setBleSubscribed(false);
    setBleBattery(null);
  }, []);

  // Manual entry form state
  const [manualForm, setManualForm] = useState({
    testType: 'high-fire',
    fuelType: 'natural gas',
    o2: '', co: '', co2: '',
    flueTemp: '', ambientTemp: '',
    efficiencyNet: '', efficiencyGross: '',
    excessAir: '', coAirFree: '',
  });

  // Save readings to localStorage
  const saveReadings = useCallback((newReadings) => {
    setReadings(newReadings);
    try {
      localStorage.setItem('bb_fga_readings', JSON.stringify(newReadings));
    } catch (e) {
      console.warn('Could not save FGA readings to localStorage:', e);
    }
  }, []);

  // Handle CSV file import
  const handleFileImport = useCallback(async (file) => {
    setImportError(null);
    setImportSuccess(false);

    if (!file) return;
    if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
      setImportError('Please upload a CSV file exported from your analyser app.');
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseFlueGasCSV(text);

      if (parsed.length === 0) {
        setImportError('No valid readings found in the CSV file. Please check the format.');
        return;
      }

      const manufacturer = detectManufacturer(text);
      const updated = [...parsed, ...readings];
      saveReadings(updated);
      setCurrentReading(parsed[0]);
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 4000);
    } catch (err) {
      setImportError(err.message || 'Failed to parse CSV file.');
    }
  }, [readings, saveReadings]);

  // Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileImport(e.dataTransfer.files[0]);
    }
  }, [handleFileImport]);

  const handleFileChange = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileImport(e.target.files[0]);
    }
  }, [handleFileImport]);

  // Load sample data for testing
  const loadSampleData = useCallback(() => {
    const csv = generateSampleCSV('kane');
    const parsed = parseFlueGasCSV(csv);
    const updated = [...parsed, ...readings];
    saveReadings(updated);
    setCurrentReading(parsed[0]);
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 4000);
  }, [readings, saveReadings]);

  // Manual entry submit
  const handleManualSubmit = useCallback((e) => {
    e.preventDefault();
    const reading = createManualReading(manualForm);
    if (Object.keys(reading.values).length === 0) {
      setImportError('Please enter at least one reading value.');
      return;
    }
    const updated = [reading, ...readings];
    saveReadings(updated);
    setCurrentReading(reading);
    setActiveView('import');
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 4000);
    setManualForm({
      testType: 'high-fire', fuelType: 'natural gas',
      o2: '', co: '', co2: '',
      flueTemp: '', ambientTemp: '',
      efficiencyNet: '', efficiencyGross: '',
      excessAir: '', coAirFree: '',
    });
  }, [manualForm, readings, saveReadings]);

  // Clear history
  const clearHistory = useCallback(() => {
    saveReadings([]);
    setCurrentReading(null);
  }, [saveReadings]);

  // Export readings as CSV
  const exportReadings = useCallback(() => {
    if (readings.length === 0) return;
    const headers = ['Date', 'Test Type', 'Fuel', 'Manufacturer', 'O2 %', 'CO ppm', 'CO2 %', 'Flue Temp °C', 'Ambient Temp °C', 'ΔT °C', 'Eff Net %', 'Eff Gross %', 'Excess Air %', 'CO AF ppm', 'CO/CO2 Ratio'];
    const rows = readings.map(r => [
      r.timestamp, r.testType, r.fuelType, r.manufacturer,
      r.values.o2 ?? '', r.values.co ?? '', r.values.co2 ?? '',
      r.values.flueTemp ?? '', r.values.ambientTemp ?? '', r.values.deltaT ?? '',
      r.values.efficiencyNet ?? '', r.values.efficiencyGross ?? '',
      r.values.excessAir ?? '', r.values.coAirFree ?? '', r.values.coCo2Ratio ?? '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boilerbrain-fga-readings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [readings]);

  // Get status colour
  const getStatusColor = (key, value) => {
    const status = getSafetyStatus(key, value);
    if (status === 'danger') return 'text-red-600 bg-red-50 border-red-200';
    if (status === 'warning') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  };

  const getStatusDot = (key, value) => {
    const status = getSafetyStatus(key, value);
    if (status === 'danger') return 'bg-red-500';
    if (status === 'warning') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // Manufacturer badge
  const ManufacturerBadge = ({ manufacturer }) => {
    const colors = {
      kane: 'bg-blue-100 text-blue-700',
      tpi: 'bg-purple-100 text-purple-700',
      anton: 'bg-green-100 text-green-700',
      testo: 'bg-orange-100 text-orange-700',
      manual: 'bg-gray-100 text-gray-700',
      generic: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${colors[manufacturer] || colors.generic}`}>
        {manufacturer === 'manual' ? 'Manual Entry' : manufacturer}
      </span>
    );
  };

  // Reading value card
  const ReadingCard = ({ fieldKey, value }) => {
    const field = FIELD_LABELS[fieldKey];
    if (!field) return null;
    const statusColor = getStatusColor(fieldKey, value);
    const dotColor = getStatusDot(fieldKey, value);

    return (
      <div className={`rounded-xl p-3 border ${statusColor} transition-all`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-medium opacity-70">{field.label}</span>
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        </div>
        <div className="text-lg font-bold tabular-nums">
          {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : value}
          {field.unit && <span className="text-xs font-normal ml-1 opacity-60">{field.unit}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-4 sm:p-5 mb-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl flex-shrink-0">
            📊
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Flue Gas Analyser</h1>
            <p className="text-sm text-white/70 mt-0.5">Connect via Bluetooth, import CSV, or enter manually</p>
          </div>
        </div>
        {/* Tab switcher */}
        <div className="flex flex-wrap gap-2 mt-3">
          {[
            { id: 'bluetooth', label: 'Bluetooth', icon: '📡' },
            { id: 'import', label: 'CSV Import', icon: '📥' },
            { id: 'manual', label: 'Manual', icon: '✏️' },
            { id: 'history', label: `History (${readings.length})`, icon: '📋' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveView(tab.id); setImportError(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[44px] ${
                activeView === tab.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'bg-white/15 text-white/90 hover:bg-white/25'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Success message */}
      {importSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex items-center gap-2">
          <span className="text-emerald-500 text-lg">✓</span>
          <span className="text-sm text-emerald-700 font-medium">Readings imported successfully!</span>
        </div>
      )}

      {/* Error message */}
      {importError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2">
          <span className="text-red-500 text-lg">⚠</span>
          <span className="text-sm text-red-700">{importError}</span>
          <button onClick={() => setImportError(null)} className="ml-auto text-red-400 hover:text-red-600 text-lg">×</button>
        </div>
      )}

      {/* === BLUETOOTH VIEW === */}
      {activeView === 'bluetooth' && (
        <div className="space-y-4">
          {/* Browser support check */}
          {!isBleSupported() ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
              <div className="text-4xl mb-3">🚫</div>
              <h3 className="text-base font-semibold text-amber-800 mb-2">Bluetooth Not Available</h3>
              <p className="text-sm text-amber-700 leading-relaxed">
                {getBleUnsupportedReason()}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setActiveView('import')}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl min-h-[44px]"
                >
                  Use CSV Import Instead
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Connection status card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800">Device Connection</h3>
                  <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    bleState === 'connected' ? 'bg-emerald-100 text-emerald-700' :
                    bleState === 'connecting' || bleState === 'scanning' ? 'bg-blue-100 text-blue-700' :
                    bleState === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      bleState === 'connected' ? 'bg-emerald-500 animate-pulse' :
                      bleState === 'connecting' || bleState === 'scanning' ? 'bg-blue-500 animate-pulse' :
                      bleState === 'error' ? 'bg-red-500' :
                      'bg-gray-400'
                    }`} />
                    {bleState === 'connected' ? 'Connected' :
                     bleState === 'connecting' ? 'Connecting...' :
                     bleState === 'scanning' ? 'Scanning...' :
                     bleState === 'error' ? 'Error' :
                     'Disconnected'}
                  </span>
                </div>

                <div className="p-4">
                  {/* Disconnected — show scan buttons */}
                  {bleState === 'disconnected' && (
                    <div className="text-center py-4">
                      <div className="text-4xl mb-3">📡</div>
                      <h3 className="text-base font-semibold text-gray-800 mb-1">Connect Your Analyser</h3>
                      <p className="text-sm text-gray-500 mb-4">Make sure your analyser has Bluetooth enabled and is in range</p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <button
                          onClick={() => handleBleScan(false)}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors min-h-[44px]"
                        >
                          📡 Scan for Analysers
                        </button>
                        <button
                          onClick={() => handleBleScan(true)}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors min-h-[44px]"
                        >
                          🔍 Show All Devices
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-3">Scan filters for Kane, TPI, Anton, Testo by name</p>
                    </div>
                  )}

                  {/* Scanning / Connecting — spinner */}
                  {(bleState === 'scanning' || bleState === 'connecting') && (
                    <div className="text-center py-6">
                      <div className="inline-block w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" style={{ borderWidth: '3px' }} />
                      <p className="text-sm font-medium text-gray-700">
                        {bleState === 'scanning' ? 'Select your analyser from the browser dialog...' : 'Connecting to device...'}
                      </p>
                    </div>
                  )}

                  {/* Device selected but not yet connected */}
                  {bleState !== 'disconnected' && bleState !== 'scanning' && bleState !== 'connecting' && bleState !== 'connected' && bleDeviceInfo.name && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600 mb-2">Device found: <strong>{bleDeviceInfo.name}</strong></p>
                      <button
                        onClick={handleBleConnect}
                        className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl min-h-[44px]"
                      >
                        Connect
                      </button>
                    </div>
                  )}

                  {/* Connected — show device info */}
                  {bleState === 'connected' && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[11px] font-medium px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                          {bleDeviceInfo.name || 'Unknown'}
                        </span>
                        {bleDeviceInfo.manufacturer && bleDeviceInfo.manufacturer !== 'unknown' && (
                          <span className="text-[11px] font-medium px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full uppercase">
                            {bleDeviceInfo.manufacturer}
                          </span>
                        )}
                        {bleDeviceInfo.modelNumber && (
                          <span className="text-[11px] font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                            Model: {bleDeviceInfo.modelNumber}
                          </span>
                        )}
                        {bleDeviceInfo.serialNumber && (
                          <span className="text-[11px] font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                            S/N: {bleDeviceInfo.serialNumber}
                          </span>
                        )}
                        {bleDeviceInfo.firmwareRevision && (
                          <span className="text-[11px] font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                            FW: {bleDeviceInfo.firmwareRevision}
                          </span>
                        )}
                        {bleBattery !== null && (
                          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                            bleBattery > 50 ? 'bg-emerald-50 text-emerald-700' :
                            bleBattery > 20 ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            🔋 {bleBattery}%
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleBleDiscover}
                          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-xs font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
                        >
                          🔎 Discover Services
                        </button>
                        {!bleSubscribed && (
                          <button
                            onClick={handleBleSubscribe}
                            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors min-h-[44px]"
                          >
                            📶 Start Live Data
                          </button>
                        )}
                        {bleSubscribed && (
                          <span className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700 rounded-lg min-h-[44px]">
                            📶 Listening for data...
                          </span>
                        )}
                        <button
                          onClick={handleBleDisconnect}
                          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-xs font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors min-h-[44px]"
                        >
                          ✕ Disconnect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* BLE Error */}
              {bleError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                  <span className="text-red-500 text-lg">⚠</span>
                  <span className="text-sm text-red-700">{bleError}</span>
                  <button onClick={() => setBleError(null)} className="ml-auto text-red-400 hover:text-red-600 text-lg">×</button>
                </div>
              )}

              {/* Live data display */}
              {Object.keys(bleLiveData).length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-800">Live Readings</h3>
                      <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        LIVE
                      </span>
                    </div>
                    <button
                      onClick={handleBleSaveReading}
                      className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 min-h-[44px] px-2"
                    >
                      💾 Save Reading
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {Object.entries(bleLiveData).map(([key, value]) => (
                        <ReadingCard key={key} fieldKey={key} value={value} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Discovered services */}
              {bleServices.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800">BLE Services ({bleServices.length})</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {bleServices.map((svc, sIdx) => (
                      <div key={svc.uuid} className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded break-all">
                            {svc.uuid}
                          </span>
                        </div>
                        {svc.characteristics.length > 0 && (
                          <div className="ml-3 space-y-1.5">
                            {svc.characteristics.map((ch, cIdx) => (
                              <div key={ch.uuid} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="font-mono text-gray-500 break-all">{ch.uuid.substring(0, 8)}...</span>
                                <div className="flex gap-1">
                                  {ch.properties.read && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">R</span>}
                                  {ch.properties.write && <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-[10px] font-medium">W</span>}
                                  {ch.properties.notify && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-medium">N</span>}
                                  {ch.properties.indicate && <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-[10px] font-medium">I</span>}
                                </div>
                                {ch.value && <span className="text-gray-400 truncate max-w-[120px]">{ch.value}</span>}
                                {(ch.properties.notify || ch.properties.indicate) && bleState === 'connected' && (
                                  <button
                                    onClick={() => handleBleSubscribeChar(ch.uuid)}
                                    className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-medium hover:bg-indigo-100 transition-colors"
                                  >
                                    Subscribe
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw data log */}
              {bleRawLog.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setShowRawLog(!showRawLog)}
                    className="w-full px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-left min-h-[44px]"
                  >
                    <h3 className="text-sm font-bold text-gray-800">Raw Data Log ({bleRawLog.length})</h3>
                    <span className="text-gray-400 text-sm">{showRawLog ? '▲' : '▼'}</span>
                  </button>
                  {showRawLog && (
                    <div className="max-h-48 overflow-y-auto p-3 bg-gray-900 font-mono text-[11px] leading-relaxed">
                      {bleRawLog.map((entry, i) => (
                        <div key={i} className="text-gray-300">
                          <span className="text-gray-500">[{entry.time}]</span> {entry.msg}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Help info */}
              {bleState === 'disconnected' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Supported Analysers</h3>
                  <div className="space-y-2">
                    {[
                      { brand: 'Kane', models: 'KANE258, KANE358, KANE458, KANE458s, KANE958', color: 'bg-blue-100 text-blue-700' },
                      { brand: 'TPI', models: 'DC710, DC711', color: 'bg-purple-100 text-purple-700' },
                      { brand: 'Anton', models: 'Sprint Pro3, Pro4, Pro5, Pro6', color: 'bg-green-100 text-green-700' },
                      { brand: 'Testo', models: 'testo 300, testo 310 II, testo 330', color: 'bg-orange-100 text-orange-700' },
                    ].map(item => (
                      <div key={item.brand} className="flex items-start gap-2">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${item.color}`}>{item.brand}</span>
                        <span className="text-xs text-gray-600">{item.models}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      <strong>Note:</strong> Bluetooth connection requires Chrome, Edge, or Opera on Android, macOS, Windows, or Linux. 
                      iOS Safari is not supported — use CSV Import instead.
                      Manufacturer-specific protocols may require a partnership for full data access.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* === IMPORT VIEW === */}
      {activeView === 'import' && (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'
                : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="text-4xl mb-3">📂</div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">
              {dragActive ? 'Drop CSV file here' : 'Import from Analyser App'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Drag & drop your CSV export, or tap to browse
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {['Kane LIVE', 'TPI View', 'Anton Sprint'].map(app => (
                <span key={app} className="text-[11px] font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                  {app}
                </span>
              ))}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors min-h-[44px]"
            >
              📥 Choose CSV File
            </button>
          </div>

          {/* How-to guide */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3">How to export from your analyser app:</h3>
            <div className="space-y-3">
              {[
                { app: 'Kane LIVE', color: 'bg-blue-100 text-blue-700', steps: 'Open KANE LIVE → View test results → Tap Share → Choose CSV → Send/Save to Files' },
                { app: 'TPI View', color: 'bg-purple-100 text-purple-700', steps: 'Open TPI View → Go to Job Reports → Select report → Export as CSV → Share to Files' },
                { app: 'Anton Sprint', color: 'bg-green-100 text-green-700', steps: 'Open Sprint Mobile → View Reports → Select test → Share → Export CSV → Save to Files' },
              ].map(item => (
                <div key={item.app} className="flex items-start gap-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${item.color}`}>
                    {item.app}
                  </span>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.steps}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Try sample data */}
          <button
            onClick={loadSampleData}
            className="w-full text-center text-sm text-indigo-600 font-medium py-2 hover:text-indigo-700 transition-colors"
          >
            🧪 Load sample data to preview the feature
          </button>

          {/* Current reading display */}
          {currentReading && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-800">Latest Reading</h3>
                  <ManufacturerBadge manufacturer={currentReading.manufacturer} />
                </div>
                <span className="text-[11px] text-gray-500">
                  {new Date(currentReading.timestamp).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>

              {/* Safety summary */}
              {currentReading.values.coCo2Ratio !== undefined && (
                <div className={`px-4 py-2.5 flex items-center gap-2 border-b ${
                  getSafetyStatus('coCo2Ratio', currentReading.values.coCo2Ratio) === 'safe'
                    ? 'bg-emerald-50 border-emerald-100'
                    : getSafetyStatus('coCo2Ratio', currentReading.values.coCo2Ratio) === 'warning'
                    ? 'bg-amber-50 border-amber-100'
                    : 'bg-red-50 border-red-100'
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${getStatusDot('coCo2Ratio', currentReading.values.coCo2Ratio)}`} />
                  <span className="text-xs font-semibold">
                    CO/CO₂ Ratio: {currentReading.values.coCo2Ratio}
                    {getSafetyStatus('coCo2Ratio', currentReading.values.coCo2Ratio) === 'safe' && ' — Within safe limits'}
                    {getSafetyStatus('coCo2Ratio', currentReading.values.coCo2Ratio) === 'warning' && ' — Investigation needed'}
                    {getSafetyStatus('coCo2Ratio', currentReading.values.coCo2Ratio) === 'danger' && ' — DANGER: Immediate action required'}
                  </span>
                </div>
              )}

              {/* Readings grid */}
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {Object.entries(currentReading.values).map(([key, value]) => (
                    <ReadingCard key={key} fieldKey={key} value={value} />
                  ))}
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                  <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                    Test: {currentReading.testType}
                  </span>
                  <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                    Fuel: {currentReading.fuelType}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === MANUAL ENTRY VIEW === */}
      {activeView === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Test Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Test Type</label>
                <select
                  value={manualForm.testType}
                  onChange={(e) => setManualForm(f => ({ ...f, testType: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[16px] bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none min-h-[44px]"
                >
                  <option value="high-fire">High Fire</option>
                  <option value="low-fire">Low Fire</option>
                  <option value="ambient">Ambient</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Fuel Type</label>
                <select
                  value={manualForm.fuelType}
                  onChange={(e) => setManualForm(f => ({ ...f, fuelType: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[16px] bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none min-h-[44px]"
                >
                  <option value="natural gas">Natural Gas</option>
                  <option value="lpg">LPG</option>
                  <option value="oil">Oil</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Core Readings</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: 'o2', label: 'O₂ (%)', placeholder: 'e.g. 5.2' },
                { key: 'co', label: 'CO (ppm)', placeholder: 'e.g. 42' },
                { key: 'co2', label: 'CO₂ (%)', placeholder: 'e.g. 9.8' },
                { key: 'flueTemp', label: 'Flue Temp (°C)', placeholder: 'e.g. 127' },
                { key: 'ambientTemp', label: 'Ambient Temp (°C)', placeholder: 'e.g. 21' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{field.label}</label>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={manualForm[field.key]}
                    onChange={(e) => setManualForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[16px] focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none min-h-[44px]"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Efficiency & Safety</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { key: 'efficiencyNet', label: 'Efficiency Net (%)', placeholder: 'e.g. 92.3' },
                { key: 'efficiencyGross', label: 'Efficiency Gross (%)', placeholder: 'e.g. 84.1' },
                { key: 'excessAir', label: 'Excess Air (%)', placeholder: 'e.g. 32.8' },
                { key: 'coAirFree', label: 'CO Air-Free (ppm)', placeholder: 'e.g. 58' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{field.label}</label>
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={manualForm[field.key]}
                    onChange={(e) => setManualForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[16px] focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none min-h-[44px]"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors min-h-[44px] text-sm"
          >
            Save Reading
          </button>
        </form>
      )}

      {/* === HISTORY VIEW === */}
      {activeView === 'history' && (
        <div className="space-y-4">
          {readings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <div className="text-4xl mb-3">📭</div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">No readings yet</h3>
              <p className="text-sm text-gray-500">Import a CSV or enter readings manually to get started.</p>
            </div>
          ) : (
            <>
              {/* Actions bar */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={exportReadings}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  📤 Export All as CSV
                </button>
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white border border-red-200 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors min-h-[44px]"
                >
                  🗑️ Clear History
                </button>
              </div>

              {/* Readings list */}
              {readings.map((reading, idx) => (
                <button
                  key={reading.id || idx}
                  onClick={() => { setCurrentReading(reading); setActiveView('import'); }}
                  className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:shadow-md transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ManufacturerBadge manufacturer={reading.manufacturer} />
                      <span className="text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{reading.testType}</span>
                    </div>
                    <span className="text-[11px] text-gray-500">
                      {new Date(reading.timestamp).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {reading.values.o2 !== undefined && (
                      <div className="text-xs"><span className="text-gray-400">O₂:</span> <span className="font-semibold text-gray-700">{reading.values.o2}%</span></div>
                    )}
                    {reading.values.co !== undefined && (
                      <div className="text-xs">
                        <span className="text-gray-400">CO:</span>
                        <span className={`font-semibold ml-0.5 ${getSafetyStatus('co', reading.values.co) === 'danger' ? 'text-red-600' : getSafetyStatus('co', reading.values.co) === 'warning' ? 'text-amber-600' : 'text-gray-700'}`}>
                          {reading.values.co}ppm
                        </span>
                      </div>
                    )}
                    {reading.values.co2 !== undefined && (
                      <div className="text-xs"><span className="text-gray-400">CO₂:</span> <span className="font-semibold text-gray-700">{reading.values.co2}%</span></div>
                    )}
                    {reading.values.efficiencyNet !== undefined && (
                      <div className="text-xs"><span className="text-gray-400">Eff:</span> <span className="font-semibold text-gray-700">{reading.values.efficiencyNet}%</span></div>
                    )}
                    {reading.values.flueTemp !== undefined && (
                      <div className="text-xs"><span className="text-gray-400">Flue:</span> <span className="font-semibold text-gray-700">{reading.values.flueTemp}°C</span></div>
                    )}
                    {reading.values.coCo2Ratio !== undefined && (
                      <div className="text-xs">
                        <span className="text-gray-400">Ratio:</span>
                        <span className={`font-semibold ml-0.5 ${getSafetyStatus('coCo2Ratio', reading.values.coCo2Ratio) !== 'safe' ? 'text-red-600' : 'text-gray-700'}`}>
                          {reading.values.coCo2Ratio}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Info footer */}
      <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/60">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">💡</span>
          </div>
          <div>
            <h3 className="font-semibold text-[14px] text-blue-900">Compatible Analysers</h3>
            <p className="text-[12px] text-blue-600/80 mt-0.5 leading-relaxed">
              Works with CSV exports and Bluetooth connection from <strong>Kane</strong> (258, 358, 458, 458s, 958), <strong>TPI</strong> (DC710, DC711), 
              <strong> Anton</strong> (Sprint Pro3+), and <strong>Testo</strong> (300, 330).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlueGasAnalyser;
