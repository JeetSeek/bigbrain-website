#!/usr/bin/env node

/**
 * Improved Migration Execution Script
 * 
 * This script applies migrations directly through Supabase REST API
 * using the SQL query endpoint for reliable execution.
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
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Execute SQL directly
 */
async function executeSql(sql) {
  try {
    // Using the REST API directly for SQL execution
    const endpoint = `${supabaseUrl}/rest/v1/sql`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ query: sql })
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`SQL execution failed (status ${response.status}): ${text}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`SQL execution error: ${error.message}`);
  }
}

/**
 * Apply a single migration file
 */
async function applyMigration(filename) {
  const spinner = ora(`Applying migration: ${filename}`).start();
  
  try {
    // Read migration file
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const content = await fs.readFile(filePath, 'utf8');
    
    // Execute as a single transaction
    const transaction = `
      BEGIN;
      ${content}
      COMMIT;
    `;
    
    await executeSql(transaction);
    
    // Log success
    spinner.succeed(`Applied migration: ${filename}`);
    return true;
  } catch (error) {
    spinner.fail(`Migration failed: ${filename}`);
    console.error(chalk.red(`Error: ${error.message}`));
    return false;
  }
}

/**
 * Check if a migration has already been applied
 */
async function isMigrationApplied(filename) {
  try {
    const { data, error } = await supabase
      .from('migrations')
      .select('name')
      .eq('name', filename)
      .single();
    
    if (error) {
      // If the table doesn't exist yet, no migrations have been applied
      if (error.code === '42P01') {
        return false;
      }
      throw error;
    }
    
    return !!data;
  } catch (error) {
    console.error(chalk.yellow(`Warning: Could not check migration status: ${error.message}`));
    return false;
  }
}

/**
 * Main function to run all migrations
 */
async function main() {
  try {
    console.log(chalk.blue('🔧 Improved Migration Application'));
    
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
    
    // First check if we need to create the migrations table itself
    try {
      const { data, error } = await supabase
        .from('migrations')
        .select('count(*)', { count: 'exact' })
        .limit(1);
      
      if (error && error.code === '42P01') {
        // Migrations table doesn't exist, apply the first migration
        console.log(chalk.yellow('Migrations table not found. Applying setup migration first.'));
        const setupSuccess = await applyMigration(migrationFiles[0]);
        
        if (!setupSuccess) {
          throw new Error('Failed to create migrations table. Aborting.');
        }
        
        // Remove the first migration from the list
        migrationFiles.shift();
      }
    } catch (error) {
      console.log(chalk.yellow(`Could not check migrations table: ${error.message}`));
      console.log(chalk.yellow('Proceeding with all migrations...'));
    }
    
    let appliedCount = 0;
    
    // Apply each migration if not already applied
    for (const filename of migrationFiles) {
      const isApplied = await isMigrationApplied(filename);
      
      if (isApplied) {
        console.log(chalk.dim(`Skipping migration: ${filename} (already applied)`));
        continue;
      }
      
      const success = await applyMigration(filename);
      if (success) {
        appliedCount++;
      } else {
        throw new Error(`Failed to apply migration: ${filename}`);
      }
    }
    
    console.log(chalk.green(`✅ Migration complete! Applied ${appliedCount} new migrations.`));
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

// Run the script
main();
