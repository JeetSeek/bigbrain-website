import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ErrorBoundary from './ErrorBoundary';
import { UI, DEMO, STORAGE_KEYS } from '../utils/constants';
import * as adminApi from '../utils/adminApiService';
import { useAuth } from '../contexts/AuthContext';
import { isUserAdmin, getAuthHeaders } from '../services/authUtils';

/**
 * Admin Dashboard Component
 * Provides administration interface for user management, analytics, and system configuration
 *
 * @component
 * @returns {React.ReactElement} The admin dashboard interface
 */
export function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('users');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if the current user has admin permissions
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        setIsLoading(true);

        // Use secure authentication service to check admin status
        const authData = getStoredAuthData();
        
        if (!authData) {
          console.warn('No authentication data found');
          setIsAdmin(false);
          setErrorMessage('Authentication required. Please log in.');
          return;
        }

        // Check if token is still valid
        if (authData.session.expires_at && Date.now() > authData.session.expires_at) {
          console.warn('Authentication token expired');
          setIsAdmin(false);
          setErrorMessage('Session expired. Please log in again.');
          return;
        }

        // Check if user has admin role
        const hasAdminRole = isCurrentUserAdmin();
        
        if (hasAdminRole) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          setErrorMessage('Admin access required. Current user does not have admin privileges.');
        }

      } catch (error) {
        console.error('Error checking admin status:', error);
        setErrorMessage('Failed to verify admin permissions');
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAdminStatus();
  }, []);

  // User data state with pagination
  const [users, setUsers] = useState([]);
  const [usersPagination, setUsersPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [sortConfig, setSortConfig] = useState({ field: 'created_at', order: 'desc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Analytics data state
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    revenueThisMonth: 0,
    averageSessionTime: '0s',
    chatQueriesPerDay: 0,
    isDemo: false,
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Fetch users data
  const fetchUsersData = async (page = usersPagination.page) => {
    try {
      setLoadingUsers(true);
      const result = await adminApi.fetchUsers(
        page,
        usersPagination.pageSize,
        sortConfig.field,
        sortConfig.order,
        searchQuery
      );

      setUsers(result.users);
      setUsersPagination(result.pagination);
    } catch (error) {
      console.error('Error loading users:', error);
      setErrorMessage('Failed to load user data');

      // Fallback to demo data if API fails
      setUsers([
        {
          id: 1,
          name: 'John Smith',
          email: 'john@example.com',
          tier: 'Premium',
          created_at: '2023-02-15',
          active: true,
        },
        {
          id: 2,
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          tier: 'Basic',
          created_at: '2023-04-20',
          active: true,
        },
        {
          id: 3,
          name: 'Robert Williams',
          email: 'robert@example.com',
          tier: 'Premium',
          created_at: '2023-01-10',
          active: false,
        },
        {
          id: 4,
          name: 'Emily Davis',
          email: 'emily@example.com',
          tier: 'Trial',
          created_at: '2023-05-05',
          active: true,
        },
        {
          id: 5,
          name: 'Michael Brown',
          email: 'michael@example.com',
          tier: 'Basic',
          created_at: '2023-03-30',
          active: true,
        },
      ]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setLoadingAnalytics(true);
      const analyticsData = await adminApi.fetchAdminAnalytics();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Fallback data is already handled in the API service
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Load data when admin dashboard is displayed and admin status is verified
  useEffect(() => {
    if (isAdmin && !isLoading) {
      fetchUsersData();
      fetchAnalyticsData();
    }
  }, [isAdmin, isLoading]);

  // Reload data when active section changes
  useEffect(() => {
    if (isAdmin && !isLoading) {
      if (activeSection === 'users') {
        fetchUsersData();
      } else if (activeSection === 'analytics') {
        fetchAnalyticsData();
      }
    }
  }, [activeSection]);

  // Handle page change
  const handlePageChange = newPage => {
    fetchUsersData(newPage);
  };

  // Handle sort change
  const handleSortChange = field => {
    const newOrder = field === sortConfig.field && sortConfig.order === 'asc' ? 'desc' : 'asc';
    setSortConfig({ field, order: newOrder });
    fetchUsersData(usersPagination.page);
  };

  // Handle search
  const handleSearch = e => {
    setSearchQuery(e.target.value);
    // Debounce this in production code
    fetchUsersData(1); // Reset to first page on new search
  };

  /**
   * Renders the Users Management section
   * @returns {React.ReactElement}
   */
  const renderUsersSection = () => {
    return (
      <div>
        <h2 className="text-xl font-medium mb-4">User Management</h2>

        {/* Search and filters */}
        <div className="mb-4 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full bg-gray-800 border border-gray-700 px-4 py-2 rounded-lg text-gray-200 focus:outline-none focus:border-blue-500"
            />
            <span className="absolute right-3 top-2.5 text-gray-500">🔍</span>
          </div>

          <div className="text-sm text-gray-400">
            {analytics.isDemo ? 'Demo data' : `Showing ${usersPagination.total} total users`}
          </div>
        </div>

        {/* Users table */}
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                >
                  Tier
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                >
                  Joined
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-700">
              {loadingUsers ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                      <p>Loading user data...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {user.name || 'Unnamed User'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${user.tier === 'Premium' ? 'bg-blue-800/30 text-blue-400' : user.tier === 'Basic' ? 'bg-green-800/30 text-green-400' : 'bg-gray-800/30 text-gray-400'}`}
                      >
                        {user.tier || 'Free'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${user.active ? 'bg-green-800/30 text-green-400' : 'bg-red-800/30 text-red-400'}`}
                      >
                        {user.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-blue-400 hover:text-blue-300 mx-1">Edit</button>
                      <button className="text-red-400 hover:text-red-300 mx-1">
                        {user.active ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {usersPagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <div className="text-gray-400">
              Page {usersPagination.page} of {usersPagination.totalPages}
            </div>

            <div className="flex space-x-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={usersPagination.page === 1}
                className={`px-3 py-1 rounded ${usersPagination.page === 1 ? 'text-gray-600 cursor-not-allowed' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                «
              </button>

              <button
                onClick={() => handlePageChange(usersPagination.page - 1)}
                disabled={usersPagination.page === 1}
                className={`px-3 py-1 rounded ${usersPagination.page === 1 ? 'text-gray-600 cursor-not-allowed' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                ‹
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, usersPagination.totalPages) }, (_, i) => {
                // Show pages around current page
                let pageNum;
                if (usersPagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (usersPagination.page <= 3) {
                  pageNum = i + 1;
                } else if (usersPagination.page >= usersPagination.totalPages - 2) {
                  pageNum = usersPagination.totalPages - 4 + i;
                } else {
                  pageNum = usersPagination.page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 rounded ${usersPagination.page === pageNum ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(usersPagination.page + 1)}
                disabled={usersPagination.page === usersPagination.totalPages}
                className={`px-3 py-1 rounded ${usersPagination.page === usersPagination.totalPages ? 'text-gray-600 cursor-not-allowed' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                ›
              </button>

              <button
                onClick={() => handlePageChange(usersPagination.totalPages)}
                disabled={usersPagination.page === usersPagination.totalPages}
                className={`px-3 py-1 rounded ${usersPagination.page === usersPagination.totalPages ? 'text-gray-600 cursor-not-allowed' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Renders the Analytics section
   * @returns {React.ReactElement}
   */
  const renderAnalyticsSection = () => (
    <div>
      <h2 className="text-xl font-medium mb-4">Analytics Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Total Users</div>
          <div className="text-2xl font-bold">{analytics.totalUsers}</div>
          <div className="text-xs text-green-400 mt-2">↑ 12% this month</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Active Users</div>
          <div className="text-2xl font-bold">{analytics.activeUsers}</div>
          <div className="text-xs text-green-400 mt-2">↑ 5% this month</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Revenue</div>
          <div className="text-2xl font-bold">£{analytics.revenueThisMonth}</div>
          <div className="text-xs text-green-400 mt-2">↑ 8% this month</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-sm text-gray-400 mb-1">Avg. Session Time</div>
          <div className="text-2xl font-bold">{analytics.averageSessionTime}</div>
          <div className="text-xs text-green-400 mt-2">↑ 3% this month</div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
        <h3 className="text-lg font-medium mb-4">User Growth</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Chart visualization will be implemented here</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-medium mb-4">Revenue Breakdown</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Chart visualization will be implemented here</p>
        </div>
      </div>
    </div>
  );

  /**
   * Renders the Settings section
   * @returns {React.ReactElement}
   */
  const renderSettingsSection = () => (
    <div>
      <h2 className="text-xl font-medium mb-4">System Settings</h2>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
        <h3 className="text-lg font-medium mb-4">Application Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Application Name</label>
            <input
              type="text"
              defaultValue="BoilerBrain"
              className="w-full px-3 py-2 bg-gray-900 rounded-md border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Support Email</label>
            <input
              type="email"
              defaultValue="support@boilerbrain.com"
              className="w-full px-3 py-2 bg-gray-900 rounded-md border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="maintenanceMode"
              className="h-4 w-4 text-blue-600 rounded border-gray-700 focus:ring-blue-500"
            />
            <label htmlFor="maintenanceMode" className="ml-2 text-sm text-gray-300">
              Enable Maintenance Mode
            </label>
          </div>
        </div>

        <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500">
          Save Settings
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-medium mb-4">Database Management</h3>

        <div className="mb-4">
          <h4 className="text-md font-medium mb-2 text-gray-300">Backup Database</h4>
          <p className="text-sm text-gray-400 mb-3">
            Create a manual backup of the entire database
          </p>
          <button className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600">
            Create Backup
          </button>
        </div>

        <div>
          <h4 className="text-md font-medium mb-2 text-gray-300">Restore Database</h4>
          <p className="text-sm text-gray-400 mb-3">Restore from a previous backup point</p>
          <div className="flex items-center gap-2">
            <select className="px-3 py-2 bg-gray-900 rounded-md border border-gray-700">
              <option>Backup - 2025-06-15 13:45:22</option>
              <option>Backup - 2025-06-14 08:30:11</option>
              <option>Backup - 2025-06-10 19:22:45</option>
            </select>
            <button className="px-4 py-2 bg-amber-700 text-white rounded-md hover:bg-amber-600">
              Restore
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Access denied component for non-admin users
  const AccessDenied = () => (
    <div className="admin-dashboard">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1">Admin Dashboard</h1>
        <p className="text-gray-400">Administrative access required</p>
      </header>

      <div className="bg-red-900/30 border border-red-700 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-medium text-white mb-2">Access Denied</h2>
        <p className="text-gray-300 mb-6">
          You do not have permission to access the admin dashboard.
        </p>
        <p className="text-gray-400 text-sm">
          Please contact an administrator if you believe this is an error.
        </p>
      </div>
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="admin-dashboard">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-white mb-1">Admin Dashboard</h1>
          <p className="text-gray-400">Loading admin panel...</p>
        </header>

        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-300">Verifying administrative access...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (errorMessage) {
    return (
      <div className="admin-dashboard">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-white mb-1">Admin Dashboard</h1>
          <p className="text-gray-400">Error loading admin panel</p>
        </header>

        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
          <h2 className="text-xl font-medium text-white mb-2">Error</h2>
          <p className="text-gray-300">{errorMessage}</p>
        </div>
      </div>
    );
  }

  // Access denied for non-admin users
  if (!isAdmin) {
    return <AccessDenied />;
  }

  // Main admin dashboard for authenticated admin users
  return (
    <div className="admin-dashboard">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1">Admin Dashboard</h1>
        <p className="text-gray-400">Manage users, view analytics, and configure system settings</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 shrink-0">
          <nav className="bg-gray-800 rounded-lg py-2 border border-gray-700">
            <ul>
              <li>
                <button
                  onClick={() => setActiveSection('users')}
                  className={`w-full text-left px-4 py-2 ${activeSection === 'users' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  User Management
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('analytics')}
                  className={`w-full text-left px-4 py-2 ${activeSection === 'analytics' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  Analytics
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveSection('settings')}
                  className={`w-full text-left px-4 py-2 ${activeSection === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  System Settings
                </button>
              </li>
            </ul>
          </nav>

          <div className="mt-6 bg-yellow-800/30 text-yellow-200 p-4 rounded-lg border border-yellow-700 text-sm">
            <h4 className="font-medium mb-1">Admin Access</h4>
            <p>Remember that changes made here affect all users. Use caution.</p>
          </div>
        </div>

        <main className="flex-1">
          <ErrorBoundary componentName="Admin Content">
            <div className="bg-gray-900 rounded-lg border border-gray-700 p-6">
              {activeSection === 'users' && renderUsersSection()}
              {activeSection === 'analytics' && renderAnalyticsSection()}
              {activeSection === 'settings' && renderSettingsSection()}
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
