/**
 * Server starter script that loads environment variables from .env2
 * This ensures all API keys are available to the server
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env2');


try {
  // Read the .env2 file
  const envConfig = fs.readFileSync(envPath, 'utf8');
  
  // Parse each line and set environment variables
  const envVars = envConfig
    .split('\n')
    .filter(line => {
      return line.trim() !== '' && !line.startsWith('#');
    })
    .map(line => {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('='); // Handle values that might contain =
      return { key: key.trim(), value: value.trim() };
    })
    .filter(({ key }) => key);
  
  // Set environment variables
  for (const { key, value } of envVars) {
    process.env[key] = value;
    console.log(`Set ENV: ${key}=${value.substring(0, 5)}...`);
  }
  
  
  // Start the actual server script
  
  // Import and run the main server file
  import('./index.js').catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

} catch (error) {
  console.error(`Error loading environment variables: ${error.message}`);
  process.exit(1);
}
