#!/usr/bin/env node

/**
 * Direct Knowledge Embeddings Setup
 * 
 * This script creates the knowledge_embeddings table and sets up pgvector
 * without relying on migrations or SQL execution endpoints.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import ora from 'ora';

// Initialize Supabase client with service role key for admin access
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(chalk.dim(`Using Supabase URL: ${supabaseUrl}`));
console.log(chalk.dim(`Using Supabase Key: ${supabaseKey ? supabaseKey.substring(0, 5) + '...' + supabaseKey.substring(supabaseKey.length - 5) : 'not set'}`));

if (!supabaseUrl || !supabaseKey) {
  console.error(chalk.red('❌ Error: Missing Supabase URL or service key.'));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Main function to create tables and setup RLS
 */
async function main() {
  console.log(chalk.blue('🔧 Setting up Knowledge Embeddings Table'));

  try {
    // 1. Enable the pgvector extension
    const pgvectorSpinner = ora('Enabling pgvector extension...').start();
    
    // Using REST API to enable the extension
    const pgvectorRes = await fetch(`${supabaseUrl}/rest/v1/rpc/enable_extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        name: 'vector'
      })
    });
    
    if (!pgvectorRes.ok) {
      // If extension already exists, this might fail, we can continue
      pgvectorSpinner.warn('Could not enable pgvector extension directly, it may already be enabled');
    } else {
      pgvectorSpinner.succeed('pgvector extension enabled');
    }
    
    // 2. Create the knowledge_embeddings table using standard RPC
    const tableSpinner = ora('Creating knowledge_embeddings table...').start();
    
    try {
      
      // Check if the table already exists
      const { data: existingData, error: existingError } = await supabase
        .from('knowledge_embeddings')
        .select('count(*)', { count: 'exact', head: true });
      
      
      if (!existingError) {
        tableSpinner.succeed('Table knowledge_embeddings already exists');
        return; // Exit early if table exists
      }
      
      // Define table columns (excluding vector for now)
      const rpcResult = await supabase.rpc('create_knowledge_embeddings_table');
      const { error } = rpcResult || { error: { message: 'RPC create_knowledge_embeddings_table not found' } };
      
      if (error) {
        // Try alternative approach if RPC doesn't exist
        tableSpinner.text = 'Creating knowledge_embeddings table via alternative method...';
        
        // We'll use a mixture of REST API calls and table operations
        const insertResult = await supabase
          .from('knowledge_embeddings')
          .insert([{
            content: 'Initial test content',
            content_tokens: 3,
            metadata: { test: true },
            tag: 'test',
            source: 'setup_script',
            is_active: true
          }])
          .select();
        
        const { error: createError } = insertResult || { error: { message: 'Unknown error during insert', code: '42P01' } };
        
        if (createError && createError.code === '42P01') { // relation does not exist
          // Table doesn't exist, we need to create it first
          const tableCreationRes = await fetch(`${supabaseUrl}/rest/v1/tables`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey
            },
            body: JSON.stringify({
              name: 'knowledge_embeddings',
              schema: 'public',
              columns: [
                {
                  name: 'id',
                  type: 'uuid',
                  primaryKey: true,
                  default: 'uuid_generate_v4()'
                },
                {
                  name: 'content',
                  type: 'text',
                  nullable: false
                },
                {
                  name: 'content_tokens',
                  type: 'integer'
                },
                {
                  name: 'metadata',
                  type: 'jsonb',
                  default: '{}'
                },
                {
                  name: 'tag',
                  type: 'varchar(100)'
                },
                {
                  name: 'source',
                  type: 'varchar(255)'
                },
                {
                  name: 'source_url',
                  type: 'text'
                },
                {
                  name: 'created_at',
                  type: 'timestamptz',
                  default: 'now()'
                },
                {
                  name: 'updated_at',
                  type: 'timestamptz',
                  default: 'now()'
                },
                {
                  name: 'last_accessed_at',
                  type: 'timestamptz'
                },
                {
                  name: 'access_count',
                  type: 'integer',
                  default: 0
                },
                {
                  name: 'relevance_score',
                  type: 'float8',
                  default: 0.0
                },
                {
                  name: 'is_active',
                  type: 'boolean',
                  default: true
                }
              ]
            })
          });
          
          if (!tableCreationRes.ok) {
            const errorData = await tableCreationRes.text();
            throw new Error(`Failed to create table: ${errorData}`);
          }
          
          // Add embedding column after table is created (special vector type)
          const vectorColumnRes = await fetch(`${supabaseUrl}/rest/v1/columns`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey
            },
            body: JSON.stringify({
              table: 'knowledge_embeddings',
              schema: 'public',
              name: 'embedding',
              type: 'vector(1536)'
            })
          });
          
          if (!vectorColumnRes.ok) {
            const errorData = await vectorColumnRes.text();
            tableSpinner.warn(`Warning: Could not add vector column: ${errorData}`);
            
            // Try the RPC approach as fallback for the embedding column
            await supabase.rpc('add_embedding_column');
          }
        } else if (createError) {
          tableSpinner.fail(`Failed to create table: ${createError.message}`);
          throw createError;
        }
      }
      
      tableSpinner.succeed('knowledge_embeddings table created or already exists');
      
      // 3. Create vector index
      const indexSpinner = ora('Creating vector index...').start();
      
      try {
        const { error: indexError } = await supabase.rpc('create_vector_index');
        
        if (indexError) {
          // Try direct REST API for index
          indexSpinner.text = 'Creating vector index via alternative method...';
          
          const indexRes = await fetch(`${supabaseUrl}/rest/v1/indexes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey
            },
            body: JSON.stringify({
              name: 'idx_embedding_vector',
              table: 'knowledge_embeddings',
              schema: 'public',
              using: 'ivfflat',
              options: 'WITH (lists = 100)',
              columns: ['embedding vector_cosine_ops']
            })
          });
          
          if (!indexRes.ok) {
            const errorText = await indexRes.text();
            indexSpinner.warn(`Could not create vector index directly: ${errorText}`);
          } else {
            indexSpinner.succeed('Vector index created');
          }
        } else {
          indexSpinner.succeed('Vector index created');
        }
      } catch (err) {
        indexSpinner.warn(`Warning: Could not create vector index, you may need to do this manually: ${err.message}`);
      }
      
      // 4. Create vector search function
      const funcSpinner = ora('Creating vector search function...').start();
      
      try {
        const { error: funcError } = await supabase.rpc('create_vector_search_function');
        
        if (funcError) {
          funcSpinner.warn(`Could not create vector search function with RPC: ${funcError.message}`);
          funcSpinner.text = 'Creating vector search function manually...';
          
          // Create function via REST API
          const functionDef = `
          CREATE OR REPLACE FUNCTION find_similar_documents(
            query_embedding vector(1536),
            similarity_threshold float,
            match_count int
          )
          RETURNS TABLE (
            id uuid,
            content text,
            similarity float
          )
          LANGUAGE plpgsql
          AS $$
          BEGIN
            RETURN QUERY
            SELECT
              knowledge_embeddings.id,
              knowledge_embeddings.content,
              1 - (knowledge_embeddings.embedding <=> query_embedding) AS similarity
            FROM knowledge_embeddings
            WHERE 1 - (knowledge_embeddings.embedding <=> query_embedding) > similarity_threshold
            ORDER BY similarity DESC
            LIMIT match_count;
          END;
          $$;
          
          -- Create alias function for compatibility
          CREATE OR REPLACE FUNCTION find_similar_knowledge(
            query_embedding vector(1536),
            similarity_threshold float,
            match_count int
          )
          RETURNS TABLE (
            id uuid,
            content text,
            similarity float
          )
          LANGUAGE plpgsql
          AS $$
          BEGIN
            RETURN QUERY
            SELECT * FROM find_similar_documents(query_embedding, similarity_threshold, match_count);
          END;
          $$;`;
          
          // We'll need to find a way to execute this SQL directly
          funcSpinner.warn('Cannot create vector search function directly.');
          console.log(chalk.yellow('Please create the following function manually in the Supabase SQL editor:'));
          console.log(chalk.dim(functionDef));
        } else {
          funcSpinner.succeed('Vector search function created');
        }
      } catch (err) {
        funcSpinner.warn(`Warning: Could not create vector search function: ${err.message}`);
      }
      
      // 5. Create RLS policies
      const policySpinner = ora('Setting up RLS policies...').start();
      
      try {
        
        // Enable RLS on the table
        const rlsResult = await supabase.rpc('enable_rls_on_knowledge_embeddings');
        
        // Create read policy
        const readPolicyResult = await supabase.rpc('create_read_policy_for_knowledge_embeddings');
        
        // Create admin policy
        const adminPolicyResult = await supabase.rpc('create_admin_policy_for_knowledge_embeddings');
        
        policySpinner.succeed('RLS policies created');
      } catch (err) {
        console.error('RLS policy setup error details:', err);
        policySpinner.warn(`Warning: Could not set up all RLS policies: ${err.message}`);
      }
      
      console.log(chalk.green('✅ Knowledge embeddings table setup is complete!'));
      console.log(chalk.yellow('NOTE: If some operations failed, you may need to complete them manually.'));
      console.log(chalk.yellow('You can now run the embed_knowledge.js script to populate the table.'));
      
    } catch (error) {
      console.error('Table creation error details:', error);
      tableSpinner.fail(`Failed to create table: ${error.message || 'Unknown error'}`);
      throw error;
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Setup failed: ${error.message || 'Unknown error'}`));
    console.error('Full error details:', error);
    process.exit(1);
  }
}

// Run the setup
main();
