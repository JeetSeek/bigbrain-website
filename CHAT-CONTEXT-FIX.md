# BoilerBrain Chat Context Fix

## Issue
The BoilerBrain chat assistant was experiencing context retention issues, resulting in:
- Repeated introductory messages during ongoing conversations
- Generic fallback responses that ignored previous context
- Context mixing between different user sessions

## Root Cause Analysis
1. The LLM service (`boilerBrainLLMService.js`) was using a single global context object instead of session-specific contexts
2. This caused all users/sessions to share the same conversation context, leading to context loss or mixing
3. When multiple users were active, their contexts would overwrite each other

## Solution Implemented

### LLM Service Refactoring
1. Converted the single global `sessionContext` to a map of session-specific contexts
   ```javascript
   // Before:
   let sessionContext = createNewContext();
   
   // After:
   const sessionContexts = new Map();
   ```

2. Created a `getSessionContext` helper function to access/create session-specific context
   ```javascript
   function getSessionContext(sessionId = null) {
     // Generate default session ID if none provided
     const session = sessionId || `default_${Date.now()}`;
     
     // Create context if it doesn't exist for this session
     if (!sessionContexts.has(session)) {
       sessionContexts.set(session, createNewContext());
     }
     
     return sessionContexts.get(session);
   }
   ```

3. Updated all helper functions to accept and use `sessionId` parameter:
   - `updateContext(userMessage, sessionId)`
   - `loadSystemComponentSchema(sessionId)`
   - `extractSystemComponents(userMessage, sessionId)`
   - `factCheckCorrections(sessionId)`
   - `lookupFaultCode(faultCode, sessionId)`
   - `lookupSymptomBasedIssues(sessionId)`

4. Modified the exported API methods to work with session-specific contexts:
   ```javascript
   export const boilerBrainLLMService = {
     processMessage,
   
     // Expose session context for persistence/debugging
     getSessionContext(sessionId = null) {
       return { ...getSessionContext(sessionId) };
     },
   
     // Allow setting session context from saved state
     restoreSessionContext(savedContext, sessionId = null) {
       const sessionContext = getSessionContext(sessionId);
       // ...
     },
   
     // Clear session context
     clearSessionContext(sessionId = null) {
       const sessionContext = getSessionContext(sessionId);
       sessionContext.reset();
     },
   };
   ```

### Frontend Integration Verification
1. Confirmed ChatDock component correctly:
   - Maintains persistent session IDs via localStorage
   - Stores chat history per session in sessionStorage
   - Passes sessionId to the API in each request

2. Verified backend API correctly:
   - Extracts sessionId from requests
   - Passes it to LLM functions
   - Uses session store for persistence

### Context Recovery Mechanisms
1. Client-side recovery: Implemented sessionStorage-based history recovery
2. Server-side recovery: Utilizes contextRecoveryService for session state persistence

## Benefits

1. **Isolation**: Each user session now has its own context object
2. **Persistence**: Context is maintained throughout conversations
3. **Recovery**: Multiple recovery mechanisms prevent context loss
4. **Consistency**: Responses remain contextually relevant throughout the conversation

## Testing

1. Created test script (`test-chat-persistence.js`) to verify session context persistence
2. Implemented session-specific context tests with multiple parallel conversations
3. Added context retention verification based on conversation content

## Future Recommendations

1. Consider using a persistent database for long-term context storage beyond the current in-memory solution
2. Implement session timeouts and context pruning to prevent memory leaks
3. Add telemetry to monitor context retention success rates
4. Consider implementing state snapshots at key conversation points for better recovery options
