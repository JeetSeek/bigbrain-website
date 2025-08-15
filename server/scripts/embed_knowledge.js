#!/usr/bin/env node

/**
 * Knowledge Embedding Script
 * 
 * Loads boiler knowledge from the knowledge service and creates vector embeddings in Supabase
 * for semantic search functionality in the chat system.
 * 
 * Usage: node embed_knowledge.js
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import ora from 'ora';
import chalk from 'chalk';
import boilerKnowledge from './boilerKnowledgeData.js';
import { AI, VECTOR_SEARCH } from '../constants.js';
import fetch from 'node-fetch';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// OpenAI API key for embeddings
const openaiApiKey = process.env.OPENAI_API_KEY;

// Create embeddings using OpenAI API
async function createEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: AI.OPENAI_MODELS.EMBEDDINGS, // Use the correct model parameter from constants
      input: text
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
  }
  
  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Process fault codes and store their embeddings
 */
async function processFaultCodes() {
  const spinner = ora('Processing fault codes').start();
  let count = 0;
  
  try {
    // Access the fault codes from the boilerKnowledge service
    // Make sure we're accessing correctly - the export includes both data and helper functions
    if (!boilerKnowledge.faultCodes) {
      throw new Error('Fault codes data not found in boilerKnowledge service. Check the import.');
    }
    
    const manufacturers = Object.keys(boilerKnowledge.faultCodes);
    
    for (const manufacturer of manufacturers) {
      const codes = Object.keys(boilerKnowledge.faultCodes[manufacturer]);
      
      for (const code of codes) {
        const faultData = boilerKnowledge.faultCodes[manufacturer][code];
        
        // Create content for embedding
        const content = `Fault Code: ${code} for ${manufacturer}\n\n` +
          `Description: ${faultData.description}\n\n` +
          `Causes: ${faultData.causes.join(', ')}\n\n` +
          `Troubleshooting Steps:\n${faultData.troubleshooting.join('\n')}\n\n` +
          `Safety Level: ${faultData.safety || 'Not specified'}`;
        
        // Create embedding
        const embedding = await createEmbedding(content);
        
        // Store in Supabase
        const { error } = await supabase.from('knowledge_embeddings').insert({
          content,
          embedding,
          content_tokens: Math.ceil(content.length / 4), // Rough estimate
          tag: 'fault-code',
          metadata: {
            manufacturer,
            code,
            safety_level: faultData.safety || 'unknown'
          },
          source: 'boiler-knowledge-service',
          is_active: true
        });
        
        if (error) {
          throw new Error(`Error storing fault code embedding: ${error.message}`);
        }
        
        count++;
      }
    }
    
    spinner.succeed(`Processed ${count} fault codes`);
  } catch (error) {
    spinner.fail(`Error processing fault codes: ${error.message}`);
    throw error;
  }
}

/**
 * Process symptoms and store their embeddings
 */
async function processSymptoms() {
  const spinner = ora('Processing symptoms').start();
  let count = 0;
  
  try {
    // Access symptoms from the boilerKnowledge service
    const symptoms = Object.keys(boilerKnowledge.symptoms);
    
    for (const symptom of symptoms) {
      const symptomData = boilerKnowledge.symptoms[symptom];
      
      // Create content for embedding
      let content = `Symptom: ${symptom}\n\nPossible Causes:\n`;
      
      for (const cause of symptomData) {
        content += `- ${cause.cause} (Probability: ${cause.probability})\n`;
        if (cause.checks && cause.checks.length > 0) {
          content += `  Checks: ${cause.checks.join(', ')}\n`;
        }
        if (cause.repair && cause.repair.length > 0) {
          content += `  Repair: ${cause.repair.join(', ')}\n`;
        }
      }
      
      // Create embedding
      const embedding = await createEmbedding(content);
      
      // Store in Supabase
      const { error } = await supabase.from('knowledge_embeddings').insert({
        content,
        embedding,
        content_tokens: Math.ceil(content.length / 4), // Rough estimate
        tag: 'symptom',
        metadata: {
          symptom
        },
        source: 'boiler-knowledge-service',
        is_active: true
      });
      
      if (error) {
        throw new Error(`Error storing symptom embedding: ${error.message}`);
      }
      
      count++;
    }
    
    spinner.succeed(`Processed ${count} symptoms`);
  } catch (error) {
    spinner.fail(`Error processing symptoms: ${error.message}`);
    throw error;
  }
}

/**
 * Process safety warnings and store their embeddings
 */
async function processSafetyWarnings() {
  const spinner = ora('Processing safety warnings').start();
  let count = 0;
  
  try {
    // Access safety warnings from the boilerKnowledge service
    const warnings = Object.keys(boilerKnowledge.safetyWarnings);
    
    for (const warning of warnings) {
      const warningData = boilerKnowledge.safetyWarnings[warning];
      
      // Create content for embedding
      const content = `Safety Warning: ${warning}\n\n` +
        `Severity: ${warningData.severity}\n\n` +
        `Immediate Actions:\n${warningData.immediateActions.join('\n')}\n\n` +
        `Additional Guidance:\n${warningData.additionalGuidance || 'No additional guidance provided'}`;
      
      // Create embedding
      const embedding = await createEmbedding(content);
      
      // Store in Supabase
      const { error } = await supabase.from('knowledge_embeddings').insert({
        content,
        embedding,
        content_tokens: Math.ceil(content.length / 4), // Rough estimate
        tag: 'safety-warning',
        metadata: {
          warning,
          severity: warningData.severity
        },
        source: 'boiler-knowledge-service',
        is_active: true
      });
      
      if (error) {
        throw new Error(`Error storing safety warning embedding: ${error.message}`);
      }
      
      count++;
    }
    
    spinner.succeed(`Processed ${count} safety warnings`);
  } catch (error) {
    spinner.fail(`Error processing safety warnings: ${error.message}`);
    throw error;
  }
}

/**
 * Main function to run the script
 */
async function main() {
  try {
    // Check if OpenAI API key is set
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not set. Please set the OPENAI_API_KEY environment variable.');
    }
    
    // Display script info
    console.log(chalk.blue('📚 BoilerBrain Knowledge Embedding'));
    console.log(chalk.dim('Generating vector embeddings for semantic search...'));
    
    // Test Supabase connection
    const spinner = ora('Testing Supabase connection').start();
    
    try {
      // Check if table exists by trying to select a single row
      const { data, error } = await supabase.from('knowledge_embeddings').select('id').limit(1);
      
      if (error) {
        spinner.warn(`Supabase query error: ${error.message} - will attempt to proceed anyway`);
      } else {
        spinner.succeed('Connected to Supabase successfully');
      }
    } catch (error) {
      spinner.warn(`Supabase connection issue: ${error.message} - will attempt to proceed anyway`);
    }
    
    // Process each knowledge type
    await processFaultCodes();
    await processSymptoms();
    await processSafetyWarnings();
    
    console.log(chalk.green('✅ Knowledge embedding complete!'));
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

// Run the script
main();
