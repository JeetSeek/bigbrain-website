-- Migration: Create chat sessions table for persistent session storage
-- Description: Adds a table to store chat session data with indexing and RLS policies

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ttl TIMESTAMPTZ  -- When this session should expire
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON public.chat_sessions(updated_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_ttl ON public.chat_sessions(ttl);

-- Add RLS policies
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own sessions
CREATE POLICY chat_sessions_select_policy ON public.chat_sessions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy for users to update their own sessions
CREATE POLICY chat_sessions_update_policy ON public.chat_sessions
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy for users to insert their own sessions
CREATE POLICY chat_sessions_insert_policy ON public.chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy for users to delete their own sessions
CREATE POLICY chat_sessions_delete_policy ON public.chat_sessions
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Comments
COMMENT ON TABLE public.chat_sessions IS 'Stores chat session data for persistence across server restarts';
COMMENT ON COLUMN public.chat_sessions.id IS 'Unique session identifier';
COMMENT ON COLUMN public.chat_sessions.user_id IS 'User ID if authenticated, null for anonymous sessions';
COMMENT ON COLUMN public.chat_sessions.data IS 'Session data including chat history and boiler info';
COMMENT ON COLUMN public.chat_sessions.metadata IS 'Additional session metadata';
COMMENT ON COLUMN public.chat_sessions.ttl IS 'Timestamp when this session should expire';

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_chat_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.chat_sessions
  WHERE ttl < NOW();
END;
$$;

-- Schedule cleanup job (can be triggered by application or via pgAgent)
COMMENT ON FUNCTION cleanup_expired_chat_sessions IS 'Removes expired chat sessions from the database';
