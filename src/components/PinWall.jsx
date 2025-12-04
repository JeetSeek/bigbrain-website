/**
 * PIN Wall Component
 * Simple PIN entry screen for live testing access control
 */
import { useState, useRef, useEffect } from 'react';

const CORRECT_PIN = '1250';
const STORAGE_KEY = 'boilerbrain_pin_verified';

export default function PinWall({ children }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [verified, setVerified] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  // Check if already verified this session
  useEffect(() => {
    const isVerified = sessionStorage.getItem(STORAGE_KEY) === 'true';
    if (isVerified) {
      setVerified(true);
    }
  }, []);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(false);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Check PIN when complete
    if (index === 3 && value) {
      const enteredPin = newPin.join('');
      if (enteredPin === CORRECT_PIN) {
        sessionStorage.setItem(STORAGE_KEY, 'true');
        setVerified(true);
      } else {
        setError(true);
        setPin(['', '', '', '']);
        setTimeout(() => inputRefs[0].current?.focus(), 100);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 4);
    if (/^\d+$/.test(pastedData)) {
      const newPin = pastedData.split('').concat(['', '', '', '']).slice(0, 4);
      setPin(newPin);
      
      if (pastedData === CORRECT_PIN) {
        sessionStorage.setItem(STORAGE_KEY, 'true');
        setVerified(true);
      } else if (pastedData.length === 4) {
        setError(true);
        setPin(['', '', '', '']);
      }
    }
  };

  // Show app if verified
  if (verified) {
    return children;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="text-6xl mb-4 block">🧠</span>
        <h1 className="text-2xl font-bold text-white">BoilerBrain</h1>
        <p className="text-gray-400 text-sm mt-1">Beta Testing Access</p>
      </div>

      {/* PIN Entry */}
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-xs">
        <p className="text-gray-300 text-center mb-6">Enter PIN to continue</p>
        
        <div className="flex justify-center gap-3 mb-6">
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={inputRefs[index]}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              className={`w-14 h-14 text-center text-2xl font-bold rounded-xl 
                         bg-gray-800 text-white border-2 transition-all
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         ${error ? 'border-red-500 animate-shake' : 'border-gray-700'}
                         ${digit ? 'border-blue-500' : ''}`}
              autoFocus={index === 0}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-center text-sm animate-pulse">
            Incorrect PIN. Try again.
          </p>
        )}
      </div>

      {/* Footer */}
      <p className="text-gray-600 text-xs mt-8">
        Contact admin for access
      </p>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
