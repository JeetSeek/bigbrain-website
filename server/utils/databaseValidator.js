/**
 * Database Schema Validator
 * Validates that required database tables and columns exist
 */

import { supabase } from '../supabaseClient.js';
import logger from './logger.js';

/**
 * Required tables and their essential columns
 */
const REQUIRED_SCHEMA = {
  'knowledge_base': ['id', 'title', 'content', 'created_at'],
  'boiler_fault_codes': ['id', 'manufacturer', 'fault_code', 'description'],
  'chat_sessions': ['id', 'session_id', 'history', 'created_at'],
  'boiler_manuals': ['id', 'manufacturer', 'name', 'url']
};

/**
 * Optional tables that enhance functionality but aren't critical
 */
const OPTIONAL_SCHEMA = {
  'users': ['id', 'email', 'role', 'created_at'],
  'knowledge_embeddings': ['id', 'content', 'embedding'],
  'discovered_knowledge': ['id', 'content', 'reliability_score'],
  'verified_knowledge': ['id', 'content', 'verified_at']
};

/**
 * Validate database schema
 */
export async function validateDatabaseSchema() {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    tables: {}
  };

  logger.info('Starting database schema validation');

  try {
    // Check required tables
    for (const [tableName, requiredColumns] of Object.entries(REQUIRED_SCHEMA)) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          results.valid = false;
          results.errors.push(`Required table '${tableName}' is not accessible: ${error.message}`);
          results.tables[tableName] = { exists: false, error: error.message };
        } else {
          results.tables[tableName] = { exists: true, accessible: true };
          logger.debug(`Required table '${tableName}' is accessible`);
        }
      } catch (err) {
        results.valid = false;
        results.errors.push(`Failed to check required table '${tableName}': ${err.message}`);
        results.tables[tableName] = { exists: false, error: err.message };
      }
    }

    // Check optional tables (warnings only)
    for (const [tableName, requiredColumns] of Object.entries(OPTIONAL_SCHEMA)) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          results.warnings.push(`Optional table '${tableName}' is not accessible: ${error.message}`);
          results.tables[tableName] = { exists: false, optional: true, error: error.message };
        } else {
          results.tables[tableName] = { exists: true, accessible: true, optional: true };
          logger.debug(`Optional table '${tableName}' is accessible`);
        }
      } catch (err) {
        results.warnings.push(`Failed to check optional table '${tableName}': ${err.message}`);
        results.tables[tableName] = { exists: false, optional: true, error: err.message };
      }
    }

    // Log results
    if (results.valid) {
      logger.info('Database schema validation passed', {
        tablesChecked: Object.keys(REQUIRED_SCHEMA).length + Object.keys(OPTIONAL_SCHEMA).length,
        errors: results.errors.length,
        warnings: results.warnings.length
      });
    } else {
      logger.error('Database schema validation failed', {
        errors: results.errors,
        warnings: results.warnings
      });
    }

  } catch (error) {
    results.valid = false;
    results.errors.push(`Database validation failed: ${error.message}`);
    logger.error('Database schema validation error', { error: error.message });
  }

  return results;
}

/**
 * Check if specific table exists and is accessible
 */
export async function checkTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('count')
      .limit(1);

    return { exists: !error, error: error?.message };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  const stats = {};

  for (const tableName of Object.keys({ ...REQUIRED_SCHEMA, ...OPTIONAL_SCHEMA })) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('count');

      if (!error && data) {
        stats[tableName] = { count: data.length, accessible: true };
      } else {
        stats[tableName] = { accessible: false, error: error?.message };
      }
    } catch (err) {
      stats[tableName] = { accessible: false, error: err.message };
    }
  }

  return stats;
}
