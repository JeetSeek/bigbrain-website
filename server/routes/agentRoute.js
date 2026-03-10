/**
 * Agent Routes — /api/agent/chat and /api/agent/chat/stream
 * SSE streaming and non-streaming agent endpoints with tool calling
 */
import express from 'express';
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';
import logger from '../utils/logger.js';
import EnhancedFaultCodeService from '../services/EnhancedFaultCodeService.js';
import SessionManager from '../services/SessionManager.js';
import AgentTools from '../services/AgentTools.js';
import { validateChatMessage } from '../middleware/inputValidation.js';
import { optionalAuth } from '../authMiddleware.js';
import { chatLimiter } from '../middleware/rateLimiter.js';
import * as CONSTANTS from '../constants/index.js';
import { buildAgentSystemPrompt, buildStreamingSystemPrompt } from '../constants/systemPrompt.js';

const router = express.Router();

// ─── GET /api/agent/chat/stream — SSE streaming endpoint ────────────────────
router.get('/stream', chatLimiter, optionalAuth, async (req, res) => {
  try {
    const message = String(req.query.message || '');
    const sessionId = req.query.sessionId ? String(req.query.sessionId) : null;
    const detail = (String(req.query.detail || '').toLowerCase() === 'true') || (String(req.query.detail || '') === '1');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
    const end = () => res.end();

    // Restore session history
    let chatHistory = [];
    if (sessionId) {
      try {
        const ses = await SessionManager.getSession(sessionId);
        if (ses?.history) chatHistory = ses.history;
      } catch (e) { logger.warn('[Stream] Session restore failed:', e.message); }
    }
    chatHistory.push({ sender: 'user', text: message, timestamp: new Date().toISOString() });

    const extracted = EnhancedFaultCodeService.extractFaultInfo(message) || {};

    // Build system prompt from shared module (single source of truth)
    const system = buildStreamingSystemPrompt();

    const toOpenAIMessages = [{ role: 'system', content: system }];
    chatHistory.forEach((m) => toOpenAIMessages.push({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

    if (extracted && (extracted.manufacturer || extracted.model || extracted.systemType || extracted.faultCode)) {
      const ctxParts = [];
      if (extracted.manufacturer) ctxParts.push(`manufacturer=${extracted.manufacturer}`);
      if (extracted.model) ctxParts.push(`model=${extracted.model}`);
      if (extracted.systemType) ctxParts.push(`systemType=${extracted.systemType}`);
      if (extracted.faultCode) ctxParts.push(`faultCode=${extracted.faultCode}`);
      if (ctxParts.length > 0) {
        toOpenAIMessages.push({ role: 'system', content: `Context: ${ctxParts.join(' | ')}` });
      }
    }

    const preToolResults = [];
    let modelTipText = '';

    // Parallelise independent pre-tool DB queries
    const preToolPromises = [];
    if (extracted?.manufacturer) {
      preToolPromises.push(
        AgentTools.search_manuals({ manufacturer: extracted.manufacturer, model: extracted?.model || null, limit: 1 })
          .then(r2 => ({ role: 'tool', tool_call_id: 'pre_2', name: 'search_manuals', content: JSON.stringify(r2) }))
          .catch(() => null)
      );
    }
    if ((extracted?.manufacturer || extracted?.model) && !extracted?.faultCode) {
      preToolPromises.push(
        AgentTools.get_symptom_guidance({ manufacturer: extracted?.manufacturer || null, model: extracted?.model || null, symptoms: String(message || ''), limit: 5 })
          .then(r4 => ({ role: 'tool', tool_call_id: 'pre_4', name: 'get_symptom_guidance', content: JSON.stringify(r4) }))
          .catch(() => null)
      );
    }
    if (extracted?.faultCode) {
      preToolPromises.push(
        AgentTools.get_fault_info({ manufacturer: extracted?.manufacturer || null, fault_code: extracted?.faultCode || null, user_text: String(message || '') })
          .then(r1 => {
            if (r1?.modelTips) modelTipText = String(r1.modelTips);
            return { role: 'tool', tool_call_id: 'pre_1', name: 'get_fault_info', content: JSON.stringify(r1) };
          })
          .catch(() => null)
      );
      preToolPromises.push(
        AgentTools.get_verified_knowledge({ fault_code: extracted.faultCode, manufacturer: extracted?.manufacturer || null, model: extracted?.model || null, limit: 1 })
          .then(r3 => ({ role: 'tool', tool_call_id: 'pre_3', name: 'get_verified_knowledge', content: JSON.stringify(r3) }))
          .catch(() => null)
      );
    }
    const preToolSettled = await Promise.all(preToolPromises);
    preToolSettled.forEach(r => { if (r) preToolResults.push(r); });

    // Build allowed URLs from manuals only
    const allowedUrls = new Set();
    preToolResults
      .filter((t) => t.name === 'search_manuals')
      .forEach((t) => {
        try {
          const items = (JSON.parse(t.content || '{}')?.items) || [];
          items.forEach((m) => { if (m?.url) allowedUrls.add(String(m.url)); });
        } catch {}
      });

    // Model-only flow: emit header immediately and end
    if (!extracted?.faultCode) {
      const displayMap = CONSTANTS.MANUFACTURER_DISPLAY_MAP;
      const parts = [];
      if (extracted?.manufacturer) {
        const mfRaw = String(extracted.manufacturer).toLowerCase();
        const displayMf = displayMap[mfRaw] || (mfRaw.charAt(0).toUpperCase() + mfRaw.slice(1));
        parts.push(`Make: ${displayMf}`);
      }
      if (extracted?.model) parts.push(`Model: ${extracted.model}`);
      if (extracted?.systemType) {
        const sys = String(extracted.systemType);
        parts.push(`System: ${sys.charAt(0).toUpperCase() + sys.slice(1)}`);
      }
      const header = parts.join(' | ');
      const ask = 'Please provide the displayed fault code or a brief description of the symptoms.';
      const headerText = header ? `${header}\n\n${ask}` : ask;
      send({ delta: headerText + '\n' });

      // Append Sources
      let sourcesText = '';
      try {
        const manuals = preToolResults
          .filter((t) => t.name === 'search_manuals')
          .flatMap((t) => { try { return (JSON.parse(t.content || '{}')?.items) || []; } catch { return []; } })
          .slice(0, 1);
        const knowledge = preToolResults
          .filter((t) => t.name === 'get_verified_knowledge')
          .flatMap((t) => { try { return (JSON.parse(t.content || '{}')?.items) || []; } catch { return []; } })
          .slice(0, 1);
        if (manuals.length > 0 || knowledge.length > 0) {
          sourcesText += '\nSources:';
          manuals.forEach((m) => {
            const n = m?.name ? String(m.name) : 'Manual';
            const mf = m?.manufacturer ? ` (${m.manufacturer})` : '';
            const url = m?.url ? String(m.url) : '';
            if (url) sourcesText += `\n- [Manual] ${n}${mf}: ${url}`;
          });
          knowledge.forEach((k) => {
            const title = (k?.title || k?.summary || k?.note || k?.content || '').toString().slice(0, 120);
            const fc = k?.fault_code ? ` [${k.fault_code}]` : '';
            const mf = k?.manufacturer ? ` (${k.manufacturer})` : '';
            if (title) sourcesText += `\n- [Knowledge] ${title}${fc}${mf}`;
          });
        }
      } catch {}
      if (sourcesText) send({ delta: sourcesText });

      // Build structured and persist session
      const make = extracted?.manufacturer ? (displayMap[String(extracted.manufacturer).toLowerCase()] || extracted.manufacturer) : null;
      const model = extracted?.model || null;
      const sysType = extracted?.systemType ? (String(extracted.systemType).charAt(0).toUpperCase() + String(extracted.systemType).slice(1)) : null;
      const structured = { header: { make, model, system: sysType, faultCode: null }, bullets: [], steps: [], cautions: [], parts: [], measurements: [], sources: { manuals: Array.from(allowedUrls).map((u) => ({ type: 'manual', title: 'Manual', manufacturer: make, gc_number: null, url: u })), knowledge: [] } };
      try {
        const historyNow = Array.isArray(chatHistory) ? [...chatHistory, { sender: 'assistant', text: headerText + (sourcesText ? ('\n' + sourcesText) : ''), timestamp: new Date().toISOString() }] : [];
        if (sessionId) await SessionManager.updateSession(sessionId, historyNow);
      } catch (e) { logger.warn('[Stream] Session persist failed:', e.message); }
      send({ done: true, structured });
      return end();
    }

    // Fault present: stream from OpenAI
    const openaiKeys = [process.env.OPENAI_API_KEY, process.env.OPENAI_API_KEY_2, process.env.OPENAI_API_KEY_3].filter(Boolean);

    // Include preTool results as tool messages
    preToolResults.forEach((t) => toOpenAIMessages.push(t));

    // Model tip preface
    if (modelTipText) send({ delta: `Model tip: ${modelTipText}\n\n` });

    async function getStream(messages) {
      for (let i = 0; i < openaiKeys.length; i++) {
        const key = openaiKeys[i];
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), CONSTANTS.OPENAI_REQUEST_TIMEOUT_MS);
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({ model: 'gpt-4o-mini', messages, stream: true, tool_choice: 'none', temperature: detail ? 0.25 : 0.2, max_tokens: detail ? 900 : 600, frequency_penalty: 0.35, presence_penalty: 0 })
          });
          clearTimeout(timeout);
          if (!response.ok) continue;
          return response.body;
        } catch (e) { logger.warn('[Stream] OpenAI key failed:', e.message); continue; }
      }
      return null;
    }

    const stream = await getStream(toOpenAIMessages);
    if (!stream) {
      send({ delta: 'Sorry, I could not generate a response right now.' });
      send({ done: true });
      return end();
    }

    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finalBody = modelTipText ? `Model tip: ${modelTipText}\n\n` : '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop();
      for (const p of parts) {
        const line = p.trim();
        if (!line.startsWith('data:')) continue;
        const dataStr = line.slice(5).trim();
        if (dataStr === '[DONE]') { buffer = ''; break; }
        try {
          const obj = JSON.parse(dataStr);
          const raw = obj?.choices?.[0]?.delta?.content || '';
          if (raw) {
            // Sanitize: remove disallowed URLs and instructive lines
            let sanitized = raw.replace(/https?:\/\/\S+/g, (u) => allowedUrls.has(u) ? u : '');
            const instructive = /(\brefer to|\bsee|\bcheck|\bconsult|\bvisit|\bread)\b[^\n]{0,160}\b(manual|guide|documentation|docs|website|page|link|bulletin|datasheet|procedure)\b/i;
            const chunks = sanitized.split('\n');
            const filtered = chunks.filter((ln) => !instructive.test(ln));
            sanitized = filtered.join('\n');
            if (sanitized) {
              finalBody += sanitized;
              send({ delta: sanitized });
            }
          }
        } catch {}
      }
    }

    // Append Sources
    let sourcesText = '';
    let structuredSources = { manuals: [], knowledge: [] };
    try {
      const manuals = preToolResults
        .filter((t) => t.name === 'search_manuals')
        .flatMap((t) => { try { return (JSON.parse(t.content || '{}')?.items) || []; } catch { return []; } })
        .slice(0, 1);
      const knowledge = preToolResults
        .filter((t) => t.name === 'get_verified_knowledge')
        .flatMap((t) => { try { return (JSON.parse(t.content || '{}')?.items) || []; } catch { return []; } })
        .slice(0, 1);
      if (manuals.length > 0 || knowledge.length > 0) {
        sourcesText += '\n\nSources:';
        manuals.forEach((m) => {
          const n = m?.name ? String(m.name) : 'Manual';
          const mf = m?.manufacturer ? ` (${m.manufacturer})` : '';
          const url = m?.url ? String(m.url) : '';
          if (url) sourcesText += `\n- [Manual] ${n}${mf}: ${url}`;
          structuredSources.manuals.push({ type: 'manual', title: n, manufacturer: m?.manufacturer || null, gc_number: m?.gc_number || null, url });
        });
        knowledge.forEach((k) => {
          const title = (k?.title || k?.summary || k?.note || k?.content || '').toString().slice(0, 120);
          const fc = k?.fault_code ? ` [${k.fault_code}]` : '';
          const mf = k?.manufacturer ? ` (${k.manufacturer})` : '';
          if (title) sourcesText += `\n- [Knowledge] ${title}${fc}${mf}`;
          structuredSources.knowledge.push({ type: 'knowledge', title, fault_code: k?.fault_code || null, manufacturer: k?.manufacturer || null });
        });
      }
    } catch {}
    if (sourcesText) {
      send({ delta: sourcesText });
      finalBody += sourcesText;
    }

    // Build structured
    let structured = null;
    try {
      const displayMap = CONSTANTS.MANUFACTURER_DISPLAY_MAP;
      const make = extracted?.manufacturer ? (displayMap[String(extracted.manufacturer).toLowerCase()] || extracted.manufacturer) : null;
      const model = extracted?.model || null;
      const sysType = extracted?.systemType ? (String(extracted.systemType).charAt(0).toUpperCase() + String(extracted.systemType).slice(1)) : null;
      const faultCode = extracted?.faultCode || null;
      const idxSrc = finalBody.indexOf('\n\nSources:');
      const mainBody = idxSrc >= 0 ? finalBody.slice(0, idxSrc) : finalBody;
      const bodyLines = mainBody.split('\n').map((l) => l.trim()).filter(Boolean);
      const bullets = bodyLines.filter((l) => /^[-•—]\s+/.test(l)).map((l) => l.replace(/^[-•—]\s+/, ''));
      const steps = bodyLines.filter((l) => /^\d+[\.)]\s+/.test(l)).map((l) => l.replace(/^\d+[\.)]\s+/, ''));
      const cautions = bodyLines.filter((l) => /(safety|caution|warning|danger)/i.test(l));
      const partsList = (() => {
        const out = new Set();
        const partWords = ['electrode','spark generator','ignition module','gas valve','fan','pump','diverter valve','pcb','pressure sensor','flame sensor','thermostat'];
        bodyLines.forEach((l) => partWords.forEach((p) => { if (new RegExp(`\\b${p.replace(/\s+/g,'\\s+')}\\b`, 'i').test(l)) out.add(p); }));
        return Array.from(out);
      })();
      const measurements = bodyLines.filter((l) => /(\b\d+(\.\d+)?\s*(bar|mbar|kpa|pa|v|vac|vdc|ohm|Ω|ma|a|hz|kw|°c|c)\b)/i.test(l));
      structured = { header: { make, model, system: sysType, faultCode }, bullets, steps, cautions, parts: partsList, measurements, sources: structuredSources };
    } catch {}

    // Persist session
    try {
      if (sessionId) {
        const historyNow = Array.isArray(chatHistory) ? [...chatHistory, { sender: 'assistant', text: finalBody, timestamp: new Date().toISOString() }] : [];
        await SessionManager.updateSession(sessionId, historyNow);
      }
    } catch (e) { logger.warn('[Stream] Session persist failed:', e.message); }

    send({ done: true, structured });
    end();
  } catch (error) {
    try { res.write(`data: ${JSON.stringify({ error: 'stream_error' })}\n\n`); } catch {}
    res.end();
  }
});

