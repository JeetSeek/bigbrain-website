/**
 * Direct Setup for Chat Sessions Table
 * 
 * This script bypasses the migration system to directly create the chat_sessions table
 * using the Supabase client's query method.
 */

import { supabase } from '../supabaseClient.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// SQL for creating chat sessions table
const CREATE_CHAT_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
`;

const CREATE_INDEXES = `
-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON public.chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_active ON public.chat_sessions(last_active);
`;

const ENABLE_RLS = `
-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
`;

const CREATE_POLICIES = `
-- Create policies
CREATE POLICY IF NOT EXISTS "Users can view and update their own chat sessions"
ON public.chat_sessions
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Service role has full access to all chat sessions"
ON public.chat_sessions
FOR ALL 
USING (auth.role() = 'service_role');
`;

const CREATE_CLEANUP_FUNCTION = `
-- Add a TTL cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_chat_sessions() 
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  DELETE FROM public.chat_sessions 
  WHERE last_active < (NOW() - ttl);
END;
$$;
`;

const ADD_COMMENT = `
COMMENT ON TABLE public.chat_sessions IS 'Stores persistent chat sessions with history and context';
`;

// Main function to create the table
async function createChatSessionsTable() {
  try {
    
    // Check if table exists first
    const { data: checkData, error: checkError } = await supabase
      .from('chat_sessions')
      .select('id')
      .limit(1);
    
    if (checkError && checkError.message.includes('does not exist')) {
      
      // Execute create table statement
      const { error: createError } = await supabase.rpc('postgres_execute', { 
        query: CREATE_CHAT_SESSIONS_TABLE 
      });
      
      if (createError) {
        const { data, error } = await supabase
          .from('_manual_migration')
          .insert({ sql: CREATE_CHAT_SESSIONS_TABLE })
          .select();
          
        if (error) {
          throw new Error(`Failed to create chat_sessions table: ${error.message}`);
        }
      }
      
      // Add indexes
      await supabase.rpc('postgres_execute', { query: CREATE_INDEXES });
      
      // Enable RLS
      await supabase.rpc('postgres_execute', { query: ENABLE_RLS });
      
      // Create policies
      await supabase.rpc('postgres_execute', { query: CREATE_POLICIES });
      
      // Create cleanup function
      await supabase.rpc('postgres_execute', { query: CREATE_CLEANUP_FUNCTION });
      
      // Add comment
      await supabase.rpc('postgres_execute', { query: ADD_COMMENT });
      
    } else {
    }
  } catch (error) {
    console.error('❌ Error creating chat_sessions table:', error);
  }
}

// Run the creation function
createChatSessionsTable().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Unexpected error during setup:', err);
  process.exit(1);
});
