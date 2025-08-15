import React from 'react';
import PropTypes from 'prop-types';
import { FiSettings, FiX, FiMinimize, FiMaximize, FiMessageCircle } from 'react-icons/fi';

/**
 * Professional ChatDock header with Gas Safe branding
 * 
 * @component
 * @param {Object} props
 * @param {boolean} props.isExpanded - Whether the chat dock is expanded
 * @param {Function} props.onToggleExpand - Callback function to toggle expanded state
 * @param {Function} props.onClose - Callback function to close the chat dock
 * @param {Function} props.onSettings - Callback function to open settings
 * @returns {React.ReactElement} Styled ChatDock header
 */
const ChatDockHeader = ({ isExpanded, onToggleExpand, onClose, onSettings }) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-800 to-blue-700 text-white rounded-t-lg shadow-md">
      <div className="flex items-center">
        {/* Gas Safe inspired icon */}
        <div className="mr-2 bg-white rounded-full p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4 6V18L12 22L20 18V6L12 2Z" fill="#0057b7" />
            <path d="M12 6L7 8.5V15.5L12 18L17 15.5V8.5L12 6Z" fill="white" />
            <path d="M10 11C10 10.4477 10.4477 10 11 10H13C13.5523 10 14 10.4477 14 11V14C14 14.5523 13.5523 15 13 15H11C10.4477 15 10 14.5523 10 14V11Z" fill="#0057b7" />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-sm">Gas Safe Assistant</h2>
          <p className="text-xs text-blue-100">Professional Diagnostic Chat</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={onSettings}
          className="text-blue-100 hover:text-white p-1.5 rounded-full hover:bg-blue-600 transition-colors"
          aria-label="Chat settings"
        >
          <FiSettings size={16} />
        </button>
        <button
          onClick={onToggleExpand}
          className="text-blue-100 hover:text-white p-1.5 rounded-full hover:bg-blue-600 transition-colors"
          aria-label={isExpanded ? "Minimize chat" : "Expand chat"}
        >
          {isExpanded ? <FiMinimize size={16} /> : <FiMaximize size={16} />}
        </button>
        <button
          onClick={onClose}
          className="text-blue-100 hover:text-white p-1.5 rounded-full hover:bg-blue-600 transition-colors"
          aria-label="Close chat"
        >
          <FiX size={16} />
        </button>
      </div>
    </div>
  );
};

ChatDockHeader.propTypes = {
  isExpanded: PropTypes.bool.isRequired,
  onToggleExpand: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onSettings: PropTypes.func.isRequired
};

export default ChatDockHeader;
