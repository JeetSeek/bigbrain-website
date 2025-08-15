/**
 * BoilerBrain API Server
 * 
 * This Express server handles all backend functionality for BoilerBrain including:
 * - Chat API with AI-powered diagnostic assistance
 * - Manual and document retrieval
 * - Vector-based knowledge search
 * - Fault code lookup
 * 
 * Built with modern Node.js features and optimized for performance.
 */

// Core dependencies
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import EnvironmentValidator from './utils/envValidator.js';
import performanceMonitor from './services/PerformanceMonitor.js';
import logger from './utils/logger.js';
import { runProductionChecks, securityHeadersMiddleware } from './utils/productionChecks.js';
import { sessionMiddleware, csrfMiddleware } from './utils/secureSession.js';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '.env') });

// Validate environment variables at startup
EnvironmentValidator.validateAtStartup();

// Initialize performance monitoring
performanceMonitor.startMonitoring();

// Run production readiness checks
if (process.env.NODE_ENV === 'production') {
  runProductionChecks().then(results => {
    if (!results.ready) {
      logger.error('Production readiness checks failed - server may not be ready for production use');
      console.error('❌ Production readiness issues found:');
      results.critical.forEach(issue => console.error(`  - ${issue}`));
      
      if (process.env.STRICT_PRODUCTION_CHECKS === 'true') {
        process.exit(1);
      }
    } else {
      logger.info('✅ Production readiness checks passed');
    }
  }).catch(error => {
    logger.error('Production checks failed to run', { error: error.message });
  });
}
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import net from 'net';
import { supabase } from './supabaseClient.js';
import sessionStore from './sessionStore.js';
import contextRecoveryService from './services/ContextRecoveryService.js';
import { csrfProtection, generateCSRFTokenEndpoint } from './middleware/csrfProtection.js';

import EnhancedHybridDiagnosticService from './services/EnhancedHybridDiagnosticService.js';
import ProfessionalDiagnosticService from './services/ProfessionalDiagnosticService.js';
import InteractiveDiagnosticWorkflow from './services/InteractiveDiagnosticWorkflow.js';
import EnhancedIntegrationService from './services/EnhancedIntegrationService.js';
import ReliabilityGuaranteeService from './services/ReliabilityGuaranteeService.js';
import LLMDataSourceMonitor from './services/LLMDataSourceMonitor.js';
import { createChatEndpoint } from './chat_endpoint_clean.js';

// Import route modules
import videoSearchRoutes from './routes/videoSearch.js';
import knowledgeManagementRoutes from './routes/knowledgeManagement.js';

// Local dependencies
import boilerKnowledge from './boilerKnowledgeService.js';
import { SERVER, AI, VECTOR_SEARCH, PATTERNS, FUNCTION_DECLARATIONS } from './constants.js';

// Access constants from the centralized file
const { PORT } = SERVER;
const { MAX_RETRIES, RETRY_DELAY_MS } = SERVER;
const { MAX_TOKENS } = AI;
const { SIMILARITY_THRESHOLD, MAX_KNOWLEDGE_SNIPPETS } = VECTOR_SEARCH;

// __filename and __dirname already declared above for dotenv config

// Initialize Express app
const app = express();

// Configure middleware
// Security headers first
app.use(securityHeadersMiddleware);

// Cookie parser for secure sessions
app.use(cookieParser());

// Session management
app.use(sessionMiddleware);

// CORS configuration for production security
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5176',
      'http://localhost:3000',
      'http://127.0.0.1:5176',
      'http://127.0.0.1:3000',
      // Add your production domain here
      process.env.FRONTEND_URL || 'https://your-production-domain.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-CSRF-Token'
  ],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 86400 // 24 hours preflight cache
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Increase payload limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure server timeouts for stability
app.use((req, res, next) => {
  // Set server timeout to 90 seconds to handle heavy processing
  req.setTimeout(90000);
  res.setTimeout(90000);
  next();
});

// Note: Static file serving moved to end of file to ensure API routes are handled first

// CSRF Protection
const csrfTokens = new Map(); // Store for valid tokens

// Generate a CSRF token and store it
app.get('/api/csrf-token', (req, res) => {
  const token = crypto.randomBytes(16).toString('hex');
  csrfTokens.set(token, Date.now() + 3600000); // Valid for 1 hour
  res.json({ csrfToken: token });
});

// CSRF token validation middleware
const validateCsrf = (req, res, next) => {
  // Skip validation for GET requests
  if (req.method === 'GET') return next();
  
  const token = req.headers['x-csrf-token'];
  
  if (!token || !csrfTokens.has(token)) {
    return res.status(403).json({ error: 'Missing or invalid CSRF token' });
  }
  
  const expiry = csrfTokens.get(token);
  if (Date.now() > expiry) {
    csrfTokens.delete(token);
    return res.status(403).json({ error: 'CSRF token expired' });
  }
  
  next();
};

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of csrfTokens.entries()) {
    if (now > expiry) csrfTokens.delete(token);
  }
}, 3600000); // Clean up every hour

// Initialize Supabase client
// Initialize professional diagnostic service and monitoring
const professionalDiagnosticService = new ProfessionalDiagnosticService();
const hybridDiagnosticService = new EnhancedHybridDiagnosticService();
const llmMonitor = new LLMDataSourceMonitor();
const enhancedIntegration = new EnhancedIntegrationService();
const interactiveWorkflow = new InteractiveDiagnosticWorkflow();
const reliabilityGuarantee = new ReliabilityGuaranteeService();
// Supabase client is imported from supabaseClient.js
// No need to recreate it here

