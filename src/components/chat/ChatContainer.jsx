import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import ChatMessageHistory from './ChatMessageHistory';
import ChatInput from './ChatInput';
import useChatSession from '../../hooks/useChatSession';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';

/**
 * ChatContainer - Main component that integrates all chat functionality
 * 
 * @component
 * @param {Object} props
 * @param {string} props.initialSessionId - Optional session ID to restore a previous session
 * @param {boolean} props.persistSession - Whether to persist session data
 * @param {boolean} props.voiceEnabled - Whether voice input is enabled
 * @returns {React.ReactElement} Full chat interface with message history and input
 */
const ChatContainer = ({ 
  initialSessionId = null,
  persistSession = true,
  voiceEnabled = true
}) => {
  // Initialize chat session hook
  const {
    sessionId,
    messages,
    loading,
    error,
    sendMessage,
    clearMessages,
    startNewSession
  } = useChatSession({
    initialSessionId,
    persistSession
  });

  // Initialize speech recognition hook
  const {
    transcript,
    isListening,
    toggleListening,
    resetTranscript,
    supported: speechSupported
  } = useSpeechRecognition({
    continuous: true,
    language: 'en-US'
  });

  // Flag to track if we've used the transcript
  const [transcriptUsed, setTranscriptUsed] = useState(false);

  // Process speech recognition transcript when it changes
  const processTranscript = useCallback(() => {
    if (transcript && !transcriptUsed && !loading) {
      sendMessage(transcript);
      resetTranscript();
      setTranscriptUsed(true);
    }
  }, [transcript, transcriptUsed, loading, sendMessage, resetTranscript]);

  // Reset transcript used flag when listening state changes
  useEffect(() => {
    if (isListening) {
      setTranscriptUsed(false);
    } else if (transcript && !transcriptUsed) {
      processTranscript();
    }
  }, [isListening, transcript, transcriptUsed, processTranscript]);

  // Handle voice input toggle
  const handleVoiceInputToggle = useCallback(() => {
    toggleListening();
  }, [toggleListening]);

  // Handle sending a message from input
  const handleSendMessage = useCallback((text) => {
    sendMessage(text);
  }, [sendMessage]);

  return (
    <div className="chat-container flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Chat header with controls */}
      <div className="chat-header p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">BoilerBrain Chat</h2>
        <div className="flex space-x-2">
          <button
            onClick={clearMessages}
            className="p-2 text-sm rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600"
            aria-label="Clear chat"
            data-testid="clear-chat-button"
          >
            Clear Chat
          </button>
          <button
            onClick={startNewSession}
            className="p-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600"
            aria-label="New session"
            data-testid="new-session-button"
          >
            New Session
          </button>
        </div>
      </div>
      
      {/* Chat message history */}
      <ChatMessageHistory 
        messages={messages} 
        loading={loading} 
      />
      
      {/* Error message if applicable */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-3 text-sm">
          Error: {error.message || 'An unknown error occurred'}
        </div>
      )}
      
      {/* Chat input area */}
      <ChatInput
        onSendMessage={handleSendMessage}
        loading={loading}
        voiceEnabled={voiceEnabled && speechSupported}
        onVoiceInputToggle={handleVoiceInputToggle}
        isVoiceActive={isListening}
      />
    </div>
  );
};

ChatContainer.propTypes = {
  initialSessionId: PropTypes.string,
  persistSession: PropTypes.bool,
  voiceEnabled: PropTypes.bool
};

export default ChatContainer;
