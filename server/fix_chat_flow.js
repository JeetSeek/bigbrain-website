import fs from 'fs';

const content = fs.readFileSync('server/index.js', 'utf8');

// Find where the chat history processing starts
const searchPattern = "  // Add current user message to history\n  chatHistory.push({ \n    sender: 'user', \n    text: message, \n    timestamp: new Date().toISOString() \n  });\n\n  // Create conversationText once for reuse\n  let conversationText = chatHistory.map(msg => msg.text).join(' ').toLowerCase();";

const replaceWith = `  // Add current user message to history
  chatHistory.push({ 
    sender: 'user', 
    text: message, 
    timestamp: new Date().toISOString() 
  });

  // Create conversationText once for reuse
  let conversationText = chatHistory.map(msg => msg.text).join(' ').toLowerCase();
  
  logger.info(\`[Chat] Processing - SessionId: \${sessionId}, History: \${chatHistory.length} messages\`);
  
  // === STEP 1: Check for basic boiler details FIRST (before any diagnostics) ===
  // Use STRICT manufacturer detection (only actual brands, NOT model names)
  const hasManufacturer = /\\b(worcester|vaillant|baxi|ideal|glow ?worm|potterton|viessmann|ariston|navien|bosch|bosh)\\b/i.test(conversationText);
  const hasSystemType = /\\b(combi|combination|system|regular|conventional|standard|heat only|back boiler)\\b/i.test(conversationText);
  const hasBoilerDetails = hasManufacturer && hasSystemType;
  
  logger.info(\`[Chat] Initial check - Manufacturer: \${hasManufacturer}, SystemType: \${hasSystemType}, Details: \${hasBoilerDetails}\`);
  
  // If basic details are missing, ask for them BEFORE doing any fault code lookup
  if (!hasBoilerDetails) {
    logger.info('[Chat] Missing boiler details - requesting basic information');
    
    if (hasManufacturer && !hasSystemType) {
      chatHistory.push({ 
        sender: 'assistant', 
        text: "I can see you've mentioned the boiler manufacturer. What type of system is it?\\n\\n• Combi boiler\\n• System boiler\\n• Regular/conventional boiler\\n• Heat-only boiler", 
        timestamp: new Date().toISOString() 
      });
      await SessionManager.updateSession(sessionId, chatHistory);
      return res.json({ 
        reply: "I can see you've mentioned the boiler manufacturer. What type of system is it?\\n\\n• Combi boiler\\n• System boiler\\n• Regular/conventional boiler\\n• Heat-only boiler" 
      });
    } else if (hasSystemType && !hasManufacturer) {
      chatHistory.push({ 
        sender: 'assistant', 
        text: "What make/manufacturer is your boiler?\\n\\nFor example:\\n• Worcester Bosch\\n• Vaillant\\n• Baxi\\n• Ideal\\n• Glow-worm\\n• Potterton", 
        timestamp: new Date().toISOString() 
      });
      await SessionManager.updateSession(sessionId, chatHistory);
      return res.json({ 
        reply: "What make/manufacturer is your boiler?\\n\\nFor example:\\n• Worcester Bosch\\n• Vaillant\\n• Baxi\\n• Ideal\\n• Glow-worm\\n• Potterton" 
      });
    } else {
      chatHistory.push({ 
        sender: 'assistant', 
        text: "To help you effectively, I need to know:\\n\\n1️⃣ **Manufacturer** (e.g., Worcester, Vaillant, Baxi, Ideal)\\n2️⃣ **Model** (if known, e.g., Greenstar 30i, Logic Combi 24)\\n3️⃣ **System Type** (Combi, System, or Regular boiler)\\n\\nWhat boiler are you working on?", 
        timestamp: new Date().toISOString() 
      });
      await SessionManager.updateSession(sessionId, chatHistory);
      return res.json({ 
        reply: "To help you effectively, I need to know:\\n\\n1️⃣ **Manufacturer** (e.g., Worcester, Vaillant, Baxi, Ideal)\\n2️⃣ **Model** (if known, e.g., Greenstar 30i, Logic Combi 24)\\n3️⃣ **System Type** (Combi, System, or Regular boiler)\\n\\nWhat boiler are you working on?" 
      });
    }
  }
  
  // === STEP 2: Now we can proceed with fault code extraction (basic details confirmed) ===
  logger.info('[Chat] Basic details confirmed - proceeding with diagnostics');`;

const index = content.indexOf(searchPattern);
if (index === -1) {
  console.error('Could not find the pattern to replace');
  process.exit(1);
}

const newContent = content.substring(0, index) + replaceWith + content.substring(index + searchPattern.length);

fs.writeFileSync('server/index.js', newContent, 'utf8');
console.log('✅ Chat flow fixed - will now ask for make/model/type FIRST');
