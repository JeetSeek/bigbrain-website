import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatSession } from '../hooks/useChatSession';
import { HiMicrophone, HiChevronDown, HiVolumeUp, HiVolumeOff } from 'react-icons/hi';
import { IoIosSend } from 'react-icons/io';
import ChatErrorBoundary from './chat/ChatErrorBoundary';
import useVoskSpeech from '../hooks/useVoskSpeech';
import useTextToSpeech from '../hooks/useTextToSpeech';
import EmptyStateMessage from './chat/EmptyStateMessage';
import MessageBubble from './chat/MessageBubble';
import TypingIndicator from './chat/TypingIndicator';
import '../styles/mobile-chat-v2.css';

const DEBUG = import.meta.env.MODE === 'development';

// Constants
const KEYBOARD_THRESHOLD = 150; // Minimum height difference to consider keyboard open
const TAB_BAR_HEIGHT = 49; // iOS tab bar height in pixels
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const FOCUS_DELAY_MS = 100; // Delay for DOM ready before focus

// Removed duplicate MessageBubble and TypingIndicator - now imported from separate files

// Quick start prompts for gas fault-finding - memoized to prevent unnecessary re-renders
const QuickStartPrompts = React.memo(({ onSelectPrompt, isVisible }) => {
  const prompts = [
    {
      title: "Fault Code",
      text: "I've got a Vaillant ecoTEC Plus 832 combi showing fault code F.28",
      icon: "⚠️"
    },
    {
      title: "No Hot Water", 
      text: "Worcester Greenstar 25i system boiler, heating works fine but no hot water, no fault codes",
      icon: "🚿"
    },
    {
      title: "Pressure Issue",
      text: "Baxi 600 Combi 28, pressure keeps dropping below 1 bar with no visible leaks",
      icon: "📉"
    },
    {
      title: "Ignition Lockout",
      text: "Ideal Logic Plus 30 combi with fault code L2 keeps coming up after reset",
      icon: "�"
    }
  ];

  if (!isVisible) return null;

  return (
    <div className="p-3 bg-blue-50 border-b border-blue-100">
      <h3 className="text-sm font-semibold text-blue-800 mb-2">Quick Start - Common Issues:</h3>
      <div className="grid grid-cols-1 gap-2">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            onClick={() => onSelectPrompt(prompt)}
            className="flex items-center p-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all text-left animate-button-press"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <span className="mr-2 text-lg">{prompt.icon}</span>
            <div className="flex-1">
              <div className="text-xs font-medium text-blue-700">{prompt.title}</div>
              <div className="text-xs text-gray-600 truncate">{prompt.text}</div>
            </div>
            <span className="text-blue-400 ml-2">→</span>
          </button>
        ))}
      </div>
    </div>
  );
});

// ContextualActions removed - replaced with feedback buttons on individual messages

