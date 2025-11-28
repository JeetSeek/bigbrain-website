import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatSession } from '../hooks/useChatSession';
import { HiMicrophone, HiChevronDown } from 'react-icons/hi';
import { IoIosSend } from 'react-icons/io';
import { BiError } from 'react-icons/bi';
import { MdSignalWifiOff, MdAccessTimeFilled, MdWarning } from 'react-icons/md';
import ErrorBoundary from './ErrorBoundary';
import ChatErrorBoundary from './chat/ChatErrorBoundary';
import useVoskSpeech from '../hooks/useVoskSpeech';
import EmptyStateMessage from './chat/EmptyStateMessage';
import MessageBubble from './chat/MessageBubble';
import TypingIndicator from './chat/TypingIndicator';
import { http } from '../utils/http';
import DOMPurify from 'dompurify';
import '../styles/ios-chat.css';

const DEBUG = import.meta.env.MODE === 'development';

// Removed duplicate MessageBubble and TypingIndicator - now imported from separate files

// Quick start prompts for gas fault-finding - memoized to prevent unnecessary re-renders
const QuickStartPrompts = React.memo(({ onSelectPrompt, isVisible }) => {
  const prompts = [
    {
      title: "New Fault Call",
      text: "I've got a Worcester Bosch combi boiler with fault code F22 - no heating or hot water",
      icon: "🔧"
    },
    {
      title: "No Heating", 
      text: "My Vaillant ecoTEC has no heating but hot water works fine",
      icon: "🏠"
    },
    {
      title: "Fault Code Help",
      text: "I need help with fault code F28 on my Ideal Logic combi",
      icon: "⚠️"
    },
    {
      title: "No Hot Water",
      text: "Baxi 830 combi - no hot water but heating works",
      icon: "🚿"
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
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const activityTimeoutRef = useRef(null);
  const {
    transcript,
    isListening,
    toggleListening,
    resetTranscript,
    supported: speechSupported
  } = useVoskSpeech();
  const [transcriptUsed, setTranscriptUsed] = useState(false);

  // Auto-focus input field on mount and after sending messages
  useEffect(() => {
    if (inputRef.current && (embedMode || open)) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [embedMode, open, waiting]); // Re-focus after waiting changes (message sent)

  // Handle iOS keyboard - Apple best practice using visualViewport API
  // This sets a CSS variable that the input uses to position itself above the keyboard
  useEffect(() => {
    if (!window.visualViewport) return;

    const viewport = window.visualViewport;
    // Store the initial viewport height (without keyboard)
    let initialHeight = window.innerHeight;

    const handleViewportChange = () => {
      // Calculate keyboard height from the difference
      // visualViewport.height shrinks when keyboard opens
      const keyboardHeight = window.innerHeight - viewport.height;
      const isKeyboardOpen = keyboardHeight > 100;
      
      // Set CSS variable for keyboard height
      document.documentElement.style.setProperty(
        '--keyboard-height', 
        isKeyboardOpen ? `${keyboardHeight}px` : '0px'
      );
      
      setKeyboardVisible(isKeyboardOpen);
      
      // Scroll to bottom when keyboard opens
      if (isKeyboardOpen && chatEndRef.current) {
        requestAnimationFrame(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
      }
    };

    // Update initial height on orientation change
    const handleOrientationChange = () => {
      setTimeout(() => {
        initialHeight = window.innerHeight;
        // Reset keyboard height on orientation change
        document.documentElement.style.setProperty('--keyboard-height', '0px');
      }, 300);
    };

    viewport.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Initial check
    handleViewportChange();

    return () => {
      viewport.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      // Reset keyboard height on unmount
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    };
  }, []);

  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    
    if (!input.trim() || waiting || !sendMessage) return;
    
    const messageText = input.trim();
    setInput('');
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
    }, 100);
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
    }, 100);
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
      }, 100);
    }
  }, [open]);

  useEffect(() => {
    if (embedMode && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [embedMode]);

  // Initialize speech recognition
  useEffect(() => {
    if (transcript && transcript.trim()) {
      setInput(transcript);
      setLastActivity(Date.now());
    }
  }, [transcript]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current && history?.length > 0) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

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
  
  // Auto-clear session after inactivity
  useEffect(() => {
    const resetActivityTimeout = () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
        activityTimeoutRef.current = null;
      }
      
      // Clear session after 30 minutes of inactivity
      activityTimeoutRef.current = setTimeout(() => {
        if (clearSession) {
          clearSession();
        }
        setShowQuickStart(true);
      }, 30 * 60 * 1000); // 30 minutes
    };
    
    resetActivityTimeout();
    
    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
        activityTimeoutRef.current = null;
      }
    };
  }, [lastActivity, clearSession]);

  if (embedMode) {
    return (
      <ChatErrorBoundary>
        <div 
          ref={chatContainerRef}
          className={`ios-chat-container bg-white rounded-lg shadow-lg border border-gray-200 ${keyboardVisible ? 'keyboard-open' : ''} ${className}`}
        >
          <header className="ios-chat-header bg-gradient-to-b from-blue-600 to-blue-700 text-white p-3 sm:p-4 rounded-t-lg flex items-center justify-between shadow-lg">
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
            <button
              onClick={() => {
                if (history.length > 1) {
                  if (window.confirm('Start a new chat? This will clear the current conversation.')) {
                    clearSession();
                    setShowQuickStart(true);
                  }
                } else {
                  clearSession();
                  setShowQuickStart(true);
                }
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg transition-all text-white text-xs sm:text-sm font-medium flex-shrink-0"
              title="Start new chat"
              aria-label="Start new chat"
            >
              <span className="text-sm sm:text-base">🔄</span>
              <span className="hidden xs:inline sm:inline">New</span>
            </button>
          </header>
          
          <div className="ios-chat-messages" role="log" aria-label="Chat messages" style={{backgroundColor: 'var(--ios-bg-grouped-primary)'}}>
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
                    <div key={`${sessionId}-${index}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'} message-enter-enhanced`}>
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

          <footer className={`ios-chat-input-area ${keyboardVisible ? 'keyboard-visible' : ''}`}>
            <form
              onSubmit={handleSendMessage}
              aria-label="Chat message form"
            >
              <div className="ios-chat-input-wrapper">
                <button 
                  type="button" 
                  onClick={toggleListening} 
                  className={`ios-chat-mic-btn ${isListening ? 'listening' : ''} ${!speechSupported ? 'opacity-50' : ''}`}
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
                    // Ensure scroll to bottom on focus for iOS
                    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                  }}
                  placeholder="Describe the issue..."
                  className="ios-chat-input-field flex-1"
                  disabled={waiting}
                  aria-label="Message input"
                  enterKeyHint="send"
                  autoComplete="off"
                  autoCorrect="on"
                  spellCheck="true"
                />
                
                <button 
                  type="submit" 
                  className="ios-chat-send-btn" 
                  disabled={!input.trim() || waiting}
                  title="Send message"
                  aria-label="Send message"
                >
                  <IoIosSend size={18} />
                </button>
              </div>
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
                <button
                  onClick={() => {
                    if (history.length > 1) {
                      if (window.confirm('Start a new chat? This will clear the current conversation.')) {
                        clearSession();
                        setShowQuickStart(true);
                      }
                    } else {
                      clearSession();
                      setShowQuickStart(true);
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

            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0" role="log" aria-label="Chat messages">
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
                      <div key={`${sessionId}-${index}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'} message-enter-enhanced`}>
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
                    onClick={toggleListening} 
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
