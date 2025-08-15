import React from 'react';
import PropTypes from 'prop-types';

/**
 * MessageBubble - Renders a chat message with Apple-style design
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.message - Message object with sender and text properties
 * @param {boolean} props.isUser - Whether the message is from the user (true) or AI (false)
 * @param {boolean} props.isFirst - Whether this is the first message in a sequence from the same sender
 * @param {boolean} props.isLast - Whether this is the last message in a sequence from the same sender
 * @returns {React.ReactElement} Styled message bubble
 */
const MessageBubble = ({ message, isUser, isFirst, isLast }) => {
  // Apple-style bubble styling with proper rounding based on message position
  const bubbleStyle = isUser
    ? `bg-[#007AFF] text-white ${isFirst && isLast ? 'rounded-2xl' : isFirst ? 'rounded-t-2xl rounded-bl-2xl rounded-br-lg' : isLast ? 'rounded-b-2xl rounded-bl-lg rounded-br-2xl' : 'rounded-l-2xl rounded-r-lg'}`
    : `bg-gray-100 text-gray-900 ${isFirst && isLast ? 'rounded-2xl' : isFirst ? 'rounded-t-2xl rounded-br-2xl rounded-bl-lg' : isLast ? 'rounded-b-2xl rounded-br-lg rounded-bl-2xl' : 'rounded-r-2xl rounded-l-lg'}`;

  // Enhanced fault code detection patterns
  const detectFaultCodes = (text) => {
    if (typeof text !== 'string') return [];
    // Common boiler fault code patterns (F1, F22, E1, L2, etc.)
    const faultCodeRegex = /\b[FELA]\d{1,3}\b/gi;
    return text.match(faultCodeRegex) || [];
  };

  // Detect technical terms for highlighting
  const detectTechnicalTerms = (text) => {
    if (typeof text !== 'string') return [];
    const technicalTerms = [
      'gas supply', 'pilot light', 'ignition', 'thermostat', 'pcb', 'heat exchanger',
      'condensate', 'flue', 'gas valve', 'pump', 'diverter valve', 'pressure switch',
      'flame sensor', 'overheat', 'lockout', 'boiler reset', 'gas safe'
    ];
    const found = [];
    technicalTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      if (regex.test(text)) found.push(term);
    });
    return found;
  };

  // Enhanced content rendering with gas fault diagnosis features
  const renderMessageContent = () => {
    // If message is null/undefined, display empty message warning
    if (!message || message.text === undefined || message.text === null) {
      console.warn('MessageBubble received invalid message:', message);
      return 'Empty message';
    }
    
    let textContent = '';
    
    // Handle object messages (typically from API responses)
    if (typeof message.text === 'object') {
      // If the object has a text property, use that
      if (message.text.text && typeof message.text.text === 'string') {
        textContent = message.text.text;
      } else {
        // Otherwise try to stringify it - with fallback error handling
        try {
          textContent = JSON.stringify(message.text);
        } catch (e) {
          console.error('Failed to stringify message object:', e);
          return 'Unable to display message content';
        }
      }
    } else if (typeof message.text === 'string') {
      textContent = message.text;
    } else {
      textContent = String(message.text);
    }

    // For AI messages, enhance with fault code highlighting and structured formatting
    if (!isUser && message.sender === 'assistant') {
      return renderEnhancedDiagnosticContent(textContent);
    }
    
    // For user messages, basic fault code highlighting
    return renderWithBasicHighlighting(textContent);
  };

  // Enhanced diagnostic content rendering for AI responses
  const renderEnhancedDiagnosticContent = (text) => {
    const faultCodes = detectFaultCodes(text);
    const technicalTerms = detectTechnicalTerms(text);
    
    // Split text into lines for better structure detection
    const lines = text.split('\n');
    
    return (
      <div className="space-y-2">
        {lines.map((line, index) => {
          // Check if line is a numbered step or bullet point
          const isStep = /^\d+\.|^\u2022|^-\s/.test(line.trim());
          const isImportant = /^\*\*|WARNING|CAUTION|SAFETY|GAS SAFE/i.test(line);
          
          let processedLine = line;
          
          // Highlight fault codes
          faultCodes.forEach(code => {
            const regex = new RegExp(`\\b${code}\\b`, 'gi');
            processedLine = processedLine.replace(regex, 
              `<span class="bg-red-100 text-red-800 px-1 py-0.5 rounded text-sm font-semibold">${code}</span>`
            );
          });
          
          // Highlight technical terms (only for AI messages)
          technicalTerms.forEach(term => {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            processedLine = processedLine.replace(regex, 
              `<span class="bg-blue-100 text-blue-800 px-1 rounded text-sm font-medium">${term}</span>`
            );
          });
          
          return (
            <div 
              key={index}
              className={`${isStep ? 'ml-2 pl-2 border-l-2 border-blue-200' : ''} ${
                isImportant ? 'bg-yellow-50 border border-yellow-200 rounded p-2 font-semibold' : ''
              }`}
              dangerouslySetInnerHTML={{ __html: processedLine }}
            />
          );
        })}
      </div>
    );
  };

  // Basic highlighting for user messages (just fault codes)
  const renderWithBasicHighlighting = (text) => {
    const faultCodes = detectFaultCodes(text);
    let processedText = text;
    
    faultCodes.forEach(code => {
      const regex = new RegExp(`\\b${code}\\b`, 'gi');
      processedText = processedText.replace(regex, 
        `<span class="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-sm font-semibold">${code}</span>`
      );
    });
    
    return <div dangerouslySetInnerHTML={{ __html: processedText }} />;
  };

  return (
    <div
      className={`px-4 py-2 max-w-[75%] shadow-sm ${bubbleStyle} transition-all duration-200 ease-in-out`}
      data-testid={`message-bubble-${isUser ? 'user' : 'ai'}`}
    >
      <p
        className="text-[15px] leading-tight break-words"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {renderMessageContent()}
      </p>
    </div>
  );
};

MessageBubble.propTypes = {
  message: PropTypes.shape({
    sender: PropTypes.string,
    text: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object
    ])
  }).isRequired,
  isUser: PropTypes.bool.isRequired,
  isFirst: PropTypes.bool.isRequired,
  isLast: PropTypes.bool.isRequired
};

export default MessageBubble;
