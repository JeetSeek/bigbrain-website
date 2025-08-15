import React from 'react';

/**
 * Mock ErrorBoundary component for testing - simplified version without external dependencies
 */
class MockErrorBoundary extends React.Component {
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
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      `ErrorBoundary caught an error in ${this.props.componentName || 'a component'}:`,
      error,
      errorInfo
    );
    this.setState({ errorInfo });
  }

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary-fallback">
          <h2>Something went wrong in {this.props.componentName || 'this section'}</h2>
          <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={this.toggleDetails}>
            {this.state.showDetails ? 'Hide error details' : 'Show error details'}
          </button>
          {this.state.showDetails && (
            <div>
              <p>Component Stack:</p>
              <pre>{this.state.errorInfo?.componentStack || 'No component stack available'}</pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default MockErrorBoundary;
