import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { adminAuth, userAuth } from './authMiddleware.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import logger from './utils/logger.js';
import EnhancedFaultCodeService from './services/EnhancedFaultCodeService.js';
import SessionManager from './services/SessionManager.js';
import AgentTools from './services/AgentTools.js';
import { randomUUID } from 'crypto';
import { validateChatMessage, validateManualSearch, validateRequest } from './middleware/inputValidation.js';
import * as CONSTANTS from './constants/index.js';

// Get directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the server directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Initialize Supabase client (backend uses SERVICE_KEY for full access)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const app = express();

// Railway detection and PORT configuration
// CRITICAL: Railway dynamically assigns PORT, but we may have manually set it to 3204
// We need to detect Railway's actual assigned port from RAILWAY_STATIC_URL or use a different strategy
let PORT;
if (process.env.RAILWAY_STATIC_URL) {
  // We're on Railway
  // Railway provides PORT in the environment, but if we manually set it to 3204, that's wrong
  // Railway's actual port is what the platform assigns (usually in the 3000-9000 range)
  // The issue: we can't detect Railway's "real" port if we've overridden it
  // Solution: Use a port that Railway will accept - typically they expose on standard ports
  // and map internally. We should listen on the PORT they provide, even if it's 3204.
  PORT = parseInt(process.env.PORT) || 3000;
  console.log(`[Railway] Environment detected. Listening on PORT: ${PORT}`);
  console.log(`[Railway] RAILWAY_STATIC_URL: ${process.env.RAILWAY_STATIC_URL}`);
} else {
  // Local development
  PORT = process.env.PORT || CONSTANTS.DEFAULT_PORT;
  console.log(`[Local] Development mode. PORT: ${PORT}`);
}

