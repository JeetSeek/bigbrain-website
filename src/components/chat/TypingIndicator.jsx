import React from 'react';

/**
 * TypingIndicator - Shows an animated typing indicator for chat messages
 * Uses Apple-style animation with delayed dots
 * 
 * @component
 * @returns {React.ReactElement} Animated typing indicator
 */
const TypingIndicator = () => {
  const ANIMATION_DELAYS = [0, 200, 400]; // in milliseconds

  return (
    <div 
      className="flex items-center space-x-1 px-3 py-2 max-w-[80px] rounded-3xl bg-gray-100 dark:bg-gray-700 shadow"
      data-testid="typing-indicator"
    >
      {ANIMATION_DELAYS.map(delay => (
        <div
          key={delay}
          className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
};

export default TypingIndicator;
