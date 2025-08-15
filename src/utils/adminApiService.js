/**
 * Admin API Service
 * Provides functions for interacting with admin-specific API endpoints
 * Handles authentication, error handling, and data formatting for admin operations
 */

import { supabase } from '../supabaseClient';
import { getAuthHeaders, getStoredAuthData } from '../services/secureAuthService';
import { setCachedData, getCachedData } from './cacheUtils';
import { API, CACHE, STORAGE_KEYS, DEMO } from './constants';

const ADMIN_CACHE_KEYS = {
  USERS: 'admin_users',
  ANALYTICS: 'admin_analytics',
  USAGE_STATS: 'admin_usage_stats',
  PAYMENT_SUMMARY: 'admin_payment_summary',
  CSRF_TOKEN: 'admin_csrf_token',
};

// CSRF token management
let cachedCSRFToken = null;
let csrfTokenExpiry = null;

/**
 * Get CSRF token for secure API calls
 * @returns {Promise<string>} CSRF token
 */
async function getCSRFToken() {
  try {
    // Check if we have a valid cached token
    if (cachedCSRFToken && csrfTokenExpiry && Date.now() < csrfTokenExpiry) {
      return cachedCSRFToken;
    }

    // Get session ID for CSRF token generation
    const authData = getStoredAuthData();
    const sessionId = authData?.user?.id || 'anonymous';

    // Fetch new CSRF token from server
    const response = await fetch('/api/security/csrf-token', {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        'X-Session-ID': sessionId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get CSRF token: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the token
    cachedCSRFToken = data.csrfToken;
    csrfTokenExpiry = Date.now() + (data.expiresIn || 3600000); // Default 1 hour

    return cachedCSRFToken;
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    return null;
  }
}

/**
 * Check if demo mode is active
 * @returns {boolean} - True if demo mode is active
 */
function isDemoMode() {
  try {
    // Check secure auth data instead of localStorage flags
    const authData = getStoredAuthData();
    return authData?.user?.isDemoUser === true;
  } catch (error) {
    console.warn('Error checking demo mode:', error);
    return false;
  }
}

/**
 * Generate mock user data for demo mode
 * @param {number} count - Number of users to generate
 * @returns {Array} - Array of mock user objects
 */
function generateMockUsers(count = 50) {
  const users = [];
  const tiers = ['free', 'basic', 'pro', 'enterprise'];
  const startDate = new Date(2023, 0, 1).getTime();
  const endDate = new Date().getTime();

  for (let i = 0; i < count; i++) {
    const createdAt = new Date(startDate + Math.random() * (endDate - startDate));
    const lastLogin = new Date(
      createdAt.getTime() + Math.random() * (endDate - createdAt.getTime())
    );

    users.push({
      id: `mock-${i}`,
      email: `user${i}@example.com`,
      name: `Test User ${i}`,
      tier: tiers[Math.floor(Math.random() * tiers.length)],
      created_at: createdAt.toISOString(),
      active: Math.random() > 0.2,
      last_login: lastLogin.toISOString(),
    });
  }

  return users;
}

/**
 * Fetch all users with pagination
 * @param {number} page - The page number (1-indexed)
 * @param {number} pageSize - Number of records per page
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - 'asc' or 'desc'
 * @param {string} searchQuery - Optional search term to filter users
 * @returns {Promise<Object>} - Users data with pagination info
 */
export async function fetchUsers(
  page = 1,
  pageSize = 20,
  sortBy = 'created_at',
  sortOrder = 'desc',
  searchQuery = ''
) {
  try {
    // Check if we're in demo mode
    if (isDemoMode()) {
      if (import.meta.env.DEV) {
      }

      // Generate mock data for demo mode
      let mockUsers = generateMockUsers();

      // Apply search filter if provided
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        mockUsers = mockUsers.filter(
          user =>
            user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
        );
      }

      // Sort the data
      mockUsers.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];

        if (sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });

      // Apply pagination
      const total = mockUsers.length;
      const from = (page - 1) * pageSize;
      const to = Math.min(from + pageSize, total);
      const paginatedUsers = mockUsers.slice(from, to);

      return {
        users: paginatedUsers,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }

    // Use secure backend API endpoint instead of direct Supabase calls
    const queryParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      sortBy,
      sortOrder,
      ...(searchQuery && { search: searchQuery })
    });

    const response = await fetch(`/api/admin/users?${queryParams}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      users: result.users || [],
      pagination: result.pagination || {
        total: 0,
        page,
        pageSize,
        totalPages: 0
      }
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

/**
 * Generate mock analytics data for demo mode
 * @returns {Object} - Mock analytics data
 */
function generateMockAnalytics() {
  const now = new Date();
  const currentMonth = now.toLocaleString('default', { month: 'short' });
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString(
    'default',
    { month: 'short' }
  );

  return {
    userStats: {
      total: 2475,
      active: 1843,
      newToday: 14,
      growthRate: 8.2,
    },
    revenueStats: {
      monthly: 18650,
      annually: 223800,
      growth: 12.4,
      averageRevenue: 75.2,
    },
    userTiers: {
      free: 1350,
      basic: 740,
      pro: 320,
      enterprise: 65,
    },
    monthlyTrends: {
      users: [
        { month: previousMonth, count: 2380 },
        { month: currentMonth, count: 2475 },
      ],
      revenue: [
        { month: previousMonth, amount: 17400 },
        { month: currentMonth, amount: 18650 },
      ],
      engagement: [
        { month: previousMonth, score: 83 },
        { month: currentMonth, score: 87 },
      ],
    },
    sessionStats: {
      averageDuration: 840, // in seconds
      totalSessions: 8720,
      bounceRate: 23.5,
      peak: '14:00-16:00',
    },
    feedbackStats: {
      positive: 85.3,
      negative: 14.7,
      responseRate: 78.1,
    },
  };
}

/**
 * Get analytics data for the admin dashboard
 * @returns {Promise<Object>} - Analytics data
 */
export async function fetchAdminAnalytics() {
  try {
    // Check if we're in demo mode
    if (isDemoMode()) {
      if (import.meta.env.DEV) {
      }
      const mockData = generateMockAnalytics();

      // Store in cache for consistency
      setCachedData(ADMIN_CACHE_KEYS.ANALYTICS, mockData, CACHE.TTL.ANALYTICS);

      return mockData;
    }

    // Check cache first if not in demo mode
    const cachedData = getCachedData(ADMIN_CACHE_KEYS.ANALYTICS);
    if (cachedData) return cachedData;

    // Use secure backend API endpoint instead of direct Supabase calls
    const response = await fetch('/api/admin/analytics', {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const analytics = await response.json();
    
    // Cache the data
    setCachedData(ADMIN_CACHE_KEYS.ANALYTICS, analytics, 15 * 60 * 1000); // 15 minutes

    return analytics;
  } catch (error) {
    console.error('Error fetching admin analytics:', error);

    // Return backup demo data in case of error
    return {
      totalUsers: 156,
      activeUsers: 129,
      revenueThisMonth: 780,
      averageSessionTime: '12m 42s',
      chatQueriesPerDay: 428,
      isDemo: true,
    };
  }
}

/**
 * Format session time in seconds to human-readable format
 * @param {number} timeInSeconds - Time in seconds
 * @returns {string} - Formatted time string
 */
function formatSessionTime(timeInSeconds) {
  if (timeInSeconds < 60) {
    return `${timeInSeconds}s`;
  }

  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Update user information (admin only) with CSRF protection
 * @param {string} userId - User ID to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated user data
 */
export async function updateUser(userId, updates) {
  try {
    // Get CSRF token for secure operation
    const csrfToken = await getCSRFToken();
    if (!csrfToken) {
      throw new Error('Failed to get CSRF token for secure operation');
    }

    // Get session ID for CSRF validation
    const authData = getStoredAuthData();
    const sessionId = authData?.user?.id;

    if (!sessionId) {
      throw new Error('Authentication required');
    }

    // Make secure API call with CSRF protection
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'X-CSRF-Token': csrfToken,
        'X-Session-ID': sessionId
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.user;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Delete user (admin only) with CSRF protection
 * @param {string} userId - User ID to delete
 * @returns {Promise<Object>} - Deletion result
 */
export async function deleteUser(userId) {
  try {
    // Get CSRF token for secure operation
    const csrfToken = await getCSRFToken();
    if (!csrfToken) {
      throw new Error('Failed to get CSRF token for secure operation');
    }

    // Get session ID for CSRF validation
    const authData = getStoredAuthData();
    const sessionId = authData?.user?.id;

    if (!sessionId) {
      throw new Error('Authentication required');
    }

    // Make secure API call with CSRF protection
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        'X-CSRF-Token': csrfToken,
        'X-Session-ID': sessionId
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Get admin audit log
 * @param {number} page - Page number
 * @param {number} pageSize - Items per page
 * @returns {Promise<Object>} - Audit log data
 */
export async function getAuditLog(page = 1, pageSize = 20) {
  try {
    const response = await fetch(`/api/admin/audit-log?page=${page}&pageSize=${pageSize}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching audit log:', error);
    throw error;
  }
}

