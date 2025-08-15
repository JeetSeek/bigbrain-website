/**
 * Supabase Client Configuration
 * Initializes and exports a Supabase client instance to be used across the application
 * Uses environment variables for secure configuration of URL and API key
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Supabase URL from environment variables
 * This should point to your Supabase project URL
 * @type {string}
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

/**
 * Anonymous API key from environment variables
 * This key should have limited permissions based on Row Level Security (RLS)
 * @type {string}
 */
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing required environment variable: VITE_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing required environment variable: VITE_SUPABASE_ANON_KEY');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error('Invalid VITE_SUPABASE_URL format. Must be a valid URL.');
}

/**
 * Configured Supabase client
 * Used for all database interactions and authentication in the application
 * @type {SupabaseClient}
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Default export for backward compatibility
export default { supabase };
