import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useAuth } from './contexts/AuthContext';
import { TAB_IDS, STORAGE_KEYS, ROUTES, DEMO } from './utils/constants';

// Mobile-first iOS components
import MobileNavigation, { MobileHeader, MobileContainer } from './components/MobileNavigation';
import ErrorBoundary from './components/ErrorBoundary';

// Import components needed in the main App component directly
import ManualFinderStandalone from './components/ManualFinderStandalone';
import SupportTickets from './components/SupportTickets';
import ServiceStatus from './components/ServiceStatus';
import PaymentHistory from './components/PaymentHistory';
import SettingsPanel from './components/SettingsPanel';
import FeedbackForm from './components/FeedbackForm';
import AdminDashboard from './components/AdminDashboard';
import ChatDock from './components/ChatDock';
import KnowledgeManagement from './components/KnowledgeManagement';
import GasRateCalculator from './components/tools/gas-rate/GasRateCalculator';
import RoomBtuCalculator from './components/tools/room-btu/RoomBtuCalculator';

// Import pages
import Login from './pages/Login';
import Chat from './pages/Chat';

// Code-split larger/less critical components
const Sidebar = lazy(() => import('./components/Sidebar'));
const MainContent = lazy(() => import('./components/MainContent'));
// ChatDock moved to direct import to fix dynamic loading issue

/**
 * Loading fallback component shown during lazy-loaded component loading
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.componentName='Component'] - Name of the component being loaded
 * @returns {React.ReactElement} Loading spinner with component name
 */
const LoadingFallback = ({ componentName = 'Component' }) => (
  <div className="flex items-center justify-center h-full w-full bg-slate-900 bg-opacity-50">
    <div className="flex flex-col items-center p-4 rounded-lg bg-gray-800 bg-opacity-70 shadow-lg">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-3"></div>
      <p className="text-blue-300">Loading {componentName}...</p>
      <p className="text-gray-400 text-sm mt-2">Please wait, this may take a moment</p>
    </div>
  </div>
);

