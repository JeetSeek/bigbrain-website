# BoilerBrain RAG Improvement Roadmap

## Executive Summary

This document outlines a concrete plan to enhance the BoilerBrain's Retrieval Augmented Generation (RAG) system. The improvements are structured into short-term fixes (1-2 weeks), medium-term enhancements (1-2 months), and long-term strategic improvements (3+ months). Implementation of these changes will lead to more accurate responses, improved engineer experience, and reduced operational costs.

## Current System Assessment

### Strengths
- Well-structured knowledge base with manufacturer-specific fault codes
- Efficient vector search implementation with embedding generation
- Good system prompting strategy with clear persona definition
- Effective function calling for retrieving specific knowledge

### Pain Points
1. **Failing RAG validation tests** that need environmental fixes
2. **Limited knowledge base** covering only major manufacturers
3. **Static knowledge retrieval** that doesn't adapt to user feedback
4. **Regex-based information extraction** that's brittle and error-prone
5. **Lack of multilingual support** for international engineers
6. **Basic conversation summarization** that may lose important context

## Short-Term Improvements (1-2 Weeks)

### 1. Fix RAG Validation Tests

**Problem:** Tests fail due to missing environment variables and configuration issues.

**Solution:**
```javascript
// Create a .env.test file with mock credentials
const mockEnv = {
  SUPABASE_URL: 'https://mock-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role-key',
  OPENAI_API_KEY: 'mock-openai-key'
};

// Modify the test setup to use mock/spy objects for Supabase and OpenAI calls
jest.mock('../supabaseClient.js', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnValue({ error: null }),
      select: jest.fn().mockReturnValue({ data: [], error: null }),
      delete: jest.fn().mockReturnValue({ error: null })
    })),
    rpc: jest.fn().mockReturnValue({ error: null })
  }
}));
```

### 2. Implement Hybrid Search

**Problem:** Current vector search may miss relevant results with different terminology.

**Solution:**
```javascript
// Implement hybrid search that combines BM25 keyword matching with vector similarity
async function hybridSearch(query, tag = null) {
  // Get vector results
  const vectorResults = await findRelevantKnowledge(query, tag);
  
  // Get keyword results using simple term matching
  const keywordMatches = await keywordSearch(query, tag);
  
  // Combine and deduplicate results, with configurable weights
  return mergeSearchResults(vectorResults, keywordMatches, {
    vectorWeight: 0.7,
    keywordWeight: 0.3
  });
}
```

### 3. Improve Knowledge Extraction

**Problem:** Basic regex patterns miss many variations of boiler information.

**Solution:**
```javascript
// Replace simple regex patterns with more sophisticated pattern matching
const ENHANCED_PATTERNS = {
  MANUFACTURER: /\b(worcester|bosch|vaillant|baxi|ideal|glow\s*worm|potterton|viessmann|ariston|navien|alpha|ferroli|atag|johnson\s*&\s*starley|biasi|heatline|vokera|main|ravenheat|chaffoteaux|gledhill)\b/gi,
  // Add more comprehensive patterns for models, including new formats
  MODEL: /\b([a-z][0-9]{1,3}|[a-z0-9]+-[a-z0-9]+|ecomax|ecotec|logic|vogue|combi|system|greenstar|i\d+|cdi|si|ri|hi|fit|compact|system\s+s|combi\s+erp)\b/gi,
  // Add fuzzy matching for fault codes with various formats
  FAULT_CODES: [
    /\b([a-z][0-9]{1,2}|[a-z]\.?[0-9]{1,2})\b/gi,
    /fault(?:\s+code)?\s+([a-z0-9][a-z0-9\.\-]{1,6})/gi,
    /error(?:\s+code)?\s+([a-z0-9][a-z0-9\.\-]{1,6})/gi,
    /\b(f\d+|e\d+|h\d+)\b/gi // Common short codes
  ],
};
```

## Medium-Term Improvements (1-2 Months)

### 1. Implement Knowledge Contribution System

**Problem:** Knowledge base is static and doesn't grow with engineer experiences.

**Solution:**
- Create API endpoint for engineers to submit new fault codes/solutions
- Implement admin review interface for validating submissions
- Add automatic embedding generation for approved contributions
- Update vector database with new knowledge
- Implement feedback collection on chat responses

### 2. Enhanced Contextual Memory

**Problem:** Basic conversation summarization loses important details.

**Solution:**
```javascript
// Implement hierarchical conversation memory with variable retention
const conversationMemory = {
  // Critical information that should never be lost in summaries
  criticalContext: {
    manufacturer: null,
    model: null, 
    faultCodes: [],
    confirmedSymptoms: []
  },
  
  // Recent messages stored verbatim (last 8-10 exchanges)
  shortTermMemory: [],
  
  // Summarized older exchanges with focus on diagnostic path
  longTermMemory: [],
  
  // Update and maintain memory
  updateMemory(newMessage) {
    // Extract and update critical information
    this.updateCriticalContext(newMessage);
    
    // Manage sliding window of short-term memory
    this.shortTermMemory.push(newMessage);
    if (this.shortTermMemory.length > 10) {
      const oldestMessage = this.shortTermMemory.shift();
      this.summarizeIntoLongTerm(oldestMessage);
    }
  }
};
```

