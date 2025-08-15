import React from 'react';
import PropTypes from 'prop-types';
import { FiAlertCircle, FiRefreshCw, FiInfo } from 'react-icons/fi';

/**
 * Context-aware error fallback component for different chat error types
 * 
 * @component
 * @param {Object} props
 * @param {string} props.errorType - Type of error (server, network, timeout, etc.)
 * @param {Function} props.onRetry - Callback function to retry the operation
 * @returns {React.ReactElement} Context-aware error message with helpful guidance
 */
const ErrorFallback = ({ errorType = 'unknown', onRetry }) => {
  // Configure error message based on error type
  const errorConfig = {
    server: {
      title: 'Server Error',
      icon: <FiAlertCircle size={20} className="text-red-500" />,
      message: 'There was an issue processing your request on our servers.',
      help: 'Try again in a few moments. If the problem persists, contact technical support.',
      color: 'red'
    },
    network: {
      title: 'Connection Error',
      icon: <FiAlertCircle size={20} className="text-yellow-500" />,
      message: 'Unable to reach the diagnostic server. Check your internet connection.',
      help: 'If your connection is working, our service may be temporarily unavailable.',
      color: 'yellow'
    },
    timeout: {
      title: 'Request Timed Out',
      icon: <FiAlertCircle size={20} className="text-orange-500" />,
      message: 'Your request took too long to process and timed out.',
      help: 'This could be due to high demand or complex diagnostics. Please try again.',
      color: 'orange'
    },
    unauthorized: {
      title: 'Authentication Error',
      icon: <FiAlertCircle size={20} className="text-blue-500" />,
      message: 'Your session has expired or you lack permissions for this operation.',
      help: 'Try refreshing the page to re-authenticate or contact your administrator.',
      color: 'blue'
    },
    unknown: {
      title: 'Something Went Wrong',
      icon: <FiAlertCircle size={20} className="text-gray-500" />,
      message: 'We encountered an unexpected error while processing your request.',
      help: 'Please try again or refresh the page to continue.',
      color: 'gray'
    }
  };

  // Use config for the specific error type or fall back to unknown
  const config = errorConfig[errorType] || errorConfig.unknown;
  const { title, icon, message, help, color } = config;

  return (
    <div className={`rounded-lg border bg-${color}-50 border-${color}-100 p-4 mb-4`}>
      <div className="flex items-center mb-2">
        {icon}
        <h3 className={`ml-2 font-medium text-${color}-700`}>{title}</h3>
      </div>
      <p className={`text-sm mb-3 text-${color}-600`}>{message}</p>
      <p className="text-xs mb-3 text-gray-600">{help}</p>
      
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
        <button
          onClick={onRetry}
          className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md bg-${color}-100 text-${color}-700 hover:bg-${color}-200`}
          aria-label="Retry operation"
        >
          <FiRefreshCw size={14} className="mr-1" /> Try Again
        </button>
        
        {errorType === 'network' && (
          <div className={`inline-flex items-center px-3 py-1.5 text-xs rounded-md bg-${color}-50 text-${color}-800 border border-${color}-200`}>
            <FiInfo size={14} className="mr-1" />
            <span>Gas Emergency Service: <strong>0800 111 999</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};

ErrorFallback.propTypes = {
  errorType: PropTypes.oneOf(['server', 'network', 'timeout', 'unauthorized', 'unknown']),
  onRetry: PropTypes.func.isRequired
};

export default ErrorFallback;
