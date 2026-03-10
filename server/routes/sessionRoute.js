/**
 * Session & Feedback Routes — /api/sessions, /api/feedback
 */
import express from 'express';
import { supabase } from '../supabaseClient.js';
import logger from '../utils/logger.js';
import SessionManager from '../services/SessionManager.js';

const router = express.Router();

// --- POST /api/sessions/get ---
// Retrieve session by ID for cross-device sync
router.post('/sessions/get', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }
    
    const session = await SessionManager.getSession(sessionId);
    if (!session) {
      return res.json({ sessionId, history: [], exists: false });
    }
    
    res.json({
      sessionId: session.session_id,
      history: session.history || [],
      expiresAt: session.expires_at,
      exists: true
    });
  } catch (error) {
    logger.error('[Sessions] Get session error:', error);
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

// --- POST /api/feedback ---
// Endpoint to receive user feedback on AI responses
router.post('/feedback', async (req, res) => {
  try {
    const { messageId, feedback, messageText, timestamp } = req.body;
    
    logger.info(`[Feedback] Received: ${feedback} for message ${messageId}`);
    
    const { data, error } = await supabase
      .from('chat_feedback')
      .insert({
        message_id: messageId,
        feedback_type: feedback,
        message_text: messageText,
        created_at: timestamp || new Date().toISOString()
      });
    
    if (error) {
      logger.warn('[Feedback] Database insert failed (table may not exist):', error.message);
    }
    
    res.json({ success: true, message: 'Feedback recorded' });
  } catch (error) {
    logger.error('[Feedback] Error:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// Session cleanup job - runs every hour
setInterval(async () => {
  try {
    const cleaned = await SessionManager.cleanupExpiredSessions();
    if (cleaned > 0) {
      console.log(`[Cleanup] Removed ${cleaned} expired sessions`);
    }
  } catch (error) {
    console.error('[Cleanup] Session cleanup failed:', error);
  }
}, 60 * 60 * 1000);

// Initial cleanup on startup
SessionManager.cleanupExpiredSessions().catch(err => 
  console.error('[Cleanup] Initial cleanup failed:', err)
);

export default router;