### 3. Implement Chunk Refinement for Knowledge Base

**Problem:** Knowledge snippets may be too large or imprecisely chunked.

**Solution:**
- Implement semantic chunking instead of fixed-size chunks
- Develop chunk refinement process:
  1. Split documents by semantic units (sections, topics)
  2. Generate meaningful chunk titles
  3. Create overlapping chunks for better context preservation
  4. Store metadata about chunk relationships

## Long-Term Strategic Improvements (3+ Months)

### 1. Fine-Tuned Domain-Specific Model

**Problem:** General LLMs may not have deep knowledge of HVAC terminology and processes.

**Solution:**
- Collect domain-specific training data from:
  - Manufacturer service manuals
  - Engineer troubleshooting logs
  - Anonymized successful chat interactions
- Fine-tune a smaller open-source model (e.g., Llama 3) on this data
- Build evaluation framework to compare with current approach

### 2. Multi-modal Support for Visual Diagnostics

**Problem:** Engineers often need to interpret visual cues (displays, components).

**Solution:**
- Add image upload capability to chat interface
- Implement vision model for analyzing:
  - Display readings and error codes
  - Component identification
  - Wiring and connection issues
- Connect visual analysis with text-based troubleshooting

### 3. Personalized Retrieval Based on Engineer Expertise

**Problem:** All engineers receive same level of detail regardless of expertise.

**Solution:**
- Build engineer profiling system tracking:
  - Areas of expertise (manufacturers, systems)
  - Experience level
  - Previous interactions and feedback
- Implement adaptive retrieval that considers engineer profile
- Adjust response detail and terminology to match expertise level

## Implementation Priority Matrix

| Improvement | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| Fix RAG tests | Medium | Low | 1 |
| Hybrid search | High | Medium | 2 |
| Improve knowledge extraction | High | Low | 3 |
| Knowledge contribution | Medium | High | 4 |
| Enhanced contextual memory | High | Medium | 5 |
| Chunk refinement | Medium | Medium | 6 |
| Fine-tuned model | High | High | 7 |
| Multi-modal support | High | High | 8 |
| Personalized retrieval | Medium | High | 9 |

## Next Steps

1. **Immediate:** Fix RAG validation tests using mocking approach outlined
2. **This Sprint:** Implement hybrid search and improved knowledge extraction patterns
3. **Next Sprint:** Begin development of knowledge contribution system
4. **Planning:** Schedule technical discovery for model fine-tuning approach

## Appendix: SQL Migrations

### Improve Vector Search Function

```sql
-- Migration: 001_improve_vector_search.sql

-- Add weighted hybrid search function
CREATE OR REPLACE FUNCTION hybrid_search_knowledge(
  query_text TEXT,
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  tag TEXT DEFAULT NULL,
  keyword_weight FLOAT DEFAULT 0.3,
  vector_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT,
  tag TEXT,
  source TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_matches AS (
    SELECT
      id,
      content,
      1 - (embedding <=> query_embedding) as similarity,
      tag,
      source
    FROM knowledge_embeddings
    WHERE 
      is_active = true
      AND (tag = hybrid_search_knowledge.tag OR hybrid_search_knowledge.tag IS NULL)
      AND 1 - (embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count
  ),
  keyword_matches AS (
    SELECT
      id,
      content,
      ts_rank(to_tsvector('english', content), plainto_tsquery('english', query_text)) as keyword_score,
      tag,
      source
    FROM knowledge_embeddings
    WHERE 
      is_active = true
      AND (tag = hybrid_search_knowledge.tag OR hybrid_search_knowledge.tag IS NULL)
      AND content ILIKE '%' || query_text || '%'
    ORDER BY keyword_score DESC
    LIMIT match_count
  ),
  combined_matches AS (
    SELECT
      id,
      content,
      (similarity * vector_weight) + (COALESCE(keyword_score, 0) * keyword_weight) as weighted_score,
      tag,
      source
    FROM vector_matches
    LEFT JOIN keyword_matches USING (id)
    
    UNION
    
    SELECT
      id,
      content,
      (COALESCE(similarity, 0) * vector_weight) + (keyword_score * keyword_weight) as weighted_score,
      tag,
      source
    FROM keyword_matches
    LEFT JOIN vector_matches USING (id)
    WHERE id NOT IN (SELECT id FROM vector_matches)
  )
  SELECT
    id,
    content,
    weighted_score as similarity,
    tag,
    source
  FROM combined_matches
  ORDER BY weighted_score DESC
  LIMIT match_count;
END;
$$;
```
