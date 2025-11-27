import { useState, useEffect, useCallback, useRef } from 'react';

// Disable Vosk for production deployment to reduce bundle size
const loadVosk = async () => {
  console.warn('Vosk speech recognition disabled in production build');
  return null;
};

/**
 * useVoskSpeech – React hook providing offline speech-to-text via Vosk-browser.
 * Model must be hosted at /models/vosk-model-small-en-us-0.15.tar.gz (or provide custom URL).
 * When browser lacks WebAssembly + AudioWorklet support the hook returns supported = false
 * and the mic UI should be disabled.
 */
export default function useVoskSpeech({
  modelUrl = '/models/vosk-model-small-en-us-0.15.tar.gz',
  sampleRate = 48000
} = {}) {
  const [supported, setSupported] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognizerRef = useRef(null);
  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);

  // Feature detection – WebAssembly, AudioWorklet, getUserMedia
  useEffect(() => {
    const hasWasm = typeof WebAssembly === 'object';
    const hasAudioWorklet = (() => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const available = !!ctx.audioWorklet;
        ctx.close();
        return available;
      } catch {
        return false;
      }
    })();
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setSupported(hasWasm && hasAudioWorklet && hasGetUserMedia);
  }, []);

  // Load model lazily
  const loadModel = useCallback(async () => {
    if (recognizerRef.current || loadingModel) return;
    setLoadingModel(true);
    try {
      const model = await createModel(modelUrl);
      recognizerRef.current = await model.createRecognizer(sampleRate);
    } catch (err) {
      console.error('[useVoskSpeech] Failed to load Vosk model:', err);
      setSupported(false);
    } finally {
      setLoadingModel(false);
    }
  }, [modelUrl, sampleRate, loadingModel]);

  const startListening = useCallback(async () => {
    if (!supported || isListening) return;
    await loadModel();
    if (!recognizerRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate });
      audioContextRef.current = ctx;
      await ctx.audioWorklet.addModule('data:application/javascript;base64,'); // dummy module, will inject below
      // Build a small inline worklet to forward raw PCM to recognizer
      const workletCode = `class VoskProcessor extends AudioWorkletProcessor{constructor(){super()}process(inputs){const input=inputs[0];if(input&&input[0]){const buf=input[0];const ab=new Float32Array(buf.length);ab.set(buf);this.port.postMessage(ab);}return true;} } registerProcessor('vosk-processor',VoskProcessor);`;
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const moduleUrl = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(moduleUrl);
      const node = new AudioWorkletNode(ctx, 'vosk-processor');
      node.port.onmessage = (e) => {
        const pcm = e.data;
        // Convert Float32Array [-1,1] to Int16 PCM for Vosk
        const int16 = new Int16Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) {
          const s = Math.max(-1, Math.min(1, pcm[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        recognizerRef.current.acceptWaveform(int16);
        const result = recognizerRef.current.result();
        if (result?.text) {
          setTranscript(result.text.trim());
        }
      };
      const source = ctx.createMediaStreamSource(stream);
      source.connect(node);
      node.connect(ctx.destination);
      workletNodeRef.current = node;
      setIsListening(true);
    } catch (err) {
      console.error('[useVoskSpeech] Error starting microphone:', err);
    }
  }, [supported, isListening, loadModel, sampleRate]);

  const stopListening = useCallback(() => {
    if (!isListening) return;
    try {
      workletNodeRef.current?.disconnect();
      audioContextRef.current?.close();
    } catch (err) {
      console.warn('[useVoskSpeech] error closing audio context', err);
    }
    setIsListening(false);
  }, [isListening]);

  const toggleListening = useCallback(() => {
    isListening ? stopListening() : startListening();
  }, [isListening, startListening, stopListening]);

  const resetTranscript = () => setTranscript('');

  return {
    supported,
    loadingModel,
    isListening,
    transcript,
    toggleListening,
    resetTranscript
  };
}
