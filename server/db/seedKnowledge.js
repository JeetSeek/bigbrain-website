#!/usr/bin/env node

/**
 * Knowledge Database Seeder
 * 
 * Command-line utility to seed the database with initial knowledge
 * This will import boiler knowledge from local JSON files and create
 * vector embeddings for semantic search.
 * 
 * Usage: 
 *   node seedKnowledge.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import knowledgeService from '../services/knowledgeService.js';
import secretsManager from '../utils/secretsManager.js';

// Get directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up paths
const DATA_DIR = path.join(__dirname, '../data');
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'boiler_knowledge.json');

// Ensure secrets manager can access environment variables
secretsManager.logConfigStatus();

/**
 * Import knowledge from JSON file
 * @returns {Promise<Array>} Knowledge items
 */
async function importKnowledge() {
  try {
    const fileExists = await fs.stat(KNOWLEDGE_FILE).catch(() => false);
    
    if (!fileExists) {
      console.error(`File not found: ${KNOWLEDGE_FILE}`);
      return [];
    }
    
    const content = await fs.readFile(KNOWLEDGE_FILE, 'utf8');
    const data = JSON.parse(content);
    
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error importing knowledge:', error);
    return [];
  }
}

/**
 * Process and seed knowledge items
 * @param {Array} items - Knowledge items to seed
 */
async function seedKnowledge(items) {
  if (!items.length) {
    return;
  }
  
  
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    try {
      // Log progress every 10 items
      if (i % 10 === 0) {
      }
      
      // Transform item into proper format
      const knowledgeItem = {
        content: item.content || item.text,
        tag: item.tag || item.category || 'general',
        source: item.source || 'seed-data',
        metadata: item.metadata || {},
        relevance_score: item.relevance || 0.0
      };
      
      if (item.url) {
        knowledgeItem.source_url = item.url;
      }
      
      // Add knowledge item with embedding
      await knowledgeService.addKnowledgeItem(knowledgeItem);
      results.success++;
      
    } catch (error) {
      console.error(`Error seeding item ${i + 1}:`, error.message);
      results.failed++;
      results.errors.push({
        item: i + 1,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Main function
 */
async function main() {
  try {
    
    // Import knowledge items
    const items = await importKnowledge();
    
    if (!items.length) {
      // Create sample data structure if it doesn't exist
      await fs.mkdir(DATA_DIR, { recursive: true });
      
      const sampleData = [
        {
          content: "Modern condensing boilers typically operate at around 90-98% efficiency, converting almost all fuel into heat.",
          tag: "efficiency",
          source: "boiler-specifications",
          metadata: { boilerType: "condensing" }
        },
        {
          content: "If your boiler is making a loud banging noise (kettling), it's often caused by limescale buildup on the heat exchanger.",
          tag: "troubleshooting",
          source: "maintenance-guide",
          metadata: { severity: "medium", commonIssue: true }
        }
      ];
      
      await fs.writeFile(
        KNOWLEDGE_FILE, 
        JSON.stringify(sampleData, null, 2), 
        'utf8'
      );
      
      process.exit(0);
    }
    
    // Seed knowledge
    const results = await seedKnowledge(items);
    
    // Report results
    console.log(`Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
      results.errors.forEach(err => {
      });
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the main function
main().then(() => process.exit(0)).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
