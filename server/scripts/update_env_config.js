#!/usr/bin/env node
/**
 * Update Environment Configuration Script
 * 
 * This script merges the contents of .env2 into .env to ensure
 * proper configuration with valid API keys.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env');
const env2Path = path.join(__dirname, '..', '.env2');

try {
  // Check if .env2 exists
  if (!fs.existsSync(env2Path)) {
    console.error('❌ Error: .env2 file not found');
    process.exit(1);
  }

  // Read the .env2 file
  const env2Content = fs.readFileSync(env2Path, 'utf8');
  
  // Check if .env exists, if not create it
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, env2Content);
    process.exit(0);
  }

  // Read the current .env file
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Extract key-value pairs from both files
  const env2Lines = env2Content.split('\n');
  const envLines = envContent.split('\n');
  
  const env2Map = {};
  env2Lines.forEach(line => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') {
      return;
    }
    
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      env2Map[key.trim()] = value;
    }
  });
  
  // Update .env file with values from .env2
  const updatedEnvLines = envLines.map(line => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') {
      return line;
    }
    
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key] = match;
      const trimmedKey = key.trim();
      
      if (env2Map[trimmedKey]) {
        return `${trimmedKey}=${env2Map[trimmedKey]}`;
      }
    }
    return line;
  });
  
  // Add any keys from .env2 that don't exist in .env
  Object.entries(env2Map).forEach(([key, value]) => {
    const keyExists = updatedEnvLines.some(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      return match && match[1].trim() === key;
    });
    
    if (!keyExists) {
      updatedEnvLines.push(`${key}=${value}`);
    }
  });
  
  // Write back to the .env file
  fs.writeFileSync(envPath, updatedEnvLines.join('\n'));
  
  console.log('- DeepSeek API keys configured');
  
} catch (error) {
  console.error('❌ Error updating environment configuration:', error.message);
  process.exit(1);
}
