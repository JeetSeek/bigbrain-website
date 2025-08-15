/**
 * CSRF Token Service
 * Provides persistent CSRF token management with database storage
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

class CSRFService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.tokenExpiry = 3600000; // 1 hour in milliseconds
  }

  /**
   * Generate a new CSRF token and store it in database
   * @returns {Promise<string>} Generated token
   */
  async generateToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.tokenExpiry);

    try {
      const { error } = await this.supabase
        .from('csrf_tokens')
        .insert({
          token,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing CSRF token:', error);
        throw new Error('Failed to generate CSRF token');
      }

      return token;
    } catch (error) {
      console.error('CSRF token generation failed:', error);
      throw error;
    }
  }

  /**
   * Validate a CSRF token
   * @param {string} token - Token to validate
   * @returns {Promise<boolean>} True if valid, false otherwise
   */
  async validateToken(token) {
    if (!token) return false;

    try {
      const { data, error } = await this.supabase
        .from('csrf_tokens')
        .select('expires_at')
        .eq('token', token)
        .single();

      if (error || !data) {
        return false;
      }

      const expiresAt = new Date(data.expires_at);
      const isValid = expiresAt > new Date();

      // Clean up expired token
      if (!isValid) {
        await this.deleteToken(token);
      }

      return isValid;
    } catch (error) {
      console.error('CSRF token validation failed:', error);
      return false;
    }
  }

  /**
   * Delete a specific token
   * @param {string} token - Token to delete
   */
  async deleteToken(token) {
    try {
      await this.supabase
        .from('csrf_tokens')
        .delete()
        .eq('token', token);
    } catch (error) {
      console.error('Error deleting CSRF token:', error);
    }
  }

  /**
   * Clean up expired tokens
   * Should be called periodically
   */
  async cleanupExpiredTokens() {
    try {
      const { error } = await this.supabase
        .from('csrf_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error cleaning up expired CSRF tokens:', error);
      } else {
      }
    } catch (error) {
      console.error('CSRF cleanup failed:', error);
    }
  }

  /**
   * Initialize the service - create table if needed
   */
  async initialize() {
    try {
      // Create table if it doesn't exist
      const { error } = await this.supabase.rpc('create_csrf_tokens_table');
      
      if (error && !error.message.includes('already exists')) {
        console.error('Error creating CSRF tokens table:', error);
      }

      // Start cleanup interval (every hour)
      setInterval(() => {
        this.cleanupExpiredTokens();
      }, 3600000);

    } catch (error) {
      console.error('CSRF Service initialization failed:', error);
    }
  }
}

export default new CSRFService();
