/**
 * Supabase Client Configuration
 * Initializes and exports a Supabase client instance to be used across the application
 * Uses environment variables for secure configuration of URL and API key
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration - fallback to production values if env vars not set
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hfyfidpbtoqnqhdywdzw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmeWZpZHBidG9xbnFoZHl3ZHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0OTQ4OTksImV4cCI6MjA2MTA3MDg5OX0.eZrUGTGOOnHrZp2BoIbnaqSPvcmNKYfpoLXmGsa3PME';

/**
 * Configured Supabase client
 * Used for all database interactions and authentication in the application
 * @type {SupabaseClient}
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Default export for backward compatibility
export default { supabase };
