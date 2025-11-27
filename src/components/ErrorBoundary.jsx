import React from 'react';
import { UI, ERROR } from '../utils/constants';
import { uploadLog } from '../utils/csrfUtils';

/**
 * Enhanced ErrorBoundary component for catching and displaying React errors
 * with improved error reporting and user feedback
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to be rendered
 * @param {string} [props.componentName='Component'] - Name of the wrapped component for better error reporting
 * @returns {React.ReactElement} Either the children components or an error UI
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error(
      `ErrorBoundary caught an error in ${this.props.componentName || 'a component'}:`,
      error,
      errorInfo
    );
    this.setState({ errorInfo });

    // Send error logs using CSRF-protected endpoint
    this.reportError(error, errorInfo);
    
    // Store error in localStorage for diagnostics
    try {
      const errorLog = JSON.parse(localStorage.getItem('bb_error_log') || '[]');
      errorLog.push({
        component: this.props.componentName,
        message: error?.message,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      // Keep only last 10 errors
      if (errorLog.length > 10) errorLog.shift();
      localStorage.setItem('bb_error_log', JSON.stringify(errorLog));
    } catch (e) {
      console.error('Failed to store error log:', e);
    }
  }

  /**
   * Reports error to our secure logging endpoint with CSRF protection
   * @param {Error} error - The error that occurred
   * @param {Object} errorInfo - React error info object with component stack
   */
  reportError = async (error, errorInfo) => {
    try {
      await uploadLog('error', {
        component: this.props.componentName || 'unknown',
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      });
    } catch (logError) {
      // Don't throw errors from error reporting
      console.error('Failed to report error:', logError);
    }
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI when an error occurs
      return (
        <div className="p-6 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-800/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-red-600 dark:text-red-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-medium text-red-700 dark:text-red-300">
                Something went wrong in {this.props.componentName || 'this section'}
              </h2>
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <div className="mt-3">
                <button
                  onClick={this.toggleDetails}
                  className="text-sm px-3 py-1 rounded bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                >
                  {this.state.showDetails ? 'Hide error details' : 'Show error details'}
                </button>
              </div>
              {this.state.showDetails && (
                <div className="mt-3">
                  <div
                    className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 p-3 rounded overflow-auto mt-2"
                    style={{ maxHeight: UI.ERROR.STACK_TRACE_HEIGHT }}
                  >
                    <p className="font-mono text-xs whitespace-pre-wrap text-red-700 dark:text-red-300">
                      {this.state.error?.stack || 'No stack trace available'}
                    </p>
                    <p className="font-mono text-xs whitespace-pre-wrap mt-4 text-red-700 dark:text-red-300">
                      Component Stack:
                      <br />
                      {this.state.errorInfo?.componentStack || 'No component stack available'}
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Reload page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
