/**
 * Production Authentication Utilities
 * Provides utility functions for production Supabase authentication
 * Works in conjunction with AuthContext for complete authentication management
 */

import { supabase } from '../supabaseClient';

/**
 * Check if current user has admin role
 * @param {Object} user - User object from AuthContext
 * @returns {boolean} True if user has admin role
 */
export function isUserAdmin(user) {
  if (!user) return false;
  
  // Check app_metadata for admin role
  return user.app_metadata?.role === 'admin' || 
         user.user_metadata?.role === 'admin' ||
         user.email === 'admin@boilerbrain.com'; // Fallback admin email
}

/**
 * Get authorization headers for API requests
 * @param {Object} session - Session object from AuthContext
 * @returns {Object} Authorization headers
 */
export function getAuthHeaders(session) {
  if (!session?.access_token) {
    return {
      'Content-Type': 'application/json'
    };
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Check if user session is valid and not expired
 * @param {Object} session - Session object from AuthContext
 * @returns {boolean} True if session is valid
 */
export function isSessionValid(session) {
  if (!session?.access_token || !session?.expires_at) {
    return false;
  }

  // Check if session is expired (with 5 minute buffer)
  const expiresAt = new Date(session.expires_at * 1000);
  const now = new Date();
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  return expiresAt.getTime() > (now.getTime() + bufferTime);
}

/**
 * Get user role from user object
 * @param {Object} user - User object from AuthContext
 * @returns {string} User role ('admin' or 'user')
 */
export function getUserRole(user) {
  if (!user) return 'user';
  
  return isUserAdmin(user) ? 'admin' : 'user';
}

/**
 * Clear any legacy authentication data from localStorage
 * This is a cleanup utility for migration from old auth system
 */
export function clearLegacyAuthData() {
  try {
    // Clear old demo authentication data
    localStorage.removeItem('bb_auth_token');
    localStorage.removeItem('bb_refresh_token');
    localStorage.removeItem('bb_user_data');
    localStorage.removeItem('bb_session_expires');
    localStorage.removeItem('bb_demo_user_logged_in');
    localStorage.removeItem('bb_admin_user_logged_in');
    
  } catch (error) {
    console.warn('Error clearing legacy auth data:', error);
  }
}

export default {
  isUserAdmin,
  getAuthHeaders,
  isSessionValid,
  getUserRole,
  clearLegacyAuthData
};
