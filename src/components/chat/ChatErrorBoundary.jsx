import React from 'react';
import { BiError } from 'react-icons/bi';
import { MdRefresh, MdSignalWifi4Bar, MdSignalWifiOff } from 'react-icons/md';

/**
 * Chat Error Boundary Component
 * Features:
 * - Catches JavaScript errors in chat components
 * - Provides user-friendly error messages
 * - Includes recovery options
 * - Logs errors for debugging
 * - Handles network connectivity issues
 */
class ChatErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isOnline: navigator.onLine,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Chat Error Boundary caught an error:', error, errorInfo);

    // Could send to error reporting service
    this.logError(error, errorInfo);

    this.setState({
      errorInfo
    });
  }

  componentDidMount() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = () => {
    this.setState({ isOnline: true });
    // Could trigger a retry of failed operations
  };

  handleOffline = () => {
    this.setState({ isOnline: false });
  };

  logError = (error, errorInfo) => {
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      isOnline: this.state.isOnline
    };

    // In a real app, this would be sent to an error reporting service
    console.error('Error Report:', errorReport);

    // Could also store in localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('chatErrors') || '[]');
      existingErrors.push(errorReport);
      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.shift();
      }
      localStorage.setItem('chatErrors', JSON.stringify(existingErrors));
    } catch (e) {
      console.error('Failed to store error report:', e);
    }
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="chat-error-enhanced">
          <div className="error-content text-center max-w-md mx-auto">
            {/* Error Icon */}
            <div className="error-icon-enhanced">
              <BiError />
            </div>

            {/* Error Title */}
            <h3 className="error-title-enhanced">
              Chat System Error
            </h3>

            {/* Error Message */}
            <p className="error-message-enhanced">
              {!this.state.isOnline
                ? "You're currently offline. Please check your internet connection and try again."
                : "Something went wrong with the chat system. This has been reported to our team."
              }
            </p>

            {/* Error Suggestions */}
            <div className="error-suggestions">
              <h4>Try these steps:</h4>
              <ol>
                <li>Check your internet connection</li>
                <li>Refresh the page</li>
                <li>Clear browser cache and try again</li>
              </ol>
            </div>

            {/* Technical Details (only in development) */}
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details mb-4 text-left">
                <summary className="cursor-pointer text-xs text-red-600 dark:text-red-400 mb-2">
                  Technical Details
                </summary>
                <pre className="text-xs bg-red-100 dark:bg-red-800 p-2 rounded overflow-auto max-h-32">
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo && (
                    <div className="mt-2">
                      <strong>Component Stack:</strong>
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </pre>
              </details>
            )}

            {/* Network Status */}
            <div className="network-status mb-4 flex items-center justify-center gap-2 text-sm">
              {this.state.isOnline ? (
                <>
                  <MdSignalWifi4Bar className="w-4 h-4 text-green-500" />
                  <span className="text-green-700 dark:text-green-300">Online</span>
                </>
              ) : (
                <>
                  <MdSignalWifiOff className="w-4 h-4 text-red-500" />
                  <span className="text-red-700 dark:text-red-300">Offline</span>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="error-actions-enhanced">
              <button
                onClick={this.handleRetry}
                className="btn-secondary-enhanced"
                disabled={this.state.retryCount >= 3}
              >
                <MdRefresh className="w-4 h-4 inline mr-2" />
                {this.state.retryCount >= 3 ? 'Max retries reached' : 'Try Again'}
              </button>

              <button
                onClick={this.handleReload}
                className="btn-primary-enhanced"
              >
                Reload Page
              </button>
            </div>

            {/* Retry Count */}
            {this.state.retryCount > 0 && (
              <p className="retry-count text-xs text-red-600 dark:text-red-400 mt-2">
                Retry attempts: {this.state.retryCount}/3
              </p>
            )}

            {/* Emergency Contact */}
            <div className="emergency-contact mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-1 font-semibold">
                🚨 For urgent boiler issues:
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Contact Gas Safe emergency: 0800 408 5500
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChatErrorBoundary;