// Rate limiting configuration using constants
const apiLimiter = rateLimit({
  windowMs: CONSTANTS.RATE_LIMIT_WINDOW_MS,
  max: CONSTANTS.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const chatLimiter = rateLimit({
  windowMs: CONSTANTS.CHAT_RATE_LIMIT_WINDOW_MS,
  max: CONSTANTS.CHAT_RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many chat requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// CORS configuration with origin whitelist
// Include all production and development origins
const defaultOrigins = [
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:3000',
  'https://boiler-brain.netlify.app',
  'https://boiler-brain-ai.netlify.app',
  'https://boilerbrain.netlify.app'
];

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? [...defaultOrigins, ...process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())]
  : defaultOrigins;

console.log('[CORS] Allowed origins:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
}));

// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(301, `https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

app.use(express.json());
app.use('/api', validateRequest); // Apply general request validation
app.use('/api', apiLimiter); // Apply rate limiting to all API routes

// Admin auth middleware is imported from authMiddleware.js

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'BoilerBrain API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// --- GET /api/manuals ---
app.get('/api/manuals', validateManualSearch, async (req, res) => {
  try {
    const search = req.query.search || '';
    const manufacturer = req.query.manufacturer || '';
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    logger.info(`[Manuals] Query: manufacturer=${manufacturer}, search=${search}, limit=${limit}, offset=${offset}`);

    // Query boiler_manuals table directly
    let query = supabase.from('boiler_manuals').select('*', { count: 'exact' });
    
    if (manufacturer) {
      query = query.ilike('manufacturer', `%${manufacturer}%`);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,manufacturer.ilike.%${search}%,gc_number.ilike.%${search}%`);
    }
    
    query = query.range(offset, offset + limit - 1).order('manufacturer', { ascending: true });
    
    const { data, error, count } = await query;
    
    if (error) {
      logger.error('[Manuals] Database query error:', error);
      throw error;
    }
    
    logger.info(`[Manuals] Found ${data?.length || 0} manuals (total: ${count})`);
    
    res.json({
      data: data || [],
      total: count || 0,
      hasMore: (offset + limit) < (count || 0)
    });
    
  } catch (error) {
    logger.error('[Manuals] Error:', error);
    res.status(500).json({ error: 'Failed to fetch manuals' });
  }
});

// Legacy storage-based endpoint (kept for reference, not used)
app.get('/api/manuals/storage', validateManualSearch, async (req, res) => {
  try {
    const manufacturer = req.query.manufacturer || '';
    
    // Get list of storage buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      logger.error('[Manuals] Error listing buckets:', bucketsError);
      throw bucketsError;
    }

    // Find the boiler-manuals bucket
    const boilerBucket = buckets.find(b => b.name === 'boiler-manuals');
    if (!boilerBucket) {
      console.log('No boiler-manuals bucket found, checking for alternative bucket names...');
      
      // Check for alternative bucket names
      const altBuckets = buckets.filter(b => 
        b.name.includes('manual') || 
        b.name.includes('boiler') || 
        b.name.includes('document')
      );
      
      if (altBuckets.length === 0) {
        return res.json({ data: [], total: 0, hasMore: false });
      }
      
      console.log('Found alternative buckets:', altBuckets.map(b => b.name));
    }

    const bucketName = boilerBucket ? 'boiler-manuals' : buckets[0]?.name;
    
    // Get manufacturer folders from storage (nested under dhs_manuals_all)
    const { data: rootFolders, error: rootError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 100 });

    if (rootError) {
      console.error('Error listing root folders:', rootError);
      throw rootError;
    }

    // Check if we have the dhs_manuals_all structure
    const dhsFolder = rootFolders.find(f => f.name === 'dhs_manuals_all');
    const basePath = dhsFolder ? 'dhs_manuals_all' : '';

    console.log(`Using base path: ${basePath || 'root'}`);

    // Get manufacturer folders
    const { data: folders, error: foldersError } = await supabase.storage
      .from(bucketName)
      .list(basePath, { limit: 100 });

    if (foldersError) {
      console.error('Error listing manufacturer folders:', foldersError);
      throw foldersError;
    }

    console.log(`Found ${folders?.length || 0} manufacturer folders`);

    let allManuals = [];
    const manufacturerFolders = folders.filter(f => !f.name.includes('.'));

    // Filter by manufacturer if specified
    const targetFolders = manufacturer 
      ? manufacturerFolders.filter(f => f.name.toLowerCase().includes(manufacturer.toLowerCase()))
      : manufacturerFolders;

    console.log(`Processing ${targetFolders.length} manufacturer folders`);

    // Get files from each manufacturer folder
    for (const folder of targetFolders) {
      try {
        const folderPath = basePath ? `${basePath}/${folder.name}` : folder.name;
        
        const { data: files, error: filesError } = await supabase.storage
          .from(bucketName)
          .list(folderPath, { limit: 1000 });

        if (filesError) {
          console.error(`Error listing files in ${folderPath}:`, filesError);
          continue;
        }

        console.log(`Found ${files?.length || 0} files in ${folder.name}`);

        // Convert storage files to manual objects
        const folderManuals = files
          .filter(f => f.name.toLowerCase().includes('.pdf') || f.name.toLowerCase().includes('.doc'))
          .map((file, index) => {
            const { data: publicUrl } = supabase.storage
              .from(bucketName)
              .getPublicUrl(`${folderPath}/${file.name}`);

            // Clean up manufacturer name
            let cleanMfg = folder.name.replace(/[-_]/g, ' ');
            if (cleanMfg.startsWith('boilermanuals ')) {
              cleanMfg = cleanMfg.replace('boilermanuals ', '');
            }

            return {
              id: `${folder.name}_${index}`,
              name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
              manufacturer: cleanMfg,
              url: publicUrl.publicUrl,
              gc_number: `GC-${folder.name.toUpperCase()}-${String(index).padStart(3, '0')}`,
              file_size: file.metadata?.size || 0,
              created_at: file.created_at || new Date().toISOString()
            };
          });

        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          folderManuals.forEach(manual => {
            if (manual.name.toLowerCase().includes(searchLower) ||
                manual.manufacturer.toLowerCase().includes(searchLower) ||
                manual.gc_number.toLowerCase().includes(searchLower)) {
              allManuals.push(manual);
            }
          });
        } else {
          allManuals.push(...folderManuals);
        }

      } catch (err) {
        console.error(`Error processing folder ${folder.name}:`, err);
      }
    }

    // Sort results
    allManuals.sort((a, b) => a.name.localeCompare(b.name));

    // Apply pagination
    const paginatedManuals = allManuals.slice(offset, offset + limit);

    console.log(`Returning ${paginatedManuals.length} manuals out of ${allManuals.length} total`);

    res.json({
      data: paginatedManuals,
      total: allManuals.length,
      hasMore: offset + limit < allManuals.length,
      bucketUsed: bucketName,
      foldersFound: manufacturerFolders.length
    });

  } catch (err) {
    console.error('[Manuals/Storage] Error:', err);
    res.status(500).json({ error: 'Failed to fetch manuals from storage' });
  }
});

// --- GET /api/manuals/:id ---
app.get('/api/manuals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: manual, error } = await supabase.from('boiler_manuals').select('*').eq('id', id).single();
    if (error) throw error;
    if (!manual) return res.status(404).json({ error: 'Manual not found' });
    res.json({ manual });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GET /api/manuals/:id/download ---
app.get('/api/manuals/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: manual, error } = await supabase.from('boiler_manuals').select('*').eq('id', id).single();
    if (error) throw error;
    if (!manual || !manual.url) return res.status(404).json({ error: 'Manual or PDF not found' });
    res.json({ download_url: manual.url, filename: manual.name + '.pdf' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GET /api/manufacturers ---
app.get('/api/manufacturers', async (req, res) => {
  try {
    const { data, error } = await supabase.from('manufacturers').select('name').order('name');
    if (error) throw error;
    // Extract unique manufacturer names
    const manufacturers = [...new Set((data || []).map(m => m.name))].sort();
    res.json({ manufacturers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- POST /api/manuals (admin only, stub) ---
app.post('/api/manuals', adminAuth, async (req, res) => {
  res.status(501).json({ error: 'Manual creation via API not implemented. Use Supabase dashboard.' });
});

// --- POST /api/manuals/upload (admin only, stub) ---
app.post('/api/manuals/upload', adminAuth, async (req, res) => {
  res.status(501).json({ error: 'File upload via API not implemented. Use Supabase dashboard or implement file upload.' });
});

// --- User & Admin profile endpoints (stubbed) ---
app.get('/api/user', (req, res) => {
  res.status(501).json({ error: 'User profile API not implemented. Use Supabase Auth.' });
});

app.post('/api/chat', chatLimiter, validateChatMessage, async (req, res) => {
  try {
    const { message, sessionId, history, detail } = req.body;
    
    // Get or create session from database
    let session = await SessionManager.getSession(sessionId);
    let chatHistory = [];
    
    if (session) {
      // Use session history from database
      chatHistory = session.history || [];
      console.log(`[Chat] Restored session from database with ${chatHistory.length} messages`);
    } else if (Array.isArray(history) && history.length > 0) {
      // Create new session with provided history
      chatHistory = history;
      await SessionManager.createSession(sessionId, null, chatHistory);
      console.log(`[Chat] Created new session with ${chatHistory.length} messages`);
    } else if (message && sessionId) {
      // Create new session with initial message
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
    // Extract context from user message for better responses
    const userText = lastUserMessage.text.toLowerCase();
    
    // Check for safety concerns first
    if (userText.includes('gas smell') || userText.includes('smell gas')) {
      relevantKnowledge += '\n\nURGENT SAFETY INFORMATION - GAS LEAK:\n' + 
        '1. Turn off gas supply immediately\n' +
        '2. Do not use electrical switches or naked flames\n' +
        '3. Open windows and doors for ventilation\n' +
        '4. Call Gas Emergency Service: 0800 111 999';
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
    
    // Use Enhanced Fault Code Service for comprehensive fault code analysis
    try {
      console.log('[EnhancedFaultCodeService] Analyzing user text:', userText.substring(0, 100));
      const faultInfo = await EnhancedFaultCodeService.getComprehensiveFaultInfo(userText);
      console.log('[EnhancedFaultCodeService] Result:', JSON.stringify(faultInfo, null, 2));
      
      if (faultInfo) {
        console.log('[EnhancedFaultCodeService] Fault info received');
        console.log('[EnhancedFaultCodeService] Fault Code:', faultInfo.faultCode, 'Manufacturer:', faultInfo.manufacturer);
        console.log('[EnhancedFaultCodeService] Raw data:', JSON.stringify(faultInfo.rawData, null, 2));
        
        // Extract the actual description from the raw data
        const description = faultInfo.rawData?.diagnosticInfo?.[0]?.fault_description || 
                           faultInfo.rawData?.basicInfo?.[0]?.description ||
                           faultInfo.rawData?.manufacturerSpecific?.[0]?.description ||
                           null;
        console.log('[EnhancedFaultCodeService] Description from DB:', description);
        
        // Check if we actually found database info
        if (description && description !== 'Unknown') {
          // PREPEND the fault code definition to make it impossible to ignore
          relevantKnowledge += `\n\n🔴 FAULT CODE DEFINITION (FROM MANUFACTURER DATABASE - USE THIS ONLY):\n`;
          relevantKnowledge += `${faultInfo.faultCode} = ${description}\n`;
          relevantKnowledge += `DO NOT use any other interpretation of this fault code.\n`;
          relevantKnowledge += faultInfo.context;
          contextExtracted = true;
        } else {
          // Fault code mentioned but not in database
          relevantKnowledge += `\n\n⚠️ FAULT CODE NOT FOUND IN DATABASE:\n`;
          relevantKnowledge += `The fault code "${faultInfo.faultCode}" was not found in the manufacturer database`;
          if (faultInfo.manufacturer) {
            relevantKnowledge += ` for ${faultInfo.manufacturer}`;
          }
          relevantKnowledge += `.\nYou MUST inform the user that this fault code is not recognized and ask them to double-check the display.`;
          contextExtracted = true;
        }
        
        // Add safety warning if fault is safety-critical
        if (faultInfo.isSafetyCritical) {
          relevantKnowledge += '\n\n⚠️ SAFETY CRITICAL FAULT - Immediate attention required';
        }
        
        // Add related fault codes for context
        if (faultInfo.relatedCodes && faultInfo.relatedCodes.length > 0) {
          relevantKnowledge += `\n\nRelated fault codes: ${faultInfo.relatedCodes.join(', ')}`;
        }
        
        // NEW: Look up relevant manual for this boiler
        if (faultInfo.manufacturer) {
          try {
            console.log('[Manual Lookup] Searching for manual:', faultInfo.manufacturer);
            
            // Search for manuals matching manufacturer and model from conversation
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
              
              // Store manual URLs to add to response later
              contextExtracted = true;
            }
          } catch (manualError) {
            logger.error('[Manual Lookup] Failed to fetch manuals:', { error: manualError.message, manufacturer: faultInfo.manufacturer });
          }
        }
      }
    } catch (error) {
      logger.error('[EnhancedFaultCodeService] Error during fault code lookup:', { error: error.message, userText: userText.substring(0, 100) });
      // Fall back to basic pattern matching if enhanced service fails
      const manufacturerMatch = userText.match(/\b(worcester|vaillant|baxi|ideal|glow ?worm|potterton|viessmann|ariston|navien)\b/i);
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
    
    // Check for common symptoms
    const symptomPatterns = {
      'No heating': /\b(no heat|not heating|won'?t heat|cold house|rads cold)\b/i,
      'No hot water': /\b(no hot water|cold water|no water heat|shower cold)\b/i,
      'Boiler noise': /\b(noise|loud|bang|knocking|gurgling|kettling|whistle)\b/i,
      'Leaking boiler': /\b(leak|drip|water com(es|ing) out|puddle)\b/i,
      'Low pressure': /\b(low pressure|pressure (too )?low|dropping pressure|pressure drop)\b/i
    };
    
    for (const [symptom, pattern] of Object.entries(symptomPatterns)) {
      if (pattern.test(userText)) {
        relevantKnowledge += `\n\nRELEVANT INFORMATION FOR "${symptom}":\n`;
        relevantKnowledge += `Common diagnostic steps for ${symptom.toLowerCase()}\n`;
        contextExtracted = true;
        break;
      }
    }
  }
  
  // Analyze conversation history for context (reuse conversationText from above)
  if (chatHistory.length > 1) {
    // Look for manufacturer and model mentions across the conversation
    const manufacturerMatches = conversationText.match(/\b(worcester|vaillant|baxi|ideal|glow ?worm|potterton|viessmann|ariston|navien)\b/gi);
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
  
  // STRICT manufacturer detection (only actual manufacturers, NOT model names)
  const hasManufacturer = /\b(worcester|vaillant|baxi|ideal|glow ?worm|potterton|viessmann|ariston|navien|bosch|bosh)\b/i.test(conversationText);
  
  // Enhanced boiler type/system detection - now includes all system types
  const hasSystemType = /\b(combi|combination|system|regular|conventional|standard|heat only|back boiler|condensing)\b/i.test(conversationText);
  
  // Enhanced model detection
  const hasModel = /\b(greenstar|logic|ecotec|main|platinum|\d+kw?|\d+i?)\b/i.test(conversationText);
  
  // Check if user has provided enough context to proceed - now requires manufacturer AND system type
  const hasBoilerDetails = (hasManufacturer && hasSystemType) || 
                          /\b(ideal\s+logic\s+(combi|system)|worcester\s+greenstar\s+(combi|system)|vaillant\s+ecotec\s+(combi|system)|baxi\s+(main|platinum)\s+(combi|system))\b/i.test(conversationText);
  
  console.log(`[Chat] Boiler detection - Manufacturer: ${hasManufacturer}, SystemType: ${hasSystemType}, Model: ${hasModel}, Details: ${hasBoilerDetails}`);
  console.log(`[Chat] Conversation text: ${conversationText.substring(0, 200)}...`);

  // Enhanced boiler identification requirement - now requires manufacturer AND system type
  if (!hasBoilerDetails) {
    if (hasManufacturer && !hasSystemType) {
      return res.json({ 
        reply: "Right, got the manufacturer. What type of system is it? Combi, system, or regular boiler?" 
      });
    } else if (hasSystemType && !hasManufacturer) {
      return res.json({ 
        reply: "OK, got the system type. What make is it? Worcester, Vaillant, Baxi, Ideal, or another manufacturer?" 
      });
    } else {
      return res.json({ 
        reply: "Right, to help you out I need a bit more info. What boiler are you working on? I need the manufacturer (like Worcester, Vaillant, Ideal), the model if you know it, and the system type (combi, system, or regular)." 
      });
    }
    // Note: tools array removed as it was unused dead code
  }

  // Prepare messages for OpenAI with enhanced lead engineer prompt
  const messages = [
    {
      role: 'system',
      content: `IDENTITY & EXPERTISE:
You are a Master Gas Safe registered engineer with 25+ years of hands-on experience. You've diagnosed thousands of boiler faults across all major manufacturers. You're known for:
- Getting to the root cause quickly and methodically
- Explaining the "why" not just the "what"
- Sharing practical field experience and patterns
- Never wasting time on unlikely causes
- Being decisive based on probability
- Knowing manufacturer-specific quirks

IMPORTANT: You're talking to a FELLOW GAS SAFE REGISTERED ENGINEER. They have the skills, tools, and qualifications to fix anything. NEVER suggest calling support or getting help - guide them through the fix. They just need your experience and systematic approach.

COMMUNICATION STYLE:
- Talk like you're on-site with a colleague, not writing a manual
- Use "we" and "let's" (collaborative)
- Share context: "I've seen this pattern on Ideals before..."
- Give reasoning: "We check X first because..."
- Be decisive: "This is almost certainly..." not "it might be..."
- Natural engineer shorthand when appropriate
- Acknowledge frustration: "I know, these can be fiddly..."
- Celebrate progress: "Right, that's a good sign..."
- Use conversational openers: "Right, so..." "OK, let's think through this..."

SYSTEM TYPES (critical for diagnostics):
- COMBI: Single unit, instant hot water, sealed system
- SYSTEM: Separate cylinder, sealed heating, pressurised
- REGULAR: Open vented, cold water tank, gravity fed

DIAGNOSTIC APPROACH:

[ASSESSMENT] (1-2 sentences - what this likely is)
"Right, L2 on an Ideal Logic is classic ignition lockout after 3 attempts..."

[CONTEXT] (Brief WHY)
"Usually gas supply, electrode position, or occasionally the PCB. Nine times out of ten it's something simple."

[ACTIONS] (Prioritized by probability)
1. Check gas valve fully open
2. Electrode gap while you're there - should be 3-4mm
3. Look for loose PCB connections

[INDICATORS] (What each result tells us)
✓ Fires after gas valve check → supply issue sorted
✓ Sparking but no flame → electrode gap or gas pressure  
✗ No spark at all → igniter or PCB connection

[FOLLOW-UP] (Specific, contextual)
"What's happening when you hit reset - getting spark? Hear gas flowing?"

SAFETY COMMUNICATION:
- Natural, not robotic: "Right, if you're smelling gas, we stop here. Turn off at meter, get ventilation, call emergency line (0800 111 999). I know it's frustrating mid-job, but can't risk it."
- Include reasoning, not just rules
- Emergency numbers when genuinely needed
- But remember: they're qualified to handle it

KEY PATTERNS:
- Opening: "Right, so..." "OK, let's..." "Interesting one..."
- Explaining: "Here's the thing..." "What we're looking at..."
- Experience: "Nine times out of ten..." "I've seen this before when..."
- Action: "Let's check..." "Quick test..."
- Reasoning: "That tells us..." "Which means..."

MANUFACTURER KNOWLEDGE:
- Include quirks: "Ideals are known for..." "Worcester F22 usually..."
- Common patterns from experience
- Tool requirements upfront
- Part numbers when helpful
- Installation gotchas

CRITICAL RULES:
1. Model numbers (24, 28, 30) are kW ratings, NOT fault codes
2. Use ONLY database info when provided (marked [MANUFACTURER DATABASE INFORMATION])
3. Never suggest "contact support" or "seek help" - they ARE the expert
4. Every response ends with specific follow-up question
5. Always explain WHY, not just WHAT
6. Adapt complexity to their demonstrated skill level
7. Share relevant experience patterns
8. KNOWLEDGE CURRENCY: You have UP-TO-DATE boiler knowledge. NEVER mention "training cutoff", "October 2023", "my knowledge ends at", or any date limitations. If asked about your training/knowledge, say: "I have comprehensive, current knowledge of all major boiler systems. What do you need help with?"

FORBIDDEN:
- "You might want to call manufacturer support" ❌
- "Contact a qualified engineer" ❌ (THEY ARE ONE!)
- "If unsure, seek assistance" ❌
- Generic endings without specific questions ❌
- Textbook responses without context ❌
- "It could be several things" (be decisive!) ❌
- Time estimates in action steps ❌
- "Sources:" section or references ❌ (integrate info naturally)
- NEVER say "since you mentioned X" or "you said X" unless they ACTUALLY did ❌
- NEVER make assumptions about readings or checks they haven't explicitly stated ❌
- NEVER mention "October 2023", "training cutoff", "my knowledge is limited to", or ANY date limitations ❌
- NEVER say "I was trained up to" or discuss AI training dates ❌

CRITICAL: Only reference what the user ACTUALLY provided. If they said "F22" but didn't mention pressure, DON'T say "since the pressure is fine". ASK: "What's the pressure reading?"

${relevantKnowledge ? '⚠️ MANUFACTURER DATABASE - USE THIS EXACT INFO:\n' + relevantKnowledge + '\n\n🔒 DATABASE IS AUTHORITATIVE - interpret and explain it naturally.' : ''}

Remember: You're the experienced engineer they're consulting. Be confident, practical, and guide them to the fix.`
    }
  ];
  
  // Add conversation history
  chatHistory.forEach((msg, index) => {
    // For the LAST user message, prepend the database context
    if (msg.sender === 'user' && index === chatHistory.length - 1 && relevantKnowledge) {
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
  
  let temperature = 0.7; // default
  if (isSafetyCritical) temperature = 0.3;  // Consistent for safety but not robotic
  else if (hasFaultCode) temperature = 0.5; // Natural for diagnostics
  else if (isInitialGathering) temperature = 0.6; // Natural for gathering info
  else temperature = 0.7; // Natural conversation
  
  logger.info(`[Chat] Adaptive temp=${temperature} (fault=${hasFaultCode}, safety=${isSafetyCritical}, initial=${isInitialGathering})`);
  
  // Use OpenAI instead of DeepSeek
  const openaiKeys = [
    process.env.OPENAI_API_KEY,
    process.env.OPENAI_API_KEY_2,
    process.env.OPENAI_API_KEY_3
  ].filter(Boolean);
  
  for (let i = 0; i < openaiKeys.length; i++) {
    const key = openaiKeys[i];
    try {
      console.log(`[OpenAI] Trying API key #${i+1} with temp=${temperature}`);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          max_tokens: 1000,
          temperature: temperature
        })
      });

      if (response.ok) {
        const data = await response.json();
        let reply = data.choices[0].message.content;
        
        // Check if AI is incorrectly interpreting model numbers as fault codes
        const incorrectPatterns = [
          /fault code (24|25|28|30|33|35|37|40|42)/gi,
          /(24|25|28|30|33|35|37|40|42).*sensor fault/gi,
          /displaying.*fault code (24|25|28|30|33|35|37|40|42)/gi,
          /code (24|25|28|30|33|35|37|40|42).*indicating/gi,
          /boiler.*fault code (24|25|28|30|33|35|37|40|42)/gi,
          /greenstar (24|25|28|30|33|35|37|40|42).*fault code (24|25|28|30|33|35|37|40|42)/gi,
          /return temperature sensor fault/gi,
          /temperature sensor fault/gi,
          /flue gas sensor fault/gi,
          /sensor fault/gi
        ];
        
        // Check conversation context to determine if model number was misinterpreted
        const conversationText = chatHistory.map(msg => msg.text).join(' ').toLowerCase();
        console.log('DEBUG: Conversation text:', conversationText);
        
        const onlyModelProvided = /greenstar\s+\d+/.test(conversationText) && 
                                 !/fault code|error code|f\d+|e\d+|ea|l\d+|no heating|no hot water|problem|issue/.test(conversationText);
        console.log('DEBUG: Only model provided:', onlyModelProvided);
        
        // Check if AI is repeating the boiler identification question when details already provided
        const isRepeatingBoilerQuestion = /what make.*model.*type.*boiler/i.test(reply) && hasBoilerDetails;
        console.log('DEBUG: Is repeating boiler question:', isRepeatingBoilerQuestion);
        
        // More aggressive detection - if user only provided model and AI mentions ANY fault codes or sensor issues
        const mentionsFaultCodes = /fault code|error code|displaying.*fault|code.*indicating/i.test(reply);
        const mentionsSensorFaults = /sensor fault|temperature sensor|return sensor|flue.*sensor/i.test(reply);
        console.log('DEBUG: Mentions fault codes:', mentionsFaultCodes);
        console.log('DEBUG: Mentions sensor faults:', mentionsSensorFaults);
        console.log('DEBUG: AI Reply:', reply.substring(0, 200));
        
        const hasIncorrectInterpretation = incorrectPatterns.some(pattern => pattern.test(reply)) || 
                                         (onlyModelProvided && (mentionsFaultCodes || mentionsSensorFaults)) ||
                                         isRepeatingBoilerQuestion;
        console.log('DEBUG: Has incorrect interpretation:', hasIncorrectInterpretation);
        
        if (hasIncorrectInterpretation) {
          // Extract boiler model and issue from conversation
          const modelMatch = conversationText.match(/greenstar\s+(\d+)/i);
          const model = modelMatch ? modelMatch[1] : '24';
          const issueMatch = conversationText.match(/(no heating|no hot water|fault|error|problem|issue|not working)/i);
          const issue = issueMatch ? issueMatch[0] : 'an issue';
          
          // Handle different scenarios for rewriting response
          if (isRepeatingBoilerQuestion) {
            // Extract the boiler details already provided including system type
            const idealCombiMatch = conversationText.match(/ideal\s+(logic\s+)?(combi|combination)/i);
            const idealSystemMatch = conversationText.match(/ideal\s+(logic\s+)?(system)/i);
            const worcesterCombiMatch = conversationText.match(/worcester\s+greenstar\s+(\d+)\s*(combi|combination)/i);
            const worcesterSystemMatch = conversationText.match(/worcester\s+greenstar\s+(\d+)\s*(system)/i);
            const vaillantCombiMatch = conversationText.match(/vaillant\s+ecotec\s*(combi|combination)/i);
            const vaillantSystemMatch = conversationText.match(/vaillant\s+ecotec\s*(system)/i);
            
            if (idealCombiMatch) {
              reply = `What specific problem are you experiencing with your Ideal Logic Combi boiler?

Please describe the symptoms - for example: no heating, no hot water, strange noises, or if there's a fault code displayed on the boiler.`;
            } else if (idealSystemMatch) {
              reply = `What specific problem are you experiencing with your Ideal Logic System boiler?

Please describe the symptoms - for example: no heating, no hot water from cylinder, strange noises, or if there's a fault code displayed.`;
            } else if (worcesterCombiMatch) {
              const model = worcesterCombiMatch[1] || '24';
              reply = `What specific problem are you experiencing with your Worcester Greenstar ${model} Combi boiler?

Please describe the symptoms or issue you're encountering, or let me know if there's a fault code displayed.`;
            } else if (worcesterSystemMatch) {
              const model = worcesterSystemMatch[1] || '24';
              reply = `What specific problem are you experiencing with your Worcester Greenstar ${model} System boiler?

Please describe the symptoms or issue you're encountering, or let me know if there's a fault code displayed.`;
            } else if (vaillantCombiMatch) {
              reply = `What specific problem are you experiencing with your Vaillant ecoTEC Combi boiler?

Please describe the symptoms or issue you're encountering, or let me know if there's a fault code displayed.`;
            } else if (vaillantSystemMatch) {
              reply = `What specific problem are you experiencing with your Vaillant ecoTEC System boiler?

Please describe the symptoms or issue you're encountering, or let me know if there's a fault code displayed.`;
            } else {
              reply = `What specific problem are you experiencing with your boiler?

Please describe the symptoms - for example: no heating, no hot water, strange noises, or if there's a fault code displayed.`;
            }
          } else if (issueMatch) {
            const modelMatch = conversationText.match(/greenstar\s+(\d+)/i);
            const model = modelMatch ? modelMatch[1] : '24';
            reply = `For your Worcester Greenstar ${model} (${model}kW) boiler with ${issue}, I need to clarify: Is there an actual fault code displayed on the boiler's digital display?

Fault codes typically appear as letters followed by numbers (like F22, F28, F75, EA, etc.). The "${model}" in your boiler model name is just the power rating, not a fault code.

What fault code is showing on the boiler display, or is there no fault code displayed?`;
          } else {
            const modelMatch = conversationText.match(/greenstar\s+(\d+)/i);
            const model = modelMatch ? modelMatch[1] : '24';
            reply = `What specific problem are you experiencing with your Worcester Greenstar ${model} (${model}kW) boiler?

The "${model}" refers to the power output in kilowatts, not a fault code. Please describe the symptoms or issue you're encountering.`;
          }
          
          // Skip the rest of the post-processing since we've rewritten the response
          // Save session before responding (user message already added at top)
          chatHistory.push({ sender: 'assistant', text: reply, timestamp: new Date().toISOString() });
          await SessionManager.updateSession(sessionId, chatHistory);
          return res.json({ reply });
        }
        
        // Force follow-up question by removing generic endings and adding specific question
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
        
        // Remove all forbidden endings
        forbiddenPatterns.forEach(pattern => {
          reply = reply.replace(pattern, '');
        });
        
        // Remove trailing periods and whitespace
        reply = reply.trim().replace(/\.$/, '');
        
        // Always add a specific follow-up question based on what was actually mentioned
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
          // Only add question if there isn't already one
          reply += '\n\nWhat have you observed so far?';
        }

        // NEW: Add manual links - match by model name for accuracy
        try {
          const conversationText = chatHistory.map(msg => msg.text).join(' ').toLowerCase();
          const manufacturerMatch = conversationText.match(/\b(worcester|vaillant|baxi|ideal|glow ?worm|potterton)\b/i);
          
          if (manufacturerMatch) {
            const manufacturer = manufacturerMatch[0];
            
            // Extract model name (e.g., "Logic 24", "Greenstar 30", "ecoTEC Plus")
            const modelMatch = conversationText.match(/\b(logic|greenstar|ecotec|main|platinum|vogue|mexico|response|isar|icos|promax|combi)\s*\+?\s*\d*\b/gi);
            const modelName = modelMatch ? modelMatch[0] : null;
            
            console.log('[Manual Lookup] Manufacturer:', manufacturer, 'Model:', modelName);
            
            let manuals = [];
            
            // Strategy 1: If we have a model name, search for exact model match
            if (modelName) {
              const { data: modelManuals } = await supabase
                .from('boiler_manuals')
                .select('name, url, gc_number')
                .or(`manufacturer.ilike.%${manufacturer}%,name.ilike.%${manufacturer}%`)
                .ilike('name', `%${modelName}%`)
                .limit(3);
              
              if (modelManuals && modelManuals.length > 0) {
                manuals = modelManuals;
                console.log('[Manual Lookup] Found', manuals.length, 'model-specific manuals');
              }
            }
            
            // Strategy 2: If no model-specific manuals, get general manufacturer manuals
            if (manuals.length === 0) {
              const { data: generalManuals } = await supabase
                .from('boiler_manuals')
                .select('name, url, gc_number')
                .or(`manufacturer.ilike.%${manufacturer}%,name.ilike.%${manufacturer}%`)
                .limit(3);
              
              if (generalManuals && generalManuals.length > 0) {
                manuals = generalManuals;
                console.log('[Manual Lookup] Found', manuals.length, 'general manuals');
              }
            }
            
            if (manuals.length > 0) {
              reply += `\n\n📄 **${manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1)} Manuals Available:**`;
              manuals.slice(0, 2).forEach(manual => {
                const displayName = manual.name.replace(/-/g, ' ').replace(/\d{7}$/, '').trim();
                reply += `\n• [${displayName}](${manual.url})`;
                if (manual.gc_number) {
                  reply += ` (GC: ${manual.gc_number})`;
                }
              });
              
              if (modelName && manuals.some(m => m.name.toLowerCase().includes(modelName.toLowerCase()))) {
                reply += `\n\n💡 *Model-specific manual for ${modelName}*`;
              } else {
                reply += `\n\n💡 *Reference these ${manufacturer} manuals for detailed procedures*`;
              }
            }
          }
        } catch (manualError) {
          logger.error('[Manual Links] Failed to fetch manual links:', { error: manualError.message });
        }

        // Save session before responding (user message already added at top)
        chatHistory.push({ sender: 'assistant', text: reply, timestamp: new Date().toISOString() });
        await SessionManager.updateSession(sessionId, chatHistory);
        
        return res.json({ reply });
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
  // All keys failed
  res.json({ reply: "I'm having trouble connecting to the AI right now. Please try again later!" });
  } catch (error) {
    console.error('[Chat] Endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SSE streaming endpoint for detailed diagnostics
app.get('/api/agent/chat/stream', chatLimiter, async (req, res) => {
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
      } catch {}
    }
    chatHistory.push({ sender: 'user', text: message, timestamp: new Date().toISOString() });

    const extracted = EnhancedFaultCodeService.extractFaultInfo(message) || {};

    // Build system and pre-seed tools similar to non-streaming path
    const system = `You are a senior Gas Safe engineer assistant.
Ground responses with tools and keep them brief. Rules:
1) If a CLEAR fault code is present, call get_fault_info first (use user_text fallback).
2) Numbers after model names (e.g., "Logic Combi 24/30/35") are kW ratings, NOT fault codes.
3) For model/system-only inputs (no fault code), begin reply with: "Make: <mfr> | Model: <model> | System: <type>" (omit unknowns). Then ask for the displayed fault code or symptoms. Do NOT diagnose a fault code.
4) If manufacturer known, call search_manuals (limit 1) and include 1 manual link.
5) If a fault code present, call get_verified_knowledge (limit 1) and summarize briefly.
6) If get_fault_info returns modelTips, INCLUDE it early in the reply.
7) Do NOT include URLs in the body. Only include URLs from tool results in a final 'Sources:' section. Never invent URLs.
8) Do NOT instruct the user to check/read/see/consult any guide/manual/website. Include necessary procedures directly; 'Sources:' is provenance only.
9) Prefer manufacturer-specific info; no hallucinated codes/values.
10) Output: concise and safety-first.
11) If the user requests diagnostics/procedure/steps, provide a detailed numbered procedure (8–15 steps) using available tool context/procedures, include cautions, and keep it self-contained.`;

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
    if (extracted?.manufacturer) {
      try {
        const r2 = await AgentTools.search_manuals({ manufacturer: extracted.manufacturer, model: extracted?.model || null, limit: 1 });
        preToolResults.push({ role: 'tool', tool_call_id: 'pre_2', name: 'search_manuals', content: JSON.stringify(r2) });
      } catch {}
    }
    if ((extracted?.manufacturer || extracted?.model) && !extracted?.faultCode) {
      try {
        const r4 = await AgentTools.get_symptom_guidance({ manufacturer: extracted?.manufacturer || null, model: extracted?.model || null, symptoms: String(message || ''), limit: 5 });
        preToolResults.push({ role: 'tool', tool_call_id: 'pre_4', name: 'get_symptom_guidance', content: JSON.stringify(r4) });
      } catch {}
    }
    let modelTipText = '';
    if (extracted?.faultCode) {
      try {
        const r1 = await AgentTools.get_fault_info({ manufacturer: extracted?.manufacturer || null, fault_code: extracted?.faultCode || null, user_text: String(message || '') });
        preToolResults.push({ role: 'tool', tool_call_id: 'pre_1', name: 'get_fault_info', content: JSON.stringify(r1) });
        if (r1?.modelTips) modelTipText = String(r1.modelTips);
      } catch {}
      try {
        const r3 = await AgentTools.get_verified_knowledge({ fault_code: extracted.faultCode, manufacturer: extracted?.manufacturer || null, model: extracted?.model || null, limit: 1 });
        preToolResults.push({ role: 'tool', tool_call_id: 'pre_3', name: 'get_verified_knowledge', content: JSON.stringify(r3) });
      } catch {}
    }

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
      const displayMap = {
        'worcester': 'Worcester Bosch',
        'glow-worm': 'Glow-worm',
        'viessmann': 'Viessmann',
        'vaillant': 'Vaillant',
        'ideal': 'Ideal',
        'baxi': 'Baxi',
        'potterton': 'Potterton',
        'ariston': 'Ariston',
        'ferroli': 'Ferroli',
        'alpha': 'Alpha',
        'ravenheat': 'Ravenheat',
        'intergas': 'Intergas'
      };
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
      const system = extracted?.systemType ? (String(extracted.systemType).charAt(0).toUpperCase() + String(extracted.systemType).slice(1)) : null;
      const structured = { header: { make, model, system, faultCode: null }, bullets: [], steps: [], cautions: [], parts: [], measurements: [], sources: { manuals: Array.from(allowedUrls).map((u) => ({ type: 'manual', title: 'Manual', manufacturer: make, gc_number: null, url: u })), knowledge: [] } };
      try {
        const historyNow = Array.isArray(chatHistory) ? [...chatHistory, { sender: 'assistant', text: headerText + (sourcesText ? ('\n' + sourcesText) : ''), timestamp: new Date().toISOString() }] : [];
        if (sessionId) await SessionManager.updateSession(sessionId, historyNow);
      } catch {}
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
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages, stream: true, tool_choice: 'none', temperature: detail ? 0.25 : 0.2, max_tokens: detail ? 900 : 600, frequency_penalty: 0.35, presence_penalty: 0 })
          });
          if (!response.ok) continue;
          return response.body;
        } catch (e) { continue; }
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
      const displayMap = {
        'worcester': 'Worcester Bosch',
        'glow-worm': 'Glow-worm',
        'viessmann': 'Viessmann',
        'vaillant': 'Vaillant',
        'ideal': 'Ideal',
        'baxi': 'Baxi',
        'potterton': 'Potterton',
        'ariston': 'Ariston',
        'ferroli': 'Ferroli',
        'alpha': 'Alpha',
        'ravenheat': 'Ravenheat',
        'intergas': 'Intergas'
      };
      const make = extracted?.manufacturer ? (displayMap[String(extracted.manufacturer).toLowerCase()] || extracted.manufacturer) : null;
      const model = extracted?.model || null;
      const system = extracted?.systemType ? (String(extracted.systemType).charAt(0).toUpperCase() + String(extracted.systemType).slice(1)) : null;
      const faultCode = extracted?.faultCode || null;
      const idxSrc = finalBody.indexOf('\n\nSources:');
      const mainBody = idxSrc >= 0 ? finalBody.slice(0, idxSrc) : finalBody;
      const bodyLines = mainBody.split('\n').map((l) => l.trim()).filter(Boolean);
      const bullets = bodyLines.filter((l) => /^[-•—]\s+/.test(l)).map((l) => l.replace(/^[-•—]\s+/, ''));
      const steps = bodyLines.filter((l) => /^\d+[\.)]\s+/.test(l)).map((l) => l.replace(/^\d+[\.)]\s+/, ''));
      const cautions = bodyLines.filter((l) => /(safety|caution|warning|danger)/i.test(l));
      const parts = (() => {
        const out = new Set();
        const partWords = ['electrode','spark generator','ignition module','gas valve','fan','pump','diverter valve','pcb','pressure sensor','flame sensor','thermostat'];
        bodyLines.forEach((l) => partWords.forEach((p) => { if (new RegExp(`\\b${p.replace(/\s+/g,'\\s+')}\\b`, 'i').test(l)) out.add(p); }));
        return Array.from(out);
      })();
      const measurements = bodyLines.filter((l) => /(\b\d+(\.\d+)?\s*(bar|mbar|kpa|pa|v|vac|vdc|ohm|Ω|ma|a|hz|kw|°c|c)\b)/i.test(l));
      structured = { header: { make, model, system, faultCode }, bullets, steps, cautions, parts, measurements, sources: structuredSources };
    } catch {}

    // Persist session
    try {
      if (sessionId) {
        const historyNow = Array.isArray(chatHistory) ? [...chatHistory, { sender: 'assistant', text: finalBody, timestamp: new Date().toISOString() }] : [];
        await SessionManager.updateSession(sessionId, historyNow);
      }
    } catch {}

    send({ done: true, structured });
    end();
  } catch (error) {
    try { res.write(`data: ${JSON.stringify({ error: 'stream_error' })}\n\n`); } catch {}
    res.end();
  }
});

