/**
 * Verify Chat Sessions Table
 * 
 * This script verifies that the chat_sessions table exists and is accessible
 * using the Supabase JavaScript client and the service role key.
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function verifyTable() {
  
  try {
    // Check if table exists by querying it
    const { data, error, count } = await supabaseAdmin
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error accessing chat_sessions table:', error.message);
      return false;
    }
    
    
    // Try inserting a test record
    const testSessionId = `test-${Date.now()}`;
    
    const { error: insertError } = await supabaseAdmin
      .from('chat_sessions')
      .insert({
        id: uuidv4(),
        session_id: testSessionId,
        history: JSON.stringify([{ role: 'system', content: 'Test message' }]),
        metadata: JSON.stringify({ test: true, timestamp: Date.now() })
      });
    
    if (insertError) {
      console.error('❌ Error inserting test record:', insertError.message);
      return false;
    }
    
    
    // Retrieve the test record
    const { data: retrievedData, error: retrieveError } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('session_id', testSessionId)
      .single();
    
    if (retrieveError) {
      console.error('❌ Error retrieving test record:', retrieveError.message);
      return false;
    }
    
    
    // Clean up the test record
    const { error: deleteError } = await supabaseAdmin
      .from('chat_sessions')
      .delete()
      .eq('session_id', testSessionId);
    
    if (deleteError) {
      console.error('❌ Error deleting test record:', deleteError.message);
      return false;
    }
    
    
    // Test RLS permissions with anon key
    const supabaseAnon = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);
    
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('chat_sessions')
      .select('count(*)')
      .limit(1);
    
    if (anonError) {
      console.log('⚠️ Anon access is restricted (this might be expected if RLS is enabled):', anonError.message);
    } else {
    }
    
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the verification
console.log('Starting table verification at', new Date().toISOString());
verifyTable()
  .then(success => {
    if (success) {
      process.exit(0);
    } else {
      console.error('❌ Table verification failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Unhandled error during verification:', error);
    process.exit(1);
  });
