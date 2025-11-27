import { useState, useEffect, useCallback, useRef } from 'react';
import { http } from '../utils/http';

// Function to generate a proper UUID for session IDs
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper function to create a fresh chat history with a greeting
const createInitialHistory = (userName) => [
  {
    id: generateUUID(),
    sender: 'assistant',
    text: userName
      ? `Hey ${userName}! I'm your BoilerBrain assistant. To help you effectively, I need to know the manufacturer (Worcester, Vaillant, Baxi, Ideal, etc.), the model if you know it (like Greenstar 30i or Logic Combi 24), and the system type (Combi, System, or Regular boiler). What boiler are you working on?`
      : "Hey there! I'm your BoilerBrain assistant. To help you effectively, I need to know the manufacturer (Worcester, Vaillant, Baxi, Ideal, etc.), the model if you know it (like Greenstar 30i or Logic Combi 24), and the system type (Combi, System, or Regular boiler). What boiler are you working on?",
    timestamp: new Date().toISOString(),
  }
];

// Session storage keys
const SESSION_ID_KEY = 'bb_chat_session_id';
const SESSION_TIMESTAMP_KEY = 'bb_session_timestamp';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const useChatSession = (userName) => {
  const syncInProgress = useRef(false);
  const lastSyncTime = useRef(0);
  const sessionCreatedAt = useRef(Date.now());
  
  // Check if existing session is expired
  const isSessionExpired = useCallback(() => {
    const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY);
    if (!timestamp) return true;
    return Date.now() - parseInt(timestamp) > SESSION_TIMEOUT;
  }, []);
  
  // Create a fresh session
  const createFreshSession = useCallback(() => {
    const newId = generateUUID();
    const timestamp = Date.now().toString();
    
    localStorage.setItem(SESSION_ID_KEY, newId);
    localStorage.setItem(SESSION_TIMESTAMP_KEY, timestamp);
    
    // Clear any existing session storage
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('bb_chat_history_')) {
        sessionStorage.removeItem(key);
      }
    });
    
    return newId;
  }, []);
  
  // State for the session ID with proper expiration handling
  const [sessionId, setSessionId] = useState(() => {
    const existingId = localStorage.getItem(SESSION_ID_KEY);
    
    if (existingId && !isSessionExpired()) {
      return existingId;
    }
    
    return createFreshSession();
  });
  
  // Track session status
  const [sessionStatus, setSessionStatus] = useState('active');

  // Key for session storage, derived from the session ID
  const getSessionStorageKey = useCallback(() => {
    return `bb_chat_history_${sessionId}`;
  }, [sessionId]);

  // State for the chat history - initialize with empty array first to avoid React queue issues
  const [history, setHistory] = useState([]);
  
  // Initialize history after component mount to avoid React hook queue issues
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const storedSessionId = localStorage.getItem(SESSION_ID_KEY);
        const storedTimestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY);
        
        // Check if session is still valid (not expired)
        if (storedSessionId && storedTimestamp) {
          const sessionAge = Date.now() - parseInt(storedTimestamp);
          if (sessionAge < SESSION_TIMEOUT) {
            // Try to sync with backend first
            try {
              const backendSession = await http.post('/api/sessions/get', { sessionId: storedSessionId });
              if (backendSession?.history && Array.isArray(backendSession.history) && backendSession.history.length > 0) {
                console.log('[useChatSession] Restored session from backend');
                setHistory(backendSession.history);
                // Update localStorage with backend data
                localStorage.setItem(`bb_chat_history_${storedSessionId}`, JSON.stringify(backendSession.history));
                return;
              }
            } catch (backendError) {
              // This is expected on first load - session doesn't exist in backend yet
              if (import.meta.env.DEV) {
                console.log('[useChatSession] No backend session found, using localStorage (this is normal on first load)');
              }
            }
            
            // Fallback to localStorage if backend sync fails
            const storedHistory = localStorage.getItem(`bb_chat_history_${storedSessionId}`);
            if (storedHistory) {
              const parsedHistory = JSON.parse(storedHistory);
              if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
                console.log('[useChatSession] Restored session from localStorage');
                setHistory(parsedHistory);
                return;
              }
            }
          }
        }
      } catch (error) {
        console.warn('[useChatSession] Failed to restore session history:', error);
      }
      
      // Fallback to fresh history if restoration fails or session expired
      const initialHistory = createInitialHistory(userName);
      setHistory(initialHistory);
    };
    
    initializeSession();
  }, [userName]);

  // Add message to history with proper ID and timestamp
  const addMessage = useCallback((message) => {
    const messageWithId = {
      ...message,
      id: message.id || generateUUID(),
      timestamp: message.timestamp || new Date().toISOString()
    };
    
    setHistory(prev => {
      const newHistory = [...prev, messageWithId];
      
      // Persist updated history to localStorage
      try {
        const currentSessionId = localStorage.getItem(SESSION_ID_KEY);
        if (currentSessionId) {
          localStorage.setItem(`bb_chat_history_${currentSessionId}`, JSON.stringify(newHistory));
        }
      } catch (error) {
        console.warn('[useChatSession] Failed to persist history:', error);
      }
      
      return newHistory;
    });
    
    // Update session timestamp
    localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    
    return messageWithId;
  }, []);
  
  
  // Simplified session management - removed server sync
  // Session state is now managed entirely through localStorage
  
  // Save history to localStorage when it changes
  useEffect(() => {
    if (history.length > 0) {
      try {
        localStorage.setItem(`bb_chat_history_${sessionId}`, JSON.stringify(history));
        localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
      } catch (error) {
        console.error('[useChatSession] Error saving chat history:', error);
      }
    }
  }, [history, sessionId]);
  
  // Clear session and start fresh
  const clearSession = useCallback(() => {
    const oldSessionId = localStorage.getItem(SESSION_ID_KEY);
    const newSessionId = generateUUID();
    setSessionId(newSessionId);
    
    const freshHistory = createInitialHistory(userName);
    setHistory(freshHistory);
    
    // Clear old session data from localStorage
    if (oldSessionId) {
      localStorage.removeItem(`bb_chat_history_${oldSessionId}`);
    }
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(SESSION_TIMESTAMP_KEY);
    
    // Store new session
    localStorage.setItem(SESSION_ID_KEY, newSessionId);
    localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
    localStorage.setItem(`bb_chat_history_${newSessionId}`, JSON.stringify(freshHistory));
    
    setSessionStatus('active');
  }, [userName]);

  // Auto-cleanup expired sessions
  useEffect(() => {
    const cleanup = () => {
      if (isSessionExpired()) {
        clearSession();
      }
    };
    
    const interval = setInterval(cleanup, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isSessionExpired, clearSession]);

  // Send message to chat API and get response
  const sendMessage = useCallback(async (messageText) => {
    if (!messageText?.trim()) return;

    console.log(`[useChatSession] Sending message with sessionId: ${sessionId}`);

    const userMessage = addMessage({
      sender: 'user',
      text: messageText.trim()
    });

    try {
      const wantsDetail = /(diagnos|procedure|step|walkthrough|how to|detailed|full)/i.test(messageText);
      if (wantsDetail) {
        const placeholder = addMessage({ sender: 'assistant', text: '' });
        const sseBase = 'http://localhost:3204';
        const es = new EventSource(`${sseBase}/api/agent/chat/stream?message=${encodeURIComponent(messageText.trim())}&sessionId=${encodeURIComponent(sessionId)}&detail=true`);
        let acc = '';
        const onMsg = (evt) => {
          try {
            const data = JSON.parse(evt.data || '{}');
            if (data?.delta) {
              acc += String(data.delta);
              setHistory(prev => prev.map(m => m.id === placeholder.id ? { ...m, text: acc } : m));
            }
            if (data?.done) {
              if (data?.structured) {
                setHistory(prev => prev.map(m => m.id === placeholder.id ? { ...m, text: { text: acc, structured: data.structured } } : m));
              }
              es.close();
            }
            if (data?.error) {
              es.close();
            }
          } catch {}
        };
        es.onmessage = onMsg;
        es.onerror = (err) => { 
          console.error('[useChatSession] SSE error, falling back to standard POST:', err);
          try { es.close(); } catch {} 
          // Fallback to standard POST request
          http.post('/api/agent/chat', {
            message: messageText.trim(),
            sessionId: sessionId,
            history: history,
            detail: false
          }).then(response => {
            if (response?.reply || response?.response) {
              const replyText = response.reply || response.response;
              const structured = response?.structured || null;
              setHistory(prev => prev.map(m => m.id === placeholder.id ? { ...m, text: structured ? { text: replyText, structured } : replyText } : m));
            }
          }).catch(fallbackErr => {
            console.error('[useChatSession] Fallback also failed:', fallbackErr);
            setHistory(prev => prev.map(m => m.id === placeholder.id ? { ...m, text: 'Connection error. Please try again.' } : m));
          });
        };
        return {};
      }

      const response = await http.post('/api/agent/chat', {
        message: messageText.trim(),
        sessionId: sessionId,
        history: history,
        detail: false
      });

      console.log(`[useChatSession] Received response:`, response);

      if (response?.reply || response?.response) {
        const replyText = response.reply || response.response;
        const structured = response?.structured || null;
        addMessage({ sender: 'assistant', text: structured ? { text: replyText, structured } : replyText });
      } else {
        throw new Error('No response received from server');
      }

      return response;
    } catch (error) {
      console.error('[useChatSession] Send message error:', error);
      
      // Unified error handling with consistent messaging
      const errorMessage = error.message?.includes('timeout') 
        ? "Request timed out. Please check your connection and try again."
        : error.message?.includes('network')
        ? "Network error. Please check your connection and try again."
        : "I'm experiencing technical difficulties. Please try again in a moment.";
      
      addMessage({
        sender: 'assistant',
        text: `${errorMessage} For gas emergencies, call Gas Emergency Service: 0800 111 999`
      });
      
      throw error;
    }
  }, [sessionId, addMessage, setHistory, history]);

  return { 
    sessionId, 
    history, 
    setHistory,
    addMessage,
    sendMessage,
    sessionStatus, 
    clearSession,
    isSessionExpired: isSessionExpired()
  };
};
