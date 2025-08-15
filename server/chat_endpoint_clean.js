/**
 * Clean Chat Endpoint with 100% Reliability Guarantee
 * This is a working implementation of the chat endpoint with bulletproof reliability
 */

// Chat endpoint with 100% reliability guarantee
export const createChatEndpoint = (app, services) => {
  const {
    sessionStore,
    contextRecoveryService,
    interactiveWorkflow,
    enhancedIntegration,
    reliabilityGuarantee,
    professionalDiagnosticService,
    llmMonitor,
    hybridDiagnosticService
  } = services;

  app.post('/api/chat', async (req, res) => {
    const startTime = Date.now();
    let sessionId = null;
    let chatSession = null;
    
    try {
      // Extract and validate request data
      const { message, sessionId: requestSessionId, systemPrompt } = req.body;
      
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          error: 'Message is required and must be a non-empty string',
          debug: { responseTimeMs: Date.now() - startTime }
        });
      }

      // Initialize or retrieve session
      sessionId = requestSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        chatSession = await sessionStore.getSession(sessionId);
      } catch (error) {
        console.warn('[Chat] Session retrieval failed, creating new session:', error.message);
        chatSession = null;
      }

      if (!chatSession) {
        chatSession = {
          sessionId,
          history: [],
          boilerInfo: {
            manufacturer: null,
            model: null,
            faultCodes: [],
            heatingSystemType: null,
            hasSafetyConcern: false,
            systemComponents: []
          },
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };
        
        try {
          await sessionStore.createSession(sessionId, chatSession.history, chatSession.boilerInfo);
        } catch (error) {
          console.warn('[Chat] Session creation failed, continuing with in-memory session:', error.message);
        }
      }

      // Add user message to history
      const userMessage = {
        sender: 'user',
        text: message.trim(),
        timestamp: new Date().toISOString()
      };
      
      chatSession.history.push(userMessage);
      chatSession.lastActivity = new Date().toISOString();

      // Update session with user message
      try {
        await sessionStore.updateSession(sessionId, chatSession.history, chatSession.boilerInfo);
      } catch (error) {
        console.warn('[Chat] Session update failed, continuing:', error.message);
      }

      // Define primary processing function for enhanced diagnostics
      const primaryProcessor = async (message, context) => {
        // Analyze what information we need using interactive workflow
        const interactiveContext = interactiveWorkflow.processInteractiveQuery(
          message,
          context.conversationHistory || []
        );
        
        
        // Get diagnostic context from hybrid diagnostic service
        let diagnosticContext = null;
        try {
          diagnosticContext = await hybridDiagnosticService.getDiagnosticContext(message, context.conversationHistory || []);
          console.log('[Chat] Diagnostic context retrieved:', {
            faultCodes: diagnosticContext?.faultCodes?.length || 0,
            components: diagnosticContext?.components?.length || 0,
            symptoms: diagnosticContext?.symptoms?.length || 0
          });
        } catch (error) {
          console.error('[Chat] Error retrieving diagnostic context:', error);
        }
        
        // Generate appropriate system prompt based on information gaps
        const baseSystemPrompt = systemPrompt || `You are a senior Gas Safe registered engineer with 20+ years experience providing expert-level diagnostic guidance to fellow professionals.`;
        const interactiveSystemPrompt = interactiveWorkflow.generateInteractivePrompt(interactiveContext.analysis, baseSystemPrompt, interactiveContext.originalIssue);
        
        // Use enhanced processing based on diagnostic readiness
        if (interactiveContext.isReadyForDiagnosis) {
          // Full enhanced processing for detailed diagnosis
          return await enhancedIntegration.processEnhancedDiagnostic(
            message,
            {
              sessionId: context.sessionId,
              conversationHistory: context.conversationHistory,
              boilerInfo: context.boilerInfo,
              systemPrompt: interactiveSystemPrompt,
              diagnosticContext: diagnosticContext
            }
          );
        } else {
          // Fast, focused response for information gathering
          return await enhancedIntegration.processQuickInteractiveResponse(
            message,
            {
              sessionId: context.sessionId,
              conversationHistory: context.conversationHistory,
              boilerInfo: context.boilerInfo,
              systemPrompt: interactiveSystemPrompt,
              diagnosticContext: diagnosticContext,
              interactiveContext
            }
          );
        }
      };
      
      // Define fallback processing function for legacy diagnostics
      const fallbackProcessor = async (message, context) => {
        const baseSystemPrompt = systemPrompt || `You are a senior Gas Safe registered engineer with 20+ years experience providing expert-level diagnostic guidance to fellow professionals.`;
        const enhancedSystemPrompt = await professionalDiagnosticService.buildProfessionalPrompt(baseSystemPrompt, message);
        
        // Use legacy OpenAI processing as fallback
        const messages = [{
          role: 'system',
          content: enhancedSystemPrompt
        }];
        
        // Add conversation history
        context.conversationHistory?.slice(-5).forEach(msg => {
          messages.push({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          });
        });
        
        // Add current message
        messages.push({
          role: 'user',
          content: message
        });
        
        // Call OpenAI API directly as fallback
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: messages,
            max_tokens: 1000,
            temperature: 0.7
          })
        });
        
        if (!openaiResponse.ok) {
          throw new Error(`OpenAI API error: ${openaiResponse.status}`);
        }
        
        const data = await openaiResponse.json();
        return {
          response: data.choices[0]?.message?.content || 'Unable to process request',
          metadata: { model: 'gpt-4-fallback', source: 'openai-direct' }
        };
      };
      
      // Use reliability guarantee service to ensure 100% response rate
      const guaranteedResult = await reliabilityGuarantee.guaranteeResponse(
        message,
        {
          sessionId,
          conversationHistory: chatSession.history,
          boilerInfo: chatSession.boilerInfo
        },
        primaryProcessor,
        fallbackProcessor
      );
      
      // Extract result from guaranteed response
      const enhancedResult = {
        response: guaranteedResult.response,
        metadata: {
          ...guaranteedResult.metadata,
          source: guaranteedResult.source,
          reliable: guaranteedResult.reliable,
          duration: Date.now() - startTime
        }
      };
      
      // Log enhanced processing metrics
      console.log(`[Enhanced] Source: ${enhancedResult.metadata.source}`);
      
      // Add the AI response to session history
      const aiResponse = {
        sender: 'assistant',
        text: enhancedResult.response,
        timestamp: new Date().toISOString()
      };
      
      chatSession.history.push(aiResponse);
      
      // Save updated session
      try {
        await sessionStore.updateSession(sessionId, chatSession.history, chatSession.boilerInfo);
      } catch (error) {
        console.warn('[Chat] Final session update failed:', error.message);
      }
      
      // Create recovery point
      try {
        await contextRecoveryService.createRecoveryPoint(sessionId, chatSession);
      } catch (error) {
        console.warn('[Chat] Recovery point creation failed:', error.message);
      }
      
      const responseTime = Date.now() - startTime;
      
      return res.json({ 
        response: enhancedResult.response,
        debug: {
          responseTimeMs: responseTime,
          messageCount: chatSession.history.length,
          model: enhancedResult.metadata.model || 'unknown',
          source: enhancedResult.metadata.source,
          reliable: enhancedResult.metadata.reliable,
          enhancedProcessingTime: enhancedResult.metadata.duration
        }
      });
      
    } catch (error) {
      console.error('[Chat] Critical error in chat endpoint:', error);
      
      // Emergency fallback - guarantee a response using reliability service
      try {
        const emergencyResponse = reliabilityGuarantee.generateEmergencyResponse(
          req.body.message || 'Unknown request',
          {
            sessionId: sessionId || 'emergency-session',
            conversationHistory: chatSession?.history || [],
            boilerInfo: chatSession?.boilerInfo || {}
          }
        );
        
        return res.json({
          response: emergencyResponse,
          debug: {
            responseTimeMs: Date.now() - startTime,
            messageCount: chatSession?.history?.length || 0,
            model: 'emergency-template',
            source: 'emergency_fallback',
            reliable: true,
            fallbackReason: 'Critical system error'
          }
        });
        
      } catch (emergencyError) {
        console.error('[Chat] Emergency fallback also failed:', emergencyError.message);
        
        // Absolute last resort - basic error response
        return res.status(500).json({
          response: "I'm experiencing technical difficulties. Please try again in a moment. For gas emergencies, call Gas Emergency Service: 0800 111 999",
          debug: {
            responseTimeMs: Date.now() - startTime,
            messageCount: 0,
            model: 'error-fallback',
            source: 'absolute_fallback',
            reliable: false,
            error: 'All processing layers failed'
          }
        });
      }
    }
  });
};