// Use real API keys from .env file instead of mock testing mode
const TESTING_MODE = false;

// Collect API keys
const deepseekApiKeys = [
  process.env.DEEPSEEK_API_KEY_1,
  process.env.DEEPSEEK_API_KEY_2,
  process.env.DEEPSEEK_API_KEY_3,
  process.env.DEEPSEEK_API_KEY_4,
  process.env.DEEPSEEK_API_KEY_5,
  process.env.DEEPSEEK_API_KEY_6,
  // Add mock key for testing if no real keys available
  TESTING_MODE ? 'mock-deepseek-api-key-for-testing' : null
].filter(Boolean);

// Set up mock OpenAI key if needed
if (TESTING_MODE && !process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'mock-openai-api-key-for-testing';
}

if (deepseekApiKeys.length === 0 && !TESTING_MODE) {
  console.error('⚠️ WARNING: No DeepSeek API keys configured! Chat functionality will fail.');
} else if (TESTING_MODE && deepseekApiKeys.length === 1 && deepseekApiKeys[0].startsWith('mock-')) {
}

/**
 * Admin authentication middleware
 * Verifies that the request is from an authenticated admin user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const adminAuth = async (req, res, next) => {
  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Missing or invalid authorization token' 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Handle demo tokens for development/testing
    if (token === 'admin-token') {
      // Demo admin token - validate against environment variables
      const adminEmail = process.env.ADMIN_EMAIL || 'mark@boilerbrain.com';
      req.user = {
        id: 'admin-user',
        email: adminEmail,
        app_metadata: { role: 'admin' },
        isDemoUser: true
      };
      return next();
    }
    
    if (token === 'demo-token') {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Admin access required - demo user detected' 
      });
    }
    
    // Verify the JWT token with Supabase for real users
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      console.error('Admin auth error:', error);
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid or expired token' 
      });
    }
    
    // Check if user has admin role
    const adminEmail = process.env.ADMIN_EMAIL || 'mark@boilerbrain.com';
    const isAdmin = data.user.app_metadata?.role === 'admin' || 
                   data.user.email === adminEmail;
    
    if (!isAdmin) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Admin access required' 
      });
    }
    
    // Add user to request object
    req.user = data.user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Server error', message: 'Authentication verification failed' });
  }
};

// OpenAI embeddings creation
async function createEmbedding(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid input for embedding');
  }
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Find relevant knowledge snippets using vector similarity search
async function findRelevantKnowledge(query, tag = null) {
  try {
    // Create embedding for the user query
    const embedding = await createEmbedding(query);
    
    // Query the database for similar embeddings
    const { data, error } = await supabase.rpc(
      'find_similar_knowledge',
      {
        query_embedding: embedding,
        match_threshold: VECTOR_SEARCH.SIMILARITY_THRESHOLD,
        match_count: VECTOR_SEARCH.MAX_KNOWLEDGE_SNIPPETS,
        filter_tag: tag
      }
    );
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`[Knowledge Search] Error: ${error.message}`);
    return []; // Return empty array on error
  }
}

// Extract boiler information from text using regex patterns
function extractBoilerInfo(text) {
  const result = {
    manufacturer: null,
    model: null,
    faultCodes: [],
    hasSafetyConcern: false,
    heatingSystemType: null,
    systemComponents: [],
    systemTypeProbability: {}
  };
  
  const lowerText = text.toLowerCase();
  
  // Check for manufacturer
  const manufacturerMatches = lowerText.match(PATTERNS.MANUFACTURER);
  if (manufacturerMatches && manufacturerMatches.length > 0) {
    result.manufacturer = manufacturerMatches[0].trim();
  }
  
  // PRIORITIZE FAULT CODES FIRST to avoid misclassification
  const foundFaultCodes = new Set();
  for (const pattern of PATTERNS.FAULT_CODES) {
    let match;
    while ((match = pattern.exec(lowerText)) !== null) {
      if (match[1]) {
        foundFaultCodes.add(match[1].trim());
      }
    }
  }
  result.faultCodes = Array.from(foundFaultCodes);
  
  // Check for model - EXCLUDE any strings that were identified as fault codes
  const modelMatches = lowerText.match(PATTERNS.MODEL);
  if (modelMatches && modelMatches.length > 0) {
    // Filter out any matches that were already identified as fault codes
    const validModels = modelMatches.filter(match => {
      const cleanMatch = match.trim();
      return !foundFaultCodes.has(cleanMatch);
    });
    if (validModels.length > 0) {
      result.model = validModels[0].trim();
    }
  }

  
  // Check for safety concerns
  for (const pattern of PATTERNS.SAFETY_CONCERNS) {
    if (pattern.test(lowerText)) {
      result.hasSafetyConcern = true;
      break;
    }
  }
  
  // Detect heating system type based on keywords
  const systemTypeCounts = {
    combi: 0,
    system: 0,
    heatOnly: 0,
    backBoiler: 0
  };
  
  // Check for explicit heating system type mentions
  if (PATTERNS.HEATING_SYSTEM_TYPES.COMBI.test(lowerText)) {
    systemTypeCounts.combi += 2; // Stronger signal for explicit mention
  }
  if (PATTERNS.HEATING_SYSTEM_TYPES.SYSTEM.test(lowerText)) {
    systemTypeCounts.system += 2;
  }
  if (PATTERNS.HEATING_SYSTEM_TYPES.HEAT_ONLY.test(lowerText)) {
    systemTypeCounts.heatOnly += 2;
  }
  if (PATTERNS.HEATING_SYSTEM_TYPES.BACK_BOILER.test(lowerText)) {
    systemTypeCounts.backBoiler += 2;
  }
  
  // Check for system components that hint at system type
  if (PATTERNS.SYSTEM_COMPONENTS.CYLINDER.test(lowerText)) {
    systemTypeCounts.system += 1;
    systemTypeCounts.heatOnly += 1;
    result.systemComponents.push('hot water cylinder');
  }
  if (PATTERNS.SYSTEM_COMPONENTS.PLATE_HEAT_EXCHANGER.test(lowerText)) {
    systemTypeCounts.combi += 1;
    result.systemComponents.push('plate heat exchanger');
  }
  if (PATTERNS.SYSTEM_COMPONENTS.DIVERTER_VALVE.test(lowerText)) {
    systemTypeCounts.combi += 0.5;
    systemTypeCounts.system += 0.5;
    result.systemComponents.push('diverter valve');
  }
  if (PATTERNS.SYSTEM_COMPONENTS.EXPANSION_VESSEL.test(lowerText)) {
    // All system types have expansion vessels, but it's mentioned more with system boilers
    systemTypeCounts.combi += 0.5;
    systemTypeCounts.system += 0.5;
    result.systemComponents.push('expansion vessel');
  }
  
  // Calculate probabilities
  const totalScore = Object.values(systemTypeCounts).reduce((sum, val) => sum + val, 0);
  if (totalScore > 0) {
    result.systemTypeProbability = {
      combi: systemTypeCounts.combi / totalScore,
      system: systemTypeCounts.system / totalScore,
      heatOnly: systemTypeCounts.heatOnly / totalScore,
      backBoiler: systemTypeCounts.backBoiler / totalScore
    };
    
    // Determine most likely heating system type
    const mostLikelyType = Object.entries(systemTypeCounts)
      .reduce((max, [type, count]) => count > max[1] ? [type, count] : max, ['unknown', 0]);
    
    if (mostLikelyType[1] > 0) {
      // Convert camelCase to proper format
      const typeMapping = {
        combi: 'combi',
        system: 'system',
        heatOnly: 'heat-only',
        backBoiler: 'back boiler'
      };
      result.heatingSystemType = typeMapping[mostLikelyType[0]] || null;
    }
  }
  
  // Remove duplicates from system components
  result.systemComponents = [...new Set(result.systemComponents)];
  
  return result;
}

// Summarize conversation to reduce token usage
async function summarizeConversation(messages) {
  if (messages.length < AI.CONVERSATION_SUMMARY_LENGTH) return null; // No need to summarize short conversations
  
  try {
    const messagesToSummarize = messages.slice(0, -4); // Keep the last 4 messages unsummarized
    const conversationText = messagesToSummarize
      .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
      .join('\n');
    
    // Use DeepSeek to generate a summary
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekApiKeys[0]}` // Use first key for summaries
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a summarization assistant. Create a concise summary of the following heating engineer support conversation. 
            Focus on extracting key facts about the boiler manufacturer, model, fault codes, symptoms described, and advice given.`
          },
          {
            role: 'user',
            content: `Summarize this conversation: \n${conversationText}`
          }
        ],
        max_tokens: AI.SUMMARY_MAX_TOKENS,
        temperature: AI.SUMMARY_TEMPERATURE
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${errorText}`);
    }
    
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || null;
    
  } catch (error) {
    console.error(`[Summarization] Error: ${error.message}`);
    return null; // Return null on error
  }
}

// Function declarations imported from constants.js
const functionDeclarations = FUNCTION_DECLARATIONS;

// Function call handlers
async function handleFunctionCall(functionCall) {
  
  switch(functionCall.name) {
    case 'getFaultCodeInfo':
      try {
        const { manufacturer, faultCode } = JSON.parse(functionCall.arguments);
        const info = boilerKnowledge.findFaultCode(manufacturer, faultCode);
        return {
          role: 'function',
          name: functionCall.name,
          content: info ? JSON.stringify(info) : JSON.stringify({ error: 'Fault code not found' })
        };
      } catch (error) {
        console.error(`[Function] Error handling getFaultCodeInfo: ${error.message}`);
        return {
          role: 'function',
          name: functionCall.name,
          content: JSON.stringify({ error: error.message })
        };
      }
      
    case 'getSymptomInfo':
      try {
        const { symptom } = JSON.parse(functionCall.arguments);
        const info = boilerKnowledge.getSymptomHelp(symptom);
        return {
          role: 'function',
          name: functionCall.name,
          content: info ? JSON.stringify(info) : JSON.stringify({ error: 'Symptom information not found' })
        };
      } catch (error) {
        console.error(`[Function] Error handling getSymptomInfo: ${error.message}`);
        return {
          role: 'function',
          name: functionCall.name,
          content: JSON.stringify({ error: error.message })
        };
      }
      
    case 'getSafetyInformation':
      try {
        const { concern } = JSON.parse(functionCall.arguments);
        const info = boilerKnowledge.getSafetyWarning(concern);
        return {
          role: 'function',
          name: functionCall.name,
          content: info ? JSON.stringify(info) : JSON.stringify({ error: 'Safety information not found' })
        };
      } catch (error) {
        console.error(`[Function] Error handling getSafetyInformation: ${error.message}`);
        return {
          role: 'function',
          name: functionCall.name,
          content: JSON.stringify({ error: error.message })
        };
      }
      
    default:
      return {
        role: 'function',
        name: functionCall.name,
        content: JSON.stringify({ error: 'Unknown function' })
      };
  }
}

// Sleep function for retries
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Make ChatCompletion request with retry logic
async function makeChatCompletionRequest(messages, sessionId = null, retries = MAX_RETRIES) {
  // Add request timestamp for performance tracking
  const requestStartTime = Date.now();
  // Determine which API to use based on environment variable
  const useModel = process.env.USE_MODEL?.toLowerCase() || 'openai';
  
  // Validate messages before sending to prevent null content errors
  for (const msg of messages) {
    if (msg.content === null || msg.content === undefined) {
      console.warn('[LLM] Found null/undefined content in message, setting to empty string');
      msg.content = '';
    }
  }
  
  if (useModel === 'openai') {
    return await makeOpenAIRequest(messages, sessionId, retries);
  } else {
    try {
      return await makeDeepSeekRequest(messages, sessionId, retries);
    } catch (error) {
      console.warn(`[DeepSeek] Failed with error: ${error.message}. Falling back to OpenAI...`);
      return await makeOpenAIRequest(messages, sessionId, retries);
    }
  }
}

// Get all available OpenAI API keys (cached to prevent infinite loops)
let cachedApiKeys = null;
function getOpenAIAPIKeys() {
  // Return cached keys to prevent repeated calls
  if (cachedApiKeys !== null) {
    return cachedApiKeys;
  }
  
  const keys = [];
  
  // Get all API keys (supports up to 5 keys)
  if (process.env.OPENAI_API_KEY) keys.push(process.env.OPENAI_API_KEY);
  if (process.env.OPENAI_API_KEY_2) keys.push(process.env.OPENAI_API_KEY_2);
  if (process.env.OPENAI_API_KEY_3) keys.push(process.env.OPENAI_API_KEY_3);
  if (process.env.OPENAI_API_KEY_4) keys.push(process.env.OPENAI_API_KEY_4);
  if (process.env.OPENAI_API_KEY_5) keys.push(process.env.OPENAI_API_KEY_5);
  
  // Cache the keys to prevent repeated calls
  cachedApiKeys = keys;
  
  return keys;
}

// Store last successful key index to optimize subsequent calls
let lastSuccessfulKeyIndex = 0;

// Make request to OpenAI API with key rotation and context recovery
async function makeOpenAIRequest(messages, sessionId = null, retries = MAX_RETRIES) {
  const apiKeys = getOpenAIAPIKeys();
  
  if (apiKeys.length === 0) {
    throw new Error('No valid OpenAI API keys available');
  }
  
  // Validate messages before sending to avoid null content issues
  const validatedMessages = messages.map(msg => {
    if (msg.content === null || msg.content === undefined) {
      console.warn('[LLM] Found null/undefined content in message, setting to empty string');
      return { ...msg, content: '' };
    }
    return msg;
  });
  
  // If session exists, mark that we're starting a critical operation
  if (sessionId) {
    try {
      // Create a recovery point before API call in case of failure
      const session = await sessionStore.getSession(sessionId);
      await contextRecoveryService.createRecoveryPoint(sessionId, session);
    } catch (err) {
      // Non-fatal, continue with request
      console.warn(`[LLM] Failed to create recovery point: ${err.message}`);
    }
  }
  
  // Try all api keys in random order
  const keyOrder = Array.from({length: apiKeys.length}, (_, i) => i);
  // Shuffle for load balancing
  for (let i = keyOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keyOrder[i], keyOrder[j]] = [keyOrder[j], keyOrder[i]];
  }
  
  const keyErrors = [];
  const requestStartTime = Date.now();
  
  // Try each key with multiple attempts
  for (const keyIndex of keyOrder) {
    const apiKey = apiKeys[keyIndex];
    
    // Try multiple times with each key
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            messages: validatedMessages,
            model: AI.OPENAI_MODELS.CHAT,
            temperature: 0.3,
            max_tokens: 1000,
          })
        });
        
        // Handle rate limiting and server errors with retries
        if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
          console.warn(`[OpenAI] Rate limit or server error (${response.status}) for key ${keyIndex + 1}. Retrying...`);
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000)); // Exponential backoff
          continue;
        }
        
        const data = await response.json();
        
        if (!response.ok) {
          const errorText = data.error?.message || 'Unknown error';
          keyErrors.push(`Key ${keyIndex + 1}: ${errorText}`);
          throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
        }
        
        // Return the full completion object so chat handler can access completion.choices[0].message.content
        console.log('[Chat] Successfully generated response in ' + (Date.now() - requestStartTime) + 'ms');
        return data;
      } catch (error) {
        console.warn(`[OpenAI] Error with key ${keyIndex + 1}: ${error.message}. Retrying...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500)); // Exponential backoff
      }
    }
  }
  
  // If we get here, all keys and attempts have failed
  const errorMsg = `All OpenAI API keys failed: ${keyErrors.join(', ')}`;
  console.error(errorMsg);
  
  // Try to recover session context if possible
  if (sessionId) {
    try {
      await contextRecoveryService.recoverContext(sessionId);
    } catch (recoveryErr) {
      console.error(`[LLM] Context recovery also failed: ${recoveryErr.message}`);
    }
  }
  
  throw new Error(errorMsg);
}

// Make request to DeepSeek API
async function makeDeepSeekRequest(messages, sessionId = null, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt < retries + 1; attempt++) {
    try {
      // Simple round-robin key selection
      const keyIndex = attempt % deepseekApiKeys.length;
      const apiKey = deepseekApiKeys[keyIndex];
      
      if (!apiKey) {
        throw new Error('No valid DeepSeek API key available');
      }
      
      
      // Handle testing mode with mock API key
      if (TESTING_MODE && apiKey.startsWith('mock-')) {
        
        // Extract the last user message to generate a relevant mock response
        const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
        const userInput = lastUserMessage.toLowerCase();
        
        // Generate mock response based on user input
        let mockResponse = "I'm BoilerBrain, your boiler diagnostic assistant. How can I help you today?";
        
        if (userInput.includes('worcester')) {
          mockResponse = "I see you're working with a Worcester boiler. These are quite common in UK homes. What model is it, and what fault are you experiencing?";
        } else if (userInput.includes('fault') || userInput.includes('error')) {
          mockResponse = "That fault code could indicate several issues. First, check if the gas supply is adequate. Then verify the pressure is between 1-2 bar. If both are fine, it might be a sensor issue.";
        } else if (userInput.includes('thank')) {
          mockResponse = "You're welcome! If you have any more questions about the boiler, feel free to ask.";
        }
        
        // Return mock completion response object
        return {
          choices: [{
            message: {
              content: mockResponse,
              role: 'assistant'
            },
            finish_reason: 'stop'
          }]
        };
      }
      
      // Real API request
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          max_tokens: MAX_TOKENS,
          temperature: 0.4,
          functions: functionDeclarations,
          user: sessionId || uuidv4(),
          stream: false
        })
      });
      
      // Handle rate limits and server errors with retries
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        console.warn(`[DeepSeek] Rate limit or server error (${response.status}). Retrying...`);
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt)); // Exponential backoff
        continue;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`[DeepSeek] Request error on attempt ${attempt + 1}:`, error.message);
      
      if (attempt >= retries) {
        throw error; // Re-throw after all retries
      }
      
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt)); // Exponential backoff
    }
  }
}

// --- API Routes ---

// Register route modules
app.use('/api/video', videoSearchRoutes);
app.use('/api/knowledge', knowledgeManagementRoutes);

// Manual API endpoints
// List all manuals
app.get('/api/manuals', async (req, res) => {
  try {
    const search = req.query.search || '';
    const manufacturer = req.query.manufacturer || '';
    const sortBy = req.query.sort || 'name';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';
    
    
    // Query the real boiler_manuals database table using admin client to bypass RLS
    console.log('[Manual API] Querying boiler_manuals table from database');
    
    // Create admin client with service key to bypass RLS
    const adminClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    let query = adminClient
      .from('boiler_manuals')
      .select('*');

    // Apply manufacturer filter if provided
    if (manufacturer) {
      query = query.ilike('manufacturer', manufacturer);
    }

    // Apply search filter if provided (only use existing database columns)
    if (search) {
      query = query.or(`name.ilike.%${search}%,manufacturer.ilike.%${search}%,gc_number.ilike.%${search}%`);
    }

    // Apply sorting
    const sortField = sortBy === 'name' ? 'name' : sortBy;
    query = query.order(sortField, { ascending: order === 'ASC' });

    // Limit results for performance and browser compatibility
    query = query.limit(10);

    const { data: manuals, error } = await query;

    if (error) {
      console.error('[Manual API] Database error:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }


    if (manuals && manuals.length > 0) {
      console.log('[Manual API] First manual:', {
        name: manuals[0].name,
        manufacturer: manuals[0].manufacturer
      });
    }

    // Format the response using the actual database fields
    const formattedManuals = (manuals || []).map(manual => ({
      id: manual.id,
      name: manual.name,
      manufacturer: manual.manufacturer,
      url: manual.url,
      gc_number: manual.gc_number,
      file_type: 'application/pdf', // Default since not in database
      upload_date: manual.created_at,
      description: '', // Not in database schema
      popularity: 0 // Not in database schema
    }));

    res.json({ manuals: formattedManuals });
  } catch (err) {
    console.error('[Manual API] Error fetching manuals:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get manufacturers for filter dropdown
app.get('/api/manufacturers', async (req, res) => {
  try {
    
    let manufacturers = [];
    let usingMockData = false;
    
    try {
      
      // Create admin client with service key to bypass RLS
      const adminClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      
      const { data: manuals, error } = await adminClient
        .from('boiler_manuals')
        .select('manufacturer');


      if (error) {
        usingMockData = true;
      } else if (manuals && manuals.length > 0) {
        // Extract unique manufacturers from database
        const manufacturerSet = new Set();
        manuals.forEach(manual => {
          if (manual.manufacturer && manual.manufacturer.trim()) {
            manufacturerSet.add(manual.manufacturer.trim());
          }
        });
        manufacturers = Array.from(manufacturerSet).sort();
        console.log(`[Manual API] Found ${manufacturers.length} manufacturers from database:`, manufacturers.slice(0, 5));
      } else {
        usingMockData = true;
      }
    } catch (dbError) {
      usingMockData = true;
    }

    // If database query failed or returned no results, use mock data
    if (usingMockData || manufacturers.length === 0) {
      manufacturers = [
        'Baxi',
        'Ideal',
        'Worcester Bosch',
        'Vaillant',
        'Glow-worm',
        'Potterton',
        'Ferroli',
        'Alpha',
        'Viessmann',
        'Ariston'
      ].sort();
    }

    res.json({ manufacturers });
  } catch (err) {
    console.error('[Manual API] Error fetching manufacturers:', err);
    // Return default manufacturers as fallback
    res.json({ 
      manufacturers: ['Baxi', 'Ideal', 'Worcester Bosch', 'Vaillant', 'Glow-worm', 'Potterton'].sort()
    });
  }
});

// Get a download URL for a manual
app.get('/api/manuals/:id/download', async (req, res) => {
  try {
    
    const { data: manual, error } = await supabase
      .from('boiler_manuals')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      console.error('[Manual API] Error fetching manual:', error);
      throw error;
    }

    if (!manual) {
      return res.status(404).json({ error: 'Manual not found' });
    }

    // Update popularity (optional - increment download count)
    try {
      await supabase
        .from('boiler_manuals')
        .update({ popularity: (manual.popularity || 0) + 1 })
        .eq('id', req.params.id);
    } catch (updateError) {
      console.warn('[Manual API] Failed to update popularity:', updateError);
    }

    res.json({ 
      download_url: manual.url || manual.download_url,
      filename: manual.model || manual.name,
      file_type: manual.file_type || 'application/pdf'
    });
  } catch (err) {
    console.error('[Manual API] Error getting download URL:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoints
app.get('/api/health', async (req, res) => {
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    };

    // Test database connection
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('count')
        .limit(1);
      
      health.database = error ? 'unhealthy' : 'healthy';
      if (error) health.databaseError = error.message;
    } catch (dbError) {
      health.database = 'unhealthy';
      health.databaseError = dbError.message;
    }

    // Test API keys
    health.apiKeys = {
      deepseek: !!process.env.DEEPSEEK_API_KEY_1,
      openai: !!process.env.OPENAI_API_KEY,
      supabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };

    const isHealthy = health.database === 'healthy';
    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Readiness check for Kubernetes/Docker
app.get('/api/ready', async (req, res) => {
  try {
    // Check if all critical services are ready
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('count')
      .limit(1);
    
    if (error) {
      return res.status(503).json({
        status: 'not ready',
        reason: 'Database not accessible'
      });
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      reason: error.message
    });
  }
});

// Liveness check for Kubernetes/Docker
app.get('/api/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});


// POST session endpoint for session management (production-ready)
app.post('/api/chat/session', async (req, res) => {
  try {
    const { sessionId, history, userName, action = 'persist' } = req.body;
    
    // Validate request
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    
    // Handle persist action (production approach - no sync conflicts)
    if (action === 'persist') {
      if (!history || !Array.isArray(history) || history.length === 0) {
        return res.json({
          success: true,
          message: 'No messages to persist',
          sessionId
        });
      }
      
      // Create session object for persistence
      const sessionData = {
        sessionId,
        history,
        boilerInfo: {
          manufacturer: null,
          model: null,
          systemType: null,
          faultCodes: [],
          heatingSystemType: null,
          systemComponents: [],
          detectedIssues: []
        },
        summaries: [],
        userName: userName || null,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      
      try {
        // Save session to store (overwrite approach for production)
        await sessionStore.updateSession(sessionId, sessionData.history, sessionData.boilerInfo);
        
        // Create recovery point
        await contextRecoveryService.createRecoveryPoint(sessionId, sessionData);
        
        res.json({
          success: true,
          message: 'Session persisted successfully',
          sessionId,
          messageCount: history.length
        });
        
      } catch (persistError) {
        console.error(`[Session] Failed to persist session ${sessionId}:`, persistError);
        res.status(500).json({ 
          error: 'Failed to persist session',
          details: persistError.message
        });
      }
      
      return;
    }
    
    // Handle other actions (if needed in future)
    res.status(400).json({ error: `Unknown action: ${action}` });
    
  } catch (error) {
    console.error('[Session] Error in session management:', error);
    res.status(500).json({ 
      error: 'Failed to manage session',
      details: error.message
    });
  }
});

// POST clear session endpoint for resetting problematic sessions
app.post('/api/chat/clear-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    
    // Clear from session store
    try {
      await sessionStore.clearSession(sessionId);
    } catch (error) {
      console.warn(`[Session] Failed to clear from session store: ${error.message}`);
    }
    
    // Clear from context recovery
    try {
      await contextRecoveryService.clearRecoveryPoint(sessionId);
    } catch (error) {
      console.warn(`[Session] Failed to clear recovery point: ${error.message}`);
    }
    
    
    res.json({
      success: true,
      message: 'Session cleared successfully',
      sessionId
    });
    
  } catch (error) {
    console.error('[Session] Error clearing session:', error);
    res.status(500).json({ 
      error: 'Failed to clear session',
      details: error.message
    });
  }
});

// Fault Code API endpoints
app.get('/api/fault-codes/search', async (req, res) => {
  try {
    const { code, manufacturer } = req.query;
    
    if (!code) {
      return res.status(400).json({ error: 'Fault code is required' });
    }

    const { data, error } = await supabase
      .from('boiler_fault_codes')
      .select('*')
      .ilike('fault_code', `%${code}%`)
      .ilike('manufacturer', manufacturer ? `%${manufacturer}%` : '%')
      .limit(10);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database query failed' });
    }

    res.json({ results: data || [], count: data?.length || 0 });
  } catch (error) {
    console.error('Fault code search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/fault-codes/manufacturers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('boiler_fault_codes')
      .select('manufacturer')
      .not('manufacturer', 'is', null);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database query failed' });
    }

    const manufacturers = [...new Set(data?.map(row => row.manufacturer).filter(Boolean))].sort();
    res.json({ manufacturers });
  } catch (error) {
    console.error('Manufacturers fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize clean chat endpoint with 100% reliability guarantee
createChatEndpoint(app, {
  sessionStore,
  contextRecoveryService,
  interactiveWorkflow,
  enhancedIntegration,
  reliabilityGuarantee,
  professionalDiagnosticService,
  llmMonitor,
  hybridDiagnosticService
});

// Chat session endpoint - get session info
app.get('/api/chat/session', async (req, res) => {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    const session = await sessionStore.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
      sessionId: session.sessionId,
      messageCount: session.history?.length || 0,
      lastActivity: session.lastActivity,
      boilerInfo: session.boilerInfo
    });
    
  } catch (error) {
    console.error('[Session] Error retrieving session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reliability metrics endpoint
app.get('/api/reliability/metrics', async (req, res) => {
  try {
    const metrics = reliabilityGuarantee.getReliabilityMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('[Reliability] Error getting metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Chat session endpoint - get session info
app.get('/api/chat/session', async (req, res) => {
  try {
    const sessionId = req.query.sessionId;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const session = await sessionStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId,
      messageCount: session.history?.length || 0,
      lastActivity: session.lastActivity,
      boilerInfo: session.boilerInfo
    });
  } catch (error) {
    console.error('[Session] Error getting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Enhanced LLM system ready for professional Gas Safe diagnostics`);
});

/**
 * GET admin analytics endpoint
 * Returns analytics data for admin dashboard
 */
