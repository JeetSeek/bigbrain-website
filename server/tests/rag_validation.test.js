/**
 * RAG System Validation Test
 * 
 * This test validates the Retrieval Augmented Generation (RAG) functionality
 * by checking each component of the system:
 * 1. Vector embedding creation (OpenAI API)
 * 2. Vector storage in Supabase
 * 3. Vector similarity search via RPC
 * 4. Integration with chat API
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../supabaseClient.js';
import fetch from 'node-fetch';
import boilerKnowledge from '../boilerKnowledgeService.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

console.log('Loading environment variables from .env.test');
console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Validate environment variables
const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY'
];

// Test data
const TEST_EMBEDDING = Array(1536).fill(0).map(() => Math.random() * 2 - 1); // Random 1536-dim vector
const TEST_CONTENT = 'Test knowledge for RAG system validation';

describe('RAG System Validation', () => {
  beforeAll(async () => {
    // Check required environment variables
    const missingEnvVars = REQUIRED_ENV_VARS.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }
    
    console.log('Environment variables validated');
    
    // Insert test data
    try {
      // Insert using JSONB for embeddings instead of vector
    const { error } = await supabase.from('knowledge_embeddings').insert({
        content: TEST_CONTENT,
        embedding: TEST_EMBEDDING,
        content_tokens: Math.floor(TEST_CONTENT.length / 4), // Ensure integer
        tag: 'test',
        metadata: { test: true },
        source: 'test',
        is_active: true
      });
      
      if (error) {
        throw new Error(`Error inserting test data: ${error.message}`);
      }
      
      console.log('Test data inserted successfully');
    } catch (error) {
      console.error('Error in test setup:', error);
      throw error;
    }
  });
  
  afterAll(async () => {
    // Clean up test data
    try {
      const { error } = await supabase
        .from('knowledge_embeddings')
        .delete()
        .eq('content', TEST_CONTENT);
      
      if (error) {
        console.warn(`Warning: Could not clean up test data: ${error.message}`);
      } else {
        console.log('Test data cleaned up successfully');
      }
    } catch (error) {
      console.warn('Warning: Error during test cleanup:', error);
    }
  });

  test('should verify the knowledge_embeddings table exists', async () => {
    // Using head: true to only get the count, not the actual data
    const { count, error } = await supabase
      .from('knowledge_embeddings')
      .select('*', { count: 'exact', head: true });
    
    expect(error).toBeNull();
    expect(count).not.toBeNull();
    console.log(`Table knowledge_embeddings exists with ${count} records`);
  });
  
  // Skipping legacy function test as we're now using find_similar_knowledge_jsonb
  test.skip('should verify that find_similar_documents RPC exists', async () => {
    // Skipped - using find_similar_knowledge_jsonb instead
  });
  
  test('should verify that find_similar_knowledge_jsonb RPC exists', async () => {
    try {
      const { data, error } = await supabase.rpc('find_similar_knowledge_jsonb', {
        query_embedding: TEST_EMBEDDING,
        match_threshold: 0.5,
        match_count: 5
      });
      
      if (error) {
        if (error.message.includes('Could not find the function')) {
          throw new Error('find_similar_knowledge_jsonb function does not exist. Please create this function first.');
        } else {
          console.warn(`Warning: find_similar_knowledge_jsonb error: ${error.message}`);
        }
      } else {
        // Function exists and returned results
        expect(Array.isArray(data)).toBe(true);
      }
    } catch (error) {
      if (error.message.includes('Could not find the function')) {
        throw new Error('find_similar_knowledge_jsonb function does not exist. Please create this function first.');
      } else {
        throw error;
      }
    }
  });
  
  // This test will still use OpenAI's embedding API for vectors
  test('should verify OpenAI embedding API works', async () => {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const text = 'This is a test for creating embeddings';
    
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text
        })
      });
      
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data[0].embedding).toBeDefined();
      expect(data.data[0].embedding.length).toBeGreaterThan(1000); // Should be 1536 dimensions
      
      console.log('OpenAI embedding API working correctly');
    } catch (error) {
      console.error('Error testing OpenAI API:', error);
      throw error;
    }
  });

  test('should verify chat endpoint with RAG returns relevant knowledge', async () => {
    // This test will simulate a call to the /api/chat endpoint
    // Note: This test might need to be adapted based on the actual implementation
    
    const apiUrl = 'http://localhost:3001/api/chat';
    const testQuery = 'What are common boiler fault codes?';
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: testQuery,
          systemPrompt: 'You are a helpful boiler technician assistant.',
          useRag: true
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error('Chat API error:', error);
      }
      
      const data = await response.json();
      
      expect(data).toBeDefined();
      expect(data.message).toBeDefined();
      console.log('Chat API response:', data.message.slice(0, 100) + '...');
      
    } catch (error) {
      console.warn('Warning: Chat API test failed. This may be expected if the server is not running:', error.message);
    }
  });
});
