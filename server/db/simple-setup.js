/**
 * Simple Direct Database Table Creation
 * 
 * This script uses the Supabase JS client's basic functionality to create
 * the chat_sessions table without relying on complex SQL or migrations.
 */

import { supabase } from '../supabaseClient.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Main function
async function createChatSessionsTable() {
  try {
    
    // Check if the table exists by trying to query it
    const { error: checkError } = await supabase
      .from('chat_sessions')
      .select('count(*)')
      .limit(1);
    
    if (checkError && checkError.message.includes('does not exist')) {
      
      try {
        // Try using the PostgreSQL extension if available
        
        // Using the postgres.execute shorthand available in newer versions
        const { error } = await supabase.postgres.execute(`
          CREATE TABLE IF NOT EXISTS public.chat_sessions (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            session_id TEXT UNIQUE NOT NULL,
            history JSONB DEFAULT '[]'::jsonb NOT NULL,
            metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
            context JSONB DEFAULT '{}'::jsonb NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
            last_active TIMESTAMPTZ DEFAULT now() NOT NULL,
            ttl INTERVAL DEFAULT '7 days'::interval NOT NULL,
            recovery_points JSONB DEFAULT '[]'::jsonb
          );
        `);
        
        if (error) {
          console.warn(`PostgreSQL extension error: ${error.message}`);
          throw error; // Pass to outer catch block
        } else {
        }
      } catch (pgError) {
        
        // Let's create a very minimal version of the table just to unblock our development
        try {
          
          // First create the raw table without constraints
          await supabase.schema.createTable('chat_sessions', [
            { name: 'id', type: 'uuid', primaryKey: true },
            { name: 'session_id', type: 'text', notNull: true, isUnique: true },
            { name: 'history', type: 'jsonb', notNull: true, defaultValue: '[]' },
            { name: 'metadata', type: 'jsonb', notNull: true, defaultValue: '{}' },
            { name: 'last_active', type: 'timestamp with time zone', notNull: true, defaultValue: 'now()' },
            { name: 'created_at', type: 'timestamp with time zone', notNull: true, defaultValue: 'now()' }
          ]);
          
        } catch (restError) {
          console.error(`REST API table creation error: ${restError.message}`);
          throw restError;
        }
      }
      
      // Try to add a test record
      const testSessionId = `test-${Date.now()}`;
      const { error: insertError } = await supabase
        .from('chat_sessions')
        .insert([
          {
            session_id: testSessionId,
            history: JSON.stringify([]),
            metadata: JSON.stringify({ test: true }),
          }
        ]);
      
      if (insertError) {
        console.warn(`Test insert failed: ${insertError.message}`);
      } else {
        
        // Clean up test record
        await supabase
          .from('chat_sessions')
          .delete()
          .eq('session_id', testSessionId);
      }
      
    } else {
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error setting up chat_sessions table:', error);
    return false;
  }
}

// Run the setup
createChatSessionsTable()
  .then(success => {
    if (success) {
    } else {
      console.error('Failed to set up chat sessions table.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
