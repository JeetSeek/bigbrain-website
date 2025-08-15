#!/usr/bin/env node
/**
 * Validate Row Level Security Policies
 * 
 * This script:
 * 1. Runs pending migrations to apply RLS policies
 * 2. Validates that all tables have proper RLS enabled
 * 3. Reports any security gaps
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { supabase } from '../supabaseClient.js';
// Since migrationManager might be exported differently, we'll handle both default and named exports
import migrationManagerModule from '../db/migrationManager.js';
const migrationManager = migrationManagerModule.default || migrationManagerModule;

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Colorized console output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m"
};

async function main() {
  try {
    console.log(`\n${colors.cyan}Running at:${colors.reset} ${new Date().toISOString()}\n`);

    // Step 1: Run pending migrations (this will apply our RLS policies)
    try {
      // Checking if this is exported as runPendingMigrations or applyMigrations
      const migrationFunction = migrationManager.runPendingMigrations || migrationManager.applyMigrations || migrationManager.runMigrations;
      
      if (!migrationFunction) {
      } else {
        const migrations = await migrationFunction();
        console.log(`${colors.green}✓${colors.reset} Applied ${Array.isArray(migrations) ? migrations.length : 0} migration(s)`);
        
        if (Array.isArray(migrations) && migrations.length > 0) {
          console.log(`${colors.green}✓${colors.reset} Applied migrations: ${migrations.map(m => m.name || m.id || m).join(', ')}`);
        }
      }
    } catch (error) {
    }

    // Step 2: Test RLS policies using our new function
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('test_rls_policies');
    
    if (rlsError) {
      console.error(`${colors.red}✗ Failed to validate RLS policies:${colors.reset}`, rlsError.message);
      process.exit(1);
    }

    // Step 3: Report results

    const tableCount = rlsStatus.length;
    const securedTables = rlsStatus.filter(t => t.has_rls).length;
    const percentage = Math.round((securedTables / tableCount) * 100);

    console.log(`${colors.white}Tables with RLS enabled:${colors.reset} ${securedTables} (${percentage}%)`);

    if (percentage < 100) {
    } else {
    }

    console.log('--------------------------------------------------------');

    rlsStatus.forEach(table => {
      const policies = table.policies ? table.policies.length : 0;
      const rlsStatus = table.has_rls 
        ? `${colors.green}YES${colors.reset}` 
        : `${colors.red}NO ${colors.reset}`;
      const policyText = policies > 0 
        ? `${colors.green}${policies} policies${colors.reset}` 
        : `${colors.red}No policies${colors.reset}`;
      
      console.log(`${table.table_name.padEnd(20)} | ${rlsStatus} | ${policyText}`);
    });


    // Find tables without RLS
    const unsecuredTables = rlsStatus.filter(t => !t.has_rls);
    
    if (unsecuredTables.length > 0) {
      unsecuredTables.forEach(table => {
      });
      
    }

    // Find tables with RLS but no policies
    const tablesWithoutPolicies = rlsStatus.filter(t => t.has_rls && (!t.policies || t.policies.length === 0));
    
    if (tablesWithoutPolicies.length > 0) {
      tablesWithoutPolicies.forEach(table => {
      });
      
    }

    // Success message
    if (percentage === 100 && tablesWithoutPolicies.length === 0) {
    } else {
    }

  } catch (error) {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});
