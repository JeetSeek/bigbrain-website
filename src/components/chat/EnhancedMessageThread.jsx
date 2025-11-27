import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, Clock, User, Bot } from 'lucide-react';

/**
 * Enhanced Message Thread Component
 * Collapsible diagnostic conversation threads for better organization
 * Optimized for mobile screens and professional technician workflow
 */
const EnhancedMessageThread = ({
  threadId,
  messages = [],
  isExpanded: initialExpanded = false,
  onToggle,
  onMessageClick,
  className = "",
  maxPreviewMessages = 2,
  showTimestamps = true,
  allowReordering = false
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [threadMessages, setThreadMessages] = useState(messages);

  // Get thread messages (filter by threadId if provided)
  const getThreadMessages = useCallback(() => {
    if (threadId) {
      return threadMessages.filter(msg => msg.threadId === threadId);
    }
    return threadMessages;
  }, [threadId, threadMessages]);

  const messages = getThreadMessages();

  // Don't render if no messages
  if (messages.length === 0) return null;

  const mainMessage = messages[0];
  const previewMessages = messages.slice(0, maxPreviewMessages);
  const hasMoreMessages = messages.length > maxPreviewMessages;
  const threadDuration = calculateThreadDuration(messages);

  // Handle thread expansion toggle
  const handleToggle = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggle?.(threadId, newExpanded);
  }, [isExpanded, threadId, onToggle]);

  // Handle individual message click
  const handleMessageClick = useCallback((message) => {
    onMessageClick?.(message);
  }, [onMessageClick]);

  // Calculate thread duration
  function calculateThreadDuration(messages) {
    if (messages.length < 2) return null;

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    if (!firstMessage.timestamp || !lastMessage.timestamp) return null;

    const duration = new Date(lastMessage.timestamp) - new Date(firstMessage.timestamp);
    return duration;
  }

  // Format duration for display
  function formatDuration(duration) {
    if (!duration) return '';

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Get message preview text
  function getMessagePreview(message) {
    const maxLength = 80;
    const text = message.content || '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  return (
    <div className={`enhanced-message-thread border border-gray-200 dark:border-gray-600 rounded-lg mb-3 overflow-hidden ${className}`}>
      {/* Thread Header - Always Visible */}
      <button
        onClick={handleToggle}
        className="thread-header w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        aria-expanded={isExpanded}
        aria-controls={`thread-content-${threadId}`}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} diagnostic thread with ${messages.length} messages`}
      >
        <div className="thread-info flex items-center gap-3 flex-1 min-w-0">
          {/* Thread Icon */}
          <div className="thread-icon flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-blue-500" />
          </div>

          {/* Thread Details */}
          <div className="thread-details flex-1 min-w-0">
            <div className="thread-title flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                Diagnostic Thread #{threadId || 'New'}
              </h4>
              <span className="thread-count px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                {messages.length} messages
              </span>
            </div>

            {/* Thread Duration */}
            {threadDuration && (
              <div className="thread-meta flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Duration: {formatDuration(threadDuration)}
                </span>
                <span>
                  Started: {new Date(mainMessage.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}

            {/* Preview Messages */}
            <div className="thread-preview space-y-1">
              {previewMessages.map((message, index) => (
                <div
                  key={message.id || index}
                  className="preview-message flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400"
                >
                  <div className="message-avatar flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5">
                    {message.sender === 'user' ? (
                      <User className="w-3 h-3" />
                    ) : (
                      <Bot className="w-3 h-3" />
                    )}
                  </div>
                  <span className="message-text truncate flex-1">
                    {getMessagePreview(message)}
                  </span>
                </div>
              ))}

              {hasMoreMessages && (
                <div className="more-messages text-xs text-gray-500 dark:text-gray-400 italic">
                  +{messages.length - maxPreviewMessages} more messages...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expand/Collapse Indicator */}
        <div className="thread-controls flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400 transition-transform" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400 transition-transform" />
          )}
        </div>
      </button>

      {/* Thread Content - Collapsible */}
      {isExpanded && (
        <div
          id={`thread-content-${threadId}`}
          className="thread-content border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
        >
          {/* Thread Actions */}
          <div className="thread-actions p-3 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="thread-stats text-xs text-gray-500 dark:text-gray-400">
                {messages.length} messages • {formatDuration(threadDuration)} duration
              </div>

              <div className="thread-controls flex items-center gap-2">
                <button
                  onClick={() => {/* Handle export thread */}}
                  className="action-btn px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                  title="Export thread"
                >
                  Export
                </button>
                <button
                  onClick={() => {/* Handle share thread */}}
                  className="action-btn px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                  title="Share thread"
                >
                  Share
                </button>
              </div>
            </div>
          </div>

          {/* Messages List */}
          <div className="thread-messages divide-y divide-gray-200 dark:divide-gray-600">
            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className="thread-message p-4 hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={() => handleMessageClick(message)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleMessageClick(message);
                  }
                }}
                aria-label={`Message ${index + 1} of ${messages.length}: ${message.content?.substring(0, 50)}...`}
              >
                <div className="message-header flex items-center gap-3 mb-2">
                  {/* Message Avatar */}
                  <div className={`message-avatar w-8 h-8 rounded-full flex items-center justify-center ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-green-500 text-white'
                  }`}>
                    {message.sender === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>

                  {/* Message Info */}
                  <div className="message-info flex-1 min-w-0">
                    <div className="sender-info flex items-center gap-2">
                      <span className="sender-name text-sm font-medium text-gray-900 dark:text-gray-100">
                        {message.sender === 'user' ? 'You' : 'BoilerBrain Assistant'}
                      </span>

                      {showTimestamps && message.timestamp && (
                        <span className="message-time text-xs text-gray-500 dark:text-gray-400">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Actions */}
                  <div className="message-actions opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle message actions (copy, bookmark, etc.)
                      }}
                      className="action-btn p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                      title="Message options"
                    >
                      ⋯
                    </button>
                  </div>
                </div>

                {/* Message Content */}
                <div className="message-content ml-11">
                  <div className="message-text text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                    {message.content}
                  </div>

                  {/* Message Metadata */}
                  {message.confidence && (
                    <div className="message-meta mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Confidence: {Math.round(message.confidence * 100)}%</span>
                      {message.responseTime && (
                        <span>Response: {message.responseTime}ms</span>
                      )}
                      {message.apiUsed && (
                        <span>via {message.apiUsed}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Thread Footer */}
          <div className="thread-footer p-3 border-t border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
            <div className="flex items-center justify-center">
              <button
                onClick={handleToggle}
                className="collapse-btn px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
              >
                Collapse Thread
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Message Thread Manager Component
 * Manages multiple threads and their interactions
 */
const MessageThreadManager = ({
  threads = {},
  onThreadUpdate,
  onThreadSelect,
  className = ""
}) => {
  const [expandedThreads, setExpandedThreads] = useState(new Set());

  const handleThreadToggle = useCallback((threadId, isExpanded) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(threadId);
      } else {
        newSet.delete(threadId);
      }
      return newSet;
    });
  }, []);

  const threadEntries = Object.entries(threads);

  return (
    <div className={`message-thread-manager ${className}`}>
      {threadEntries.length === 0 ? (
        <div className="no-threads text-center py-8 text-gray-500 dark:text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No diagnostic threads yet</p>
          <p className="text-sm">Start a conversation to create your first thread</p>
        </div>
      ) : (
        <div className="threads-list space-y-2">
          {threadEntries.map(([threadId, messages]) => (
            <EnhancedMessageThread
              key={threadId}
              threadId={threadId}
              messages={messages}
              isExpanded={expandedThreads.has(threadId)}
              onToggle={handleThreadToggle}
              onMessageClick={(message) => onThreadSelect?.(threadId, message)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export { EnhancedMessageThread, MessageThreadManager };
