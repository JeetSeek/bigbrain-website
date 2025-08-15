/**
 * Direct Database Setup Script
 * 
 * This script bypasses the migration system to directly create the required tables
 * for our session persistence feature. Use this only if the migration system is failing.
 */

import { supabase } from '../supabaseClient.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

// Get directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Main function to run setup
async function setupDatabase() {
  
  try {
    // 1. Create chat_sessions table
    const { error: createError } = await supabase.from('chat_sessions')
      .select('id')
      .limit(1)
      .maybeSingle();
      
    if (createError && createError.message.includes('does not exist')) {
      
      // Use raw SQL for table creation through the REST API
      // This is an ugly workaround but necessary due to migration system issues
      const result = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          action: 'exec_sql',
          sql: `
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
            
            -- Create indexes for faster lookups
            CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON public.chat_sessions(session_id);
            CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_active ON public.chat_sessions(last_active);
            
            -- Enable RLS
            ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
            
            -- Create policies
            CREATE POLICY "Users can view and update their own chat sessions"
            ON public.chat_sessions
            FOR ALL 
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
            
            CREATE POLICY "Service role has full access to all chat sessions"
            ON public.chat_sessions
            FOR ALL 
            USING (auth.role() = 'service_role');
            
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
            
            COMMENT ON TABLE public.chat_sessions IS 'Stores persistent chat sessions with history and context';
          `
        })
      });
      
      if (!result.ok) {
        const errorData = await result.json();
        throw new Error(`Failed to create chat_sessions table: ${JSON.stringify(errorData)}`);
      } else {
      }
    } else {
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run setup
setupDatabase()
  .then(() => {
  })
  .catch(err => {
    console.error('Unexpected error in setup:', err);
    process.exit(1);
  });