// ─── POST /api/agent/chat — Non-streaming agent endpoint ────────────────────
router.post('/', chatLimiter, optionalAuth, validateChatMessage, async (req, res) => {
  try {
    const { message, sessionId, history, detail } = req.body;
    const rid = randomUUID();
    logger.info(`[Agent][${rid}] POST /api/agent/chat msgLen=${(message||'').length} sessionId=${sessionId||'-'}`);
    if (!message) return res.status(400).json({ error: 'Missing message' });

    let session = await SessionManager.getSession(sessionId);
    let chatHistory = [];
    if (session) {
      chatHistory = session.history || [];
    } else if (Array.isArray(history)) {
      chatHistory = history;
      if (sessionId) await SessionManager.createSession(sessionId, null, chatHistory);
    } else if (sessionId) {
      await SessionManager.createSession(sessionId, null, []);
    }

    chatHistory.push({ sender: 'user', text: message, timestamp: new Date().toISOString() });
    
    // Check if we have required boiler information FIRST
    const conversationText = chatHistory.map(m => m.text || '').join(' ').toLowerCase();
    const hasManufacturer = /\b(worcester|vaillant|baxi|ideal|glow ?worm|potterton|viessmann|ariston|navien|bosch|bosh|alpha|ferroli|ravenheat|intergas|atag|biasi|remeha|chaffoteaux|sime|vokera|main)\b/i.test(conversationText);
    const hasSystemType = /\b(combi|combination|system|regular|conventional|standard|heat only|back boiler|condensing)\b/i.test(conversationText);
    const hasModel = /\b(greenstar|logic|ecotec|ecofit|turbomax|platinum|duo.?tec|neta.?tec|titanium|promax|suprima|gold|ultimate|energy|betacom|intec|evoke|modena|optimax|boxer|isar|esprit|evo|independent|ultracom|flexicom|8000|2000|life|style|compact|si\s*compact|cdi\s*compact|ri\s*compact|\d{2,3}\s*(?:kw|i|si|ri|cdi))\b/i.test(conversationText);
    
    // Require ALL THREE before proceeding with diagnostics
    if (!hasManufacturer || !hasSystemType || !hasModel) {
      const mfrMatch = conversationText.match(/\b(worcester|vaillant|baxi|ideal|glow ?worm|potterton|viessmann|ariston|navien|alpha|ferroli|ravenheat|intergas|atag|biasi|remeha|chaffoteaux|sime|vokera)\b/i);
      const sysMatch = conversationText.match(/\b(combi|combination|system|regular|conventional|heat only|back boiler|condensing)\b/i);
      const mdlMatch = conversationText.match(/\b(greenstar|logic|ecotec|ecofit|turbomax|platinum|duo.?tec|neta.?tec|titanium|promax|suprima|gold|ultimate|energy|betacom|intec|evoke|modena|optimax|boxer|isar|esprit|evo|independent|ultracom|flexicom|8000|2000|life|style|compact)\b/i);
      const mfrName = mfrMatch ? mfrMatch[0] : '';
      const sysName = sysMatch ? sysMatch[0] : '';
      const mdlName = mdlMatch ? mdlMatch[0] : '';
      
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
      
      chatHistory.push({ sender: 'assistant', text: reply, timestamp: new Date().toISOString() });
      if (sessionId) await SessionManager.updateSession(sessionId, chatHistory);
      return res.json({ reply });
    }

    const detailKeywords = /(diagnos|procedure|step|walkthrough|how to|detailed|full)/i;
    const detailedMode = (detail === true) || detailKeywords.test(String(message || ''));
    
    // Adaptive temperature
    const hasFaultCodeAgent = /\b([fela]\.?\d{1,3}|EA)\b/i.test(conversationText);
    const isSafetyCriticalAgent = /gas smell|leak|co alarm|carbon monoxide/i.test(conversationText);
    const agentTemp = isSafetyCriticalAgent ? 0.3 : hasFaultCodeAgent ? 0.5 : detailedMode ? 0.4 : 0.6;

    let systemPrompt = buildAgentSystemPrompt('');
    
    if (String(process.env.DB_ONLY_MODE || 'false').toLowerCase() === 'true') {
      systemPrompt += `\n\nDB-ONLY: Use ONLY tool results. If insufficient, ask ONE clarifying question. No invented data.`;
    }

    const toOpenAIMessages = [];
    toOpenAIMessages.push({ role: 'system', content: systemPrompt });
    chatHistory.forEach((m) => {
      const t = m?.text;
      const s = typeof t === 'string' ? t : (t && typeof t === 'object' && typeof t.text === 'string' ? t.text : '');
      toOpenAIMessages.push({ role: m.sender === 'user' ? 'user' : 'assistant', content: s });
    });

    const extracted = EnhancedFaultCodeService.extractFaultInfo(String(message || '')) || {};
    logger.info(`[Agent][${rid}] extracted manufacturer=${extracted.manufacturer||'-'} model=${extracted.model||'-'} system=${extracted.systemType||'-'} fault=${extracted.faultCode||'-'}`);
    // Detect if a prior message in this session contained a fault code
    let hasPriorFaultMention = false;
    try {
      const historyText = (Array.isArray(chatHistory) ? chatHistory : [])
        .map((m) => {
          const t = m?.text;
          return typeof t === 'string' ? t : (t && typeof t === 'object' && typeof t.text === 'string' ? t.text : '');
        })
        .join('\n');
      const faultRegex = /\b(?:[FfEeLlAa]\.?\d{1,3}|EA)\b/;
      hasPriorFaultMention = faultRegex.test(historyText);
    } catch (e) { logger.warn('[Agent] Prior fault detection failed:', e.message); }
    const preToolCalls = [];
    const preToolResults = [];
    if (extracted && (extracted.manufacturer || extracted.model || extracted.systemType || extracted.faultCode)) {
      const ctxParts = [];
      if (extracted.manufacturer) ctxParts.push(`manufacturer=${extracted.manufacturer}`);
      if (extracted.model) ctxParts.push(`model=${extracted.model}`);
      if (extracted.systemType) ctxParts.push(`systemType=${extracted.systemType}`);
      if (extracted.faultCode) ctxParts.push(`faultCode=${extracted.faultCode}`);
      if (ctxParts.length > 0) {
        toOpenAIMessages.push({ role: 'system', content: `Context: ${ctxParts.join(' | ')}` });
      }
    }
    // Build pre-tool call descriptors and parallelise independent DB queries
    const agentPreToolPromises = [];
    if (extracted?.manufacturer) {
      const tc2 = { id: 'pre_2', type: 'function', function: { name: 'search_manuals', arguments: JSON.stringify({ manufacturer: extracted.manufacturer, model: extracted?.model || null, limit: 1 }) } };
      preToolCalls.push(tc2);
      agentPreToolPromises.push(
        (async () => { const t0 = Date.now(); const r2 = await AgentTools.search_manuals({ manufacturer: extracted.manufacturer, model: extracted?.model || null, limit: 1 }); logger.info(`[Agent][${rid}] tool search_manuals dt=${Date.now()-t0}ms items=${(r2?.items||[]).length}`); return { role: 'tool', tool_call_id: tc2.id, name: 'search_manuals', content: JSON.stringify(r2) }; })().catch(() => null)
      );
    }
    if ((extracted?.manufacturer || extracted?.model) && !extracted?.faultCode) {
      const tc4 = { id: 'pre_4', type: 'function', function: { name: 'get_symptom_guidance', arguments: JSON.stringify({ manufacturer: extracted?.manufacturer || null, model: extracted?.model || null, symptoms: String(message || ''), limit: 5 }) } };
      preToolCalls.push(tc4);
      agentPreToolPromises.push(
        (async () => { const t0 = Date.now(); const r4 = await AgentTools.get_symptom_guidance({ manufacturer: extracted?.manufacturer || null, model: extracted?.model || null, symptoms: String(message || ''), limit: 5 }); logger.info(`[Agent][${rid}] tool get_symptom_guidance dt=${Date.now()-t0}ms items=${(r4?.items||[]).length}`); return { role: 'tool', tool_call_id: tc4.id, name: 'get_symptom_guidance', content: JSON.stringify(r4) }; })().catch(() => null)
      );
    }
    if (extracted?.faultCode) {
      const tc1 = { id: 'pre_1', type: 'function', function: { name: 'get_fault_info', arguments: JSON.stringify({ manufacturer: extracted?.manufacturer || null, fault_code: extracted?.faultCode || null, user_text: String(message || '') }) } };
      preToolCalls.push(tc1);
      agentPreToolPromises.push(
        (async () => { const t0 = Date.now(); const r1 = await AgentTools.get_fault_info({ manufacturer: extracted?.manufacturer || null, fault_code: extracted?.faultCode || null, user_text: String(message || '') }); logger.info(`[Agent][${rid}] tool get_fault_info dt=${Date.now()-t0}ms found=${!!r1?.found}`); return { role: 'tool', tool_call_id: tc1.id, name: 'get_fault_info', content: JSON.stringify(r1) }; })().catch(() => null)
      );
      const tc3 = { id: 'pre_3', type: 'function', function: { name: 'get_verified_knowledge', arguments: JSON.stringify({ fault_code: extracted.faultCode, manufacturer: extracted?.manufacturer || null, limit: 1 }) } };
      preToolCalls.push(tc3);
      agentPreToolPromises.push(
        (async () => { const t0 = Date.now(); const r3 = await AgentTools.get_verified_knowledge({ fault_code: extracted.faultCode, manufacturer: extracted?.manufacturer || null, limit: 1 }); logger.info(`[Agent][${rid}] tool get_verified_knowledge dt=${Date.now()-t0}ms items=${(r3?.items||[]).length}`); return { role: 'tool', tool_call_id: tc3.id, name: 'get_verified_knowledge', content: JSON.stringify(r3) }; })().catch(() => null)
      );
    }
    const agentSettled = await Promise.all(agentPreToolPromises);
    agentSettled.forEach(r => { if (r) preToolResults.push(r); });
    if (preToolCalls.length > 0) {
      toOpenAIMessages.push({ role: 'assistant', content: '', tool_calls: preToolCalls });
      preToolResults.forEach((t) => toOpenAIMessages.push(t));
    }

    // Fast-path: answer identity questions without LLM
    try {
      const lowerMsg = String(message || '').toLowerCase();
      const askMake = /(what\s+(boiler\s+)?(make|brand|manufacturer)|which\s+brand)/i.test(lowerMsg);
      const askModel = /(what\s+(boiler\s+)?model|which\s+model)/i.test(lowerMsg);
      if ((askMake || askModel)) {
        const displayMap = CONSTANTS.MANUFACTURER_DISPLAY_MAP;
        let make = extracted?.manufacturer || null;
        let model = extracted?.model || null;
        let systemType = extracted?.systemType || null;
        try {
          if (!make) {
            const mItem = preToolResults
              .filter((t) => t.name === 'search_manuals')
              .map((t) => { try { return (JSON.parse(t.content || '{}')?.items)||[]; } catch { return []; } })
              .flat()[0];
            if (mItem?.manufacturer) make = mItem.manufacturer;
            if (!model && mItem?.name) model = mItem.name;
          }
          if (!make) {
            const kItem = preToolResults
              .filter((t) => t.name === 'get_verified_knowledge')
              .map((t) => { try { return (JSON.parse(t.content || '{}')?.items)||[]; } catch { return []; } })
              .flat()[0];
            if (kItem?.manufacturer) make = kItem.manufacturer;
          }
        } catch {}
        try {
          if (!make || !model || !systemType) {
            const historyText = (Array.isArray(chatHistory) ? chatHistory : [])
              .map((m) => {
                const t = m?.text; return typeof t === 'string' ? t : (t && typeof t === 'object' && typeof t.text === 'string' ? t.text : '');
              })
              .join('\n');
            const hx = EnhancedFaultCodeService.extractFaultInfo(historyText) || {};
            if (!make && hx.manufacturer) make = hx.manufacturer;
            if (!model && hx.model) model = hx.model;
            if (!systemType && hx.systemType) systemType = hx.systemType;
            if (!make && hx.faultCode) {
              try {
                const vk = await AgentTools.get_verified_knowledge({ fault_code: hx.faultCode, manufacturer: null, limit: 1 });
                const item = (vk?.items || [])[0];
                if (item?.manufacturer) make = item.manufacturer;
              } catch {}
            }
          }
        } catch {}
        const structuredSources = { manuals: [], knowledge: [] };
        if (make && (!structuredSources.manuals || structuredSources.manuals.length === 0)) {
          try {
            const sm = await AgentTools.search_manuals({ manufacturer: make, model: model || null, limit: 1 });
            const manuals = sm?.items || [];
            if (manuals.length > 0) {
              const m = manuals[0];
              structuredSources.manuals.push({ type: 'manual', title: m?.name || 'Manual', manufacturer: m?.manufacturer || null, gc_number: m?.gc_number || null, url: m?.url || '' });
            }
          } catch {}
        }
        const niceMake = make ? (displayMap[String(make).toLowerCase()] || make) : null;
        const headerParts = [];
        if (niceMake) headerParts.push(`Make: ${niceMake}`);
        if (model) headerParts.push(`Model: ${model}`);
        if (systemType) {
          const sys = String(systemType); headerParts.push(`System: ${sys.charAt(0).toUpperCase() + sys.slice(1)}`);
        }
        const header = headerParts.join(' | ');
        let finalText = header || 'I need the make or model to answer precisely.';
        try {
          if (structuredSources.manuals.length > 0) {
            let refs = '\n\nSources:';
            structuredSources.manuals.forEach((m) => {
              const n = m?.title ? String(m.title) : 'Manual';
              const mf = m?.manufacturer ? ` (${m.manufacturer})` : '';
              const url = m?.url ? String(m.url) : '';
              if (url) refs += `\n- [Manual] ${n}${mf}: ${url}`;
            });
            finalText += refs;
          }
        } catch {}
        if (sessionId) {
          try {
            const historyNow = Array.isArray(chatHistory) ? [...chatHistory, { sender: 'assistant', text: finalText, timestamp: new Date().toISOString() }] : [];
            await SessionManager.updateSession(sessionId, historyNow);
          } catch {}
        }
        const structured = {
          header: { make: niceMake || null, model: model || null, system: systemType ? (String(systemType).charAt(0).toUpperCase() + String(systemType).slice(1)) : null, faultCode: extracted?.faultCode || null },
          bullets: [], steps: [], cautions: [], parts: [], measurements: [], sources: structuredSources
        };
        logger.info(`[Agent][${rid}] fastpath identity response header='${header}'`);
        return res.json({ reply: finalText, sessionId: sessionId || null, structured });
      }
    } catch {}

    const tools = [];
    if (extracted?.faultCode) {
      tools.push({
        type: 'function',
        function: {
          name: 'get_fault_info',
          description: 'Get authoritative fault info from manufacturer database',
          parameters: {
            type: 'object',
            properties: {
              manufacturer: { type: 'string' },
              fault_code: { type: 'string' },
              user_text: { type: 'string' }
            }
          }
        }
      });
    }
    tools.push({
      type: 'function',
      function: {
        name: 'search_manuals',
        description: 'Find manuals for a manufacturer and optional model',
        parameters: {
          type: 'object',
          properties: {
            manufacturer: { type: 'string' },
            model: { type: 'string' },
            limit: { type: 'number' }
          },
          required: ['manufacturer']
        }
      }
    });
    if (extracted?.faultCode) {
      tools.push({
        type: 'function',
        function: {
          name: 'get_verified_knowledge',
          description: 'Get verified knowledge items for a fault code and optional manufacturer',
          parameters: {
            type: 'object',
            properties: {
              fault_code: { type: 'string' },
              manufacturer: { type: 'string' },
              limit: { type: 'number' }
            },
            required: ['fault_code']
          }
        }
      });
    }
    tools.push({
      type: 'function',
      function: {
        name: 'update_session',
        description: 'Persist a message in the chat session history',
        parameters: {
          type: 'object',
          properties: {
            session_id: { type: 'string' },
            role: { type: 'string', enum: ['user', 'assistant'] },
            message_text: { type: 'string' }
          },
          required: ['session_id', 'message_text']
        }
      }
    });

    const openaiKeys = [
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_API_KEY_2,
      process.env.OPENAI_API_KEY_3
    ].filter(Boolean);

    async function runOnce(messages) {
      for (let i = 0; i < openaiKeys.length; i++) {
        const key = openaiKeys[i];
        try {
          const t0 = Date.now();
          logger.info(`[Agent][${rid}] openai call start key#${i} msgs=${messages.length}`);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), CONSTANTS.OPENAI_REQUEST_TIMEOUT_MS);
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({ model: hasFaultCodeAgent ? 'gpt-4o' : 'gpt-4o-mini', messages, tools, tool_choice: 'auto', temperature: agentTemp, max_tokens: detailedMode ? 1500 : 800, frequency_penalty: 0.2, presence_penalty: 0.1 })
          });
          clearTimeout(timeout);
          if (!response.ok) continue;
          const data = await response.json();
          const usage = data?.usage || {};
          logger.info(`[Agent][${rid}] openai call done dt=${Date.now()-t0}ms tokens=${usage.total_tokens||'-'}`);
          return data;
        } catch (e) { logger.warn(`[Agent][${rid}] OpenAI key#${i} failed:`, e.message); continue; }
      }
      return null;
    }

    let messages = toOpenAIMessages.slice();
    let toolIterations = 0;
    let finalText = '';
    let structuredSources = { manuals: [], knowledge: [] };

    while (toolIterations < 4) {
      const data = await runOnce(messages);
      if (!data) break;
      const msg = data?.choices?.[0]?.message;
      const toolCalls = msg?.tool_calls || [];
      if (toolCalls.length === 0) {
        finalText = msg?.content || '';
        break;
      }
      messages.push({ role: 'assistant', content: msg?.content || '', tool_calls: toolCalls });
      for (const tc of toolCalls) {
        try {
          const name = tc.function?.name;
          const args = JSON.parse(tc.function?.arguments || '{}');
          let result;
          if (name === 'get_fault_info') result = await AgentTools.get_fault_info(args);
          else if (name === 'search_manuals') result = await AgentTools.search_manuals(args);
          else if (name === 'get_verified_knowledge') result = await AgentTools.get_verified_knowledge(args);
          else if (name === 'get_symptom_guidance') result = await AgentTools.get_symptom_guidance(args);
          else if (name === 'update_session') result = await AgentTools.update_session(args);
          else result = { error: 'unknown_tool' };
          messages.push({ role: 'tool', tool_call_id: tc.id, name, content: JSON.stringify(result) });
        } catch (e) {
          messages.push({ role: 'tool', tool_call_id: tc.id, name: tc.function?.name || 'tool', content: JSON.stringify({ error: e?.message || 'tool_error' }) });
        }
      }
      toolIterations++;
    }

    if (!finalText) {
      const data = await runOnce(messages);
      finalText = data?.choices?.[0]?.message?.content || '';
    }

    if (!finalText) finalText = "I'm having trouble responding right now. Please try again shortly.";

    let modelTipText = '';
    try {
      const gf = preToolResults.find((t) => t.name === 'get_fault_info');
      if (gf) {
        const parsed = JSON.parse(gf.content || '{}');
        if (parsed?.modelTips) modelTipText = String(parsed.modelTips);
      }
    } catch {}

    // If no fault code, override with standardized Make | Model | System + question
    try {
      if (!extracted?.faultCode && !hasPriorFaultMention) {
        const headerParts = [];
        const displayMap = CONSTANTS.MANUFACTURER_DISPLAY_MAP;
        if (extracted?.manufacturer) {
          const mfRaw = String(extracted.manufacturer).toLowerCase();
          const displayMf = displayMap[mfRaw] || (mfRaw.charAt(0).toUpperCase() + mfRaw.slice(1));
          headerParts.push(`Make: ${displayMf}`);
        }
        if (extracted?.model) headerParts.push(`Model: ${extracted.model}`);
        if (extracted?.systemType) {
          const sys = String(extracted.systemType);
          headerParts.push(`System: ${sys.charAt(0).toUpperCase() + sys.slice(1)}`);
        }
        const header = headerParts.join(' | ');
        const ask = 'Please provide the displayed fault code or a brief description of the symptoms.';
        finalText = header ? `${header}\n\n${ask}` : ask;
      }
    } catch {}

    if (preToolResults.length > 0) {
      try {
        const manuals = preToolResults
          .filter((t) => t.name === 'search_manuals')
          .flatMap((t) => {
            try { return (JSON.parse(t.content || '{}')?.items) || []; } catch { return []; }
          })
          .slice(0, 1);
        const knowledge = preToolResults
          .filter((t) => t.name === 'get_verified_knowledge')
          .flatMap((t) => {
            try { return (JSON.parse(t.content || '{}')?.items) || []; } catch { return []; }
          })
          .slice(0, 1);
        if (manuals.length > 0 || knowledge.length > 0) {
          manuals.forEach((m) => {
            const n = m?.name ? String(m.name) : 'Manual';
            const url = m?.url ? String(m.url) : '';
            structuredSources.manuals.push({ type: 'manual', title: n, manufacturer: m?.manufacturer || null, gc_number: m?.gc_number || null, url });
          });
          knowledge.forEach((k) => {
            const title = (k?.title || k?.summary || k?.note || k?.content || '').toString().slice(0, 120);
            structuredSources.knowledge.push({ type: 'knowledge', title, fault_code: k?.fault_code || null, manufacturer: k?.manufacturer || null });
          });
        }
      } catch {}
    }

    try {
      const allowedUrls = new Set();
      preToolResults
        .filter((t) => t.name === 'search_manuals')
        .forEach((t) => {
          try {
            const items = (JSON.parse(t.content || '{}')?.items) || [];
            items.forEach((m) => { if (m?.url) allowedUrls.add(String(m.url)); });
          } catch {}
        });
      let bodyPart = finalText;
      let refsPart = '';
      const idx = finalText.indexOf('\n\nSources:');
      if (idx >= 0) { bodyPart = finalText.slice(0, idx); refsPart = finalText.slice(idx); }
      bodyPart = bodyPart.replace(/https?:\/\/\S+/g, (u) => allowedUrls.has(u) ? u : '');
      const instructive = /(\brefer to|\bsee|\bcheck|\bconsult|\bvisit|\bread)\b[^\n]{0,160}\b(manual|guide|documentation|docs|website|page|link|bulletin|datasheet|procedure)\b/i;
      bodyPart = bodyPart
        .split('\n')
        .filter((line) => !instructive.test(line))
        .join('\n');
      finalText = bodyPart + refsPart;
    } catch {}

    // Build structured JSON response
    let structured = null;
    try {
      const displayMap = CONSTANTS.MANUFACTURER_DISPLAY_MAP;
      let make = extracted?.manufacturer ? (displayMap[String(extracted.manufacturer).toLowerCase()] || extracted.manufacturer) : null;
      const model = extracted?.model || null;
      const sysType = extracted?.systemType ? (String(extracted.systemType).charAt(0).toUpperCase() + String(extracted.systemType).slice(1)) : null;
      const faultCode = extracted?.faultCode || null;

      const idxSrc = finalText.indexOf('\n\nSources:');
      const mainBody = idxSrc >= 0 ? finalText.slice(0, idxSrc) : finalText;
      const bodyLines = mainBody.split('\n').map((l) => l.trim()).filter(Boolean);
      const bullets = bodyLines.filter((l) => /^[-•—]\s+/.test(l)).map((l) => l.replace(/^[-•—]\s+/, ''));
      const steps = bodyLines.filter((l) => /^\d+[\.)]\s+/.test(l)).map((l) => l.replace(/^\d+[\.)]\s+/, ''));
      const cautions = bodyLines.filter((l) => /(safety|caution|warning|danger)/i.test(l));
      const partsList = (() => {
        const out = new Set();
        const partWords = ['electrode','spark generator','ignition module','gas valve','fan','pump','diverter valve','pcb','pressure sensor','flame sensor','thermostat'];
        bodyLines.forEach((l) => partWords.forEach((p) => { if (new RegExp(`\\b${p.replace(/\s+/g,'\\s+')}\\b`, 'i').test(l)) out.add(p); }));
        return Array.from(out);
      })();
      const measurements = bodyLines.filter((l) => /(\b\d+(\.\d+)?\s*(bar|mbar|kpa|pa|v|vac|vdc|ohm|Ω|ma|a|hz|kw|°c|c)\b)/i.test(l));

      structured = {
        header: { make, model, system: sysType, faultCode },
        bullets, steps, cautions, parts: partsList, measurements,
        sources: structuredSources
      };
    } catch {}

    if (sessionId) {
      try {
        const historyNow = Array.isArray(chatHistory) ? [...chatHistory, { sender: 'assistant', text: finalText, timestamp: new Date().toISOString() }] : [];
        await SessionManager.updateSession(sessionId, historyNow);
      } catch {}
    }

    logger.info(`[Agent][${rid}] respond len=${finalText.length} structured=${structured ? 'y' : 'n'}`);
    res.json({ reply: finalText, sessionId: sessionId || null, structured: structured || null });
  } catch (error) {
    logger.error('[Agent Chat] Endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