const ChatDock = ({ userName, embedMode = false, className = '' }) => {
  // Initialize chat session hook first to avoid React hook order issues
  const chatSession = useChatSession(userName);
  
  // Safely destructure after hook is initialized - ensure we have fallback values
  const { 
    sessionId, 
    history = [], 
    setHistory, 
    addMessage, 
    sendMessage,
    sessionStatus, 
    clearSession, 
    isSessionExpired 
  } = chatSession || {};
  
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connected'); // connected, disconnected, reconnecting
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [sessionWarning, setSessionWarning] = useState(false);
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activityTimeoutRef = useRef(null);
  const {
    transcript,
    isListening,
    toggleListening,
    stopListening,
    resetTranscript,
    supported: speechSupported
  } = useVoskSpeech();

  // Text-to-speech for AI responses
  const {
    supported: ttsSupported,
    speaking,
    voiceEnabled,
    unlocked: ttsUnlocked,
    speak,
    speakNow,
    speakPending,
    stop: stopSpeaking,
    toggleVoice
  } = useTextToSpeech();
  
  // Track last spoken message to avoid repeating
  const lastSpokenIndexRef = useRef(-1);

  // Auto-focus input field on mount and after sending messages
  useEffect(() => {
    if (inputRef.current && (embedMode || open)) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, FOCUS_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [embedMode, open, waiting]); // Re-focus after waiting changes (message sent)

  // Mobile keyboard handling - adjusts chat container position
  useEffect(() => {
    // Try to opt-in to VirtualKeyboard API (Chrome 94+)
    if ('virtualKeyboard' in navigator) {
      try {
        navigator.virtualKeyboard.overlaysContent = true;
      } catch (e) {
        console.log('VirtualKeyboard API not fully supported');
      }
    }

    const viewport = window.visualViewport;
    const chatContainer = document.querySelector('.chat-fullscreen-container');
    
    // Get safe area bottom by measuring
    const getSafeAreaBottom = () => {
      const testEl = document.createElement('div');
      testEl.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;';
      document.body.appendChild(testEl);
      const safeArea = testEl.offsetHeight;
      document.body.removeChild(testEl);
      return safeArea;
    };
    
    const safeAreaBottom = getSafeAreaBottom();
    const tabBarHeight = TAB_BAR_HEIGHT + safeAreaBottom;
    
    // Set initial bottom position
    if (chatContainer) {
      chatContainer.style.bottom = `${tabBarHeight}px`;
    }
    
    if (!viewport) return;
    
    const handleViewportChange = () => {
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const keyboardHeight = windowHeight - viewportHeight;
      const isKeyboardOpen = keyboardHeight > KEYBOARD_THRESHOLD;
      
      setKeyboardVisible(isKeyboardOpen);
      
      if (chatContainer) {
        if (isKeyboardOpen) {
          // When keyboard is open, extend to bottom (cover tab bar)
          chatContainer.style.bottom = '0px';
        } else {
          // When keyboard is closed, sit exactly on top of tab bar
          chatContainer.style.bottom = `${tabBarHeight}px`;
        }
      }
      
      // Scroll to bottom when keyboard opens
      if (isKeyboardOpen && chatEndRef.current) {
        requestAnimationFrame(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
      }
    };

    // Store reference for proper cleanup
    const handleOrientationChange = () => setTimeout(handleViewportChange, FOCUS_DELAY_MS);
    
    viewport.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Initial check
    handleViewportChange();

    return () => {
      viewport.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    
    if (!input.trim() || waiting || !sendMessage) return;
    
    const messageText = input.trim();
    setInput('');
    resetTranscript(); // Clear speech transcript so it doesn't reload
    setWaiting(true);
    setIsTyping(true);
    setShowQuickStart(false);
    setLastActivity(Date.now());
    
    try {
      // Use the sendMessage function from useChatSession hook which handles the full flow
      await sendMessage(messageText);
      
      // Clear any existing typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      // Determine error type and provide appropriate message
      let errorText = 'Sorry, I encountered an error. Please try again.';
      
      if (error.message === 'timeout') {
        errorText = 'Request timed out. The system might be busy. Please try again.';
      } else if (error.message === 'network') {
        errorText = 'Network connection issue. Please check your internet and try again.';
        setConnectionStatus('disconnected');
      } else if (error.message === 'rate_limit') {
        errorText = 'Too many requests. Please wait a moment before trying again.';
      }
      
      // Add error message to history using addMessage
      if (addMessage) {
        const errorMessage = {
          sender: 'assistant',
          text: errorText,
          timestamp: new Date().toISOString(),
          isError: true
        };
        
        addMessage(errorMessage);
      }
    } finally {
      setWaiting(false);
      setIsTyping(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [input, waiting, sendMessage, addMessage]);

  // Handle quick start prompt selection
  const handleQuickStartPrompt = useCallback((prompt) => {
    setInput(prompt.text);
    setShowQuickStart(false);
  }, []);

  // Handle contextual action selection
  const handleContextualAction = useCallback((action) => {
    setInput(action.text);
    // Auto-submit for quick responses
    setTimeout(() => {
      if (inputRef.current) {
        const form = inputRef.current.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    }, FOCUS_DELAY_MS);
  }, []);

  // Handle new chat reset
  const handleNewChat = useCallback(() => {
    // Clear the current session and start fresh using clearSession
    if (clearSession) {
      clearSession();
    }
    setInput('');
    setWaiting(false);
    setIsTyping(false);
    setShowQuickStart(true);
    
    // Clear any pending timeouts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }
    
    // Reset activity tracking
    setLastActivity(Date.now());
    
    // Focus on input for immediate use
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, FOCUS_DELAY_MS);
  }, [clearSession]);

  // Show/hide quick start prompts based on chat history
  useEffect(() => {
    setShowQuickStart(history.length === 0 && open && !waiting);
  }, [history.length, open, waiting]);

  // Auto-focus input when chat opens (like messaging platforms)
  useEffect(() => {
    if (open && inputRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        inputRef.current.focus();
      }, FOCUS_DELAY_MS);
    }
  }, [open]);

  useEffect(() => {
    if (embedMode && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, FOCUS_DELAY_MS);
    }
  }, [embedMode]);

  // Initialize speech recognition - ignore transcripts while TTS is speaking
  useEffect(() => {
    if (transcript && transcript.trim() && !speaking) {
      setInput(transcript);
      setLastActivity(Date.now());
    }
  }, [transcript, speaking]);

  // Escape key handler for floating dock mode
  useEffect(() => {
    if (embedMode) return; // Only for floating dock
    
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [embedMode, open]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current && history?.length > 0) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  // Stop microphone and clear transcript when TTS starts speaking to prevent feedback loop
  useEffect(() => {
    if (speaking) {
      if (isListening) {
        console.log('[ChatDock] Stopping mic - TTS is speaking');
        stopListening();
      }
      // Clear any transcript that might have been picked up
      resetTranscript();
    }
  }, [speaking, isListening, stopListening, resetTranscript]);

  // Auto-speak new AI messages when voice is enabled
  useEffect(() => {
    if (!ttsSupported || !history || history.length === 0) return;
    
    const lastIndex = history.length - 1;
    const lastMessage = history[lastIndex];
    
    // Only speak if it's a new assistant message we haven't spoken yet
    if (lastMessage && 
        (lastMessage.sender === 'assistant' || lastMessage.sender === 'ai') && 
        lastIndex > lastSpokenIndexRef.current &&
        !lastMessage.isError) {
      
      let textToSpeak = '';
      if (typeof lastMessage.text === 'string') {
        textToSpeak = lastMessage.text;
      } else if (lastMessage.text?.text) {
        textToSpeak = lastMessage.text.text;
      }
      
      if (textToSpeak) {
        lastSpokenIndexRef.current = lastIndex;
        
        if (voiceEnabled) {
          // Stop listening before speaking to prevent feedback
          if (isListening) {
            stopListening();
          }
          console.log('[ChatDock] Auto-speaking AI response');
          speakNow(textToSpeak);
        } else {
          // Voice is off - queue for later
          speak(textToSpeak);
        }
      }
    }
  }, [history, ttsSupported, voiceEnabled, speak, speakNow, isListening, stopListening]);

  // Handle speaking AI message on tap
  const handleSpeakMessage = useCallback((messageText) => {
    if (!ttsSupported || !voiceEnabled) return;
    speakNow(messageText);
  }, [ttsSupported, voiceEnabled, speakNow]);

  // Handle session expiration
  useEffect(() => {
    if (isSessionExpired) {
      setShowQuickStart(true);
    }
  }, [isSessionExpired]);
  
  // Connection status monitoring - simplified for frontend-only mode
  useEffect(() => {
    // Set connection status based on online status
    setConnectionStatus(navigator.onLine ? 'connected' : 'disconnected');
    
    const handleOnline = () => setConnectionStatus('connected');
    const handleOffline = () => setConnectionStatus('disconnected');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); 
  
  // Auto-clear session after inactivity with 5-minute warning
  const warningTimeoutRef = useRef(null);
  useEffect(() => {
    const clearTimers = () => {
      if (activityTimeoutRef.current) { clearTimeout(activityTimeoutRef.current); activityTimeoutRef.current = null; }
      if (warningTimeoutRef.current) { clearTimeout(warningTimeoutRef.current); warningTimeoutRef.current = null; }
    };

    clearTimers();
    setSessionWarning(false);

    // Show warning at 25 minutes
    warningTimeoutRef.current = setTimeout(() => {
      setSessionWarning(true);
    }, SESSION_TIMEOUT_MS - 5 * 60 * 1000);

    // Clear session at 30 minutes
    activityTimeoutRef.current = setTimeout(() => {
      if (clearSession) { clearSession(); }
      setShowQuickStart(true);
      setSessionWarning(false);
    }, SESSION_TIMEOUT_MS);

    return clearTimers;
  }, [lastActivity, clearSession]);

  if (embedMode) {
    return (
      <ChatErrorBoundary>
        <div 
          ref={chatContainerRef}
          className={`mobile-chat-container ${className}`}
        >
          <header 
            className="mobile-chat-header bg-gradient-to-b from-blue-600 to-blue-700 text-white p-3 sm:p-4 flex items-center justify-between"
            style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}
          >
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <img src="/brain-icon-nBG.png" alt="BoilerBrain" className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-md flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <h3 className="font-bold text-sm sm:text-base tracking-tight truncate">BoilerBrain</h3>
                <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs mt-0.5">
                  <span className="bg-white/20 backdrop-blur-sm px-1.5 sm:px-2 py-0.5 rounded-full font-medium text-[10px] sm:text-xs">Gas Safe</span>
                  <div className="flex items-center space-x-1">
                    <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shadow-sm ${
                      connectionStatus === 'connected' ? 'bg-green-400 shadow-green-300' :
                      connectionStatus === 'reconnecting' ? 'bg-yellow-400 animate-pulse shadow-yellow-300' :
                      'bg-red-400 shadow-red-300'
                    }`}></div>
                    <span className="text-[10px] sm:text-xs opacity-95 font-medium">
                      {connectionStatus === 'connected' ? 'Online' :
                       connectionStatus === 'reconnecting' ? 'Reconnecting...' :
                       'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Voice toggle button */}
              {ttsSupported && (
                <button
                  onClick={() => {
                    console.log('[Voice Button] Clicked, speaking:', speaking, 'voiceEnabled:', voiceEnabled);
                    if (speaking) {
                      stopSpeaking();
                    } else {
                      // Try to speak pending text, or test message if none
                      const hasPending = speakPending();
                      if (!hasPending) {
                        // No pending text - speak test message to verify TTS works
                        speakNow("Voice is working. Send a message to hear the response.");
                      }
                      if (!voiceEnabled) toggleVoice();
                    }
                  }}
                  className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-all ${
                    speaking 
                      ? 'bg-green-500 hover:bg-green-600 animate-pulse' 
                      : voiceEnabled
                        ? 'bg-white/30 hover:bg-white/40'
                        : 'bg-white/10 hover:bg-white/20'
                  }`}
                  title={speaking ? 'Tap to stop' : 'Tap to hear response'}
                  aria-label={speaking ? 'Stop speaking' : 'Play voice response'}
                >
                  {speaking ? <HiVolumeUp size={18} className="animate-pulse" /> : voiceEnabled ? <HiVolumeUp size={18} /> : <HiVolumeOff size={18} />}
                </button>
              )}
              
              {/* Export chat button */}
              {history.length > 1 && (
                <button
                  onClick={() => {
                    const lines = history
                      .filter(m => m.text)
                      .map(m => {
                        const sender = m.sender === 'user' ? 'You' : 'BoilerBrain';
                        const text = typeof m.text === 'string' ? m.text : m.text?.text || JSON.stringify(m.text);
                        return `[${sender}]\n${text}`;
                      })
                      .join('\n\n---\n\n');
                    const header = `BoilerBrain Diagnostic — ${new Date().toLocaleDateString('en-GB')}\n${'='.repeat(40)}\n\n`;
                    const output = header + lines;
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(output).then(() => {
                        alert('Chat copied to clipboard');
                      });
                    } else {
                      const blob = new Blob([output], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `boilerbrain-chat-${Date.now()}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all text-white text-xs sm:text-sm font-medium"
                  title="Export chat"
                  aria-label="Export chat"
                >
                  <span className="text-sm sm:text-base">📋</span>
                  <span className="hidden xs:inline sm:inline">Export</span>
                </button>
              )}
              
              {/* New chat button */}
              <button
                onClick={() => {
                  if (speaking) stopSpeaking();
                  if (history.length > 1) {
                    if (window.confirm('Start a new chat? This will clear the current conversation.')) {
                      clearSession();
                      setShowQuickStart(true);
                      lastSpokenIndexRef.current = -1;
                    }
                  } else {
                    clearSession();
                    setShowQuickStart(true);
                    lastSpokenIndexRef.current = -1;
                  }
                }}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all text-white text-xs sm:text-sm font-medium"
                title="Start new chat"
                aria-label="Start new chat"
              >
                <span className="text-sm sm:text-base">🔄</span>
                <span className="hidden xs:inline sm:inline">New</span>
              </button>
            </div>
          </header>
          
          {/* Session timeout warning banner */}
          {sessionWarning && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm">
              <span className="text-amber-800">Session expires in 5 minutes due to inactivity.</span>
              <button
                onClick={() => { setLastActivity(Date.now()); setSessionWarning(false); }}
                className="ml-3 px-3 py-1 bg-amber-600 text-white rounded-md text-xs font-medium hover:bg-amber-700 transition-colors"
              >
                Stay Active
              </button>
            </div>
          )}

          <div 
            className="mobile-chat-messages" 
            role="log" 
            aria-label="Chat messages"
            aria-live="polite"
            aria-atomic="false"
          >
            {history.length === 0 || (history.length === 1 && (history[0].sender === 'assistant' || history[0].sender === 'ai')) ? (
              <EmptyStateMessage />
            ) : (
              <div className="flex flex-col space-y-3">
                {history.map((message, index) => {
                  const isUser = message.sender === 'user';
                  const isFirst = index === 0 || history[index - 1]?.sender !== message.sender;
                  const isLast = index === history.length - 1 || history[index + 1]?.sender !== message.sender;
                  const labelTextRaw = message?.text;
                  const labelText = typeof labelTextRaw === 'string' ? labelTextRaw : (labelTextRaw && typeof labelTextRaw === 'object' && typeof labelTextRaw.text === 'string' ? labelTextRaw.text : '');
                  
                  return (
                    <div key={message.id || `${sessionId}-${index}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'} message-enter-enhanced`}>
                      <MessageBubble 
                        message={message} 
                        isUser={isUser}
                        isFirst={isFirst}
                        isLast={isLast}
                        aria-label={`${message.sender === 'user' ? 'You' : 'Boiler Brain'} said: ${labelText}`}
                      />
                    </div>
                  );
                })}
                {isTyping && <TypingIndicator />}
                <div ref={chatEndRef} className="h-1" aria-hidden="true" />
              </div>
            )}
            {showQuickStart && (
              <QuickStartPrompts 
                onSelectPrompt={handleQuickStartPrompt} 
                isVisible={showQuickStart}
              />
            )}
          </div>

          <footer className={`mobile-chat-input ${keyboardVisible ? 'keyboard-open' : ''}`}>
            <form
              onSubmit={handleSendMessage}
              aria-label="Chat message form"
              className="mobile-chat-form"
            >
              <button 
                type="button" 
                onClick={() => {
                  toggleListening();
                  // Auto-enable voice output when using mic for voice chat
                  if (!isListening && !voiceEnabled) {
                    toggleVoice();
                  }
                }} 
                className={`mobile-chat-btn mobile-chat-btn-mic ${isListening ? 'listening' : ''} ${!speechSupported ? 'opacity-50' : ''}`}
                disabled={!speechSupported}
                title={isListening ? 'Stop listening' : 'Voice input'}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                aria-pressed={isListening}
              >
                <HiMicrophone size={18} />
              </button>
              
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => {
                  // Scroll to bottom on focus
                  setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
                }}
                placeholder="Describe the issue..."
                className="mobile-chat-text-input"
                disabled={waiting}
                aria-label="Message input"
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="on"
                autoCapitalize="sentences"
                inputMode="text"
                spellCheck="true"
              />
              
              <button 
                type="submit" 
                className="mobile-chat-btn mobile-chat-btn-send" 
                disabled={!input.trim() || waiting}
                title="Send message"
                aria-label="Send message"
              >
                <IoIosSend size={18} />
              </button>
            </form>
          </footer>
        </div>
      </ChatErrorBoundary>
    );
  }

  return (
    <ChatErrorBoundary>
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex flex-col max-w-full w-[95vw] sm:w-[450px] md:w-[480px]">
        {open && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-4 w-full border border-gray-200 flex flex-col h-[65vh] md:h-[70vh]">
            <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-3 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-sm">🧠</div>
                <div className="flex flex-col">
                  <h3 className="font-semibold text-sm">BoilerBrain Assistant</h3>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="bg-blue-500 px-2 py-0.5 rounded-full">Gas Safe</span>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${
                        connectionStatus === 'connected' ? 'bg-green-400' :
                        connectionStatus === 'reconnecting' ? 'bg-yellow-400 animate-pulse' :
                        'bg-red-400'
                      }`}></div>
                      <span className="text-xs opacity-90">
                        {connectionStatus === 'connected' ? 'Online' :
                         connectionStatus === 'reconnecting' ? 'Reconnecting...' :
                         'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Voice toggle button */}
                {ttsSupported && (
                  <button
                    onClick={() => {
                      console.log('[Voice Button] Clicked, speaking:', speaking, 'voiceEnabled:', voiceEnabled);
                      if (speaking) {
                        stopSpeaking();
                      } else {
                        speakPending();
                        if (!voiceEnabled) toggleVoice();
                      }
                    }}
                    className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
                      speaking 
                        ? 'bg-green-500 hover:bg-green-600 animate-pulse' 
                        : voiceEnabled
                          ? 'bg-white/30 hover:bg-white/40'
                          : 'bg-white/10 hover:bg-white/20'
                    }`}
                    title={speaking ? 'Tap to stop' : 'Tap to hear response'}
                    aria-label={speaking ? 'Stop speaking' : 'Play voice response'}
                  >
                    {speaking ? <HiVolumeUp size={16} className="animate-pulse" /> : voiceEnabled ? <HiVolumeUp size={16} /> : <HiVolumeOff size={16} />}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (speaking) stopSpeaking();
                    if (history.length > 1) {
                      if (window.confirm('Start a new chat? This will clear the current conversation.')) {
                        clearSession();
                        setShowQuickStart(true);
                        lastSpokenIndexRef.current = -1;
                      }
                    } else {
                      clearSession();
                      setShowQuickStart(true);
                      lastSpokenIndexRef.current = -1;
                    }
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-white/20 hover:bg-white/30 rounded-md transition-all text-white text-xs font-medium"
                  title="Start new chat"
                  aria-label="Start new chat"
                >
                  <span>🔄</span>
                  <span>New</span>
                </button>
                <button 
                  onClick={() => setOpen(false)} 
                  className="text-white hover:text-gray-200 transition-colors p-1 rounded"
                  aria-label="Close chat"
                >
                  <HiChevronDown size={20} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0" role="log" aria-label="Chat messages" aria-live="polite" aria-atomic="false">
              {history.length === 0 || (history.length === 1 && (history[0].sender === 'assistant' || history[0].sender === 'ai')) ? (
                <EmptyStateMessage />
              ) : (
                <div className="flex flex-col space-y-3">
                  {history.map((message, index) => {
                    const isUser = message.sender === 'user';
                    const isFirst = index === 0 || history[index - 1]?.sender !== message.sender;
                    const isLast = index === history.length - 1 || history[index + 1]?.sender !== message.sender;
                    const labelTextRaw = message?.text;
                    const labelText = typeof labelTextRaw === 'string' ? labelTextRaw : (labelTextRaw && typeof labelTextRaw === 'object' && typeof labelTextRaw.text === 'string' ? labelTextRaw.text : '');
                    
                    return (
                      <div key={message.id || `${sessionId}-${index}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'} message-enter-enhanced`}>
                        <MessageBubble 
                          message={message} 
                          isUser={isUser}
                          isFirst={isFirst}
                          isLast={isLast}
                          aria-label={`${message.sender === 'user' ? 'You' : 'Boiler Brain'} said: ${labelText}`}
                        />
                      </div>
                    );
                  })}
                  {isTyping && <TypingIndicator />}
                  <div ref={chatEndRef} className="h-1" aria-hidden="true" />
                </div>
              )}
              {showQuickStart && (
                <QuickStartPrompts 
                  onSelectPrompt={handleQuickStartPrompt} 
                  isVisible={showQuickStart}
                />
              )}
            </div>

            <footer className="border-t border-gray-200 p-2">
              <form
                className="flex items-center gap-2"
                onSubmit={handleSendMessage}
                aria-label="Chat message form"
              >
                <div className="chat-input-wrapper-enhanced flex-1">
                  <button 
                    type="button" 
                    onClick={() => {
                      toggleListening();
                      // Auto-enable voice output when using mic
                      if (!isListening && !voiceEnabled) {
                        toggleVoice();
                      }
                    }} 
                    className={`btn-icon-enhanced ${
                      isListening 
                        ? 'bg-red-500 text-white shadow-lg' 
                        : ''
                    } ${!speechSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!speechSupported}
                    title={isListening ? 'Stop listening' : 'Voice input'}
                    aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                    aria-pressed={isListening}
                  >
                    <HiMicrophone size={18} />
                    <span className="sr-only-enhanced">{isListening ? 'Stop voice input' : 'Start voice input'}</span>
                  </button>
                  
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe the issue..."
                    className="chat-input-field-enhanced"
                    disabled={waiting}
                    aria-label="Message input"
                    enterKeyHint="send"
                    autoComplete="off"
                    autoCorrect="on"
                    autoCapitalize="sentences"
                    inputMode="text"
                    spellCheck="true"
                    autoFocus
                  />
                  
                  <button 
                    type="submit" 
                    className="btn-icon-enhanced animate-button-press" 
                    disabled={!input.trim() || waiting}
                    title="Send message"
                    aria-label="Send message"
                  >
                    <IoIosSend size={18} />
                    <span className="sr-only-enhanced">Send</span>
                  </button>
                </div>
              </form>
            </footer>
          </div>
        )}
        
        <button 
          onClick={() => setOpen(!open)} 
          className={`absolute bottom-0 right-0 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-full p-3 md:p-4 shadow-lg hover:from-blue-700 hover:to-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700 transition-all duration-200 ${open ? 'scale-0' : 'scale-100'}`}
          aria-label="Open chat assistant"
          aria-expanded={open}
        >
          <div className="relative">
            <img src="/brain-icon-nBG.png" alt="" className="w-7 h-7 md:w-8 md:h-8" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">1</span>
          </div>
          <span className="sr-only">Open boiler diagnostic assistant</span>
        </button>
      </div>
    </ChatErrorBoundary>
  );
};

export default ChatDock;
export { ChatDock };
