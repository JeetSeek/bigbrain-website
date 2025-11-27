/**
 * Chat Routes
 * API endpoints for AI chat functionality
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { supabase } from '../supabaseClient.js';
import logger from '../utils/logger.js';
import EnhancedFaultCodeService from '../services/EnhancedFaultCodeService.js';
import SessionManager from '../services/SessionManager.js';
import AgentTools from '../services/AgentTools.js';
import { validateChatMessage } from '../middleware/inputValidation.js';
import * as CONSTANTS from '../constants/index.js';

const router = express.Router();

// OpenAI API keys with fallback
const openaiKeys = [
  process.env.OPENAI_API_KEY,
  process.env.OPENAI_API_KEY_2,
  process.env.OPENAI_API_KEY_3
].filter(Boolean);

/**
 * POST /api/v1/chat
 * Standard chat endpoint with database integration
 */
router.post('/', validateChatMessage, async (req, res) => {
  try {
    const { message, sessionId, history, detail } = req.body;
    
    // Get or create session from database
    let session = await SessionManager.getSession(sessionId);
    let chatHistory = [];
    
    if (session) {
      chatHistory = session.history || [];
      logger.info(`[Chat] Restored session with ${chatHistory.length} messages`);
    } else if (Array.isArray(history) && history.length > 0) {
      chatHistory = history;
      await SessionManager.createSession(sessionId, null, chatHistory);
      logger.info(`[Chat] Created new session with ${chatHistory.length} messages`);
    } else if (message && sessionId) {
      chatHistory = [];
      await SessionManager.createSession(sessionId, null, chatHistory);
      logger.info(`[Chat] Created new empty session`);
    } else {
      return res.status(400).json({ error: 'Missing message or chat history' });
    }
    
    // Add current user message to history
    chatHistory.push({ 
      sender: 'user', 
      text: message, 
      timestamp: new Date().toISOString() 
    });
  
    // Create conversationText once for reuse
    let conversationText = chatHistory.map(msg => msg.text).join(' ').toLowerCase();
    
    logger.info(`[Chat] Processing - SessionId: ${sessionId}, History: ${chatHistory.length} messages`);
    
    // Extract boiler information
    const lastUserMessage = chatHistory.filter(msg => msg.sender === 'user').pop();
    let relevantKnowledge = '';
    
    if (lastUserMessage) {
      const userText = lastUserMessage.text.toLowerCase();
      
      // Check for safety concerns
      if (userText.includes('gas smell') || userText.includes('smell gas')) {
        relevantKnowledge += '\n\nURGENT SAFETY INFORMATION - GAS LEAK:\n' + 
          '1. Turn off gas supply immediately\n' +
          '2. Do not use electrical switches or naked flames\n' +
          '3. Open windows and doors for ventilation\n' +
          `4. Call Gas Emergency Service: ${CONSTANTS.GAS_EMERGENCY_NUMBER}`;
      }
      
      if (userText.includes('carbon monoxide') || userText.includes('co alarm')) {
        relevantKnowledge += '\n\nURGENT SAFETY INFORMATION - CARBON MONOXIDE:\n' + 
          '1. Turn off gas appliances immediately\n' +
          '2. Open windows and doors for fresh air\n' +
          '3. Leave the property if symptoms persist\n' +
          `4. Call Gas Emergency Service: ${CONSTANTS.GAS_EMERGENCY_NUMBER}\n` +
          'Symptoms: headache, dizziness, nausea, fatigue, confusion';
      }
      
      // Use Enhanced Fault Code Service
      try {
        const faultInfo = await EnhancedFaultCodeService.getComprehensiveFaultInfo(userText);
        
        if (faultInfo && faultInfo.faultCode) {
          const description = faultInfo.rawData?.diagnosticInfo?.[0]?.fault_description || 
                             faultInfo.rawData?.basicInfo?.[0]?.description ||
                             faultInfo.rawData?.manufacturerSpecific?.[0]?.description ||
                             null;
          
          if (description && description !== 'Unknown') {
            relevantKnowledge += `\n\n🔴 FAULT CODE DEFINITION (FROM DATABASE):\n`;
            relevantKnowledge += `${faultInfo.faultCode} = ${description}\n`;
            relevantKnowledge += faultInfo.context;
          }
          
          if (faultInfo.isSafetyCritical) {
            relevantKnowledge += '\n\n⚠️ SAFETY CRITICAL FAULT - Immediate attention required';
          }
        }
      } catch (error) {
        logger.error('[Chat] EnhancedFaultCodeService error:', { error: error.message });
      }
    }
    
    // Check if boiler details provided
    const hasManufacturer = /\b(worcester|vaillant|baxi|ideal|glow ?worm|potterton|viessmann)\b/i.test(conversationText);
    const hasSystemType = /\b(combi|combination|system|regular|conventional)\b/i.test(conversationText);
    
    if (!hasManufacturer || !hasSystemType) {
      return res.json({ 
        reply: "What make, model, and type of boiler system are you working on?" 
      });
    }

    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: `You are a professional Gas Safe registered engineer with 20+ years experience. Provide expert diagnostic guidance.
        
${relevantKnowledge ? '⚠️ CRITICAL DATABASE INFORMATION:\n' + relevantKnowledge : ''}

Respond professionally and include safety warnings where appropriate.`
      }
    ];
    
    // Add conversation history
    chatHistory.forEach(msg => {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    });
    
    // Call OpenAI with fallback keys
    for (let i = 0; i < openaiKeys.length; i++) {
      const key = openaiKeys[i];
      try {
        logger.info(`[Chat] Trying OpenAI key #${i+1}`);
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: CONSTANTS.OPENAI_MODEL,
            messages: messages,
            max_tokens: CONSTANTS.OPENAI_MAX_TOKENS_STANDARD,
            temperature: CONSTANTS.OPENAI_TEMPERATURE_STANDARD
          })
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data.choices[0].message.content;
          
          // Save session
          chatHistory.push({ 
            sender: 'assistant', 
            text: reply, 
            timestamp: new Date().toISOString() 
          });
          await SessionManager.updateSession(sessionId, chatHistory);
          
          return res.json({ reply });
        }
      } catch (err) {
        logger.error(`[Chat] OpenAI error with key #${i+1}:`, { error: err.message });
        continue;
      }
    }
    
    // All keys failed
    res.json({ 
      reply: "I'm having trouble connecting to the AI right now. Please try again later!" 
    });
    
  } catch (error) {
    logger.error('[Chat] Endpoint error:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/chat/stream
 * Server-Sent Events streaming endpoint for detailed diagnostics
 */
router.get('/stream', validateChatMessage, async (req, res) => {
  try {
    const message = String(req.query.message || '');
    const sessionId = req.query.sessionId ? String(req.query.sessionId) : null;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
    const end = () => res.end();

    // Restore session
    let chatHistory = [];
    if (sessionId) {
      try {
        const session = await SessionManager.getSession(sessionId);
        if (session?.history) chatHistory = session.history;
      } catch (err) {
        logger.error('[Chat Stream] Session restore error:', { error: err.message });
      }
    }
    
    chatHistory.push({ 
      sender: 'user', 
      text: message, 
      timestamp: new Date().toISOString() 
    });

    send({ delta: 'Processing your request...\n' });

    // Simple response for now (can be enhanced with streaming later)
    const response = 'This is a streaming response. Feature under development.';
    send({ delta: response });
    send({ done: true });
    
    // Update session
    chatHistory.push({ 
      sender: 'assistant', 
      text: response, 
      timestamp: new Date().toISOString() 
    });
    if (sessionId) {
      await SessionManager.updateSession(sessionId, chatHistory);
    }
    
    end();
  } catch (error) {
    logger.error('[Chat Stream] Error:', { error: error.message });
    try { 
      res.write(`data: ${JSON.stringify({ error: 'stream_error' })}\n\n`); 
    } catch {}
    res.end();
  }
});

export default router;
