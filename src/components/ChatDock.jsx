import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatSession } from '../hooks/useChatSession';
import { engineerChatService } from '../services/engineerChatService';
import { HiMicrophone, HiChevronDown } from 'react-icons/hi';
import { IoIosSend } from 'react-icons/io';
import { BiError } from 'react-icons/bi';
import { MdSignalWifiOff, MdAccessTimeFilled, MdWarning } from 'react-icons/md';
import ErrorBoundary from './ErrorBoundary';
import useVoskSpeech from '../hooks/useVoskSpeech';
import EmptyStateMessage from './chat/EmptyStateMessage';

const DEBUG = import.meta.env.MODE === 'development';

const MessageBubble = React.memo(({ message }) => {
  const isUser = message.sender === 'user';
  const isError = message.isError;
  
  // Determine appropriate class for the bubble based on sender and error status
  let bubbleClass = isUser 
    ? 'bg-blue-500 text-white self-end'
    : isError
      ? 'bg-red-50 text-red-800 border border-red-200 self-start' 
      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100 self-start';
  
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Highlight fault codes with color and styling
  const highlightFaultCodes = (text) => {
    if (!text) return '';
    
    // Match boiler fault codes (e.g. F1, E123, A10, L5)
    return text.replace(/\b([FELA]\d{1,3})\b/gi, match => (
      `<span class="inline-block bg-red-100 text-red-800 rounded-md px-1 py-0.5 text-xs font-medium mx-0.5">${match}</span>`
    ));
  };

  // Highlight technical terms
  const highlightTechTerms = (text) => {
    if (!text) return '';
    const terms = [
      'gas supply', 'PCB', 'heat exchanger', 'pressure sensor', 'NTC', 
      'thermistor', 'pump', 'fan', 'diverter valve', 'ignition', 'electrode',
      'flue', 'condense trap', 'gas valve', 'CH circuit', 'DHW circuit',
      'PRV', 'AAV', 'expansion vessel', 'inhibitor', 'pressure gauge'
    ];
    
    // Create a regex that matches any of the terms
    const termsRegex = new RegExp(`\\b(${terms.join('|')})\\b`, 'gi');
    
    // Replace matched terms with highlighted versions
    return text.replace(termsRegex, match => (
      `<span class="text-blue-700 font-medium">${match}</span>`
    ));
  };

  // Process the text with both highlighting functions
  const processMessageText = (text) => {
    if (!text) return '';
    let processed = highlightFaultCodes(text);
    processed = highlightTechTerms(processed);
    return processed;
  };

  const processedText = processMessageText(message.text);

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-4`}>
      <div className={`rounded-lg px-3 py-2 max-w-[85%] sm:max-w-sm md:max-w-md ${bubbleClass}`}>
        {isError && (
          <div className="flex items-center mb-2 text-red-600">
            <BiError className="mr-1" size={16} />
            <span className="text-xs font-bold">Connection Error</span>
          </div>
        )}
        <p 
          className="text-sm whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: processedText }}
        />
      </div>
      <span className="text-xs text-gray-700 dark:text-gray-200 mt-1 px-1">{timestamp}</span>
    </div>
  );
});

const TypingIndicator = () => (
  <div className="flex items-center space-x-1 p-2 bg-blue-50 rounded-md">
    <span className="text-sm text-blue-700 font-medium">BoilerBrain is diagnosing...</span>
    <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
  </div>
);

// Quick start prompts for gas fault-finding
const QuickStartPrompts = ({ onSelectPrompt, isVisible }) => {
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
            className="flex items-center p-2 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
          >
            <span className="mr-2">{prompt.icon}</span>
            <div>
              <div className="text-xs font-medium text-blue-700">{prompt.title}</div>
              <div className="text-xs text-gray-600 truncate">{prompt.text}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Contextual quick actions based on conversation state
const ContextualActions = ({ onSelectAction, onNewChat, history, isVisible }) => {
  if (!isVisible || history.length < 2) return null;

  // Analyze conversation context to determine relevant actions
  const lastMessages = history.slice(-3).map(msg => msg.text.toLowerCase());
  const conversationText = lastMessages.join(' ');
  
  let contextualActions = [];

  // Detect fault codes and suggest common responses
  const faultCodeMatch = conversationText.match(/\b([fela]\d{1,3})\b/i);
  if (faultCodeMatch) {
    const faultCode = faultCodeMatch[1].toUpperCase();
    contextualActions.push({
      text: `${faultCode} fault resolved - boiler working`,
      icon: "✅",
      type: "success"
    });
    contextualActions.push({
      text: `Need more help with ${faultCode}`,
      icon: "❓",
      type: "help"
    });
  }

  // Detect diagnostic questions and provide common answers
  if (conversationText.includes('gas supply') || conversationText.includes('gas valve')) {
    contextualActions.push({
      text: "Gas supply is present",
      icon: "✅",
      type: "confirm"
    });
    contextualActions.push({
      text: "No gas supply detected",
      icon: "❌",
      type: "issue"
    });
  }

  if (conversationText.includes('pressure') || conversationText.includes('gauge')) {
    contextualActions.push({
      text: "Pressure is 1.2 bar (normal)",
      icon: "📊",
      type: "reading"
    });
    contextualActions.push({
      text: "Pressure is low (0.5 bar)",
      icon: "📉",
      type: "issue"
    });
  }

  if (conversationText.includes('ignition') || conversationText.includes('electrode')) {
    contextualActions.push({
      text: "Ignition working - boiler lights",
      icon: "🔥",
      type: "success"
    });
    contextualActions.push({
      text: "No ignition - not lighting",
      icon: "❌",
      type: "issue"
    });
  }

  if (conversationText.includes('flame sensor') || conversationText.includes('clean')) {
    contextualActions.push({
      text: "Sensor cleaned - looks good",
      icon: "🧽",
      type: "success"
    });
    contextualActions.push({
      text: "Sensor dirty/damaged",
      icon: "⚠️",
      type: "issue"
    });
  }

  // Generic helpful actions
  if (contextualActions.length === 0) {
    contextualActions = [
      {
        text: "That worked - issue resolved",
        icon: "✅",
        type: "success"
      },
      {
        text: "Still having the same problem",
        icon: "❌",
        type: "issue"
      },
      {
        text: "Need to order parts",
        icon: "📦",
        type: "parts"
      }
    ];
  }

  return (
    <div className="p-2 bg-gray-50 border-t border-gray-200">
      <div className="text-xs text-gray-600 mb-2">Quick responses:</div>
      <div className="flex flex-wrap gap-1">
        {contextualActions.slice(0, 3).map((action, index) => (
          <button
            key={index}
            onClick={() => onSelectAction(action)}
            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              action.type === 'success' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
              action.type === 'issue' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
              action.type === 'help' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
              'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            <span className="mr-1">{action.icon}</span>
            {action.text}
          </button>
        ))}
        <button
          onClick={onNewChat}
          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors bg-blue-100 text-blue-800 hover:bg-blue-200"
        >
          <span className="mr-1">🔄</span>
          New Chat
        </button>
      </div>
    </div>
  );
};

const ChatDock = ({ userName, embedMode = false, className = '' }) => {
  const { sessionId, history, setHistory, addMessage, sessionStatus, clearSession, isSessionExpired } = useChatSession(userName);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connected'); // connected, disconnected, reconnecting
  const [lastActivity, setLastActivity] = useState(Date.now());
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
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

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || waiting) return;
    
    const messageText = input.trim();
    setInput('');
    setWaiting(true);
    setIsTyping(true);
    setShowQuickStart(false);
    setLastActivity(Date.now());
    
    // Add user message to history using the new addMessage function
    const userMessage = {
      sender: 'user',
      text: messageText,
      timestamp: new Date().toISOString(),
    };
    
    addMessage(userMessage);
    
    // Clear any existing typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    try {
      // Set a realistic typing timeout based on message complexity
      const estimatedResponseTime = Math.min(Math.max(messageText.length * 100, 3000), 15000);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, estimatedResponseTime);
      
      const response = await engineerChatService.getResponse(sessionId, messageText, history);
      
      // Clear typing indicator immediately when response arrives
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Add AI response to history
      const aiMessage = {
        sender: 'assistant',
        text: response.text,
        timestamp: new Date().toISOString(),
        isError: response.isError || false
      };
      
      addMessage(aiMessage);
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Clear typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
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
      
      // Add error message to history
      const errorMessage = {
        sender: 'assistant',
        text: errorText,
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      addMessage(errorMessage);
    } finally {
      setWaiting(false);
      setIsTyping(false);
    }
  };

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
    // Clear the current session and start fresh
    clearSession();
    setInput('');
    setWaiting(false);
    setIsTyping(false);
    setShowQuickStart(true);
    
    // Clear any pending timeouts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
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

  // Initialize speech recognition
  useEffect(() => {
    if (transcript && transcript.trim()) {
      setInput(transcript);
      setLastActivity(Date.now());
    }
  }, [transcript]);
  
  // Connection status monitoring
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health', { 
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('disconnected');
        }
      } catch (error) {
        setConnectionStatus('disconnected');
      }
    };
    
    // Check connection every 30 seconds
    const connectionInterval = setInterval(checkConnection, 30000);
    checkConnection(); // Initial check
    
    return () => clearInterval(connectionInterval);
  }, []);
  
  // Auto-clear session after inactivity
  useEffect(() => {
    const resetActivityTimeout = () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      
      // Clear session after 30 minutes of inactivity
      activityTimeoutRef.current = setTimeout(() => {
        clearSession();
        setShowQuickStart(true);
      }, 30 * 60 * 1000); // 30 minutes
    };
    
    resetActivityTimeout();
    
    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [lastActivity, clearSession]);

  if (embedMode) {
    return (
      <ErrorBoundary>
        <div className={`bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col h-full min-h-0 max-h-full ${className}`}>
          <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-3 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src="/brain-icon-nBG.png" alt="BoilerBrain" className="w-6 h-6" />
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
            {history.length > 1 && (
              <button
                onClick={() => {
                  if (window.confirm('Clear chat history? This will start a new session.')) {
                    clearSession();
                    setShowQuickStart(true);
                  }
                }}
                className="text-white hover:text-gray-200 transition-colors p-1 rounded text-xs"
                title="Clear chat history"
              >
                🗑️
              </button>
            )}
          </header>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2" role="log" aria-label="Chat messages">
            {history.length === 0 || (history.length === 1 && history[0].sender === 'ai') ? (
              <EmptyStateMessage />
            ) : (
              <div className="flex flex-col space-y-3">
                {history.map((message, index) => (
                  <MessageBubble 
                    key={`${sessionId}-${index}`} 
                    message={message} 
                    aria-label={`${message.sender === 'user' ? 'You' : 'Boiler Brain'} said: ${message.text}`}
                  />
                ))}
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

          {/* Contextual Actions - appear during active conversations */}
          <ContextualActions 
            onSelectAction={handleContextualAction}
            onNewChat={handleNewChat}
            history={history}
            isVisible={!showQuickStart && history.length > 1 && !waiting}
          />

          <footer className="border-t border-gray-200 p-3 flex-shrink-0 bg-white">
            <form
              className="flex items-center gap-2 w-full"
              onSubmit={handleSendMessage}
              aria-label="Chat message form"
            >
              <button 
                type="button" 
                onClick={toggleListening} 
                className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                  isListening 
                    ? 'bg-red-500 text-white shadow-lg' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                } ${!speechSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!speechSupported}
                title={isListening ? 'Stop listening' : 'Voice input'}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                aria-pressed={isListening}
              >
                <HiMicrophone size={18} />
                <span className="sr-only">{isListening ? 'Stop voice input' : 'Start voice input'}</span>
              </button>
              
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe the boiler issue or enter a fault code..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-500 min-w-0"
                disabled={waiting}
                aria-label="Message input"
              />
              
              <button 
                type="submit" 
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0" 
                disabled={!input.trim() || waiting}
                title="Send message"
                aria-label="Send message"
              >
                <IoIosSend size={18} />
                <span className="sr-only">Send</span>
              </button>
            </form>
          </footer>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
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
                {history.length > 1 && (
                  <button
                    onClick={() => {
                      if (window.confirm('Clear chat history? This will start a new session.')) {
                        clearSession();
                        setShowQuickStart(true);
                      }
                    }}
                    className="text-white hover:text-gray-200 transition-colors p-1 rounded text-xs"
                    title="Clear chat history"
                  >
                    🗑️
                  </button>
                )}
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
              {history.length === 0 || (history.length === 1 && history[0].sender === 'ai') ? (
                <EmptyStateMessage />
              ) : (
                <div className="flex flex-col space-y-3">
                  {history.map((message, index) => (
                    <MessageBubble 
                      key={`${sessionId}-${index}`} 
                      message={message} 
                      aria-label={`${message.sender === 'user' ? 'You' : 'Boiler Brain'} said: ${message.text}`}
                    />
                  ))}
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
                <button 
                  type="button" 
                  onClick={toggleListening} 
                  className={`p-2 rounded-full transition-colors ${
                    isListening 
                      ? 'bg-red-500 text-white shadow-lg' 
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  } ${!speechSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!speechSupported}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                  aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                  aria-pressed={isListening}
                >
                  <HiMicrophone size={18} />
                  <span className="sr-only">{isListening ? 'Stop voice input' : 'Start voice input'}</span>
                </button>
                
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe the boiler issue or enter a fault code..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-600"
                  disabled={waiting}
                  aria-label="Message input"
                />
                
                <button 
                  type="submit" 
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors" 
                  disabled={!input.trim() || waiting}
                  title="Send message"
                  aria-label="Send message"
                >
                  <IoIosSend size={18} />
                  <span className="sr-only">Send</span>
                </button>
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
    </ErrorBoundary>
  );
};

export default ChatDock;
export { ChatDock };
