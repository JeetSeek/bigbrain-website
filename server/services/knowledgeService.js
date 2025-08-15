/**
 * Knowledge Service
 * 
 * Provides a comprehensive interface for knowledge management:
 * - Creates and manages embeddings
 * - Performs vector similarity search
 * - Manages knowledge content lifecycle
 */

import { OpenAI } from 'openai'; 
import db from '../db/dataAccess.js';
import secretsManager from '../utils/secretsManager.js';
import { v4 as uuidv4 } from 'uuid';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: secretsManager.apiKeys.getOpenAIKey(),
});

/**
 * Create embeddings for text content
 * @param {string} text - Text to generate embeddings for
 * @returns {Promise<number[]>} - Vector embedding
 */
async function createEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
      encoding_format: "float",
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw new Error(`Failed to create embedding: ${error.message}`);
  }
}

/**
 * Estimate token count for a piece of content
 * Very rough approximation: 1 token ≈ 4 chars in English
 * @param {string} text - Text to estimate tokens for
 * @returns {number} - Estimated token count
 */
function estimateTokenCount(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Add knowledge item to the database with embeddings
 * @param {Object} knowledgeItem - The knowledge content to add
 * @returns {Promise<Object>} - Created knowledge item
 */
async function addKnowledgeItem(knowledgeItem) {
  // Validate required fields
  if (!knowledgeItem.content) {
    throw new Error('Knowledge content is required');
  }
  
  try {
    // Create embedding for the knowledge content
    const embedding = await createEmbedding(knowledgeItem.content);
    
    // Estimate token count
    const contentTokens = estimateTokenCount(knowledgeItem.content);
    
    // Prepare data for insertion
    const knowledgeData = {
      id: knowledgeItem.id || uuidv4(),
      content: knowledgeItem.content,
      content_tokens: contentTokens,
      embedding,
      tag: knowledgeItem.tag || 'general',
      source: knowledgeItem.source || 'manual-entry',
      source_url: knowledgeItem.source_url,
      metadata: knowledgeItem.metadata || {},
      relevance_score: knowledgeItem.relevance_score || 0.0,
    };
    
    // Insert into database
    const { data, error } = await db.create('knowledge_embeddings', knowledgeData);
    
    if (error) {
      console.error('Error adding knowledge item:', error);
      throw new Error(`Failed to add knowledge item: ${error.message}`);
    }
    
    return data[0];
  } catch (error) {
    console.error('Error in addKnowledgeItem:', error);
    throw error;
  }
}

/**
 * Search for relevant knowledge based on a query
 * @param {string} query - The query text to search for
 * @param {Object} options - Search options (threshold, count, filters)
 * @returns {Promise<Array>} - Matching knowledge items
 */
async function searchKnowledge(query, options = {}) {
  try {
    // Create embedding for the query
    const embedding = await createEmbedding(query);
    
    // Default search options
    const searchOptions = {
      matchThreshold: options.threshold || 0.7,
      matchCount: options.limit || 5,
      filterTag: options.tag || null,
    };
    
    // Perform vector search
    const { data, error } = await db.vectorSearch(embedding, searchOptions);
    
    if (error) {
      console.error('Error searching knowledge:', error);
      throw new Error(`Failed to search knowledge: ${error.message}`);
    }
    
    // Add search query to embedding access log if results are found
    if (data && data.length > 0) {
      // Log the top match for analytics
      const topMatch = data[0];
      await db.create('embedding_access_log', {
        embedding_id: topMatch.id,
        query: query,
        similarity_score: topMatch.similarity,
        session_id: options.sessionId || uuidv4(),
      }, { cache: false });
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in searchKnowledge:', error);
    throw error;
  }
}

/**
 * Update a knowledge item
 * @param {string} id - ID of the knowledge item to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated knowledge item
 */
async function updateKnowledgeItem(id, updates) {
  try {
    // If content is updated, recreate embedding
    if (updates.content) {
      updates.embedding = await createEmbedding(updates.content);
      updates.content_tokens = estimateTokenCount(updates.content);
      updates.updated_at = new Date();
    }
    
    const { data, error } = await db.update('knowledge_embeddings', id, updates);
    
    if (error) {
      console.error('Error updating knowledge item:', error);
      throw new Error(`Failed to update knowledge item: ${error.message}`);
    }
    
    return data[0];
  } catch (error) {
    console.error('Error in updateKnowledgeItem:', error);
    throw error;
  }
}

/**
 * Get knowledge item by ID
 * @param {string} id - Knowledge item ID
 * @returns {Promise<Object>} - Knowledge item
 */
async function getKnowledgeItem(id) {
  try {
    const { data, error } = await db.getById('knowledge_embeddings', id);
    
    if (error) {
      console.error('Error getting knowledge item:', error);
      throw new Error(`Failed to get knowledge item: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error in getKnowledgeItem:', error);
    throw error;
  }
}

/**
 * Deactivate a knowledge item (soft delete)
 * @param {string} id - Knowledge item ID
 * @returns {Promise<boolean>} - Success status
 */
async function deactivateKnowledgeItem(id) {
  try {
    const { data, error } = await db.update('knowledge_embeddings', id, {
      is_active: false,
    });
    
    if (error) {
      console.error('Error deactivating knowledge item:', error);
      throw new Error(`Failed to deactivate knowledge item: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in deactivateKnowledgeItem:', error);
    throw error;
  }
}

/**
 * Hard delete a knowledge item
 * @param {string} id - Knowledge item ID
 * @returns {Promise<boolean>} - Success status
 */
async function deleteKnowledgeItem(id) {
  try {
    const { error } = await db.delete('knowledge_embeddings', id);
    
    if (error) {
      console.error('Error deleting knowledge item:', error);
      throw new Error(`Failed to delete knowledge item: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteKnowledgeItem:', error);
    throw error;
  }
}

/**
 * Get knowledge statistics
 * @returns {Promise<Object>} - Knowledge statistics
 */
async function getKnowledgeStats() {
  try {
    const { data, error } = await db.query(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE is_active = true) as active_items,
        AVG(content_tokens) as avg_tokens,
        SUM(content_tokens) as total_tokens,
        COUNT(DISTINCT tag) as unique_tags,
        MAX(updated_at) as last_updated
      FROM knowledge_embeddings
    `);
    
    if (error) {
      console.error('Error getting knowledge stats:', error);
      throw new Error(`Failed to get knowledge stats: ${error.message}`);
    }
    
    return data[0];
  } catch (error) {
    console.error('Error in getKnowledgeStats:', error);
    throw error;
  }
}

export default {
  addKnowledgeItem,
  searchKnowledge,
  updateKnowledgeItem,
  getKnowledgeItem,
  deactivateKnowledgeItem,
  deleteKnowledgeItem,
  getKnowledgeStats,
  createEmbedding
};
