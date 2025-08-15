#!/usr/bin/env node

/**
 * Direct SQL Execution Script
 * 
 * This script executes SQL files directly through Supabase REST API
 * Usage: node execute_sql.js <sql_file_path>
 */

import 'dotenv/config';
import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Main function to run the script
 */
async function main() {
  try {
    // Check arguments
    if (process.argv.length < 3) {
      console.error('Usage: node execute_sql.js <sql_file_path>');
      process.exit(1);
    }
    
    const filePath = process.argv[2];
    
    // Check configuration
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase URL or key. Check your .env file.');
    }
    
    
    // Read SQL file
    const content = await fs.readFile(filePath, 'utf8');
    
    // Execute the SQL via REST API
    
    // Get SQL endpoint URL via a simple query
    const { data } = await supabase.from('_sql').select('*').csv();
    const url = data.url.replace(/\/csv\?[^\/]*$/, '');
    
    // Now use fetch to make a direct SQL query
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Prefer': 'resolution=ignore-duplicates'
      },
      body: JSON.stringify({
        query: content
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SQL execution failed: ${errorText}`);
    }
    
    const result = await response.json();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
