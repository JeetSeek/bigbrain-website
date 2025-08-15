import { useState, useEffect, useCallback, useRef } from 'react';

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
    sender: 'ai',
    text: userName
      ? `Hey ${userName}! I'm your friendly BoilerBrain assistant. What make and model of boiler are we looking at today? 😊`
      : "Hey there! I'm your friendly BoilerBrain assistant. What make and model of boiler are we looking at today? 😊",
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

  // State for the chat history - always start fresh for new sessions
  const [history, setHistory] = useState(() => {
    // Try to restore session history from localStorage first
    try {
      const storedSessionId = localStorage.getItem(SESSION_ID_KEY);
      const storedTimestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY);
      const storedHistory = localStorage.getItem(`bb_chat_history_${storedSessionId}`);
      
      // Check if session is still valid (not expired)
      if (storedSessionId && storedTimestamp && storedHistory) {
        const sessionAge = Date.now() - parseInt(storedTimestamp);
        if (sessionAge < SESSION_TIMEOUT) {
          const parsedHistory = JSON.parse(storedHistory);
          if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
            return parsedHistory;
          }
        }
      }
    } catch (error) {
      console.warn('[useChatSession] Failed to restore session history:', error);
    }
    
    // Fallback to fresh history if restoration fails or session expired
    const initialHistory = createInitialHistory(userName);
    return initialHistory;
  });

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
  
  // Track last persisted message count to prevent unnecessary calls
  const lastPersistedCount = useRef(0);
  
  // Persist session to server (simplified, no sync conflicts)
  const persistToServer = useCallback(async (messages) => {
    if (syncInProgress.current || messages.length === 0) {
      return;
    }
    
    // Prevent duplicate persistence calls for same message count
    if (messages.length === lastPersistedCount.current) {
      return;
    }
    
    syncInProgress.current = true;
    
    try {
      const response = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          history: messages,
          userName,
          action: 'persist' // Explicitly persist, don't sync
        })
      });
      
      if (response.ok) {
        lastPersistedCount.current = messages.length;
        setSessionStatus('active');
      } else {
        console.warn('[useChatSession] Server persist failed:', response.status);
        setSessionStatus('error');
      }
    } catch (error) {
      console.error('[useChatSession] Server persist error:', error);
      setSessionStatus('error');
    } finally {
      syncInProgress.current = false;
    }
  }, [sessionId, userName]);
  
  // Effect to save history to session storage and persist to server
  useEffect(() => {
    try {
      const key = getSessionStorageKey();
      sessionStorage.setItem(key, JSON.stringify(history));
      
      // Persist to server with debouncing - only for new messages
      if (history.length > 1 && history.length !== lastPersistedCount.current) {
        const persistTimer = setTimeout(() => {
          persistToServer(history);
        }, 2000); // Increased debounce to 2 seconds
        return () => clearTimeout(persistTimer);
      }
    } catch (error) {
      console.error('[useChatSession] Error saving chat history:', error);
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

  return { 
    sessionId, 
    history, 
    setHistory,
    addMessage,
    sessionStatus, 
    clearSession,
    isSessionExpired: isSessionExpired()
  };
};
