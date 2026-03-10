import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useTextToSpeech - Simplified TTS hook using Web Speech API
 * Works on desktop browsers. iOS requires user gesture to initiate speech.
 */
export default function useTextToSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem('bb_voice_enabled');
    return saved === 'true';
  });
  const [selectedVoice, setSelectedVoice] = useState(null);
  
  const synthRef = useRef(null);
  const pendingTextRef = useRef(null);

  // Initialize
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      console.log('[TTS] Speech synthesis not supported');
      return;
    }
    
    setSupported(true);
    synthRef.current = window.speechSynthesis;
    
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      if (voices.length === 0) return;
      
      // Find best voice - prefer British English
      const preferred = ['Daniel', 'Google UK English Male', 'Karen', 'Samantha'];
      let voice = null;
      
      for (const name of preferred) {
        voice = voices.find(v => v.name.includes(name));
        if (voice) break;
      }
      
      if (!voice) {
        voice = voices.find(v => v.lang.startsWith('en-GB')) ||
                voices.find(v => v.lang.startsWith('en')) ||
                voices[0];
      }
      
      if (voice) {
        setSelectedVoice(voice);
        console.log('[TTS] Selected voice:', voice.name, voice.lang);
      }
    };
    
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Save preference
  useEffect(() => {
    localStorage.setItem('bb_voice_enabled', String(voiceEnabled));
  }, [voiceEnabled]);

  // Clean text for speech
  const cleanText = useCallback((text) => {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{2600}-\u{27BF}]/gu, '')
      .replace(/\b([FLEA])(\d+)\b/gi, '$1 $2')
      .replace(/(\d+)\s*mbar/gi, '$1 millibar')
      .replace(/(\d+)\s*mm\b/gi, '$1 millimeters')
      .replace(/(\d+)\s*kW/gi, '$1 kilowatts')
      .replace(/\bPCB\b/g, 'P C B')
      .replace(/\bNTC\b/g, 'N T C')
      .replace(/\bDHW\b/g, 'domestic hot water')
      .replace(/\bCH\b/g, 'central heating')
      .replace(/https?:\/\/[^\s]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  // Speak immediately - call this from user interaction
  const speakNow = useCallback((text) => {
    console.log('[TTS] speakNow called with:', text?.substring(0, 40));
    console.log('[TTS] State:', { supported, hasSynth: !!synthRef.current, selectedVoice: selectedVoice?.name });
    
    if (!supported) {
      console.log('[TTS] Not supported');
      return false;
    }
    
    if (!synthRef.current) {
      console.log('[TTS] No synth ref - reinitializing');
      synthRef.current = window.speechSynthesis;
    }
    
    const clean = cleanText(text);
    if (!clean) {
      console.log('[TTS] No text to speak after cleaning');
      return false;
    }
    
    console.log('[TTS] Will speak:', clean.substring(0, 60) + '...');
    
    // Cancel any current speech
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(clean);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('[TTS] Using voice:', selectedVoice.name);
    } else {
      console.log('[TTS] No voice selected, using default');
    }
    
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
      console.log('[TTS] *** STARTED SPEAKING ***');
      setSpeaking(true);
    };
    
    utterance.onend = () => {
      console.log('[TTS] *** FINISHED SPEAKING ***');
      setSpeaking(false);
    };
    
    utterance.onerror = (e) => {
      console.error('[TTS] *** ERROR ***:', e.error, e);
      setSpeaking(false);
    };
    
    // Chrome bug workaround: resume if paused
    if (synthRef.current.paused) {
      console.log('[TTS] Synth was paused, resuming');
      synthRef.current.resume();
    }
    
    // Actually speak
    console.log('[TTS] Calling speechSynthesis.speak()');
    synthRef.current.speak(utterance);
    
    // Chrome bug workaround: sometimes needs a kick to start
    // This is a known issue where speechSynthesis gets "stuck"
    setTimeout(() => {
      if (!synthRef.current.speaking && synthRef.current.pending) {
        console.log('[TTS] Synth stuck, attempting resume');
        synthRef.current.resume();
      }
    }, 100);
    
    // Check if it's actually in the queue
    console.log('[TTS] Speaking state after speak():', synthRef.current.speaking, 'Pending:', synthRef.current.pending);
    
    return true;
  }, [supported, selectedVoice, cleanText]);

  // Queue text - will be spoken on next speakPending call
  const speak = useCallback((text) => {
    if (!supported || !text) return;
    pendingTextRef.current = text;
    console.log('[TTS] Text queued:', text.substring(0, 40) + '...');
  }, [supported]);

  // Speak any pending text - call this from click handler
  // Returns true if there was pending text to speak
  const speakPending = useCallback(() => {
    console.log('[TTS] speakPending called, pending:', !!pendingTextRef.current);
    if (pendingTextRef.current) {
      const text = pendingTextRef.current;
      pendingTextRef.current = null;
      speakNow(text);
      return true;
    }
    return false;
  }, [speakNow]);

  // Stop speaking
  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setSpeaking(false);
      pendingTextRef.current = null;
    }
  }, []);

  // Toggle voice on/off
  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => {
      const next = !prev;
      console.log('[TTS] Voice', next ? 'enabled' : 'disabled');
      if (!next) stop();
      return next;
    });
  }, [stop]);

  return {
    supported,
    speaking,
    voiceEnabled,
    selectedVoice,
    unlocked: true, // Always report unlocked for simplicity
    speak,
    speakNow,
    speakPending,
    stop,
    toggleVoice,
    setSelectedVoice,
  };
}