/**
 * Get system settings
 * @returns {Promise<Object>} - System settings
 */
export async function getSystemSettings() {
  try {
    // Authentication check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    const { data, error } = await supabase.from('system_settings').select('*').single();

    if (error) {
      // If no settings exist yet, return defaults
      if (error.code === 'PGRST116') {
        return {
          maintenance_mode: false,
          application_name: 'BoilerBrain',
          support_email: 'support@boilerbrain.com',
          max_file_size_mb: 10,
          allow_registration: true,
        };
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching system settings:', error);

    // Return fallback settings in case of error
    return {
      maintenance_mode: false,
      application_name: 'BoilerBrain',
      support_email: 'support@boilerbrain.com',
      max_file_size_mb: 10,
      allow_registration: true,
      isDemo: true,
    };
  }
}

/**
 * Update system settings
 * @param {Object} settings - System settings to update
 * @returns {Promise<Object>} - Updated settings
 */
export async function updateSystemSettings(settings) {
  try {
    // Authentication check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');

    // In a real app, verify admin permissions here

    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        id: 1, // Use fixed ID for singleton settings record
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating system settings:', error);
    throw error;
  }
}

export default {
  fetchUsers,
  fetchAdminAnalytics,
  updateUser,
  deleteUser,
  getAuditLog,
  getSystemSettings,
  updateSystemSettings,
  getCSRFToken,
};
