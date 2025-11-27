-- Chat Feedback Table
-- Stores user feedback on AI responses for learning and improvement

CREATE TABLE IF NOT EXISTS chat_feedback (
  id SERIAL PRIMARY KEY,
  message_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'not_helpful')),
  message_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID,
  session_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_feedback_message_id ON chat_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_feedback_type ON chat_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_created_at ON chat_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_session_id ON chat_feedback(session_id);

-- Comments
COMMENT ON TABLE chat_feedback IS 'Stores user feedback on AI chat responses for learning and improvement';
COMMENT ON COLUMN chat_feedback.message_id IS 'Unique identifier for the message that received feedback';
COMMENT ON COLUMN chat_feedback.feedback_type IS 'Type of feedback: helpful or not_helpful';
COMMENT ON COLUMN chat_feedback.message_text IS 'The actual message text that received feedback';
COMMENT ON COLUMN chat_feedback.user_id IS 'Optional user ID if authenticated';
COMMENT ON COLUMN chat_feedback.session_id IS 'Chat session ID for context';
COMMENT ON COLUMN chat_feedback.metadata IS 'Additional metadata (fault code, manufacturer, etc.)';
