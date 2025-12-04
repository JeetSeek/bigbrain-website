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
        <h1 className="text-[28px] font-semibold text-white tracking-tight" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>BoilerBrain</h1>
        <p className="text-[#8E8E93] text-[15px] mt-1">Beta Testing Access</p>
      </div>

      {/* PIN Entry */}
      <div className="bg-[#1C1C1E] rounded-[22px] p-8 w-full max-w-xs" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
        <p className="text-[#8E8E93] text-center mb-6 text-[17px] font-normal">Enter PIN to continue</p>
        
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
              className={`w-14 h-14 text-center text-2xl font-semibold rounded-[12px]
                         bg-[#1C1C1E] text-white border-2 transition-all duration-200
                         focus:outline-none focus:ring-4 focus:ring-[#007AFF]/30
                         ${error ? 'border-[#FF3B30] animate-shake' : 'border-[#38383A]'}
                         ${digit ? 'border-[#007AFF]' : ''}`}
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
              autoFocus={index === 0}
            />
          ))}
        </div>

        {error && (
          <p className="text-[#FF3B30] text-center text-[15px] font-medium animate-pulse">
            Incorrect PIN. Try again.
          </p>
        )}
      </div>

      {/* Footer */}
      <p className="text-[#48484A] text-[13px] mt-8">
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
