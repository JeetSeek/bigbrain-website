#!/usr/bin/env node

/**
 * Simple Supabase Connection Check
 * 
 * This script verifies connectivity to Supabase before attempting migrations
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Log configuration (without showing full key)
console.log(chalk.blue('🔧 Checking Supabase Connection'));
console.log(chalk.dim(`URL: ${supabaseUrl}`));
console.log(chalk.dim(`Key: ${supabaseKey ? supabaseKey.substring(0, 3) + '...' + supabaseKey.substring(supabaseKey.length - 3) : 'not set'}`));

if (!supabaseUrl || !supabaseKey) {
  console.error(chalk.red('❌ Error: Missing Supabase URL or key. Check your .env file.'));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Simple query to validate connection
 */
async function testConnection() {
  try {
    // Try a simple query
    const { data, error } = await supabase.rpc('version');
    
    if (error) {
      // Try a table query instead if RPC fails
      const { data: tableData, error: tableError } = await supabase
        .from('migrations')
        .select('count(*)', { count: 'exact' })
        .limit(1);
      
      if (tableError) {
        console.log(chalk.yellow(`Migrations table might not exist yet: ${tableError.message}`));
        
        // Try just a raw ping
        const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          }
        });
        
        if (response.ok) {
          console.log(chalk.green('✅ Basic Supabase API connection successful!'));
        } else {
          throw new Error(`API returned status ${response.status}: ${await response.text()}`);
        }
      } else {
        console.log(chalk.green(`✅ Connection successful! Found ${tableData.count} migrations.`));
      }
    } else {
      console.log(chalk.green(`✅ Connection successful! PostgreSQL version: ${data}`));
    }
    
    // Now check available REST endpoints
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      }
    });
    
    if (response.ok) {
      const endpoints = await response.json();
      console.log(chalk.green('Available endpoints:'));
    } else {
      console.log(chalk.yellow(`Could not retrieve endpoints: ${response.status}`));
    }
  } catch (error) {
    console.error(chalk.red(`❌ Connection failed: ${error.message}`));
    process.exit(1);
  }
}

// Run the test
testConnection();
