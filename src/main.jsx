import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import App from './App';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AdminDashboard } from './components/AdminDashboard';
// AdminDirect removed to prevent router conflicts
import { STORAGE_KEYS, ROUTES } from './utils/constants';
import { clearLegacyAuthData } from './services/authUtils';
import './index.css';

// Clear any legacy authentication data on app initialization
clearLegacyAuthData();

/**
 * Loading spinner component
 */
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-black">
    <div className="animate-pulse text-blue-500 text-xl">Loading...</div>
  </div>
);

/**
 * Protected route component for production authentication
 * Uses AuthContext to check authentication status
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @returns {React.ReactElement} Authenticated children or redirect to login
 */
export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading spinner while authentication state is being determined
  if (loading) return <LoadingSpinner />;

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Render children if authenticated
  return children;
};

/**
 * Application routes component
 * Separated from authentication provider to avoid initialization issues
 * @returns {React.ReactElement} Application routes
 */
const AppRoutes = () => (
  <Routes>
    <Route
      path={`${ROUTES.HOME}*`}
      element={<App />}
    />
    <Route
      path={ROUTES.ADMIN}
      element={<AdminDashboard />}
    />
    <Route path={ROUTES.REGISTER} element={<Register />} />
    <Route path={ROUTES.LOGIN} element={<Login />} />
    {/* Direct access to dashboard for mobile testing */}
    <Route path="/dashboard" element={<App />} />
  </Routes>
);

/**
 * Main application wrapper with authentication provider and routing
 * Structure avoids lifecycle issues between auth and router
 * @returns {React.ReactElement} Configured application with routes
 */
/**
 * Simple error boundary component to catch router errors
 */
class ErrorBoundarySimple extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Router error caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-black text-white min-h-screen flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold mb-4 text-red-500">Something went wrong</h2>
          <p className="mb-4">There was an error loading the application</p>
          <div className="bg-zinc-900 p-4 rounded-lg mb-6 w-full max-w-lg overflow-auto">
            <pre className="text-red-400 text-xs">{this.state.error?.toString()}</pre>
          </div>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AppWithAuth = () => (
  <ErrorBoundarySimple>
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  </ErrorBoundarySimple>
);

// Initialize the application with proper router and error handling
const rootElement = document.getElementById('root');

if (rootElement) {
  // Clear any existing content to prevent DOM conflicts
  rootElement.innerHTML = '';
  
  // Prevent multiple root creation in development
  if (!window.__REACT_ROOT__) {
    const root = ReactDOM.createRoot(rootElement);
    window.__REACT_ROOT__ = root;
    
    // Render with error boundary to catch DOM issues
    root.render(<AppWithAuth />);
  } else {
    // Re-render on existing root
    window.__REACT_ROOT__.render(<AppWithAuth />);
  }

  // Add global error handler for logging only
  if (!window.__ERROR_HANDLER_ADDED__) {
    window.addEventListener('error', event => {
      console.error('Global error caught:', event.error);
    });
    window.__ERROR_HANDLER_ADDED__ = true;
  }
} else {
  console.error('Root element not found');
}

// Default export for backward compatibility
export default AppWithAuth;