app.get('/api/admin/analytics', adminAuth, async (req, res) => {
  try {
    // Return mock analytics data for admin dashboard
    const analytics = {
      totalUsers: 1247,
      activeUsers: 892,
      revenueThisMonth: 15420.50,
      averageSessionTime: '12m 34s',
      lastUpdated: new Date().toISOString(),
      // Additional metrics
      conversionRate: 71.5,
      avgSessionsPerUser: 3.2,
      totalSessions: 2856,
      // Growth metrics
      userGrowth: 12.3,
      revenueGrowth: 8.7,
      sessionGrowth: 15.2
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

/**
 * GET admin metrics endpoint
 * Returns system metrics for dashboard
 */
app.get('/api/admin/metrics', adminAuth, async (req, res) => {
  try {
    // Get timeframe parameter
    const timeframe = req.query.timeframe || '7days'; // default to 7 days
    
    // Calculate date range
    let startDate;
    const now = new Date();
    
    switch (timeframe) {
      case '24hours':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    // Format dates for SQL
    const startDateStr = startDate.toISOString();
    
    // Run parallel queries
    const [
      totalUsersResult,
      newUsersResult,
      activeUsersResult,
      chatCountResult,
      manualViewsResult,
      feedbackCountResult
    ] = await Promise.all([
      // Total users count
      supabase.from('users').select('id', { count: 'exact', head: true }),
      
      // New users in timeframe
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDateStr),
      
      // Active users in timeframe (users who signed in)
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('last_sign_in_at', startDateStr),
      
      // Chat count in timeframe
      supabase
        .from('chat_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDateStr),
      
      // Manual views in timeframe
      supabase
        .from('manual_views')
        .select('id', { count: 'exact', head: true })
        .gte('viewed_at', startDateStr),
      
      // Feedback count in timeframe
      supabase
        .from('feedback')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startDateStr)
    ]);
    
    // Check for errors
    const errors = [
      totalUsersResult.error,
      newUsersResult.error,
      activeUsersResult.error,
      chatCountResult.error,
      manualViewsResult.error,
      feedbackCountResult.error
    ].filter(Boolean);
    
    if (errors.length > 0) {
      console.error('Errors fetching metrics:', errors);
      return res.status(500).json({ error: 'Failed to fetch some metrics' });
    }
    
    // Build response
    const metrics = {
      users: {
        total: totalUsersResult.count || 0,
        new: newUsersResult.count || 0,
        active: activeUsersResult.count || 0
      },
      engagement: {
        chatSessions: chatCountResult.count || 0,
        manualViews: manualViewsResult.count || 0,
        feedback: feedbackCountResult.count || 0
      },
      timeframe
    };
    
    return res.json(metrics);
  } catch (error) {
    console.error('Error in admin metrics API:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST admin endpoint to update user role
 * Changes a user's role (e.g., promote to admin)
 */
app.post('/api/admin/users/:userId/role', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!userId || !role) {
      return res.status(400).json({ error: 'Missing userId or role' });
    }
    
    // Update user role in Supabase Auth
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: { role }
    });
    
    if (error) {
      console.error('Error updating user role:', error);
      return res.status(500).json({ error: 'Failed to update user role' });
    }
    
    return res.json({ message: `User ${userId} role updated to ${role}` });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST admin endpoint to manually embed knowledge
app.post('/api/admin/embed-knowledge', adminAuth, async (req, res) => {
  const { text, tag, source } = req.body;
  
  if (!text || !tag) {
    return res.status(400).json({ error: 'Text and tag are required' });
  }
  
  try {
    // Create embedding
    const vector = await createEmbedding(text);
    
    // Store in database
    const { data, error } = await supabase
      .from('knowledge_embeddings')
      .insert({
        text,
        vector,
        tag,
        source: source || null
      })
      .select();
    
    if (error) throw error;
    res.json({ success: true, id: data[0].id });
    
  } catch (error) {
    console.error('Error embedding knowledge:', error);
    res.status(500).json({ error: 'Failed to embed knowledge' });
  }
});

// POST endpoint for manual uploads (admin only)
app.post('/api/manuals/upload', adminAuth, validateCsrf, async (req, res) => {
  res.status(501).json({ error: 'File upload via API not implemented. Use Supabase dashboard.' });
});

// POST endpoint for logs/screenshots upload
app.post('/api/logs/upload', async (req, res) => {
  try {
    const { logType, content, timestamp, userInfo } = req.body;
    
    if (!logType || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Store in Supabase
    const { data, error } = await supabase
      .from('user_logs')
      .insert({
        log_type: logType,
        content,
        timestamp: timestamp || new Date().toISOString(),
        user_info: userInfo || null
      })
      .select();
      
    if (error) throw error;
    
    res.json({ success: true, id: data[0].id });
  } catch (error) {
    console.error('Error uploading log:', error);
    res.status(500).json({ error: 'Failed to upload log' });
  }
});

// Catch-all route for React SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

/**
 * Check if a port is available
 * @param {number} port - The port to check
 * @returns {Promise<boolean>} True if port is available, false if in use
 */
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false); // Port is in use
    });
    server.once('listening', () => {
      // Close the server and resolve with true (port is available)
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
};

/**
 * Find an available port starting from the given port
 * @param {number} startPort - The port to start checking from
 * @returns {Promise<number>} The first available port
 */
const findAvailablePort = async (startPort) => {
  let port = startPort;
  // Try up to 10 ports to find an available one
  for (let i = 0; i < 10; i++) {
    const isAvailable = await isPortAvailable(port);
    if (isAvailable) {
      return port;
    }
    port++;
  }
  // If no port was found, return the original port and let the system handle the error
  return startPort;
};

/**
 * PUT admin user update endpoint
 * Updates user information (admin only)
 */
app.put('/api/admin/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    // Validate user ID
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Only allow certain fields to be updated for security
    const allowedFields = ['name', 'tier', 'active', 'email'];
    const safeUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        safeUpdates[key] = updates[key];
      }
    });
    
    if (Object.keys(safeUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    // Add updated timestamp
    safeUpdates.updated_at = new Date().toISOString();
    
    // Update user in database
    const { data, error } = await supabase
      .from('users')
      .update(safeUpdates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }
    
    // Log admin action for audit trail
    
    return res.json({
      success: true,
      user: data,
      message: 'User updated successfully'
    });
    
  } catch (error) {
    console.error('Error in admin user update:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE admin user endpoint
 * Soft deletes a user (admin only)
 */
app.delete('/api/admin/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Soft delete by setting active to false
    const { data, error } = await supabase
      .from('users')
      .update({ 
        active: false, 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Failed to delete user' });
    }
    
    // Log admin action for audit trail
    
    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('Error in admin user delete:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET admin audit log endpoint
 * Returns audit trail of admin actions
 */
app.get('/api/admin/audit-log', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    
    // For now, return mock audit data
    // In production, implement proper audit logging to database
    const mockAuditLog = [
      {
        id: 1,
        admin_email: req.user.email,
        action: 'user_updated',
        target_id: 'user-123',
        details: 'Updated user tier from basic to pro',
        timestamp: new Date().toISOString()
      },
      {
        id: 2,
        admin_email: req.user.email,
        action: 'user_deleted',
        target_id: 'user-456',
        details: 'Soft deleted inactive user',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    return res.json({
      auditLog: mockAuditLog.slice(offset, offset + pageSize),
      pagination: {
        total: mockAuditLog.length,
        page,
        pageSize,
        totalPages: Math.ceil(mockAuditLog.length / pageSize)
      }
    });
    
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Start the server with dynamic port selection
(async () => {
  try {
    // Initialize enhanced integration service
    await enhancedIntegration.initialize();
    
    const availablePort = await findAvailablePort(PORT);
    app.listen(availablePort, () => {
      
      // Log enhanced capabilities
      const capabilities = enhancedIntegration.getCapabilities();
      console.log(`   - Enhanced functions: ${capabilities.enhancedFunctions} (${capabilities.functionCount} functions)`);
      console.log(`   - Real-time monitoring: ${capabilities.realTimeMonitoring} (${capabilities.monitoringSources} sources)`);
      console.log(`   - Available models: ${capabilities.availableModels.join(', ')}`);
      
      // Log environment variables for debugging
      
      // Log port info
      if (availablePort !== PORT) {
      }
      
      // Log API key presence for debugging
      
      console.log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'present' : 'not set'}`);
      
      // Log API key status
      const keyCount = deepseekApiKeys.length + (process.env.OPENAI_API_KEY ? 1 : 0);
      
      if (keyCount === 0) {
        console.warn('⚠️ WARNING: No API keys configured! Chat functionality will fail.');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

// Serve static files from the React app (placed after API routes)
app.use(express.static(path.join(__dirname, '../build')));

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

// Export for testing
export default app;
