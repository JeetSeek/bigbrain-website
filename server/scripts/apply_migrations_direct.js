#!/usr/bin/env node

/**
 * Direct Migration Execution Script
 * 
 * This script applies migrations directly through Supabase REST API
 * without relying on RPC functions that might not exist yet.
 * Use this script when the standard migration runner fails.
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import ora from 'ora';
import chalk from 'chalk';

// Get directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to migrations directory
const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Main function to run all migrations
 */
async function main() {
  try {
    console.log(chalk.blue('🔧 Direct Migration Application'));
    
    // Check configuration
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase URL or key. Check your .env file.');
    }
    
    // Get all migration files
    const files = await fs.readdir(MIGRATIONS_DIR);
    const migrationFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort((a, b) => {
        const numA = parseInt(a.split('_')[0]);
        const numB = parseInt(b.split('_')[0]);
        return numA - numB;
      });
    
    console.log(chalk.dim(`Found ${migrationFiles.length} migration files`));
    
    // Apply each migration
    for (const filename of migrationFiles) {
      const spinner = ora(`Applying migration: ${filename}`).start();
      
      try {
        // Read migration file
        const filePath = path.join(MIGRATIONS_DIR, filename);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Split into statements (naively - assumes statements end with semicolon)
        const statements = content
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);
        
        // Execute each statement separately
        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          
          // Skip comments-only statements
          if (statement.trim().startsWith('--')) {
            continue;
          }
          
          // Execute the SQL statement
          const { data, error } = await supabase.from('_sql').select('*').csv();
          
          // The above is a hack to get the actual REST API endpoint URL
          const url = data.url.replace(/\/csv\?[^\/]*$/, '');
          
          // Now use fetch to make a direct SQL query to the REST API
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
              'Prefer': 'resolution=ignore-duplicates,return=minimal'
            },
            body: JSON.stringify({
              query: statement
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`SQL execution failed for statement ${i+1}: ${errorText}`);
          }
        }
        
        // Log success
        spinner.succeed(`Applied migration: ${filename}`);
      } catch (error) {
        spinner.fail(`Migration failed: ${filename}`);
        console.error(chalk.red(`Error: ${error.message}`));
        process.exit(1);
      }
    }
    
    console.log(chalk.green('✅ All migrations applied successfully!'));
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

// Run the script
main();
