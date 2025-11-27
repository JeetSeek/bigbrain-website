import React, { useState } from 'react';
import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';
import http from '../../utils/http';

/**
 * MessageBubble - Renders a chat message with Apple-style design
 * Memoized to prevent unnecessary re-renders
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.message - Message object with sender and text properties
 * @param {boolean} props.isUser - Whether the message is from the user (true) or AI (false)
 * @param {boolean} props.isFirst - Whether this is the first message in a sequence from the same sender
 * @param {boolean} props.isLast - Whether this is the last message in a sequence from the same sender
 * @returns {React.ReactElement} Styled message bubble
 */
const MessageBubble = React.memo(({ message, isUser, isFirst = false, isLast = false }) => {
  const [feedback, setFeedback] = useState(null); // 'helpful', 'not_helpful', or null
  const [showRegenerateOption, setShowRegenerateOption] = useState(false);

  // Professional Apple-style bubble styling with animations
  const bubbleStyle = isUser
    ? 'chat-message-user'
    : 'chat-message-ai';

  // Handle feedback submission
  const handleFeedback = async (type) => {
    setFeedback(type);
    
    if (type === 'not_helpful') {
      setShowRegenerateOption(true);
    }

    // Log feedback to backend for learning
    try {
      await http.post('/api/feedback', {
        messageId: message.id || Date.now(),
        feedback: type,
        messageText: typeof message.text === 'string' ? message.text : JSON.stringify(message.text),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleRegenerate = () => {
    // Trigger regeneration - parent component will handle this
    if (window.regenerateLastResponse) {
      window.regenerateLastResponse();
    }
    setShowRegenerateOption(false);
  };

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
      // If message has actual text content, use that instead of structured data
      if (message.text.text) {
        textContent = String(message.text.text);
      } else if (message.text.structured) {
        const s = message.text.structured;
        const headerLine = [s?.header?.make ? `Make: ${s.header.make}` : null, s?.header?.model ? `Model: ${s.header.model}` : null, s?.header?.system ? `System: ${s.header.system}` : null, s?.header?.faultCode ? `Code: ${s.header.faultCode}` : null].filter(Boolean).join(' | ');
        const hasBullets = Array.isArray(s?.bullets) && s.bullets.length > 0;
        const hasSteps = Array.isArray(s?.steps) && s.steps.length > 0;
        const hasCautions = Array.isArray(s?.cautions) && s.cautions.length > 0;
        const hasParts = Array.isArray(s?.parts) && s.parts.length > 0;
        const hasMeas = Array.isArray(s?.measurements) && s.measurements.length > 0;
        const hasSources = s?.sources && ((s.sources.manuals && s.sources.manuals.length) || (s.sources.knowledge && s.sources.knowledge.length));
        const isStructuredEmpty = !headerLine && !hasBullets && !hasSteps && !hasCautions && !hasParts && !hasMeas && !hasSources;
        if (!isStructuredEmpty) {
          return (
            <div className="space-y-2">
              {headerLine && <div className="text-[13px] font-medium text-gray-800">{headerLine}</div>}
              {hasBullets && (
                <ul className="list-disc pl-4 space-y-1 text-[15px]">
                  {s.bullets.map((b, i) => (
                    <li key={`b-${i}`}>{b}</li>
                  ))}
                </ul>
              )}
              {hasSteps && (
                <ol className="list-decimal pl-5 space-y-1 text-[15px]">
                  {s.steps.map((st, i) => (
                    <li key={`st-${i}`}>{st}</li>
                  ))}
                </ol>
              )}
              {hasCautions && (
                <div className="text-[14px] text-red-700">
                  {s.cautions.map((c, i) => (
                    <div key={`c-${i}`}>⚠️ {c}</div>
                  ))}
                </div>
              )}
              {hasParts && (
                <div className="text-[14px] text-gray-800">
                  <span className="font-medium">Parts:</span> {s.parts.join(', ')}
                </div>
              )}
              {hasMeas && (
                <div className="text-[14px] text-gray-800">
                  <span className="font-medium">Measurements:</span>
                  <ul className="list-disc pl-4">
                    {s.measurements.map((m, i) => (<li key={`m-${i}`}>{m}</li>))}
                  </ul>
                </div>
              )}
              {hasSources && (
                <div className="text-[13px] text-gray-700">
                  <div className="font-medium mt-1">Sources:</div>
                  <ul className="list-disc pl-4 space-y-1">
                    {(s.sources.manuals || []).map((m, i) => (
                      <li key={`sm-${i}`}>
                        [Manual] {m.title}{m.manufacturer ? ` (${m.manufacturer})` : ''}{m.url ? `: ${m.url}` : ''}
                      </li>
                    ))}
                    {(s.sources.knowledge || []).map((k, i) => (
                      <li key={`sk-${i}`}>
                        [Knowledge] {k.title}{k.fault_code ? ` [${k.fault_code}]` : ''}{k.manufacturer ? ` (${k.manufacturer})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        }
        // Fallback when structured has nothing useful to render
        if (message.text.text && typeof message.text.text === 'string') {
          textContent = message.text.text;
        } else {
          textContent = '';
        }
      }
      if (message.text.text && typeof message.text.text === 'string') {
        textContent = message.text.text;
      } else {
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
    
    let processedText = text;
    
    // Highlight fault codes
    faultCodes.forEach(code => {
      const regex = new RegExp(`\\b${code}\\b`, 'gi');
      processedText = processedText.replace(regex, 
        `<span class="bg-red-100 text-red-800 px-1 py-0.5 rounded text-sm font-semibold">${code}</span>`
      );
    });
    
    // Highlight technical terms (only for AI messages)
    technicalTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      processedText = processedText.replace(regex, 
        `<span class="bg-blue-100 text-blue-800 px-1 rounded text-sm font-medium">${term}</span>`
      );
    });
    
    // Convert line breaks to <br> tags for proper formatting
    processedText = processedText.replace(/\n/g, '<br>');
    
    return <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processedText) }} />;
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
    
    return <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processedText) }} />;
  };

  return (
    <div className="flex flex-col">
      <div 
        className={`${bubbleStyle} animate-message-in`}
        style={{
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          hyphens: 'auto'
        }}
      >
        <div
          className="text-[15px] leading-tight break-words"
          style={{
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
          {renderMessageContent()}
        </div>
      </div>
      
      {/* Feedback buttons - only for AI messages */}
      {!isUser && isLast && (
        <div className="flex items-center gap-2 mt-2 ml-2">
          <button
            onClick={() => handleFeedback('helpful')}
            disabled={feedback !== null}
            className={`p-1.5 rounded-lg transition-all ${
              feedback === 'helpful' 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            } disabled:opacity-50`}
            title="Helpful response"
            aria-label="Mark as helpful"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
            </svg>
          </button>
          
          <button
            onClick={() => handleFeedback('not_helpful')}
            disabled={feedback !== null}
            className={`p-1.5 rounded-lg transition-all ${
              feedback === 'not_helpful' 
                ? 'bg-red-100 text-red-600' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            } disabled:opacity-50`}
            title="Not helpful"
            aria-label="Mark as not helpful"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
            </svg>
          </button>

          {showRegenerateOption && (
            <button
              onClick={handleRegenerate}
              className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all font-medium"
              aria-label="Try different response"
            >
              🔄 Try different response
            </button>
          )}

          {feedback && (
            <span className="text-xs text-gray-500 ml-1">
              {feedback === 'helpful' ? 'Thanks for feedback!' : 'Feedback recorded'}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

MessageBubble.propTypes = {
  message: PropTypes.shape({
    sender: PropTypes.string,
    text: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object
    ])
  }).isRequired,
  isUser: PropTypes.bool.isRequired,
  isFirst: PropTypes.bool,
  isLast: PropTypes.bool
};

export default MessageBubble;
