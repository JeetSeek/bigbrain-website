import { useState } from 'react';
import { useLocalStorage } from '../../../../hooks/useLocalStorage';

/**
 * Custom hook for Gas Rate Calculator
 * Manages state and calculations for the gas rate tool
 * 
 * @returns {Object} Gas rate state and calculation methods
 */
export const useGasRate = () => {
  // Gas type options with calorific values
  const gasTypes = [
    { id: 'natural', name: 'Natural Gas', cv: 10.91, correction: 1.02273 },
    { id: 'lpg', name: 'LPG', cv: 25.71, correction: 1 }
  ];

  // State
  const [activeTab, setActiveTab] = useState('metric'); // 'metric' or 'imperial'
  const [gasType, setGasType] = useState('natural');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [testDuration, setTestDuration] = useState(60); // Default 60 seconds (1 minute)
  const [initialReading, setInitialReading] = useState('');
  const [finalReading, setFinalReading] = useState('');
  const [dialRevs, setDialRevs] = useState('');
  const [dialValue, setDialValue] = useState('1.0');
  const [testSeconds, setTestSeconds] = useState('');
  const [result, setResult] = useState(null);
  
  // History
  const [testHistory, setTestHistory] = useLocalStorage('gasRateCalculator_history', []);
  
  // Custom CV values
  const [customCV, setCustomCV] = useState({
    natural: gasTypes[0].cv,
    lpg: gasTypes[1].cv
  });

  /**
   * Get current gas type configuration
   * @returns {Object} Current gas type object
   */
  const getCurrentGasType = () => {
    return gasTypes.find(g => g.id === gasType);
  };

  /**
   * Calculate gas rate for metric meter readings
   * @returns {Object|null} Calculation results or null if invalid inputs
   */
  const calculateMetric = () => {
    if (!initialReading || !finalReading || !testDuration) return null;
    
    const initial = parseFloat(initialReading);
    const final = parseFloat(finalReading);
    const duration = parseFloat(testDuration);
    const currentGasType = getCurrentGasType();
    
    if (isNaN(initial) || isNaN(final) || isNaN(duration) || duration === 0) {
      return null;
    }
    
    // m³/h = (final_reading − initial_reading) × 3600 / seconds
    const cubicMetersPerHour = ((final - initial) * 3600) / duration;
    
    // Gross kW = m³/h × CV
    const grossKW = cubicMetersPerHour * (customCV[gasType] || currentGasType.cv);
    
    // Net kW = Gross kW × 0.9
    const netKW = grossKW * 0.9;
    
    // BTU/h = Gross kW × 3412
    const btuPerHour = grossKW * 3412;
    
    return {
      cubicMetersPerHour: cubicMetersPerHour.toFixed(2),
      grossKW: grossKW.toFixed(2),
      netKW: netKW.toFixed(2),
      btuPerHour: Math.round(btuPerHour)
    };
  };

  /**
   * Calculate gas rate for imperial dial readings
   * @returns {Object|null} Calculation results or null if invalid inputs
   */
  const calculateImperial = () => {
    if (!dialRevs || !testSeconds || !dialValue) return null;
    
    const revs = parseFloat(dialRevs);
    const seconds = parseFloat(testSeconds);
    const dialVal = parseFloat(dialValue);
    const currentGasType = getCurrentGasType();
    
    if (isNaN(revs) || isNaN(seconds) || isNaN(dialVal) || seconds === 0) {
      return null;
    }
    
    // Convert cubic feet to cubic meters
    const cubicFeet = revs * dialVal;
    const cubicMeters = cubicFeet / 35.315;
    
    // m³/h = cubic meters × 3600 / seconds
    const cubicMetersPerHour = (cubicMeters * 3600) / seconds;
    
    // Gross kW = m³/h × CV
    const grossKW = cubicMetersPerHour * (customCV[gasType] || currentGasType.cv);
    
    // Net kW = Gross kW × 0.9
    const netKW = grossKW * 0.9;
    
    // BTU/h = Gross kW × 3412
    const btuPerHour = grossKW * 3412;
    
    return {
      cubicMetersPerHour: cubicMetersPerHour.toFixed(2),
      grossKW: grossKW.toFixed(2),
      netKW: netKW.toFixed(2),
      btuPerHour: Math.round(btuPerHour)
    };
  };

  /**
   * Calculate gas rate based on active tab (metric/imperial)
   */
  const handleCalculate = () => {
    const calculationResult = activeTab === 'metric' ? calculateMetric() : calculateImperial();
    
    if (calculationResult) {
      setResult(calculationResult);
      
      // Add to history
      const newHistoryEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        gasType,
        result: calculationResult,
        isMetric: activeTab === 'metric',
        inputs: activeTab === 'metric' 
          ? { initialReading, finalReading, testDuration } 
          : { dialRevs, dialValue, testSeconds }
      };
      
      setTestHistory(prev => {
        const updatedHistory = [newHistoryEntry, ...prev];
        // Keep only latest 20 entries
        return updatedHistory.slice(0, 20);
      });
    }
  };

  /**
   * Reset all form fields
   */
  const handleClearForm = () => {
    setInitialReading('');
    setFinalReading('');
    setDialRevs('');
    setTestSeconds('');
    setResult(null);
  };

  /**
   * Share results via Web Share API or clipboard
   */
  const handleShareResult = () => {
    if (!result) return;
    
    const shareText = `Gas Rate Calculation Results:
Gross kW: ${result.grossKW}
Net kW: ${result.netKW}
BTU/h: ${result.btuPerHour}
m³/h: ${result.cubicMetersPerHour}
Gas Type: ${getCurrentGasType().name}
Calculated with Boiler Brain Gas Rate Calculator
`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Gas Rate Calculation',
        text: shareText
      }).catch(console.error);
    } else {
      // Fallback - copy to clipboard
      navigator.clipboard.writeText(shareText)
        .then(() => alert('Results copied to clipboard!'))
        .catch(console.error);
    }
  };

  // Return all values and functions
  return {
    // State
    activeTab,
    setActiveTab,
    gasType,
    setGasType,
    gasTypes,
    isTimerRunning,
    setIsTimerRunning,
    timeElapsed,
    setTimeElapsed,
    testDuration,
    setTestDuration,
    initialReading,
    setInitialReading,
    finalReading,
    setFinalReading,
    dialRevs,
    setDialRevs,
    dialValue,
    setDialValue,
    testSeconds,
    setTestSeconds,
    result,
    testHistory,
    customCV,
    setCustomCV,
    
    // Methods
    getCurrentGasType,
    calculateMetric,
    calculateImperial,
    handleCalculate,
    handleClearForm,
    handleShareResult
  };
};

export default useGasRate;
