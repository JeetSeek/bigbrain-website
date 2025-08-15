import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

/**
 * ChatMessageHistory - Container for displaying chat message history
 * 
 * @component
 * @param {Object} props
 * @param {Array} props.messages - Array of message objects with sender and text properties
 * @param {boolean} props.loading - Whether the AI is currently typing a response
 * @returns {React.ReactElement} Scrollable container with chat messages
 */
const ChatMessageHistory = ({ messages = [], loading = false }) => {
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to bottom of messages when new messages arrive or loading state changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Helper function to determine if a message is the first in a sequence from the same sender
  const isFirstInSequence = (index) => {
    if (index === 0) return true;
    return messages[index].sender !== messages[index - 1].sender;
  };

  // Helper function to determine if a message is the last in a sequence from the same sender
  const isLastInSequence = (index) => {
    if (index === messages.length - 1) return true;
    return messages[index].sender !== messages[index + 1].sender;
  };
  
  // Ensure messages is always an array
  const safeMessages = Array.isArray(messages) ? messages : [];
  
  return (
    <div 
      className="chat-message-history flex-1 overflow-y-auto p-4 space-y-3"
      data-testid="message-history"
    >
      {safeMessages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {safeMessages.map((message, index) => (
            <div
              key={`${message.sender}-${index}`}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              data-testid={`message-${index}`}
            >
              <MessageBubble
                message={message}
                isUser={message.sender === 'user'}
                isFirst={isFirstInSequence(index)}
                isLast={isLastInSequence(index)}
              />
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <TypingIndicator />
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
};

ChatMessageHistory.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      sender: PropTypes.string.isRequired,
      text: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object
      ]).isRequired
    })
  ),
  loading: PropTypes.bool
};

export default ChatMessageHistory;
