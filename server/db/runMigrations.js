#!/usr/bin/env node

/**
 * Database Migration Runner
 * 
 * Command-line utility to manage database migrations
 * Usage: 
 *   node runMigrations.js [command]
 * 
 * Commands:
 *   status - Show migration status
 *   run - Run pending migrations
 *   validate - Validate applied migrations
 */

import { runMigrations, validateMigrations, getMigrationFiles, getAppliedMigrations } from './migrationManager.js';
import secretsManager from '../utils/secretsManager.js';

// Ensure secrets manager can access environment variables
secretsManager.logConfigStatus();

/**
 * Shows status of migrations
 */
async function showStatus() {
  try {
    
    const allMigrations = await getMigrationFiles();
    const appliedMigrations = await getAppliedMigrations();
    
    
    // Calculate max length for alignment
    const maxLength = allMigrations.reduce((max, file) => Math.max(max, file.length), 0);
    
    for (const migration of allMigrations) {
      const isApplied = appliedMigrations.includes(migration);
      const status = isApplied ? '✅ APPLIED' : '⏳ PENDING';
      
      // Pad the migration name for nice alignment
      const paddedName = migration.padEnd(maxLength + 2);
      
    }
    
    console.log(`Pending: ${allMigrations.length - appliedMigrations.length}`);
    
  } catch (error) {
    console.error('Error checking migration status:', error);
    process.exit(1);
  }
}

/**
 * Runs pending migrations
 */
async function run() {
  try {
    
    const result = await runMigrations();
    
    if (result.applied.length > 0) {
      result.applied.forEach(migration => console.log(`  ✅ ${migration}`));
    }
    
    if (result.skipped.length > 0) {
      result.skipped.forEach(migration => console.log(`  ⏭️ ${migration}`));
    }
    
    if (result.applied.length === 0 && result.skipped.length === 0) {
    }
    
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

/**
 * Validates applied migrations
 */
async function validate() {
  try {
    
    const isValid = await validateMigrations();
    
    if (isValid) {
    } else {
      console.error('\n❌ One or more migrations have integrity issues.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error validating migrations:', error);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  // Parse command line arguments
  const command = process.argv[2] || 'status';
  
  // Execute requested command
  switch (command) {
    case 'status':
      await showStatus();
      break;
    case 'run':
      await run();
      break;
    case 'validate':
      await validate();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
  
  // Exit successfully
  process.exit(0);
}

// Run main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
