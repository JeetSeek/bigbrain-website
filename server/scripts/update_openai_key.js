#!/usr/bin/env node
/**
 * Update OpenAI API Key Script
 * 
 * This script updates the OpenAI API key in the .env file.
 * Usage: node update_openai_key.js YOUR_NEW_API_KEY
 * 
 * Example: node update_openai_key.js sk-abcdefghijklmnopqrstuvwxyz1234567890
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env');

// Get the new API key from command line arguments
const newApiKey = process.argv[2];

if (!newApiKey) {
  console.error('❌ Error: No API key provided');
  process.exit(1);
}

// Validate API key format (basic check)
if (!newApiKey.startsWith('sk-') || newApiKey.length < 20) {
  console.warn('⚠️ Warning: The API key format looks unusual. OpenAI keys typically start with "sk-" and are longer.');
  const proceed = process.argv[3] === '--force';
  
  if (!proceed) {
    process.exit(1);
  }
}

// Read the current .env file
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update the OPENAI_API_KEY line
  const updatedContent = envContent.replace(
    /OPENAI_API_KEY=.*/,
    `OPENAI_API_KEY=${newApiKey}`
  );
  
  // Write back to the .env file
  fs.writeFileSync(envPath, updatedContent);
  
  
} catch (error) {
  console.error('❌ Error updating API key:', error.message);
  process.exit(1);
}
