import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Timer Button Component
 * A reusable timer component with start, stop, and reset functionality
 * 
 * @component
 */
const TimerButton = ({ 
  duration = 60,
  onComplete,
  onTimeUpdate,
  className = ''
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const requestRef = useRef();
  const previousTimeRef = useRef();
  
  // Use requestAnimationFrame for more accurate timing
  const animate = time => {
    if (previousTimeRef.current === undefined) {
      previousTimeRef.current = time;
    }
    
    const deltaTime = time - previousTimeRef.current;
    
    if (deltaTime > 50) { // Update roughly every 50ms for efficiency
      previousTimeRef.current = time;
      
      setTimeElapsed(prevTime => {
        const newTime = prevTime + deltaTime / 1000; // Convert to seconds
        
        // Notify parent component about time update
        if (onTimeUpdate) {
          onTimeUpdate(newTime);
        }
        
        // Check if timer completed
        if (newTime >= duration) {
          setIsRunning(false);
          if (onComplete) {
            onComplete();
          }
          return duration;
        }
        
        return newTime;
      });
    }
    
    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate);
    }
  };
  
  // Start/stop animation based on isRunning state
  useEffect(() => {
    if (isRunning) {
      requestRef.current = requestAnimationFrame(animate);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isRunning]);
  
  const startTimer = () => {
    setIsRunning(true);
  };
  
  const stopTimer = () => {
    setIsRunning(false);
  };
  
  const resetTimer = () => {
    stopTimer();
    setTimeElapsed(0);
    if (onTimeUpdate) {
      onTimeUpdate(0);
    }
  };
  
  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  
  // Calculate progress percentage for visual indicator
  const progressPercentage = Math.min((timeElapsed / duration) * 100, 100);
  
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center space-x-4">
        {/* Timer Display */}
        <div className="relative">
          <div className="text-2xl font-mono bg-gray-100 px-4 py-2 rounded-md">
            {formatTime(timeElapsed)}
          </div>
          
          {/* Circular Progress Indicator */}
          <svg
            className="absolute inset-0 h-full w-full -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={timeElapsed >= duration ? "#ef4444" : "#3b82f6"}
              strokeWidth="8"
              strokeDasharray="282.7"
              strokeDashoffset={282.7 - (282.7 * progressPercentage) / 100}
              strokeLinecap="round"
            />
          </svg>
        </div>
        
        {/* Control Buttons */}
        <div className="space-x-2">
          {!isRunning ? (
            <button
              className="px-4 py-2 bg-primary text-white rounded-md min-w-[80px]"
              onClick={startTimer}
              disabled={timeElapsed >= duration}
            >
              Start
            </button>
          ) : (
            <button
              className="px-4 py-2 bg-red-500 text-white rounded-md min-w-[80px]"
              onClick={stopTimer}
            >
              Stop
            </button>
          )}
          <button
            className="px-4 py-2 bg-gray-200 rounded-md min-w-[80px]"
            onClick={resetTimer}
          >
            Reset
          </button>
        </div>
      </div>
      
      {/* Status Text */}
      <div className="text-sm text-gray-500 mt-1">
        {isRunning ? 'Timer running...' : timeElapsed >= duration ? 'Time complete' : 'Press Start to begin timing'}
      </div>
    </div>
  );
};

TimerButton.propTypes = {
  duration: PropTypes.number,
  onComplete: PropTypes.func,
  onTimeUpdate: PropTypes.func,
  className: PropTypes.string
};

export default TimerButton;
