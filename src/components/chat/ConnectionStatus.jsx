import React from 'react';
import PropTypes from 'prop-types';
import { FiWifiOff, FiWifi } from 'react-icons/fi';
import { IoMdRefresh } from 'react-icons/io';

/**
 * Connection status indicator component
 * 
 * @component
 * @param {Object} props
 * @param {string} props.status - Current connection status ('online' or 'offline')
 * @param {Function} props.onRetry - Callback function for retry button
 * @returns {React.ReactElement} Connection status indicator with retry option
 */
const ConnectionStatus = ({ status, onRetry }) => {
  // If online, don't show anything
  if (status === 'online') return null;
  
  return (
    <div className="p-2 bg-yellow-50 border-b border-yellow-100 flex items-center justify-between">
      <div className="flex items-center text-yellow-800">
        <FiWifiOff className="mr-2" />
        <span className="text-xs font-medium">Offline Mode</span>
      </div>
      <button 
        onClick={onRetry} 
        className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-1 rounded flex items-center"
        aria-label="Retry connection"
      >
        <IoMdRefresh className="mr-1" size={12} />
        Retry
      </button>
    </div>
  );
};

ConnectionStatus.propTypes = {
  status: PropTypes.oneOf(['online', 'offline']).isRequired,
  onRetry: PropTypes.func.isRequired
};

export default ConnectionStatus;