app.post('/api/agent/chat', chatLimiter, validateChatMessage, async (req, res) => {
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
    const hasManufacturer = /\b(worcester|vaillant|baxi|ideal|glow ?worm|potterton|viessmann|ariston|navien|bosch|bosh)\b/i.test(conversationText);
    const hasSystemType = /\b(combi|combination|system|regular|conventional|standard|heat only|back boiler)\b/i.test(conversationText);
    
    // If missing required info, ask for it BEFORE proceeding
    if (!hasManufacturer || !hasSystemType) {
      let reply = "Right, to help you out I need a bit more info. What boiler are you working on? I need the manufacturer (like Worcester, Vaillant, Ideal), the model if you know it, and the system type (combi, system, or regular).";
      
      if (hasManufacturer && !hasSystemType) {
        reply = "Right, got the manufacturer. What type of system is it? Combi, system, or regular boiler?";
      } else if (hasSystemType && !hasManufacturer) {
        reply = "OK, got the system type. What make is it? Worcester, Vaillant, Baxi, Ideal, or another manufacturer?";
      }
      
      chatHistory.push({ sender: 'assistant', text: reply, timestamp: new Date().toISOString() });
      if (sessionId) await SessionManager.updateSession(sessionId, chatHistory);
      return res.json({ reply });
    }

    const detailKeywords = /(diagnos|procedure|step|walkthrough|how to|detailed|full)/i;
    const detailedMode = (detail === true) || detailKeywords.test(String(message || ''));
    
    // Adaptive temperature for agent endpoint - higher for more natural conversation
    const hasFaultCodeAgent = /\b([fela]\.?\d{1,3}|EA)\b/i.test(conversationText);
    const isSafetyCriticalAgent = /gas smell|leak|co alarm|carbon monoxide/i.test(conversationText);
    let agentTemp = isSafetyCriticalAgent ? 0.3 : hasFaultCodeAgent ? 0.5 : detailedMode ? 0.4 : 0.6;

    let system = `You are James, a Master Gas Safe engineer with 25+ years hands-on experience. You're the guy other engineers call when they're stuck.

CRITICAL: You're talking to a FELLOW GAS SAFE REGISTERED ENGINEER on-site right now. They have all the skills and tools. NEVER suggest calling support or getting help. Guide them through the fix like you're on the phone with them.

CONVERSATION STYLE - CRUCIAL:
DO NOT use structured formats, section headers, or bullet points. Talk naturally like you're having a phone conversation. Keep responses SHORT and focused - 2-3 sentences max, then ask a question.

EXAMPLES:

User: "Ideal Logic 30 combi, fault code L2"
GOOD: "Right, L2 on the Logic - ignition lockout. First check gas pressure at inlet, should be 20-21 mbar. If that's good, check the spark generator and electrode gap (3-4mm). What's your gas pressure showing?"

User: "Ideal Logic L2, no clicking sound"
GOOD: "Right, no clicking means spark generator isn't firing. Check the connections to it first - make sure they're tight. If connections are good, check continuity on the HT lead. Are you getting spark at the electrode?"

IMPORTANT - IDEAL LOGIC SPECIFIC:
- Ideal Logic boilers use a SPARK GENERATOR, NOT an ignition PCB
- Common L2 causes: faulty spark generator, electrode gap, gas pressure
- To test spark generator: Listen for clicking, look for spark at electrode, check HT lead continuity
- DO NOT test spark generator with multimeter AC voltage - that's incorrect and dangerous
- If no clicking and connections are good, spark generator is faulty and needs replacing

User: "Worcester Greenstar 28i, F22 code"
GOOD: "Right, F22 on the Greenstar - low pressure fault. What's your system pressure reading? Should be 1.0-1.5 bar when cold."

User: "Worcester Greenstar F22, pressure is 1.2 bar"
GOOD: "OK, 1.2 bar is fine so it's likely the pressure sensor playing up. Check the wiring to it first - sometimes works loose. What happens when you reset it?"

User: "Got spark but no flame on a Baxi 830"
GOOD: "Right, spark's there so ignition side's working. Check gas valve at meter is fully open, then check gas pressure while it's trying to fire - should be 20mbar minimum. Hearing the gas valve click?"

GUIDELINES:
- Keep responses SHORT: 2-3 sentences max, then ask a question
- Start with "Right" or "OK" often
- Be direct and specific
- Ask ONE focused question at the end
- Use shorthand: "spark generator", "HT lead", "NTC"
- For Ideal Logic L2: Always mention spark generator (NOT PCB)

AVOID:
- Long explanations (keep it brief!)
- Section headers [ASSESSMENT] [ACTIONS]
- Bullet points or numbered lists
- Multiple paragraphs
- Formal textbook language
- Suggesting external help
- Being vague
- NEVER claim the user said something they didn't
- NEVER make assumptions about what they've checked unless explicitly stated

TOOL USAGE:
When you get fault code data, interpret it naturally: "So L2 is ignition lockout - boiler's tried 3 times and given up. Usually means..." Don't regurgitate database info, blend it in.

CRITICAL: Only reference information the user ACTUALLY provided. If they haven't mentioned pressure, don't say "since the pressure is fine". Ask instead: "What's the pressure reading?"

ALWAYS end with a specific question about what they're seeing.

Model numbers (24/28/30) are kW ratings NOT fault codes. Never suggest calling support.`;
    
    if (String(process.env.DB_ONLY_MODE || 'false').toLowerCase() === 'true') {
      system += `\n\nDB-ONLY: Use ONLY tool results. If insufficient, ask ONE clarifying question. No invented data.`;
    }

    const toOpenAIMessages = [];
    toOpenAIMessages.push({ role: 'system', content: system });
    chatHistory.forEach((m) => {
      const t = m?.text;
      const s = typeof t === 'string' ? t : (t && typeof t === 'object' && typeof t.text === 'string' ? t.text : '');
      toOpenAIMessages.push({ role: m.sender === 'user' ? 'user' : 'assistant', content: s });
    });

    const extracted = EnhancedFaultCodeService.extractFaultInfo(String(message || '')) || {};
    logger.info(`[Agent][${rid}] extracted manufacturer=${extracted.manufacturer||'-'} model=${extracted.model||'-'} system=${extracted.systemType||'-'} fault=${extracted.faultCode||'-'}`);
    // Detect if a prior message in this session contained a fault code; if so, don't force the generic ask
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
    } catch {}
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
    // Pre-seed manuals if we know manufacturer/model (model-only flow)
    if (extracted?.manufacturer) {
      const tc2 = { id: 'pre_2', type: 'function', function: { name: 'search_manuals', arguments: JSON.stringify({ manufacturer: extracted.manufacturer, model: extracted?.model || null, limit: 1 }) } };
      preToolCalls.push(tc2);
      try {
        const t0 = Date.now();
        const r2 = await AgentTools.search_manuals({ manufacturer: extracted.manufacturer, model: extracted?.model || null, limit: 1 });
        logger.info(`[Agent][${rid}] tool search_manuals dt=${Date.now()-t0}ms items=${(r2?.items||[]).length}`);
        preToolResults.push({ role: 'tool', tool_call_id: tc2.id, name: 'search_manuals', content: JSON.stringify(r2) });
      } catch {}
    }
    // Pre-seed symptom guidance for model-only or symptom-only queries
    if ((extracted?.manufacturer || extracted?.model) && !extracted?.faultCode) {
      const tc4 = { id: 'pre_4', type: 'function', function: { name: 'get_symptom_guidance', arguments: JSON.stringify({ manufacturer: extracted?.manufacturer || null, model: extracted?.model || null, symptoms: String(message || ''), limit: 5 }) } };
      preToolCalls.push(tc4);
      try {
        const t0 = Date.now();
        const r4 = await AgentTools.get_symptom_guidance({ manufacturer: extracted?.manufacturer || null, model: extracted?.model || null, symptoms: String(message || ''), limit: 5 });
        logger.info(`[Agent][${rid}] tool get_symptom_guidance dt=${Date.now()-t0}ms items=${(r4?.items||[]).length}`);
        preToolResults.push({ role: 'tool', tool_call_id: tc4.id, name: 'get_symptom_guidance', content: JSON.stringify(r4) });
      } catch {}
    }
    // Only pre-seed fault info and knowledge when we have a real fault code
    if (extracted?.faultCode) {
      const tc1 = { id: 'pre_1', type: 'function', function: { name: 'get_fault_info', arguments: JSON.stringify({ manufacturer: extracted?.manufacturer || null, fault_code: extracted?.faultCode || null, user_text: String(message || '') }) } };
      preToolCalls.push(tc1);
      try {
        const t0 = Date.now();
        const r1 = await AgentTools.get_fault_info({ manufacturer: extracted?.manufacturer || null, fault_code: extracted?.faultCode || null, user_text: String(message || '') });
        logger.info(`[Agent][${rid}] tool get_fault_info dt=${Date.now()-t0}ms found=${!!r1?.found}`);
        preToolResults.push({ role: 'tool', tool_call_id: tc1.id, name: 'get_fault_info', content: JSON.stringify(r1) });
      } catch {}
      const tc3 = { id: 'pre_3', type: 'function', function: { name: 'get_verified_knowledge', arguments: JSON.stringify({ fault_code: extracted.faultCode, manufacturer: extracted?.manufacturer || null, limit: 1 }) } };
      preToolCalls.push(tc3);
      try {
        const t0 = Date.now();
        const r3 = await AgentTools.get_verified_knowledge({ fault_code: extracted.faultCode, manufacturer: extracted?.manufacturer || null, limit: 1 });
        logger.info(`[Agent][${rid}] tool get_verified_knowledge dt=${Date.now()-t0}ms items=${(r3?.items||[]).length}`);
        preToolResults.push({ role: 'tool', tool_call_id: tc3.id, name: 'get_verified_knowledge', content: JSON.stringify(r3) });
      } catch {}
    }
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
        const displayMap = {
          'worcester': 'Worcester Bosch',
          'glow-worm': 'Glow-worm',
          'viessmann': 'Viessmann',
          'vaillant': 'Vaillant',
          'ideal': 'Ideal',
          'baxi': 'Baxi',
          'potterton': 'Potterton',
          'ariston': 'Ariston',
          'ferroli': 'Ferroli',
          'alpha': 'Alpha',
          'ravenheat': 'Ravenheat',
          'intergas': 'Intergas'
        };
        let make = extracted?.manufacturer || null;
        let model = extracted?.model || null;
        let systemType = extracted?.systemType || null;
        // Try to infer from tool results
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
        // Try to infer from prior history text
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
            // If still no make but we have a prior fault code, look up verified knowledge to infer manufacturer
            if (!make && hx.faultCode) {
              try {
                const vk = await AgentTools.get_verified_knowledge({ fault_code: hx.faultCode, manufacturer: null, limit: 1 });
                const item = (vk?.items || [])[0];
                if (item?.manufacturer) make = item.manufacturer;
              } catch {}
            }
          }
        } catch {}
        // If we learned a make, fetch one best manual to show provenance
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
        const parts = [];
        if (niceMake) parts.push(`Make: ${niceMake}`);
        if (model) parts.push(`Model: ${model}`);
        if (systemType) {
          const sys = String(systemType); parts.push(`System: ${sys.charAt(0).toUpperCase() + sys.slice(1)}`);
        }
        const header = parts.join(' | ');
        let finalText = header || 'I need the make or model to answer precisely.';
        // Sources: include at most 1 manual discovered
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
        // Persist session history
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
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: hasFaultCodeAgent ? 'gpt-4o' : 'gpt-4o-mini', messages, tools, tool_choice: 'auto', temperature: agentTemp, max_tokens: detailedMode ? 1500 : 800, frequency_penalty: 0.2, presence_penalty: 0.1 })
          });
          if (!response.ok) continue;
          const data = await response.json();
          const usage = data?.usage || {};
          logger.info(`[Agent][${rid}] openai call done dt=${Date.now()-t0}ms tokens=${usage.total_tokens||'-'}`);
          return data;
        } catch (e) { continue; }
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
    // Model tips are now integrated into the AI's natural response by the system prompt
    // No need to prepend them separately

    // If no fault code, override with standardized Make | Model | System + question
    try {
      if (!extracted?.faultCode && !hasPriorFaultMention) {
        const parts = [];
        const displayMap = {
          'worcester': 'Worcester Bosch',
          'glow-worm': 'Glow-worm',
          'viessmann': 'Viessmann',
          'vaillant': 'Vaillant',
          'ideal': 'Ideal',
          'baxi': 'Baxi',
          'potterton': 'Potterton',
          'ariston': 'Ariston',
          'ferroli': 'Ferroli',
          'alpha': 'Alpha',
          'ravenheat': 'Ravenheat',
          'intergas': 'Intergas'
        };
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
        let referencesText = '';
        if (manuals.length > 0 || knowledge.length > 0) {
          referencesText += '\n\nSources:';
          manuals.forEach((m) => {
            const n = m?.name ? String(m.name) : 'Manual';
            const mf = m?.manufacturer ? ` (${m.manufacturer})` : '';
            const url = m?.url ? String(m.url) : '';
            if (url) referencesText += `\n- [Manual] ${n}${mf}: ${url}`;
            structuredSources.manuals.push({ type: 'manual', title: n, manufacturer: m?.manufacturer || null, gc_number: m?.gc_number || null, url });
          });
          knowledge.forEach((k) => {
            const title = (k?.title || k?.summary || k?.note || k?.content || '').toString().slice(0, 120);
            const fc = k?.fault_code ? ` [${k.fault_code}]` : '';
            const mf = k?.manufacturer ? ` (${k.manufacturer})` : '';
            if (title) referencesText += `\n- [Knowledge] ${title}${fc}${mf}`;
            structuredSources.knowledge.push({ type: 'knowledge', title, fault_code: k?.fault_code || null, manufacturer: k?.manufacturer || null });
          });
        }
        // Sources section removed - info already integrated in response
        // if (referencesText) {
        //   finalText += referencesText;
        // }
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
    try {
      const displayMap = {
        'worcester': 'Worcester Bosch',
        'glow-worm': 'Glow-worm',
        'viessmann': 'Viessmann',
        'vaillant': 'Vaillant',
        'ideal': 'Ideal',
        'baxi': 'Baxi',
        'potterton': 'Potterton',
        'ariston': 'Ariston',
        'ferroli': 'Ferroli',
        'alpha': 'Alpha',
        'ravenheat': 'Ravenheat',
        'intergas': 'Intergas'
      };
      const make = extracted?.manufacturer ? (displayMap[String(extracted.manufacturer).toLowerCase()] || extracted.manufacturer) : null;
      const model = extracted?.model || null;
      const system = extracted?.systemType ? (String(extracted.systemType).charAt(0).toUpperCase() + String(extracted.systemType).slice(1)) : null;
      const faultCode = extracted?.faultCode || null;

      const idxSrc = finalText.indexOf('\n\nSources:');
      const mainBody = idxSrc >= 0 ? finalText.slice(0, idxSrc) : finalText;
      const bodyLines = mainBody.split('\n').map((l) => l.trim()).filter(Boolean);
      const bullets = bodyLines.filter((l) => /^[-•—]\s+/.test(l)).map((l) => l.replace(/^[-•—]\s+/, ''));
      const steps = bodyLines.filter((l) => /^\d+[\.)]\s+/.test(l)).map((l) => l.replace(/^\d+[\.)]\s+/, ''));
      const cautions = bodyLines.filter((l) => /(safety|caution|warning|danger)/i.test(l));
      const parts = (() => {
        const out = new Set();
        const partWords = ['electrode','spark generator','ignition module','gas valve','fan','pump','diverter valve','pcb','pressure sensor','flame sensor','thermostat'];
        bodyLines.forEach((l) => partWords.forEach((p) => { if (new RegExp(`\\b${p.replace(/\s+/g,'\\s+')}\\b`, 'i').test(l)) out.add(p); }));
        return Array.from(out);
      })();
      const measurements = bodyLines.filter((l) => /(\b\d+(\.\d+)?\s*(bar|mbar|kpa|pa|v|vac|vdc|ohm|Ω|ma|a|hz|kw|°c|c)\b)/i.test(l));

      var structured = {
        header: { make, model, system, faultCode },
        bullets,
        steps,
        cautions,
        parts,
        measurements,
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
    res.json({ reply: finalText, sessionId: sessionId || null, structured: typeof structured !== 'undefined' ? structured : null });
  } catch (error) {
    logger.error('[Agent Chat] Endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- POST /api/sessions/get ---
// Retrieve session by ID for cross-device sync
app.post('/api/sessions/get', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }
    
    const session = await SessionManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    
    res.json({
      sessionId: session.session_id,
      history: session.history || [],
      expiresAt: session.expires_at
    });
  } catch (error) {
    logger.error('[Sessions] Get session error:', error);
    res.status(500).json({ error: 'Failed to retrieve session' });
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
}, 60 * 60 * 1000); // Every 1 hour

// Initial cleanup on startup
SessionManager.cleanupExpiredSessions().catch(err => 
console.error('[Cleanup] Initial cleanup failed:', err)
);

// --- POST /api/feedback ---
// Endpoint to receive user feedback on AI responses
app.post('/api/feedback', async (req, res) => {
try {
  const { messageId, feedback, messageText, timestamp } = req.body;
  
  logger.info(`[Feedback] Received: ${feedback} for message ${messageId}`);
  
  // Store feedback in database for learning
  const { data, error } = await supabase
    .from('chat_feedback')
    .insert({
      message_id: messageId,
      feedback_type: feedback,
      message_text: messageText,
      created_at: timestamp || new Date().toISOString()
    });
  
  if (error) {
    // Table might not exist yet - just log it
    logger.warn('[Feedback] Database insert failed (table may not exist):', error.message);
  }
  
  res.json({ success: true, message: 'Feedback recorded' });
} catch (error) {
  logger.error('[Feedback] Error:', error);
  res.status(500).json({ error: 'Failed to record feedback' });
}
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Boiler Brain server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS origins: ${process.env.ALLOWED_ORIGINS || '*'}`);
});
