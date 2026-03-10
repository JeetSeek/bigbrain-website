import React, { useEffect, useState, useCallback, useMemo, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useAuth } from './contexts/AuthContext';
import { TAB_IDS, TAB_PATHS, PATH_TO_TAB, STORAGE_KEYS, ROUTES, DEMO } from './utils/constants';
import './styles/chat-professional.css';
import './styles/ui-enhancements.css';
import './styles/professional-ui.css';

// Mobile-first iOS components
import MobileNavigation, { MobileHeader, MobileContainer } from './components/MobileNavigation';
import ErrorBoundary from './components/ErrorBoundary';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Import pages
import Login from './pages/Login';

// Code-split ALL tab components — only active tab loads its JS
const Sidebar = lazy(() => import('./components/Sidebar'));
const MainContent = lazy(() => import('./components/MainContent'));
const ManualFinderStandalone = lazy(() => import('./components/ManualFinderStandalone'));
const ChatDock = lazy(() => import('./components/ChatDock'));
const GasRateCalculator = lazy(() => import('./components/tools/gas-rate/GasRateCalculator'));
const RoomBtuCalculator = lazy(() => import('./components/tools/room-btu/RoomBtuCalculator'));
const GasPipeSizing = lazy(() => import('./components/tools/gas-pipe/GasPipeSizing'));
const GasMeterDiversity = lazy(() => import('./components/tools/gas-diversity/GasMeterDiversity'));
const CP12Form = lazy(() => import('./components/tools/forms/CP12Form'));
const WarningNotice = lazy(() => import('./components/tools/forms/WarningNotice'));
const ToolsPage = lazy(() => import('./components/ToolsPage'));
const HomePage = lazy(() => import('./components/HomePage'));
const FaultCodeLookup = lazy(() => import('./components/tools/fault-codes/FaultCodeLookup'));
const VentilationCalculator = lazy(() => import('./components/tools/ventilation/VentilationCalculator'));
const PurgeCalculator = lazy(() => import('./components/tools/purge/PurgeCalculator'));
const ManufacturerHelplines = lazy(() => import('./components/tools/helplines/ManufacturerHelplines'));
const PartsFinder = lazy(() => import('./components/tools/parts/PartsFinder'));
const FlueGasAnalyser = lazy(() => import('./components/tools/flue-gas/FlueGasAnalyser'));
const GasServiceRecord = lazy(() => import('./components/tools/forms/GasServiceRecord'));
const GasBreakdownRecord = lazy(() => import('./components/tools/forms/GasBreakdownRecord'));
const InstallationChecklist = lazy(() => import('./components/tools/forms/InstallationChecklist'));
const RadiatorSizing = lazy(() => import('./components/tools/radiator/RadiatorSizing'));
const PressureConverter = lazy(() => import('./components/tools/pressure/PressureConverter'));
const SystemVolumeCalculator = lazy(() => import('./components/tools/system-volume/SystemVolumeCalculator'));
const BenchmarkChecklist = lazy(() => import('./components/tools/forms/BenchmarkChecklist'));
const SupportTickets = lazy(() => import('./components/SupportTickets'));
const FeedbackForm = lazy(() => import('./components/FeedbackForm'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const KnowledgeManagement = lazy(() => import('./components/KnowledgeManagement'));

/**
 * Loading fallback component shown during lazy-loaded component loading
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.componentName='Component'] - Name of the component being loaded
 * @returns {React.ReactElement} Loading spinner with component name
 */
const LoadingFallback = ({ componentName = 'Component' }) => {
  // Skeleton loading based on content type
  const isChat = /chat/i.test(componentName);
  const isManual = /manual|finder/i.test(componentName);
  const isTool = /calculator|sizing|form|record|checklist|purge|ventilation|flue|diversity/i.test(componentName);

  if (isChat) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="flex justify-start"><div className="bg-gray-200 rounded-2xl h-12 w-3/4" /></div>
        <div className="flex justify-end"><div className="bg-blue-100 rounded-2xl h-10 w-1/2" /></div>
        <div className="flex justify-start"><div className="bg-gray-200 rounded-2xl h-16 w-4/5" /></div>
      </div>
    );
  }
  if (isManual) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="bg-gray-200 rounded-lg h-10 w-full" />
        <div className="bg-gray-200 rounded-lg h-10 w-full" />
        {[1,2,3].map(i => (
          <div key={i} className="p-4 border border-gray-100 rounded-xl space-y-2">
            <div className="bg-gray-200 rounded h-5 w-3/5" />
            <div className="bg-gray-200 rounded h-4 w-2/5" />
            <div className="flex gap-3 mt-3">
              <div className="bg-gray-200 rounded-lg h-10 flex-1" />
              <div className="bg-gray-200 rounded-lg h-10 flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (isTool) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="bg-gray-200 rounded h-6 w-1/2" />
        <div className="bg-gray-200 rounded-lg h-11 w-full" />
        <div className="bg-gray-200 rounded-lg h-11 w-full" />
        <div className="bg-gray-200 rounded-lg h-11 w-full" />
        <div className="bg-gray-200 rounded-lg h-11 w-2/5 mt-2" />
      </div>
    );
  }

  // Default fallback with spinner
  return (
    <div className="loading-container-enhanced">
      <div className="ios-spinner">
        <svg viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="none" stroke="var(--ios-blue)" strokeWidth="4"
            strokeDasharray="31.4 31.4" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>
      <p className="loading-text">{componentName}</p>
    </div>
  );
};

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
  const location = useLocation();
  const navigate = useNavigate();
  const { user: authUser, isAdmin, signOut: supabaseSignOut } = useAuth();

  // Derive initial tab from URL path
  const getTabFromPath = useCallback((pathname) => {
    return PATH_TO_TAB[pathname] || TAB_IDS.HOME;
  }, []);

  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));

  // Sync URL → tab when browser back/forward is used
  useEffect(() => {
    const tabFromUrl = getTabFromPath(location.pathname);
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location.pathname, getTabFromPath]);

  // Wrap setActiveTab to also update URL
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    const path = TAB_PATHS[tabId] || '/';
    if (location.pathname !== path) {
      navigate(path, { replace: false });
    }
  }, [navigate, location.pathname]);

  // Demo data for testing - memoized to prevent child re-renders
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

  // Get current tab title for header - memoized
  const tabTitle = useMemo(() => {
    const titles = {
      [TAB_IDS.HOME]: 'BoilerBrain',
      [TAB_IDS.MANUAL_FINDER]: 'Boiler Manuals',
      [TAB_IDS.CHAT]: 'Fault Finder Chat',
      [TAB_IDS.GAS_RATE]: 'Gas Rate Calculator',
      [TAB_IDS.ROOM_BTU]: 'BTU Calculator',
      [TAB_IDS.GAS_PIPE]: 'Gas Pipe Sizing',
      [TAB_IDS.GAS_DIVERSITY]: 'Meter Diversity',
      [TAB_IDS.CP12_FORM]: 'CP12 Gas Safety',
      [TAB_IDS.TOOLS]: 'Engineering Tools',
      [TAB_IDS.SUPPORT]: 'Support',
      [TAB_IDS.FEEDBACK]: 'Feedback',
      [TAB_IDS.ADMIN]: 'Admin Dashboard',
      [TAB_IDS.KNOWLEDGE_MGMT]: 'Knowledge Management',
      [TAB_IDS.FAULT_CODES]: 'Fault Code Lookup',
      [TAB_IDS.VENTILATION]: 'Ventilation Calculator',
      [TAB_IDS.PURGE_CALC]: 'Purge & Tightness',
      [TAB_IDS.HELPLINES]: 'Tech Helplines',
      [TAB_IDS.PARTS_FINDER]: 'Parts Finder',
      [TAB_IDS.FLUE_GAS]: 'Flue Gas Analyser',
      [TAB_IDS.GAS_SERVICE]: 'Service Record',
      [TAB_IDS.GAS_BREAKDOWN]: 'Breakdown Record',
      [TAB_IDS.INSTALLATION]: 'Installation Record',
      [TAB_IDS.WARNING_NOTICE]: 'Warning Notice',
      [TAB_IDS.RADIATOR_SIZING]: 'Radiator Sizing',
      [TAB_IDS.PRESSURE_CONVERTER]: 'Pressure Converter',
      [TAB_IDS.SYSTEM_VOLUME]: 'System Volume',
      [TAB_IDS.BENCHMARK]: 'Benchmark Checklist'
    };
    return titles[activeTab] || 'BoilerBrain';
  }, [activeTab]);

  // Memoize support tickets to prevent child re-renders
  const supportTickets = useMemo(() => userData.supportTickets, [userData.supportTickets]);

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ backgroundColor: 'var(--ios-bg-grouped-primary)' }}>
      {/* iOS-style Mobile Header */}
      <MobileHeader 
        title={tabTitle}
        leftAction={
          <div className="flex items-center gap-2">
            <img src="/brain-icon-nBG.png" alt="BoilerBrain" className="w-7 h-7" />
            <span className="text-[15px] font-bold tracking-tight" style={{ color: '#007AFF', letterSpacing: '-0.3px' }}>BoilerBrain</span>
          </div>
        }
        rightAction={
          <div className="flex items-center gap-1">
            <PWAInstallPrompt />
            <button
              className="flex items-center justify-center px-3 py-1.5 
                         text-[13px] font-medium text-[#007AFF]
                         hover:bg-[#007AFF]/10 active:scale-[0.96]
                         rounded-lg transition-all duration-150"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Text, sans-serif' }}
              onClick={async () => {
                await supabaseSignOut();
                localStorage.removeItem(STORAGE_KEYS.DEMO_USER_LOGGED_IN);
                window.location.reload();
              }}
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </div>
        }
      />

      {/* Chat Tab - Rendered OUTSIDE MobileContainer for proper keyboard handling */}
      {activeTab === TAB_IDS.CHAT && (
        <div 
          className="chat-fullscreen-container flex flex-col"
          style={{
            position: 'absolute',
            /* Start from top - ChatDock has its own header with safe area */
            top: 0,
            /* Bottom touches tab bar exactly */
            bottom: 'calc(49px + env(safe-area-inset-bottom, 0px))',
            left: 0,
            right: 0,
            overflow: 'hidden',
            zIndex: 10
          }}
        >
          <ErrorBoundary componentName="Chat Interface">
            <Suspense fallback={<LoadingFallback componentName="Chat Interface" />}>
              <ChatDock embedMode={true} className="h-full w-full" />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {/* Main Content Container - For NON-Chat tabs */}
      {activeTab !== TAB_IDS.CHAT && (
        <MobileContainer hasTabBar={true} hasHeader={true}>
          <div className="h-full flex flex-col">
            {/* Main Content Area - iOS Style */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <ErrorBoundary componentName="Main Content Area">
                <Suspense fallback={<LoadingFallback componentName="Main Content Area" />}>
                  {/* Content based on active tab */}
                  {activeTab === TAB_IDS.HOME && (
                    <div className="ios-content-card" style={{overflow: 'visible'}}>
                      <HomePage onNavigate={handleTabChange} />
                    </div>
                  )}
                
                  {activeTab === TAB_IDS.MANUAL_FINDER && (
                    <div className="ios-content-card" style={{overflow: 'visible'}}>
                      <ManualFinderStandalone />
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
                
                {activeTab === TAB_IDS.GAS_PIPE && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Gas Pipe Sizing">
                      <Suspense fallback={<LoadingFallback componentName="Gas Pipe Sizing" />}>
                        <GasPipeSizing />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.GAS_DIVERSITY && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Meter Diversity">
                      <Suspense fallback={<LoadingFallback componentName="Meter Diversity" />}>
                        <GasMeterDiversity />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.CP12_FORM && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="CP12 Form">
                      <Suspense fallback={<LoadingFallback componentName="CP12 Form" />}>
                        <CP12Form />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                
                {activeTab === TAB_IDS.FAULT_CODES && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Fault Code Lookup">
                      <Suspense fallback={<LoadingFallback componentName="Fault Code Lookup" />}>
                        <FaultCodeLookup />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.VENTILATION && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Ventilation Calculator">
                      <Suspense fallback={<LoadingFallback componentName="Ventilation Calculator" />}>
                        <VentilationCalculator />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.PURGE_CALC && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Purge Calculator">
                      <Suspense fallback={<LoadingFallback componentName="Purge Calculator" />}>
                        <PurgeCalculator />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.HELPLINES && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Tech Helplines">
                      <Suspense fallback={<LoadingFallback componentName="Tech Helplines" />}>
                        <ManufacturerHelplines />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.PARTS_FINDER && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Parts Finder">
                      <Suspense fallback={<LoadingFallback componentName="Parts Finder" />}>
                        <PartsFinder />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.FLUE_GAS && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Flue Gas Analyser">
                      <Suspense fallback={<LoadingFallback componentName="Flue Gas Analyser" />}>
                        <FlueGasAnalyser />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.GAS_SERVICE && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Gas Service Record">
                      <Suspense fallback={<LoadingFallback componentName="Gas Service Record" />}>
                        <GasServiceRecord />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.GAS_BREAKDOWN && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Gas Breakdown Record">
                      <Suspense fallback={<LoadingFallback componentName="Gas Breakdown Record" />}>
                        <GasBreakdownRecord />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.INSTALLATION && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Installation Checklist">
                      <Suspense fallback={<LoadingFallback componentName="Installation Checklist" />}>
                        <InstallationChecklist />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.WARNING_NOTICE && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Warning Notice">
                      <Suspense fallback={<LoadingFallback componentName="Warning Notice" />}>
                        <WarningNotice />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.RADIATOR_SIZING && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Radiator Sizing">
                      <Suspense fallback={<LoadingFallback componentName="Radiator Sizing" />}>
                        <RadiatorSizing />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.PRESSURE_CONVERTER && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Pressure Converter">
                      <Suspense fallback={<LoadingFallback componentName="Pressure Converter" />}>
                        <PressureConverter />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.SYSTEM_VOLUME && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="System Volume Calculator">
                      <Suspense fallback={<LoadingFallback componentName="System Volume Calculator" />}>
                        <SystemVolumeCalculator />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.BENCHMARK && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Benchmark Checklist">
                      <Suspense fallback={<LoadingFallback componentName="Benchmark Checklist" />}>
                        <BenchmarkChecklist />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.TOOLS && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Tools">
                      <Suspense fallback={<LoadingFallback componentName="Tools" />}>
                        <ToolsPage onNavigate={handleTabChange} />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )}
                
                {activeTab === TAB_IDS.SUPPORT && (
                  <div className="ios-content-card">
                    <ErrorBoundary componentName="Support">
                      <Suspense fallback={<LoadingFallback componentName="Support" />}>
                        <SupportTickets supportTickets={supportTickets} />
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
      )}

      {/* iOS-style Tab Bar Navigation */}
      <MobileNavigation 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
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
  // Proper authentication flow - check if in demo mode via environment variable
  if (import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === 'true') {
    console.warn('⚠️ Running in DEMO MODE - authentication bypassed');
    return <Dashboard />;
  }

  // Router is already provided by main.jsx, just return Routes
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
