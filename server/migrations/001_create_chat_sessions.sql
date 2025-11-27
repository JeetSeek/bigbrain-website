-- Chat Sessions Table
-- Stores persistent chat session data with automatic cleanup

CREATE TABLE IF NOT EXISTS chat_sessions (
  id SERIAL PRIMARY KEY,
  session_id UUID UNIQUE NOT NULL,
  user_id UUID,
  history JSONB DEFAULT '[]'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_expires_at ON chat_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_active ON chat_sessions(last_active);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_sessions_updated_at();

-- Automatic cleanup of expired sessions (run daily)
-- This can be scheduled via pg_cron or external cron job
CREATE OR REPLACE FUNCTION cleanup_expired_chat_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM chat_sessions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE chat_sessions IS 'Stores chat session data with 30-minute expiration';
COMMENT ON COLUMN chat_sessions.session_id IS 'Unique session identifier (UUID)';
COMMENT ON COLUMN chat_sessions.user_id IS 'Optional user ID for authenticated sessions';
COMMENT ON COLUMN chat_sessions.history IS 'JSON array of chat messages';
COMMENT ON COLUMN chat_sessions.expires_at IS 'Session expiration timestamp (30 minutes from last activity)';
COMMENT ON COLUMN chat_sessions.metadata IS 'Additional session metadata (user_agent, etc.)';
