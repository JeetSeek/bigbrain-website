/**
 * Verified Database Setup for Chat Sessions
 * 
 * This script ensures the chat_sessions table is properly created by:
 * 1. Using direct SQL via the Supabase client
 * 2. Verifying table creation with both existence check and test record
 * 3. Providing detailed error handling and reporting
 */

// Import standard supabase client
import { supabase } from '../supabaseClient.js';

// Create a privileged admin client using the service role key
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// SQL for creating the chat_sessions table with minimal structure
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT UNIQUE NOT NULL,
  history JSONB DEFAULT '[]'::jsonb NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add a comment to the table
COMMENT ON TABLE public.chat_sessions IS 'Stores persistent chat sessions';
`;

/**
 * Execute a SQL query safely using the admin client
 */
async function executeSql(sql) {
  try {
    console.log('Executing SQL:', sql.trim().split('\n')[0] + '...');
    
    // Use the admin client with service role key to run SQL directly
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { query: sql });
    
    if (error) {
      // First attempt failed - try direct SQL approach
      
      // Create the exec_sql function if it doesn't exist
      try {
        const createFunctionSql = `
        CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS json
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result json;
        BEGIN
          EXECUTE query;
          result := json_build_object('success', true);
          RETURN result;
        EXCEPTION WHEN OTHERS THEN
          result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'detail', SQLSTATE
          );
          RETURN result;
        END;
        $$;
        `;
        
        // Use direct REST API with service role key for admin access
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            query: createFunctionSql
          })
        });
        
        // Now try to run our original query
        const createTableResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            query: sql
          })
        });
        
        const result = await createTableResponse.json();
        if (result.success === true) {
          return { success: true };
        }
        
        console.warn('Custom function call failed:', result);
        return { success: false, error: result.error };
        
      } catch (functionError) {
        console.error('Error creating or using custom SQL function:', functionError);
      }
      
      // Last attempt - try a direct POST to pgSQL endpoint
      try {
        const directResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Prefer': 'return=minimal' 
          },
          body: sql
        });
        
        if (directResponse.ok) {
          return { success: true };
        }
      } catch (directError) {
        console.error('Direct REST endpoint error:', directError);
      }
      
      return { 
        success: false, 
        error: {
          message: error.message,
          details: error.details || 'No details available'
        }
      };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('SQL execution error:', error.message);
    return { 
      success: false, 
      error: {
        message: error.message,
        details: error.details || 'No details available'
      }
    };
  }
}

/**
 * Check if table exists using a select query with admin client
 */
async function tableExists(tableName) {
  try {
    // First try with admin client
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('count(*)')
      .limit(1);
      
    if (!error) {
      return true;
    }
    
    // If that fails, try checking information schema
    const { data: schemaData, error: schemaError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .maybeSingle();
      
    if (!schemaError && schemaData) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error.message);
    return false;
  }
}

/**
 * Verify table by inserting and selecting a test record using admin client
 */
async function verifyTableWithTestRecord(tableName) {
  const testId = uuidv4();
  const testSessionId = `test-${Date.now()}`;
  
  try {
    // Insert test record using admin client
    const { error: insertError } = await supabaseAdmin
      .from(tableName)
      .insert([
        {
          id: testId,
          session_id: testSessionId,
          history: JSON.stringify([{ test: true }]),
          metadata: JSON.stringify({ verification: true })
        }
      ]);
      
    if (insertError) {
      console.error(`Test record insertion failed: ${insertError.message}`);
      return false;
    }
    
    // Query the test record
    const { data, error: selectError } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .eq('session_id', testSessionId)
      .maybeSingle();
      
    if (selectError || !data) {
      console.error(`Test record query failed: ${selectError?.message || 'No data returned'}`);
      return false;
    }
    
    // Delete the test record
    await supabaseAdmin
      .from(tableName)
      .delete()
      .eq('session_id', testSessionId);
      
    return true;
  } catch (error) {
    console.error(`Table verification error: ${error.message}`);
    return false;
  }
}

/**
 * Main function to setup and verify the database
 */
async function setupAndVerifyDatabase() {
  
  // Check if the table already exists
  const exists = await tableExists('chat_sessions');
  
  if (exists) {
    const verified = await verifyTableWithTestRecord('chat_sessions');
    
    if (verified) {
      return true;
    } else {
    }
  }
  
  // Create the table
  const { success, error } = await executeSql(CREATE_TABLE_SQL);
  
  if (!success) {
    console.error('❌ Failed to create chat_sessions table:', error);
    return false;
  }
  
  
  // Verify the table was created
  const tableCreated = await tableExists('chat_sessions');
  if (!tableCreated) {
    console.error('❌ Table creation failed - cannot query the table');
    return false;
  }
  
  // Verify with test record
  const recordVerified = await verifyTableWithTestRecord('chat_sessions');
  
  if (!recordVerified) {
    console.error('❌ Table verification failed - cannot write/read test records');
    return false;
  }
  
  return true;
}

// Run the setup
console.log('Starting database setup at', new Date().toISOString());
setupAndVerifyDatabase()
  .then(success => {
    if (success) {
    } else {
      console.error('Database setup failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error during database setup:', error);
    process.exit(1);
  });
