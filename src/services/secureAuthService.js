/**
 * Production Authentication Utilities
 * Provides authentication utilities for production Supabase integration
 * This file is deprecated - use AuthContext for all authentication operations
 */

import { supabase } from '../supabaseClient';

/**
 * @deprecated Use AuthContext.signIn() instead
 * This function is deprecated and should not be used in production
 */
export async function secureLogin(email, password) {
  throw new Error('secureLogin is deprecated. Use AuthContext.signIn() instead.');
}

/**
 * @deprecated Use AuthContext.signOut() instead
 */
export async function secureLogout() {
  throw new Error('secureLogout is deprecated. Use AuthContext.signOut() instead.');
}

/**
 * @deprecated Authentication data is now managed by AuthContext
 */
export function storeAuthData(authData) {
  console.warn('storeAuthData is deprecated. Authentication state is managed by AuthContext.');
  try {
    if (authData.session) {
      localStorage.setItem('bb_auth_token', authData.session.access_token);
      localStorage.setItem('bb_refresh_token', authData.session.refresh_token);
      localStorage.setItem('bb_session_expires', authData.session.expires_at.toString());
    }
    
    if (authData.user) {
      localStorage.setItem('bb_user_data', JSON.stringify(authData.user));
    }
  } catch (error) {
    console.error('Error storing auth data:', error);
  }
}

/**
 * Get stored authentication data
 * @returns {Object|null} Stored auth data or null
 */
export function getStoredAuthData() {
  try {
    const token = localStorage.getItem('bb_auth_token');
    const refreshToken = localStorage.getItem('bb_refresh_token');
    const expiresAt = localStorage.getItem('bb_session_expires');
    const userData = localStorage.getItem('bb_user_data');

    if (!token || !userData) {
      return null;
    }

    // Check if token is expired
    const expires = parseInt(expiresAt);
    if (expires && Date.now() > expires) {
      // Token expired, clear storage
      clearStoredAuthData();
      return null;
    }

    return {
      user: JSON.parse(userData),
      session: {
        access_token: token,
        refresh_token: refreshToken,
        expires_at: expires
      }
    };
  } catch (error) {
    console.error('Error getting stored auth data:', error);
    return null;
  }
}

/**
 * Clear stored authentication data
 */
export function clearStoredAuthData() {
  try {
    localStorage.removeItem('bb_auth_token');
    localStorage.removeItem('bb_refresh_token');
    localStorage.removeItem('bb_user_data');
    localStorage.removeItem('bb_session_expires');
    
    // Clear legacy demo flags
    localStorage.removeItem('bb_demo_user_logged_in');
    localStorage.removeItem('bb_admin_user_logged_in');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
}

/**
 * Check if user is currently authenticated
 * @returns {boolean} True if user is authenticated with valid session
 */
export function isAuthenticated() {
  try {
    const authData = getStoredAuthData();
    return authData !== null && authData.user && authData.session;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
}

/**
 * Check if current user is admin
 * @returns {boolean} True if user has admin role
 */
export function isCurrentUserAdmin() {
  try {
    const authData = getStoredAuthData();
    return authData?.user?.role === 'admin' || authData?.user?.isAdminUser === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get authorization header for API requests
 * @returns {Object} Authorization headers
 */
export function getAuthHeaders() {
  try {
    const authData = getStoredAuthData();
    if (authData?.session?.access_token) {
      return {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      };
    }
    return {
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('Error getting auth headers:', error);
    return {
      'Content-Type': 'application/json'
    };
  }
}

/**
 * Refresh authentication token if needed
 * @returns {Promise<boolean>} True if refresh successful
 */
export async function refreshAuthToken() {
  try {
    const authData = getStoredAuthData();
    if (!authData?.session?.refresh_token) {
      return false;
    }

    // Check if token needs refresh (expires in next 5 minutes)
    const expiresAt = authData.session.expires_at;
    const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
    
    if (expiresAt > fiveMinutesFromNow) {
      return true; // Token still valid
    }

    // Attempt to refresh token with Supabase
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: authData.session.refresh_token
    });

    if (error || !data.session) {
      console.error('Token refresh failed:', error);
      clearStoredAuthData();
      return false;
    }

    // Store new token data
    const newAuthData = {
      user: authData.user,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    };

    storeAuthData(newAuthData);
    return true;

  } catch (error) {
    console.error('Error refreshing auth token:', error);
    clearStoredAuthData();
    return false;
  }
}

export default {
  secureLogin,
  secureLogout,
  storeAuthData,
  getStoredAuthData,
  clearStoredAuthData,
  isCurrentUserAdmin,
  getAuthHeaders,
  refreshAuthToken
};