/**
 * Protected Route Component
 * Redirects unauthenticated users to login page using proper Supabase authentication
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render when authenticated
 * @returns {React.ReactElement} Protected route component
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return children;
};

/**
 * Main Dashboard Component
 * Mobile-first iOS-style dashboard following Apple Human Interface Guidelines
 */
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState(TAB_IDS.MANUAL_FINDER);
  const [isAdmin, setIsAdmin] = useState(false); // TODO: Connect to actual auth system

  // Demo data for testing
  const [userData, setUserData] = useState({
    id: 'demo-user-1',
    name: DEMO.USER.DEFAULT_NAME,
    email: DEMO.USER.DEFAULT_EMAIL,
    tier: DEMO.USER.DEFAULT_TIER,
    serviceStatus: 'Active',
    paymentHistory: [
      {
        id: 1,
        date: '2025-05-01',
        amount: 5.0,
        description: 'Monthly subscription',
        status: 'completed',
      },
      {
        id: 2,
        date: '2025-04-01',
        amount: 5.0,
        description: 'Monthly subscription',
        status: 'completed',
      },
      {
        id: 3,
        date: '2025-03-01',
        amount: 5.0,
        description: 'Monthly subscription',
        status: 'completed',
      },
    ],
    supportTickets: [
      {
        id: 1,
        date: '2025-05-10',
        title: 'Boiler pressure issue',
        status: 'open',
        description: 'My boiler pressure keeps dropping below 1 bar',
      },
      {
        id: 2,
        date: '2025-04-22',
        title: 'No hot water',
        status: 'closed',
        description: 'No hot water in the morning',
      },
    ],
  });

  // Extract first name from userData.name (if available)
  const firstName = userData.name ? userData.name.split(' ')[0] : '';

  // Get current tab title for header
  const getTabTitle = (tabId) => {
    const titles = {
      [TAB_IDS.MANUAL_FINDER]: 'Boiler Manuals',
      [TAB_IDS.CHAT]: 'Fault Finder Chat',
      [TAB_IDS.GAS_RATE]: 'Gas Rate Calculator',
      [TAB_IDS.ROOM_BTU]: 'BTU Calculator',
      [TAB_IDS.SUPPORT]: 'Support',
      [TAB_IDS.FEEDBACK]: 'Feedback',
      [TAB_IDS.ADMIN]: 'Admin Dashboard',
      [TAB_IDS.KNOWLEDGE_MGMT]: 'Knowledge Management'
    };
    return titles[tabId] || 'BoilerBrain';
  };

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ backgroundColor: 'var(--ios-bg-grouped-primary)' }}>
      {/* iOS-style Mobile Header */}
      <MobileHeader 
        title={getTabTitle(activeTab)}
        leftAction={
          <div className="flex items-center space-x-2">
            <span className="text-2xl" role="img" aria-label="BoilerBrain">🧠</span>
          </div>
        }
        rightAction={
          <button
            className="ios-button-secondary px-3 py-1 text-sm"
            onClick={() => {
              localStorage.removeItem(STORAGE_KEYS.DEMO_USER_LOGGED_IN);
              window.location.reload();
            }}
            aria-label="Sign out"
          >
            Sign Out
          </button>
        }
      />

      {/* Main Content Container */}
      <MobileContainer hasTabBar={true} hasHeader={true}>
        <div className="h-full flex flex-col">
          {/* Main Content Area - iOS Style */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <ErrorBoundary componentName="Main Content Area">
              <Suspense fallback={<LoadingFallback componentName="Main Content Area" />}>
                {/* Content based on active tab */}
                {activeTab === TAB_IDS.MANUAL_FINDER && (
                  <div className="ios-content-card">
                    <ManualFinderStandalone />
                  </div>
                )}
                
                {activeTab === TAB_IDS.CHAT && (
                  <div className="absolute inset-0 flex flex-col bg-white" style={{ bottom: '49px', top: '0px' }}>
                    <ErrorBoundary componentName="Chat Interface">
                      <Suspense fallback={<LoadingFallback componentName="Chat Interface" />}>
                        <div className="h-full flex flex-col">
                          <ChatDock embedMode={true} className="h-full w-full flex flex-col" />
                        </div>
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.GAS_RATE && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Gas Rate Calculator">
                      <Suspense fallback={<LoadingFallback componentName="Gas Rate Calculator" />}>
                        <GasRateCalculator />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.ROOM_BTU && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Room BTU Calculator">
                      <Suspense fallback={<LoadingFallback componentName="Room BTU Calculator" />}>
                        <RoomBtuCalculator />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.SUPPORT && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Support">
                      <Suspense fallback={<LoadingFallback componentName="Support" />}>
                        <SupportTickets supportTickets={userData.supportTickets} />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.FEEDBACK && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Feedback Form">
                      <Suspense fallback={<LoadingFallback componentName="Feedback Form" />}>
                        <FeedbackForm />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.ADMIN && isAdmin && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Admin Dashboard">
                      <Suspense fallback={<LoadingFallback componentName="Admin Dashboard" />}>
                        <AdminDashboard />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.KNOWLEDGE_MGMT && isAdmin && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Knowledge Management">
                      <Suspense fallback={<LoadingFallback componentName="Knowledge Management" />}>
                        <KnowledgeManagement />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
              </Suspense>
            </ErrorBoundary>
          </div>
          

        </div>
      </MobileContainer>

      {/* iOS-style Tab Bar Navigation */}
      <MobileNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        isAdmin={isAdmin}
      />
    </div>
  );
};

// Default export for backward compatibility
/**
 * Main Application Component
 * Handles layout, navigation, and authenticated state for the BoilerBrain application
 * Implements code-splitting and routing for performance and organization
 *
 * @component
 * @returns {React.ReactElement} The main application UI with routing
 */
export function App() {
  return (
    /* Router removed to prevent nested router error - main.jsx already has BrowserRouter */
    <Routes>
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route
        path={ROUTES.HOME}
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}

export default App;
