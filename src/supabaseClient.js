/**
 * Supabase Client Configuration
 * Initializes and exports a Supabase client instance to be used across the application
 * Uses environment variables for secure configuration of URL and API key
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration - requires environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

/**
 * Configured Supabase client
 * Used for all database interactions and authentication in the application
 * @type {SupabaseClient}
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Default export for backward compatibility
export default { supabase };
