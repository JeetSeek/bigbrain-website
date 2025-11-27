// Supabase Edge Function: Chat API
// Replaces Express /api/chat endpoint

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Manufacturer patterns for extraction
const MANUFACTURER_PATTERNS: Record<string, RegExp> = {
  'ideal': /\b(ideal)\b/i,
  'worcester': /\b(worcester|worcester bosch)\b/i,
  'vaillant': /\b(vaillant)\b/i,
  'baxi': /\b(baxi)\b/i,
  'glow-worm': /\b(glow ?worm)\b/i,
  'potterton': /\b(potterton)\b/i,
  'viessmann': /\b(viessmann)\b/i,
  'ariston': /\b(ariston)\b/i,
  'ferroli': /\b(ferroli)\b/i,
};

// Extract fault info from user message
function extractFaultInfo(text: string) {
  const lowerText = text.toLowerCase();
  
  let manufacturer = null;
  for (const [mfg, pattern] of Object.entries(MANUFACTURER_PATTERNS)) {
    if (pattern.test(lowerText)) {
      manufacturer = mfg;
      break;
    }
  }
  
  // Fault code patterns
  const faultPatterns = [
    /\b([a-z][0-9]{1,3})\b/i,
    /\b([a-z]\.[0-9]{1,3})\b/i,
    /(fault|error|code)\s*([a-z]?[0-9]{1,3})/i
  ];
  
  let faultCode = null;
  for (const pattern of faultPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      faultCode = (match[2] || match[1]).toUpperCase().replace('.', '');
      break;
    }
  }
  
  // System type
  const hasSystemType = /\b(combi|system|regular|heat only)\b/i.test(lowerText);
  
  return { manufacturer, faultCode, hasSystemType };
}

// Get fault code info from database
async function getFaultCodeInfo(supabase: any, faultCode: string, manufacturer: string | null) {
  const queries = [];
  
  // Basic fault codes
  queries.push(
    supabase
      .from('boiler_fault_codes')
      .select('*')
      .eq('fault_code', faultCode)
      .limit(5)
  );
  
  // Diagnostic fault codes
  queries.push(
    supabase
      .from('diagnostic_fault_codes')
      .select('*')
      .eq('fault_code', faultCode)
      .limit(5)
  );
  
  // If manufacturer specified
  if (manufacturer) {
    queries.push(
      supabase
        .from('boiler_fault_codes')
        .select('*')
        .eq('fault_code', faultCode)
        .ilike('manufacturer', `%${manufacturer}%`)
        .limit(5)
    );
  }
  
  const results = await Promise.all(queries);
  
  // Combine results
  const allData = results.flatMap(r => r.data || []);
  
  if (allData.length === 0) return null;
  
  // Get best match (manufacturer-specific if available)
  const best = manufacturer 
    ? allData.find(d => d.manufacturer?.toLowerCase().includes(manufacturer)) || allData[0]
    : allData[0];
  
  return {
    faultCode,
    manufacturer: best.manufacturer,
    description: best.description || best.fault_description,
    solutions: best.solutions || best.diagnostic_steps,
  };
}

// Build system prompt
function buildSystemPrompt(faultInfo: any) {
  let context = '';
  
  if (faultInfo) {
    context = `
FAULT CODE DATABASE INFORMATION:
- Code: ${faultInfo.faultCode}
- Manufacturer: ${faultInfo.manufacturer || 'Unknown'}
- Description: ${faultInfo.description || 'Not found in database'}
- Solutions: ${faultInfo.solutions || 'Check manufacturer manual'}

USE THIS DATABASE INFORMATION as the primary source for your response.
`;
  }

  return `You are a Master Gas Safe registered engineer with 25+ years experience.
You're talking to a FELLOW GAS SAFE REGISTERED ENGINEER who has the skills to fix anything.
NEVER suggest calling support or getting help - guide them through the fix.

COMMUNICATION STYLE:
- Talk like you're on-site with a colleague
- Use "Right, so..." "Let's check..." "Here's the thing..."
- Be decisive: "This is almost certainly..." not "it might be..."
- Share experience: "I've seen this loads of times on these..."

${context}

CRITICAL RULES:
1. NEVER claim the user said something they didn't
2. If information is missing, ASK for it - never assume
3. Model numbers (24, 28, 30) are kW ratings, NOT fault codes
4. End every response with a specific follow-up question

SAFETY: If gas smell or CO suspected, immediately provide:
- Turn off gas at meter
- Ventilate property  
- Gas Emergency: 0800 111 999`;
}

// Call OpenAI
async function callOpenAI(messages: any[], isSafetyCritical: boolean) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OpenAI API key not configured');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      temperature: isSafetyCritical ? 0.3 : 0.5,
      max_tokens: 1000,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, sessionId, history = [] } = await req.json();
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build conversation text from history
    const conversationText = [...history, { text: message }]
      .map(m => m.text || '')
      .join(' ')
      .toLowerCase();

    // Check for required info
    const hasManufacturer = /\b(worcester|vaillant|baxi|ideal|glow ?worm|potterton|viessmann|ariston)\b/i.test(conversationText);
    const hasSystemType = /\b(combi|system|regular|heat only)\b/i.test(conversationText);

    // Validate requirements
    if (!hasManufacturer && !hasSystemType) {
      return new Response(
        JSON.stringify({ 
          reply: "Right, to help you out I need a bit more info. What boiler are you working on? I need the manufacturer (Worcester, Vaillant, Ideal, etc.) and system type (combi, system, or regular)."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (hasManufacturer && !hasSystemType) {
      return new Response(
        JSON.stringify({ 
          reply: "Right, got the manufacturer. What type of system is it? Combi, system, or regular boiler?"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!hasManufacturer && hasSystemType) {
      return new Response(
        JSON.stringify({ 
          reply: "OK, got the system type. What make is it? Worcester, Vaillant, Baxi, Ideal, or another manufacturer?"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract fault info from message
    const extracted = extractFaultInfo(message);
    
    // Check for safety concerns
    const isSafetyCritical = /gas smell|smell gas|carbon monoxide|co alarm/i.test(message);
    
    // Get fault code info from database if code detected
    let faultInfo = null;
    if (extracted.faultCode) {
      faultInfo = await getFaultCodeInfo(supabase, extracted.faultCode, extracted.manufacturer);
    }

    // Build messages for OpenAI
    const systemPrompt = buildSystemPrompt(faultInfo);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      })),
      { role: 'user', content: message }
    ];

    // Call OpenAI
    const reply = await callOpenAI(messages, isSafetyCritical);

    // Update session in database (optional - for persistence)
    if (sessionId) {
      const newHistory = [
        ...history,
        { sender: 'user', text: message, timestamp: new Date().toISOString() },
        { sender: 'assistant', text: reply, timestamp: new Date().toISOString() }
      ];
      
      await supabase
        .from('chat_sessions')
        .upsert({
          session_id: sessionId,
          history: newHistory,
          updated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        }, { onConflict: 'session_id' });
    }

    return new Response(
      JSON.stringify({ reply, faultInfo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process chat request',
        reply: "Sorry, I'm having trouble connecting. If this is urgent, call Gas Emergency on 0800 111 999."
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
