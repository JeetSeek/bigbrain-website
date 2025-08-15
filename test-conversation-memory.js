#!/usr/bin/env node

/**
 * Test script to verify conversation memory/context retention
 * Tests multi-turn conversation to ensure assistant remembers previous context
 */

import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const API_BASE = 'http://localhost:3204';
const TEST_SESSION_ID = uuidv4();

console.log('🧠 Testing BoilerBrain Conversation Memory');
console.log('==========================================');
console.log(`Session ID: ${TEST_SESSION_ID}`);
console.log('');

// Test conversation flow
const testConversation = [
  {
    step: 1,
    message: "I have an Ideal Logic 24 combi with L2 error code",
    expectedContext: "Should identify Ideal Logic 24 combi and L2 error"
  },
  {
    step: 2, 
    message: "What should I check first?",
    expectedContext: "Should remember it's Ideal Logic 24 with L2 error, not ask for boiler details again"
  },
  {
    step: 3,
    message: "I've checked the gas supply and it's fine",
    expectedContext: "Should remember previous context and continue with L2 troubleshooting"
  }
];

async function sendChatMessage(message, history = []) {
  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        history: history,
        userInfo: {
          sessionId: TEST_SESSION_ID,
          userName: 'TestEngineer'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Chat API Error:', error.message);
    return null;
  }
}

async function testConversationMemory() {
  let conversationHistory = [];
  
  for (const test of testConversation) {
    console.log(`\n📝 Step ${test.step}: Testing conversation memory`);
    console.log(`User: "${test.message}"`);
    console.log(`Expected: ${test.expectedContext}`);
    console.log('---');
    
    // Add user message to history
    const userMessage = {
      sender: 'user',
      text: test.message,
      timestamp: new Date().toISOString()
    };
    conversationHistory.push(userMessage);
    
    // Send message and get response
    const result = await sendChatMessage(test.message, conversationHistory);
    
    if (!result) {
      console.log('❌ Failed to get response');
      continue;
    }
    
    console.log(`🤖 Assistant: "${result.response.substring(0, 150)}..."`);
    
    // Add AI response to history
    const aiMessage = {
      sender: 'assistant', 
      text: result.response,
      timestamp: new Date().toISOString()
    };
    conversationHistory.push(aiMessage);
    
    // Analyze response for context retention
    const response = result.response.toLowerCase();
    
    if (test.step === 1) {
      // First message should acknowledge the boiler and fault code
      if (response.includes('ideal') && response.includes('l2')) {
        console.log('✅ Context captured: Boiler make and fault code recognized');
      } else {
        console.log('⚠️  Context issue: May not have captured boiler details properly');
      }
    } else if (test.step === 2) {
      // Second message should NOT ask for boiler details again
      if (response.includes('what make') || response.includes('which boiler') || response.includes('what model')) {
        console.log('❌ MEMORY FAILURE: Assistant asking for boiler details again!');
      } else {
        console.log('✅ Memory working: Assistant remembers boiler context');
      }
    } else if (test.step === 3) {
      // Third message should continue with L2 troubleshooting
      if (response.includes('ignition') || response.includes('flame') || response.includes('electrode')) {
        console.log('✅ Context retained: Continuing with L2-specific troubleshooting');
      } else {
        console.log('⚠️  May not be following L2-specific troubleshooting path');
      }
    }
    
    console.log(`📊 Debug: ${result.debug?.messageCount || 'unknown'} messages in session`);
    
    // Wait between messages to simulate real conversation
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎯 Conversation Memory Test Complete');
  console.log(`Final conversation length: ${conversationHistory.length} messages`);
}

// Run the test
testConversationMemory().catch(console.error);
