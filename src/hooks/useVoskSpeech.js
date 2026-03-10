import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * useSpeechRecognition - Speech-to-text using Web Speech API
 * Works on Chrome, Safari, Edge (macOS, iOS, Windows)
 */
export default function useVoskSpeech() {
  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setSupported(true);
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;  // Keep listening until manually stopped
      recognition.interimResults = true;
      recognition.lang = 'en-GB'; // British English for engineer context
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        console.log('[Speech] Listening started');
        setIsListening(true);
      };
      
      recognition.onresult = (event) => {
        let fullTranscript = '';
        
        // Build complete transcript from all results
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        
        if (fullTranscript) {
          console.log('[Speech] Transcript:', fullTranscript);
          setTranscript(fullTranscript);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('[Speech] Error:', event.error);
        setIsListening(false);
        
        // Handle specific errors with user-friendly messages
        switch (event.error) {
          case 'not-allowed':
            alert('Microphone access denied. Please allow microphone access in your browser settings.');
            break;
          case 'audio-capture':
            alert('Cannot access microphone. Please:\n1. Open this page directly at localhost:5176\n2. Check your browser has microphone permission\n3. Ensure no other app is using the microphone');
            break;
          case 'network':
            alert('Network error during speech recognition. Please check your internet connection.');
            break;
          case 'no-speech':
            // This is normal - user didn't speak, no alert needed
            console.log('[Speech] No speech detected');
            break;
          default:
            console.warn('[Speech] Unhandled error:', event.error);
        }
      };
      
      recognition.onend = () => {
        console.log('[Speech] Listening ended');
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
      console.log('[Speech] Web Speech API initialized');
    } else {
      console.log('[Speech] Web Speech API not supported');
      setSupported(false);
    }
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    
    try {
      setTranscript('');
      recognitionRef.current.start();
      console.log('[Speech] Starting...');
    } catch (error) {
      console.error('[Speech] Start error:', error);
      // May already be running
      if (error.name === 'InvalidStateError') {
        recognitionRef.current.stop();
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    
    try {
      recognitionRef.current.stop();
      console.log('[Speech] Stopping...');
    } catch (error) {
      console.error('[Speech] Stop error:', error);
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    supported,
    loadingModel: false,
    isListening,
    transcript,
    toggleListening,
    startListening,
    stopListening,
    resetTranscript
  };
}
