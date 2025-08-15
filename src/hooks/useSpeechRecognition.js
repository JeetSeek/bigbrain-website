import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to handle speech recognition functionality
 * 
 * @param {Object} options - Hook configuration options
 * @param {boolean} options.continuous - Whether recognition should continue after results
 * @param {string} options.language - BCP 47 language tag for recognition
 * @param {boolean} options.autoStart - Whether to automatically start recognition on mount
 * @returns {Object} Speech recognition methods and state
 */
const useSpeechRecognition = ({
  continuous = false,
  language = 'en-US',
  autoStart = false
} = {}) => {
  const [isListening, setIsListening] = useState(false);
  const listeningRef = useRef(false);
  const [transcript, setTranscript] = useState('');
  const [recognitionInstance, setRecognitionInstance] = useState(null);
  const [error, setError] = useState(null);

  // Set up the SpeechRecognition instance
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Browser compatibility check
    const SpeechRecognition = 
      window.SpeechRecognition || 
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(new Error('Speech recognition not supported in this browser'));
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.lang = language;

      // Handle recognition results
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(prevTranscript => {
          // If continuous is true, append to previous transcript
          if (continuous) {
            return prevTranscript + finalTranscript;
          }
          // Otherwise just use the new transcript
          return finalTranscript || interimTranscript;
        });
      };

      // Handle recognition errors
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        // Handle recoverable errors gracefully – let onend handler perform restart
        if (['no-speech', 'aborted'].includes(event.error)) {
          // Mild errors – let onend handle restart
          console.warn('Speech recognition recoverable error:', event.error);
        } else {
          // network / not-allowed / service-not-allowed / bad-grammar etc. → stop completely
          console.error('Speech recognition fatal error, stopping:', event.error);
          recognition.stop();
          setIsListening(false);
          listeningRef.current = false;
        }
        setError(event.error);
      };

      // Handle recognition end
      recognition.onend = () => {
        // If in continuous mode and still marked as listening, try to restart after a short delay
        if (continuous && listeningRef.current) {
          setTimeout(() => {
            try {
              recognition.start();
              setIsListening(true);
              listeningRef.current = true;
            } catch (err) {
              // If restart fails (e.g., because user toggled off or mic permission revoked), stop listening state
              console.warn('Speech recognition restart failed:', err);
              setIsListening(false);
            }
          }, 250);
        } else {
          setIsListening(false);
        }
      };

      setRecognitionInstance(recognition);
    } catch (err) {
      console.error('Error initializing speech recognition:', err);
      setError(err);
    }

    // Cleanup on unmount
    return () => {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch (err) {
          // Ignore errors when stopping
        }
      }
    };
  }, [continuous, language]);

  // Auto-start recognition if enabled
  useEffect(() => {
    if (autoStart && recognitionInstance && !isListening && !error) {
      startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, recognitionInstance, error]);

  // Keep a ref of listening state for event handlers
  useEffect(() => {
    listeningRef.current = isListening;
  }, [isListening]);

  // Start recognition
  const startListening = useCallback(() => {
    if (!recognitionInstance) return;
    
    try {
      recognitionInstance.start();
      setIsListening(true);
      listeningRef.current = true;
      setError(null);
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError(err);
    }
  }, [recognitionInstance]);

  // Stop recognition
  const stopListening = useCallback(() => {
    if (!recognitionInstance) return;
    
    try {
      recognitionInstance.stop();
      setIsListening(false);
      listeningRef.current = false;
    } catch (err) {
      console.error('Error stopping speech recognition:', err);
    }
  }, [recognitionInstance]);

  // Toggle recognition
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    error,
    supported: !!recognitionInstance
  };
};

export default useSpeechRecognition;
