import React, { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, Info, MessageSquare } from 'lucide-react';

/**
 * Enhanced Message History Component
 * Features:
 * - Auto-scrolling with smooth animations
 * - Message threading for multi-step diagnostics
 * - Safety warnings with prominent styling
 * - Confidence indicators for AI responses
 * - Mobile-optimized message bubbles
 * - Accessibility support
 */
const EnhancedMessageHistory = ({
  messages = [],
  isTyping = false,
  className = "",
  onMessageClick = null
}) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages, isTyping]);

  /**
   * Get message styling based on type and content
   */
  const getMessageStyling = (message) => {
    const isUser = message.sender === 'user';
    const isEmergency = message.content?.includes('EMERGENCY') ||
                       message.content?.includes('🚨') ||
                       message.content?.toLowerCase().includes('gas leak');

    let baseClasses = "message-bubble max-w-[85%] md:max-w-[75%] p-3 rounded-2xl mb-2 transition-all duration-200";

    if (isUser) {
      baseClasses += " bg-blue-500 text-white self-end ml-auto";
    } else {
      baseClasses += " bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 self-start mr-auto";
    }

    if (isEmergency) {
      baseClasses += isUser ? " bg-red-600 border-2 border-red-400" : " bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700";
    }

    return baseClasses;
  };

  /**
   * Render confidence indicator for AI messages
   */
  const renderConfidenceIndicator = (message) => {
    if (message.sender !== 'assistant' || !message.confidence) return null;

    const confidence = message.confidence;
    let color = 'text-gray-400';
    let icon = <Info className="w-3 h-3" />;

    if (confidence >= 0.8) {
      color = 'text-green-500';
      icon = <CheckCircle className="w-3 h-3" />;
    } else if (confidence >= 0.6) {
      color = 'text-yellow-500';
      icon = <AlertTriangle className="w-3 h-3" />;
    }

    return (
      <div className={`confidence-indicator flex items-center gap-1 mt-1 text-xs ${color}`}>
        {icon}
        <span>{Math.round(confidence * 100)}% confidence</span>
      </div>
    );
  };

  /**
   * Render message content with enhanced formatting
   */
  const renderMessageContent = (message) => {
    if (!message.content) return null;

    // Check for emergency content
    const isEmergency = message.content.includes('EMERGENCY') ||
                       message.content.includes('🚨') ||
                       message.content.toLowerCase().includes('gas leak') ||
                       message.content.toLowerCase().includes('carbon monoxide');

    return (
      <div className="message-content">
        {isEmergency && (
          <div className="emergency-header flex items-center gap-2 mb-2 text-red-600 dark:text-red-400 font-semibold">
            <AlertTriangle className="w-4 h-4" />
            <span>EMERGENCY ALERT</span>
          </div>
        )}

        <div className="message-text whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {/* Message metadata */}
        {message.timestamp && (
          <div className="message-meta mt-2 text-xs opacity-70">
            {new Date(message.timestamp).toLocaleTimeString()}
            {message.apiUsed && (
              <span className="ml-2">via {message.apiUsed}</span>
            )}
          </div>
        )}

        {/* Confidence indicator for AI messages */}
        {renderConfidenceIndicator(message)}
      </div>
    );
  };

  /**
   * Render individual message
   */
  const renderMessage = (message, index) => {
    const isUser = message.sender === 'user';
    const isEmergency = message.content?.includes('EMERGENCY') ||
                       message.content?.includes('🚨');

    return (
      <div
        key={message.id || index}
        className={`message-wrapper flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
        onClick={() => onMessageClick?.(message)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onMessageClick?.(message);
          }
        }}
        aria-label={`Message from ${isUser ? 'you' : 'assistant'}: ${message.content?.substring(0, 50)}...`}
      >
        <div className={getMessageStyling(message)}>
          {/* Message header for non-user messages */}
          {!isUser && (
            <div className="message-header flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                BoilerBrain Assistant
              </span>
            </div>
          )}

          {/* Message content */}
          {renderMessageContent(message)}

          {/* Thread indicator for multi-step diagnostics */}
          {message.threadId && (
            <div className="thread-indicator mt-2 text-xs text-gray-500 dark:text-gray-400">
              Part of diagnostic thread #{message.threadId}
            </div>
          )}
        </div>
      </div>
    );
  };

  /**
   * Render typing indicator
   */
  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    return (
      <div className="typing-indicator flex justify-start mb-4">
        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-2xl">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              BoilerBrain Assistant
            </span>
          </div>
          <div className="typing-dots flex gap-1 mt-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`message-history flex-1 overflow-y-auto p-4 space-y-2 ${className}`}
      role="log"
      aria-label="Chat message history"
      aria-live="polite"
      aria-atomic="false"
    >
      {messages.length === 0 ? (
        <div className="empty-state text-center py-8 text-gray-500 dark:text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">Start a conversation</p>
          <p className="text-sm">Ask me about boiler diagnostics, fault codes, or manuals</p>
        </div>
      ) : (
        <>
          {messages.map((message, index) => renderMessage(message, index))}
          {renderTypingIndicator()}
        </>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default EnhancedMessageHistory;
