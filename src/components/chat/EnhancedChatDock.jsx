import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { FiSend, FiMic, FiMicOff } from 'react-icons/fi';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import EnhancedMessageBubble from './EnhancedMessageBubble';
import EnhancedTypingIndicator from './EnhancedTypingIndicator';
import ConnectionStatus from './ConnectionStatus';
import ChatDockHeader from './ChatDockHeader';
import EnhancedQuickStartPrompts from './EnhancedQuickStartPrompts';
import ErrorFallback from './ErrorFallback';
import EmptyStateMessage from './EmptyStateMessage';
import { engineerChatService } from '../../services/engineerChatService';

/**
 * Enhanced ChatDock component with professional UI, error handling, and accessibility
 * 
 * @component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the chat dock is open
 * @param {Function} props.onClose - Callback function to close the chat dock
 * @param {string} props.sessionId - Chat session ID
 * @returns {React.ReactElement} Enhanced chat dock component
 */
const EnhancedChatDock = ({ isOpen, onClose, sessionId }) => {
  // State management
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [quickStartVisible, setQuickStartVisible] = useState(true);
  const messagesEndRef = useRef(null);
  const isOnline = useOnlineStatus();
  const inputRef = useRef(null);

  // Microphone (speech recognition) state
  const [isMicActive, setIsMicActive] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Focus input field when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check browser speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsMicActive(!!SpeechRecognition);
  }, []);

  // Handle sending messages
  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    
    // Hide quick start prompts when user sends first message
    setQuickStartVisible(false);
    
    // Add user message to chat
    const userMessage = {
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    
    try {
      // Handle offline mode
      if (!isOnline) {
        setTimeout(() => {
          setIsTyping(false);
          setError('network');
        }, 1000);
        return;
      }
      
      // API call to get response from the chat service
      const response = await engineerChatService.sendMessage(text, sessionId);
      
      if (response && response.text) {
        const assistantMessage = {
          sender: 'assistant',
          text: response.text,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setError(null);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      let errorType = 'unknown';
      
      if (err.message?.includes('timeout')) {
        errorType = 'timeout';
      } else if (err.message?.includes('network') || !isOnline) {
        errorType = 'network';
      } else if (err.response?.status === 401) {
        errorType = 'unauthorized';
      } else if (err.response?.status >= 500) {
        errorType = 'server';
      }
      
      setError(errorType);
    } finally {
      setIsTyping(false);
    }
  }, [sessionId, isOnline]);

  // Handle quick start prompt selection
  const handleQuickStartSelect = useCallback((prompt) => {
    setInputText(prompt.text);
    sendMessage(prompt.text);
  }, [sendMessage]);

  // Handle retry after error
  const handleRetry = useCallback(() => {
    setError(null);
    // If there's a last user message, try to resend it
    const lastUserMessage = [...messages].reverse().find(m => m.sender === 'user');
    if (lastUserMessage) {
      sendMessage(lastUserMessage.text);
    }
  }, [messages, sendMessage]);

  // Speech recognition
  const toggleSpeechRecognition = useCallback(() => {
    if (!isMicActive) return;
    
    if (isListening) {
      // Stop listening
      window.speechRecognition?.stop();
      setIsListening(false);
    } else {
      // Start listening
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      window.speechRecognition = new SpeechRecognition();
      window.speechRecognition.continuous = false;
      window.speechRecognition.interimResults = false;
      
      window.speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev + ' ' + transcript);
      };
      
      window.speechRecognition.onend = () => {
        setIsListening(false);
      };
      
      window.speechRecognition.start();
      setIsListening(true);
    }
  }, [isListening, isMicActive]);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  // Skip rendering if not open
  if (!isOpen) return null;

  // Determine the main content to show
  const renderMainContent = () => {
    if (messages.length === 0) {
      return <EmptyStateMessage />;
    }
    
    return (
      <>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((message, index) => (
            <EnhancedMessageBubble key={index} message={message} />
          ))}
          
          {/* Error message */}
          {error && <ErrorFallback errorType={error} onRetry={handleRetry} />}
          
          {/* Typing indicator */}
          {isTyping && <EnhancedTypingIndicator />}
          
          {/* Invisible element for scrolling to bottom */}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Quick start prompts (only shown initially) */}
        <EnhancedQuickStartPrompts 
          isVisible={quickStartVisible && messages.length === 0} 
          onSelectPrompt={handleQuickStartSelect} 
        />
      </>
    );
  };

  // Define class for container based on expanded state
  const containerClass = isExpanded 
    ? 'fixed inset-0 z-50 flex flex-col bg-white shadow-xl transition-all duration-300 ease-in-out'
    : 'fixed bottom-4 right-4 w-80 md:w-96 h-[500px] z-50 flex flex-col bg-white rounded-lg shadow-xl transition-all duration-300 ease-in-out';

  return (
    <div className={containerClass}>
      {/* Header */}
      <ChatDockHeader 
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(prev => !prev)}
        onClose={onClose}
        onSettings={() => console.log('Settings clicked')}
      />
      
      {/* Connection status */}
      <ConnectionStatus 
        status={isOnline ? 'online' : 'offline'} 
        onRetry={() => window.location.reload()}
      />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderMainContent()}
      </div>
      
      {/* Input area */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          <div className="flex-1 bg-white rounded-md border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your boiler issue... (e.g. F22 fault on Worcester combi)"
              className="w-full p-3 focus:outline-none resize-none rounded-md"
              rows={1}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
          </div>
          
          {/* Microphone button (only if supported) */}
          {isMicActive && (
            <button 
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-2.5 rounded-full ${isListening ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'}`}
              aria-label={isListening ? "Stop recording" : "Start recording"}
            >
              {isListening ? <FiMicOff size={20} /> : <FiMic size={20} />}
            </button>
          )}
          
          {/* Send button */}
          <button 
            type="submit"
            className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-blue-300"
            disabled={!inputText.trim()}
            aria-label="Send message"
          >
            <FiSend size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

EnhancedChatDock.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  sessionId: PropTypes.string
};

EnhancedChatDock.defaultProps = {
  sessionId: 'default-session'
};

export default EnhancedChatDock;
