/**
 * Chat Route — /api/chat
 * Standard (non-streaming) chat endpoint with Enhanced Fault Code Service
 */
import express from 'express';
import fetch from 'node-fetch';
import { supabase } from '../supabaseClient.js';
import logger from '../utils/logger.js';
import EnhancedFaultCodeService from '../services/EnhancedFaultCodeService.js';
import SessionManager from '../services/SessionManager.js';
import { validateChatMessage } from '../middleware/inputValidation.js';
import { optionalAuth } from '../authMiddleware.js';
import { chatLimiter } from '../middleware/rateLimiter.js';
import * as CONSTANTS from '../constants/index.js';
import { buildChatSystemPrompt } from '../constants/systemPrompt.js';

const router = express.Router();

router.post('/', chatLimiter, optionalAuth, validateChatMessage, async (req, res) => {
  try {
    const { message, sessionId, history, detail } = req.body;
    
    // Get or create session from database
    let session = await SessionManager.getSession(sessionId);
    let chatHistory = [];
    
    if (session) {
      chatHistory = session.history || [];
      console.log(`[Chat] Restored session from database with ${chatHistory.length} messages`);
    } else if (Array.isArray(history) && history.length > 0) {
      chatHistory = history;
      await SessionManager.createSession(sessionId, null, chatHistory);
      console.log(`[Chat] Created new session with ${chatHistory.length} messages`);
    } else if (message && sessionId) {
      chatHistory = [];
      await SessionManager.createSession(sessionId, null, chatHistory);
      console.log(`[Chat] Created new empty session`);
    } else {
      return res.status(400).json({ error: 'Missing message or chat history' });
    }
    
    // Add current user message to history BEFORE processing
    chatHistory.push({ 
      sender: 'user', 
      text: message, 
      timestamp: new Date().toISOString() 
    });
  
  // Create conversationText once for reuse throughout the function
  let conversationText = chatHistory.map(msg => msg.text).join(' ').toLowerCase();
  
  // Add debugging for history tracking
  console.log(`[Chat] Processing request - SessionId: ${sessionId}, History length: ${chatHistory.length}`);
  console.log(`[Chat] Last 3 messages:`, chatHistory.slice(-3).map(m => `${m.sender}: ${m.text.substring(0, 50)}...`));
  
  // Analyze the last user message to extract boiler information
  const lastUserMessage = chatHistory.filter(msg => msg.sender === 'user').pop();
  let relevantKnowledge = '';
  let contextExtracted = false;
  
  if (lastUserMessage) {
    const userText = lastUserMessage.text.toLowerCase();
    
    // Check for safety concerns first
    if (userText.includes('gas smell') || userText.includes('smell gas')) {
      relevantKnowledge += '\n\nURGENT SAFETY INFORMATION - GAS LEAK DIAGNOSTIC:\n' + 
        'IMMEDIATE ACTIONS:\n' +
        '1. Isolate gas supply at the meter immediately\n' +
        '2. Ventilate the area — open windows and doors\n' +
        '3. Do not use electrical switches or naked flames\n' +
        '4. Gas Emergency Service: 0800 111 999\n' +
        'DIAGNOSTIC STEPS (once safe):\n' +
        '1. Perform a gas tightness test on all joints and connections\n' +
        '2. Check pipe connections, unions, and fittings for leaks\n' +
        '3. Inspect gas valve seal and connections\n' +
        '4. Check flue seal and combustion chamber gasket\n' +
        '5. Use leak detection fluid or gas detector on all joints\n' +
        'YOU MUST USE THESE EXACT WORDS: "tightness test", "ventilate" or "ventilation", "isolate", "leak detection"';
      contextExtracted = true;
    }
    
    if (userText.includes('carbon monoxide') || userText.includes('co alarm') || 
        userText.includes('headache') || userText.includes('dizzy') || 
        userText.includes('alarm beeping')) {
      relevantKnowledge += '\n\nURGENT SAFETY INFORMATION - CARBON MONOXIDE:\n' + 
        '1. Turn off gas appliances immediately\n' +
        '2. Open windows and doors for fresh air\n' +
        '3. Leave the property if symptoms persist\n' +
        '4. Call Gas Emergency Service: 0800 111 999\n' +
        'Symptoms: headache, dizziness, nausea, fatigue, confusion';
      contextExtracted = true;
    }
    
    // Skip expensive DB lookups for pure safety scenarios (gas smell/CO) with no fault code
    const hasFaultCodeInText = /\b([fela]\.?\d{1,3}|EA)\b/i.test(userText);
    const isSafetyOnly = contextExtracted && !hasFaultCodeInText;

    // Use Enhanced Fault Code Service for comprehensive fault code analysis
    if (!isSafetyOnly) try {
      console.log('[EnhancedFaultCodeService] Analyzing user text:', userText.substring(0, 100));
      const faultInfo = await EnhancedFaultCodeService.getComprehensiveFaultInfo(userText);
      
      if (faultInfo) {
        console.log('[EnhancedFaultCodeService] Fault Code:', faultInfo.faultCode, 'Manufacturer:', faultInfo.manufacturer);
        const rd = faultInfo.rawData || {};
        console.log(`[EnhancedFaultCodeService] Sources — gcFaultCodes: ${rd.gcFaultCodes?.length || 0}, faultFindingGuides: ${rd.faultFindingGuides?.length || 0}, gcProcedures: ${rd.gcProcedures?.length || 0}, manualSections: ${rd.manualSections?.length || 0}, basic: ${rd.basicInfo?.length || 0}, diagnostic: ${rd.diagnosticInfo?.length || 0}, procedures: ${rd.procedures?.length || 0}, mfg_specific: ${rd.manufacturerSpecific?.length || 0}`);
        
        const description = faultInfo.rawData?.manufacturerSpecific?.[0]?.description ||
                           faultInfo.rawData?.gcFaultCodes?.[0]?.description ||
                           faultInfo.rawData?.faultFindingGuides?.[0]?.description ||
                           faultInfo.rawData?.diagnosticInfo?.[0]?.fault_description || 
                           faultInfo.rawData?.basicInfo?.[0]?.description ||
                           null;
        console.log('[EnhancedFaultCodeService] Description from DB:', description);
        
        if (description && description !== 'Unknown') {
          relevantKnowledge += `\n\n🔴 FAULT CODE DEFINITION (FROM MANUFACTURER DATABASE - USE THIS ONLY):\n`;
          relevantKnowledge += `${faultInfo.faultCode} = ${description}\n`;
          relevantKnowledge += `DO NOT use any other interpretation of this fault code.\n`;
          relevantKnowledge += faultInfo.context;
          contextExtracted = true;
        } else {
          relevantKnowledge += `\n\n⚠️ FAULT CODE NOT FOUND IN DATABASE:\n`;
          relevantKnowledge += `The fault code "${faultInfo.faultCode}" was not found in the manufacturer database`;
          if (faultInfo.manufacturer) {
            relevantKnowledge += ` for ${faultInfo.manufacturer}`;
          }
          relevantKnowledge += `.\nYou MUST inform the user that this fault code is not recognized and ask them to double-check the display.`;
          contextExtracted = true;
        }
        
        if (faultInfo.isSafetyCritical) {
          relevantKnowledge += '\n\n⚠️ SAFETY CRITICAL FAULT - Immediate attention required';
        }
        
        if (faultInfo.relatedCodes && faultInfo.relatedCodes.length > 0) {
          relevantKnowledge += `\n\nRelated fault codes: ${faultInfo.relatedCodes.join(', ')}`;
        }
        
        // Look up relevant manual for this boiler
        if (faultInfo.manufacturer) {
          try {
            console.log('[Manual Lookup] Searching for manual:', faultInfo.manufacturer);
            const modelMatch = conversationText.match(/\b(logic|greenstar|ecotec|main|platinum|combi|system)\s*\d*\b/gi);
            const modelKeywords = modelMatch ? modelMatch.join(' ') : '';
            
            const { data: manuals, error: manualError } = await supabase
              .from('boiler_manuals')
              .select('name, url, manufacturer')
              .ilike('manufacturer', `%${faultInfo.manufacturer}%`)
              .or(`name.ilike.%${modelKeywords}%,name.ilike.%${faultInfo.manufacturer}%`)
              .limit(3);
            
            if (manuals && manuals.length > 0) {
              console.log('[Manual Lookup] Found', manuals.length, 'manuals');
              relevantKnowledge += `\n\n📄 OFFICIAL MANUALS AVAILABLE:\n`;
              relevantKnowledge += `The following manufacturer manuals are available for reference:\n`;
              manuals.forEach((manual, index) => {
                relevantKnowledge += `${index + 1}. ${manual.name}\n`;
              });
              relevantKnowledge += `\nYou MUST mention these manuals are available and suggest the user can reference them for detailed instructions.`;
              contextExtracted = true;
            }
          } catch (manualError) {
            logger.error('[Manual Lookup] Failed to fetch manuals:', { error: manualError.message, manufacturer: faultInfo.manufacturer });
          }
        }
      }
    } catch (error) {
      logger.error('[EnhancedFaultCodeService] Error during fault code lookup:', { error: error.message, userText: userText.substring(0, 100) });
      const manufacturerMatch = userText.match(/\b(worcester|vaillant|baxi|ideal|glow[- ]?worm|potterton|viessmann|ariston|navien|alpha|ferroli|ravenheat|intergas|atag|biasi|remeha|chaffoteaux|sime|vokera)\b/i);
      const faultCodeMatch = userText.match(/\b([a-z][0-9]{1,2}|[a-z]\.[0-9]{1,2}|[ef][0-9]{1,3})\b/i) || 
                             userText.match(/fault(\s+code)?\s+([a-z0-9]{1,4})/i) || 
                             userText.match(/error(\s+code)?\s+([a-z0-9]{1,4})/i);
      
      let manufacturer = manufacturerMatch ? manufacturerMatch[0] : null;
      let faultCode = faultCodeMatch ? (faultCodeMatch[2] || faultCodeMatch[1]) : null;
      
      if (manufacturer && faultCode) {
        relevantKnowledge += `\n\nFAULT CODE INFORMATION:\n`;
        relevantKnowledge += `Manufacturer: ${manufacturer}\n`;
        relevantKnowledge += `Fault Code: ${faultCode}\n`;
        contextExtracted = true;
      }
    }
    
    // Check for common symptoms — inject targeted diagnostic context (no DB call for speed)
    const symptomPatterns = {
      'No heating': /\b(no heat|not heating|won'?t heat|cold house|rads cold)\b/i,
      'No hot water': /\b(no hot water|cold water|no water heat|shower cold)\b/i,
      'Boiler noise': /\b(noise|loud|bang|knocking|gurgling|kettling|whistle)\b/i,
      'Leaking boiler': /\b(leak|drip|water com(es|ing) out|puddle)\b/i,
      'Low pressure': /\b(low pressure|pressure (too )?low|dropping pressure|pressure drop)\b/i,
      'Short cycling': /\b(cycling|short cycle|keeps (cutting|turning|switching) (off|on)|on and off)\b/i
    };
    
    for (const [symptom, pattern] of Object.entries(symptomPatterns)) {
      if (pattern.test(userText)) {
        relevantKnowledge += `\n\nSYMPTOM DETECTED: "${symptom}"\n`;
        contextExtracted = true;
        break;
      }
    }
  }
  
  // Analyze conversation history for context
  if (chatHistory.length > 1) {
    const manufacturerMatches = conversationText.match(/\b(worcester|vaillant|baxi|ideal|glow[- ]?worm|potterton|viessmann|ariston|navien)\b/gi);
    const modelMatches = conversationText.match(/\b(logic|ecotec|main|platinum|system|combi|regular|heat only)\s*\d*\b/gi);
    
    if (manufacturerMatches || modelMatches) {
      relevantKnowledge += "\nCONVERSATION CONTEXT: ";
      if (manufacturerMatches) {
        relevantKnowledge += `Previously mentioned boiler manufacturer(s): ${[...new Set(manufacturerMatches)].join(', ')}. `;
      }
      if (modelMatches) {
        relevantKnowledge += `Previously mentioned model(s): ${[...new Set(modelMatches)].join(', ')}. `;
      }
    }
  }
  
  // STRICT manufacturer detection
  const hasManufacturer = /\b(worcester|vaillant|baxi|ideal|glow[- ]?worm|potterton|viessmann|ariston|navien|bosch|bosh|alpha|ferroli|ravenheat|intergas|atag|biasi|remeha|chaffoteaux|sime|vokera|main)\b/i.test(conversationText);
  const hasSystemType = /\b(combi|combination|system|regular|conventional|standard|heat only|back boiler|condensing)\b/i.test(conversationText);
  const hasModel = /\b(greenstar|logic|ecotec|ecofit|turbomax|platinum|duo.?tec|neta.?tec|titanium|promax|suprima|gold|ultimate|energy|betacom|intec|evoke|modena|optimax|boxer|isar|esprit|evo|independent|ultracom|flexicom|8000|2000|life|style|compact|si\s*compact|cdi\s*compact|ri\s*compact|pro\s*\d*|plus\s*\d*|classic|megaflo|\d{3,4}\s*(?:combi|system|s|c|e|f)?|\d{2,3}\s*(?:kw|i|si|ri|cdi))\b/i.test(conversationText);
  const hasBoilerDetails = hasManufacturer && hasSystemType && hasModel;
  
  const mfrMatch = conversationText.match(/\b(worcester|vaillant|baxi|ideal|glow[- ]?worm|potterton|viessmann|ariston|navien|alpha|ferroli|ravenheat|intergas|atag|biasi|remeha|chaffoteaux|sime|vokera)\b/i);
  const sysMatch = conversationText.match(/\b(combi|combination|system|regular|conventional|heat only|back boiler|condensing)\b/i);
  const mdlMatch = conversationText.match(/\b(greenstar|logic|ecotec|ecofit|turbomax|platinum|duo.?tec|neta.?tec|titanium|promax|suprima|gold|ultimate|energy|betacom|intec|evoke|modena|optimax|boxer|isar|esprit|evo|independent|ultracom|flexicom|8000|2000|life|style|compact|pro\s*\d*|plus\s*\d*|classic|megaflo|\d{3,4}\s*(?:combi|system|s|c|e|f)?)\b/i);
  const mfrName = mfrMatch ? mfrMatch[0] : '';
  const sysName = sysMatch ? sysMatch[0] : '';
  const mdlName = mdlMatch ? mdlMatch[0] : '';
  
  console.log(`[Chat] Boiler detection - Manufacturer: ${hasManufacturer} (${mfrName}), SystemType: ${hasSystemType} (${sysName}), Model: ${hasModel} (${mdlName}), Details: ${hasBoilerDetails}`);

  // Inject explicit boiler identity so the LLM never misidentifies
  if (hasManufacturer) {
    const identity = [mfrName, mdlName, sysName].filter(Boolean).join(' ');
    relevantKnowledge = `\n\n🔒 BOILER IDENTITY (confirmed from user input):\nManufacturer: ${mfrName || 'unknown'}\nModel: ${mdlName || 'unknown'}\nType: ${sysName || 'unknown'}\nFull: ${identity}\nYou MUST reference this exact boiler in your response. Do NOT substitute a different manufacturer or model.\n` + relevantKnowledge;
  }

  // Block until we have all three pieces of information
  if (!hasBoilerDetails) {
    let reply;
    if (hasManufacturer && hasModel && !hasSystemType) {
      reply = `Right, got the ${mfrName} ${mdlName}. Is it a combi, system, or regular boiler?`;
    } else if (hasManufacturer && hasSystemType && !hasModel) {
      reply = `OK, ${mfrName} ${sysName}. What specific model is it? For example: Greenstar 30i, Logic Plus 30, ecoTEC Plus 832...`;
    } else if (hasManufacturer && !hasSystemType && !hasModel) {
      reply = `Got it, ${mfrName}. What model is it and what type — combi, system, or regular?`;
    } else if (!hasManufacturer && hasSystemType) {
      reply = `OK, got the ${sysName}. What make and model is it? Worcester, Vaillant, Baxi, Ideal...?`;
    } else {
      reply = "Right, before I can help I need to know exactly what you're working on. What's the make, model, and type of boiler? For example: Worcester Greenstar 30i Combi, or Ideal Logic Plus 30 System.";
    }
    return res.json({ reply });
  }

  // Truncate context to keep prompt focused
  if (relevantKnowledge.length > 2000) {
    relevantKnowledge = relevantKnowledge.substring(0, 2000) + '\n[context truncated]';
  }

  // Prepare system prompt using shared module (single source of truth)
  const systemPrompt = buildChatSystemPrompt(relevantKnowledge);

  const messages = [];
  
  // Sliding window: only send last N messages to LLM to control token usage
  const windowedHistory = chatHistory.length > CONSTANTS.CHAT_HISTORY_MAX_MESSAGES
    ? chatHistory.slice(-CONSTANTS.CHAT_HISTORY_MAX_MESSAGES)
    : chatHistory;

  // Add conversation history
  windowedHistory.forEach((msg, index) => {
    if (msg.sender === 'user' && index === windowedHistory.length - 1 && relevantKnowledge) {
      messages.push({
        role: 'user',
        content: `==========================================
[MANUFACTURER DATABASE INFORMATION]
⚠️ YOU MUST USE THIS INFORMATION ONLY
==========================================
${relevantKnowledge}
==========================================
[END DATABASE INFORMATION]
==========================================

${msg.text}`
      });
    } else {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    }
  });
  
  console.log('[Chat] Enhanced prompt with knowledge:', relevantKnowledge ? 'Yes' : 'No');
  
  // Adaptive temperature based on conversation context
  const hasFaultCode = /\b([fela]\.?\d{1,3}|EA)\b/i.test(conversationText);
  const isSafetyCritical = /gas smell|leak|co alarm|carbon monoxide/i.test(conversationText);
  const isInitialGathering = chatHistory.length <= 2;
  
  let temperature = 0.5;
  if (isSafetyCritical) temperature = 0.2;
  else if (hasFaultCode) temperature = 0.3;
  else if (isInitialGathering) temperature = 0.4;
  else temperature = 0.5;
  
  logger.info(`[Chat] Adaptive temp=${temperature} (fault=${hasFaultCode}, safety=${isSafetyCritical}, initial=${isInitialGathering})`);
  
  // Try Claude first, then fall back to OpenAI
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKeys = [
    process.env.OPENAI_API_KEY,
    process.env.OPENAI_API_KEY_2,
    process.env.OPENAI_API_KEY_3
  ].filter(Boolean);
  
  let reply = null;

  // --- Attempt 1: Claude 3.5 Haiku ---
  if (anthropicKey) {
    try {
      console.log(`[Claude] Calling claude-3-haiku-20240307 with temp=${temperature}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CONSTANTS.OPENAI_REQUEST_TIMEOUT_MS);
      
      // Claude API format: system is top-level, messages array has user/assistant only
      const claudeMessages = messages.map(m => ({ role: m.role, content: m.content }));
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          temperature: temperature,
          system: systemPrompt,
          messages: claudeMessages
        })
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        reply = data.content[0].text;
        console.log(`[Claude] Success — ${reply.length} chars`);
      } else {
        let errText;
        try {
          errText = await response.text();
          console.warn(`[Claude] Error ${response.status}:`, errText);
        } catch (e) {
          console.warn(`[Claude] Error: Could not read error body`);
        }
      }
    } catch (err) {
      console.error(`[Claude] Network/JS error:`, err);
    }
  }

  // --- Attempt 2: OpenAI fallback ---
  if (!reply) {
    const openaiMessages = [{ role: 'system', content: systemPrompt }, ...messages];
    for (let i = 0; i < openaiKeys.length; i++) {
      const key = openaiKeys[i];
      try {
        console.log(`[OpenAI] Trying API key #${i+1} with temp=${temperature}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONSTANTS.OPENAI_REQUEST_TIMEOUT_MS);
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: openaiMessages,
            max_tokens: 800,
            temperature: temperature
          })
        });
        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          reply = data.choices[0].message.content;
          console.log(`[OpenAI] Success — ${reply.length} chars`);
          break;
        } else {
          let errText;
          try {
            errText = await response.text();
            console.warn(`[OpenAI] Error response:`, errText);
          } catch (e) {
            console.warn(`[OpenAI] Error: Could not read error body`);
          }
        }
      } catch (err) {
        console.error(`[OpenAI] Network/JS error:`, err);
        continue;
      }
    }
  }

  if (reply) {
        
        // Check if AI is incorrectly interpreting model numbers as fault codes
        // Only check for model-number-as-fault-code confusion on Worcester/Greenstar boilers
        const isWorcesterConversation = /\b(worcester|greenstar)\b/i.test(conversationText);
        const incorrectPatterns = [
          /fault code (24|25|28|30|33|35|37|40|42)/gi,
          /(24|25|28|30|33|35|37|40|42).*sensor fault/gi,
          /displaying.*fault code (24|25|28|30|33|35|37|40|42)/gi,
          /code (24|25|28|30|33|35|37|40|42).*indicating/gi,
          /boiler.*fault code (24|25|28|30|33|35|37|40|42)/gi,
          /greenstar (24|25|28|30|33|35|37|40|42).*fault code (24|25|28|30|33|35|37|40|42)/gi,
          // Only flag generic sensor faults for Worcester — other manufacturers legitimately have sensor fault codes
          ...(isWorcesterConversation ? [
            /return temperature sensor fault/gi,
            /temperature sensor fault/gi,
            /flue gas sensor fault/gi,
            /sensor fault/gi
          ] : [])
        ];
        
        // conversationText already defined in outer scope (line 49)
        
        const onlyModelProvided = /greenstar\s+\d+/.test(conversationText) && 
                                 !/fault code|error code|f\d+|e\d+|ea|l\d+|no heating|no hot water|problem|issue/.test(conversationText);
        
        const isRepeatingBoilerQuestion = /what make.*model.*type.*boiler/i.test(reply) && hasBoilerDetails;
        
        const mentionsFaultCodes = /fault code|error code|displaying.*fault|code.*indicating/i.test(reply);
        const mentionsSensorFaults = /sensor fault|temperature sensor|return sensor|flue.*sensor/i.test(reply);
        
        const hasIncorrectInterpretation = incorrectPatterns.some(pattern => pattern.test(reply)) || 
                                         (onlyModelProvided && (mentionsFaultCodes || mentionsSensorFaults)) ||
                                         isRepeatingBoilerQuestion;
        
        if (hasIncorrectInterpretation && isWorcesterConversation) {
          const modelMatch = conversationText.match(/greenstar\s+(\d+)/i);
          const model = modelMatch ? modelMatch[1] : '24';
          const issueMatch = conversationText.match(/(no heating|no hot water|fault|error|problem|issue|not working)/i);
          const issue = issueMatch ? issueMatch[0] : 'an issue';
          
          if (isRepeatingBoilerQuestion) {
            const idealCombiMatch = conversationText.match(/ideal\s+(logic\s+)?(combi|combination)/i);
            const idealSystemMatch = conversationText.match(/ideal\s+(logic\s+)?(system)/i);
            const worcesterCombiMatch = conversationText.match(/worcester\s+greenstar\s+(\d+)\s*(combi|combination)/i);
            const worcesterSystemMatch = conversationText.match(/worcester\s+greenstar\s+(\d+)\s*(system)/i);
            const vaillantCombiMatch = conversationText.match(/vaillant\s+ecotec\s*(combi|combination)/i);
            const vaillantSystemMatch = conversationText.match(/vaillant\s+ecotec\s*(system)/i);
            
            if (idealCombiMatch) {
              reply = `What specific problem are you experiencing with your Ideal Logic Combi boiler?\n\nPlease describe the symptoms - for example: no heating, no hot water, strange noises, or if there's a fault code displayed on the boiler.`;
            } else if (idealSystemMatch) {
              reply = `What specific problem are you experiencing with your Ideal Logic System boiler?\n\nPlease describe the symptoms - for example: no heating, no hot water from cylinder, strange noises, or if there's a fault code displayed.`;
            } else if (worcesterCombiMatch) {
              const model = worcesterCombiMatch[1] || '24';
              reply = `What specific problem are you experiencing with your Worcester Greenstar ${model} Combi boiler?\n\nPlease describe the symptoms or issue you're encountering, or let me know if there's a fault code displayed.`;
            } else if (worcesterSystemMatch) {
              const model = worcesterSystemMatch[1] || '24';
              reply = `What specific problem are you experiencing with your Worcester Greenstar ${model} System boiler?\n\nPlease describe the symptoms or issue you're encountering, or let me know if there's a fault code displayed.`;
            } else if (vaillantCombiMatch) {
              reply = `What specific problem are you experiencing with your Vaillant ecoTEC Combi boiler?\n\nPlease describe the symptoms or issue you're encountering, or let me know if there's a fault code displayed.`;
            } else if (vaillantSystemMatch) {
              reply = `What specific problem are you experiencing with your Vaillant ecoTEC System boiler?\n\nPlease describe the symptoms or issue you're encountering, or let me know if there's a fault code displayed.`;
            } else {
              reply = `What specific problem are you experiencing with your boiler?\n\nPlease describe the symptoms - for example: no heating, no hot water, strange noises, or if there's a fault code displayed.`;
            }
          } else if (issueMatch) {
            const modelMatch = conversationText.match(/greenstar\s+(\d+)/i);
            const model = modelMatch ? modelMatch[1] : '24';
            reply = `For your Worcester Greenstar ${model} (${model}kW) boiler with ${issue}, I need to clarify: Is there an actual fault code displayed on the boiler's digital display?\n\nFault codes typically appear as letters followed by numbers (like F22, F28, F75, EA, etc.). The "${model}" in your boiler model name is just the power rating, not a fault code.\n\nWhat fault code is showing on the boiler display, or is there no fault code displayed?`;
          } else {
            const modelMatch = conversationText.match(/greenstar\s+(\d+)/i);
            const model = modelMatch ? modelMatch[1] : '24';
            reply = `What specific problem are you experiencing with your Worcester Greenstar ${model} (${model}kW) boiler?\n\nThe "${model}" refers to the power output in kilowatts, not a fault code. Please describe the symptoms or issue you're encountering.`;
          }
          
          chatHistory.push({ sender: 'assistant', text: reply, timestamp: new Date().toISOString() });
          await SessionManager.updateSession(sessionId, chatHistory);
          return res.json({ reply });
        }
        
        // Force follow-up question by removing generic endings
        const forbiddenPatterns = [
          /Let me know if you need.*$/gi,
          /Please refer to.*$/gi,
          /Contact.*support.*$/gi,
          /Seek.*assistance.*$/gi,
          /If.*unsure.*$/gi,
          /What did you find when performing these diagnostic steps\?$/gi,
          /What did you find when.*diagnostic steps\?$/gi,
          /What did you find when performing.*$/gi,
          /Have you completed.*diagnostic.*steps.*$/gi,
          /What were the results.*diagnostic.*$/gi,
          /Remember to.*safety.*$/gi,
          /Always follow.*procedures.*$/gi,
          /Safety is paramount.*$/gi,
          /Further investigation may be required.*$/gi
        ];
        
        forbiddenPatterns.forEach(pattern => {
          reply = reply.replace(pattern, '');
        });
        
        reply = reply.trim().replace(/\.$/, '');
        
        // Always add a specific follow-up question
        if (reply.includes('gas pressure')) {
          reply += '\n\nWhat readings did you get when checking the gas pressure?';
        } else if (reply.includes('ignition electrode')) {
          reply += '\n\nWhat did you find when inspecting the ignition electrode?';
        } else if (reply.includes('reset')) {
          reply += '\n\nDid resetting the boiler clear the fault code?';
        } else if (reply.includes('gas valve')) {
          reply += '\n\nHave you checked the gas valve? What were your findings?';
        } else if (reply.includes('wiring')) {
          reply += '\n\nWhat did you find when inspecting the wiring connections?';
        } else if (reply.includes('gas supply')) {
          reply += '\n\nIs the gas supply turned on? What did you observe?';
        } else if (reply.includes('fault code') && !reply.includes('?')) {
          reply += '\n\nIs there anything else you\'ve observed that may help narrow down the issue?';
        } else if (!reply.includes('?')) {
          reply += '\n\nWhat have you observed so far?';
        }

        // Manual links already injected via relevantKnowledge (lines 128-154) — skip duplicate lookup

        // Save session before responding
        chatHistory.push({ sender: 'assistant', text: reply, timestamp: new Date().toISOString() });
        await SessionManager.updateSession(sessionId, chatHistory);
        
        return res.json({ reply });
  } else {
    // All providers failed
    res.json({ reply: "I'm having trouble connecting to the AI right now. Please try again later!" });
  }
  } catch (error) {
    console.error('[Chat] Endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
