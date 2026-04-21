import { useState, useEffect, useCallback, useRef } from 'react';
import { http } from '../utils/http';

// Function to generate a cryptographically secure UUID for session IDs
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers using crypto.getRandomValues
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
};

// Helper function to create a fresh chat history with a greeting
const createInitialHistory = (userName) => [
  {
    id: generateUUID(),
    sender: 'assistant',
    text: userName
      ? `Right ${userName}, what have you got? Tell me the make, model, system type and what's showing — fault code, symptoms, anything you've already checked.`
      : "Right, what have you got? Tell me the make, model, system type and what's showing — fault code, symptoms, anything you've already tried.",
    timestamp: new Date().toISOString(),
  }
];

// Session storage keys
const SESSION_ID_KEY = 'bb_chat_session_id';
const SESSION_TIMESTAMP_KEY = 'bb_session_timestamp';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const useChatSession = (userName) => {
  const historyRef = useRef([]);
  const backendSessionReadyRef = useRef(false);
  
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

  useEffect(() => {
    historyRef.current = history;
  }, [history]);
  
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
              if (backendSession?.exists) {
                backendSessionReadyRef.current = true;
              }
              if (backendSession?.history && Array.isArray(backendSession.history) && backendSession.history.length > 0) {
                setHistory(backendSession.history);
                // Update localStorage with backend data
                localStorage.setItem(`bb_chat_history_${storedSessionId}`, JSON.stringify(backendSession.history));
                return;
              }
            } catch (backendError) {
              // This is expected on first load - session doesn't exist in backend yet
              if (import.meta.env.DEV) {
              }
            }
            
            // Fallback to localStorage if backend sync fails
            const storedHistory = localStorage.getItem(`bb_chat_history_${storedSessionId}`);
            if (storedHistory) {
              const parsedHistory = JSON.parse(storedHistory);
              if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
                backendSessionReadyRef.current = false;
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
      backendSessionReadyRef.current = false;
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
      return [...prev, messageWithId];
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
    backendSessionReadyRef.current = false;
    
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

    const trimmedMessage = messageText.trim();
    addMessage({
      sender: 'user',
      text: trimmedMessage
    });

    try {
      const currentHistory = historyRef.current;
      const requestBody = {
        message: trimmedMessage,
        sessionId
      };

      if (currentHistory.length > 0) {
        requestBody.history = currentHistory;
      }

      let response;
      try {
        response = await http.post('/api/chat', requestBody);
      } catch (classicError) {
        response = await http.post('/api/agent/chat', {
          ...requestBody,
          detail: false
        });
      }

      if (response?.reply || response?.response) {
        const replyText = response.reply || response.response;
        const structured = response?.structured || null;
        const sources = Array.isArray(response?.sources) ? response.sources : null;
        backendSessionReadyRef.current = true;
        addMessage({
          sender: 'assistant',
          text: structured ? { text: replyText, structured } : replyText,
          sources,
        });
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
  }, [sessionId, addMessage]);

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
