/**
 * Database Configuration
 * Supabase client configuration with connection pooling
 */

import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required Supabase environment variables');
}

/**
 * Supabase client with connection pooling configuration
 * @see https://supabase.com/docs/reference/javascript/initializing
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'boilerbrain-server'
    }
  },
  // Connection pooling configuration
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('boiler_fault_codes')
      .select('id')
      .limit(1);
    
    if (error) {
      logger.error('[Database] Connection test failed:', { error: error.message });
      return false;
    }
    
    logger.info('[Database] Connection test successful');
    return true;
  } catch (err) {
    logger.error('[Database] Connection test error:', { error: err.message });
    return false;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const stats = {};
    
    // Count fault codes
    const { count: faultCount } = await supabase
      .from('boiler_fault_codes')
      .select('*', { count: 'exact', head: true });
    
    stats.faultCodes = faultCount || 0;
    
    // Count sessions
    const { count: sessionCount } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true });
    
    stats.sessions = sessionCount || 0;
    
    return stats;
  } catch (err) {
    logger.error('[Database] Stats error:', { error: err.message });
    return null;
  }
}

export default supabase;
