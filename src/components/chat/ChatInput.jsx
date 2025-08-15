import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { IoIosSend } from 'react-icons/io';
import { HiMicrophone } from 'react-icons/hi';

/**
 * ChatInput - Input area for chat messages with send and voice input buttons
 * 
 * @component
 * @param {Object} props
 * @param {Function} props.onSendMessage - Callback function when message is sent
 * @param {boolean} props.loading - Whether the chat is currently waiting for a response
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {boolean} props.voiceEnabled - Whether voice input is enabled
 * @param {Function} props.onVoiceInputToggle - Callback function when voice input button is clicked
 * @param {boolean} props.isVoiceActive - Whether voice input is currently active
 * @returns {React.ReactElement} Chat input component with text area and buttons
 */
const ChatInput = ({
  onSendMessage,
  loading = false,
  disabled = false,
  voiceEnabled = false,
  onVoiceInputToggle = null,
  isVoiceActive = false
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  // Handle input change and auto-resize textarea
  const handleChange = (e) => {
    setInput(e.target.value);
    
    // Auto-resize textarea based on content
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  // Handle message submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !loading && !disabled) {
      onSendMessage(input);
      setInput('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="chat-input p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg"
    >
      <div className="flex items-end">
        <textarea
          ref={textareaRef}
          className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
          placeholder="Type a message..."
          value={input}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          disabled={loading || disabled}
          rows={1}
          style={{ minHeight: '40px', maxHeight: '120px' }}
          data-testid="chat-input-textarea"
        />
        
        <div className="flex pl-2">
          {voiceEnabled && (
            <button
              type="button"
              onClick={onVoiceInputToggle}
              disabled={loading || disabled}
              className={`p-2 rounded-full ${
                isVoiceActive
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
              } ${loading || disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300 dark:hover:bg-gray-500'}`}
              aria-label={isVoiceActive ? 'Stop voice input' : 'Start voice input'}
              data-testid="voice-input-button"
            >
              <HiMicrophone className="w-5 h-5" />
            </button>
          )}
          
          <button
            type="submit"
            disabled={!input.trim() || loading || disabled}
            className={`ml-2 p-2 rounded-full ${
              !input.trim() || loading || disabled
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 opacity-50 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            aria-label="Send message"
            data-testid="send-button"
          >
            <IoIosSend className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {disabled && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
          Chat is currently unavailable. Please try again later.
        </p>
      )}
    </form>
  );
};

ChatInput.propTypes = {
  onSendMessage: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  voiceEnabled: PropTypes.bool,
  onVoiceInputToggle: PropTypes.func,
  isVoiceActive: PropTypes.bool
};

export default ChatInput;
