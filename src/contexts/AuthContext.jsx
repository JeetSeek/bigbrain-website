import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { AUTH, ROUTES, DEMO } from '../utils/constants';

/**
 * Authentication Context
 * Provides authentication state and methods across the application
 * @type {React.Context}
 */
const AuthContext = createContext();

/**
 * Custom hook to access the authentication context
 * @returns {Object} Authentication context value
 * @throws {Error} If used outside of AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication Provider Component
 * Manages authentication state and provides auth methods to children
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components that will have access to auth context
 * @returns {React.ReactElement} Provider component with auth context
 */
export function AuthProvider({ children }) {
  // TESTING MODE: Skip authentication entirely
  const [user, setUser] = useState({ id: 'test-user', email: 'test@test.com' });
  const [session, setSession] = useState({ user: { id: 'test-user', email: 'test@test.com' } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // TESTING MODE: Skip all auth checks
  /* useEffect(() => {
    // Auth checking disabled for testing
  }, []); */

  /**
   * Register a new user with email and password
   *
   * @async
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @param {Object} metadata - Additional user metadata
   * @returns {Promise<Object>} Signup response data
   * @throws {Error} Signup error
   */
  const signUp = async (email, password, metadata = {}) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error signing up:', error.message);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Authenticate user with email and password
   *
   * @async
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<Object>} Session data
   * @throws {Error} Authentication error
   */
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error signing in:', error.message);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out the current user
   *
   * @async
   * @returns {Promise<void>}
   * @throws {Error} Sign out error
   */
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error signing out:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send password reset email to user
   *
   * @async
   * @param {string} email - User's email address
   * @returns {Promise<Object>} Reset response data
   * @throws {Error} Reset error
   */
  const resetPassword = async email => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${ROUTES.RESET_PASSWORD}`,
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error resetting password:', error.message);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update user profile information
   *
   * @async
   * @param {Object} updates - Profile fields to update
   * @returns {Promise<Object>} Updated profile data
   * @throws {Error} Update error
   */
  const updateProfile = async updates => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          ...updates,
          updated_at: new Date(),
        })
        .select();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating profile:', error.message);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new user profile in the users table
   *
   * @async
   * @param {string} id - User's auth ID
   * @param {string} name - User's full name
   * @param {string} email - User's email address
   * @param {string} tier - User's subscription tier
   * @returns {Promise<Object>} Created profile data
   * @throws {Error} Profile creation error
   */
  const createUserProfile = async (id, name, email, tier = AUTH.DEFAULT_TIER) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            id,
            name,
            email,
            tier,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ])
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating user profile:', error.message);
      throw error;
    }
  };

  /**
   * Create a test user with preset credentials
   * Used for development and demo purposes
   *
   * @async
   * @returns {Promise<Object>} Test user credentials
   * @throws {Error} Test user creation error
   */
  const createTestUser = async () => {
    const testEmail = DEMO.USER.TEST_EMAIL;
    const testPassword = DEMO.USER.TEST_PASSWORD;

    try {
      if (import.meta.env.DEV) {
      }
      // First check if the user already exists by trying to login
      try {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword,
        });

        if (!loginError && loginData.user) {
          if (import.meta.env.DEV) {
          }
          return {
            email: testEmail,
            password: testPassword,
            exists: true,
          };
        }
      } catch (loginAttemptError) {
        if (import.meta.env.DEV) {
        }
        // Continue to create the user
      }

      // User doesn't exist or login failed, create a new one directly with Supabase
      if (import.meta.env.DEV) {
      }
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            name: 'Test User',
            tier: 'Pro',
          },
        },
      });

      if (signupError) {
        console.error('Signup error:', signupError);
        throw signupError;
      }

      if (import.meta.env.DEV) {
      }

      // Create profile record in users table
      try {
        if (signupData?.user) {
          if (import.meta.env.DEV) {
          }
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .insert([
              {
                id: signupData.user.id,
                name: DEMO.USER.TEST_NAME,
                email: testEmail,
                tier: DEMO.USER.DEFAULT_TIER,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ])
            .select();

          if (profileError) {
            console.warn('Profile creation warning:', profileError.message);
            // Continue even if profile creation fails
          } else {
            if (import.meta.env.DEV) {
            }
          }
        }
      } catch (profileCreationError) {
        console.warn('Profile creation error:', profileCreationError.message);
        // Continue even if profile creation fails, we still want to return credentials
      }

      // Return the credentials regardless of profile creation
      return {
        email: testEmail,
        password: testPassword,
        exists: false,
      };
    } catch (error) {
      console.error('Error in createTestUser:', error.message);
      // Return a more helpful error message
      throw new Error(`Failed to create test user: ${error.message}`);
    }
  };

  const value = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    createUserProfile,
    createTestUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
