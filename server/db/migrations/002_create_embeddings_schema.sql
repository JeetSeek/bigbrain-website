-- Migration 002: Create Embeddings Schema
-- This migration creates the embeddings schema for vector search functionality

-- Record this migration in migrations table
INSERT INTO public.migrations (name, applied_at) 
VALUES ('002_create_embeddings_schema.sql', CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Include the setup_embeddings.sql file contents (shortened version for demonstration)
-- Enable the pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgvector;

-- Create a table to store knowledge embeddings with vector similarity search capability
CREATE TABLE IF NOT EXISTS public.knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,                      -- The actual knowledge text
    content_tokens INTEGER,                     -- Token count of the content (for context window planning)
    embedding VECTOR(1536),                     -- OpenAI embedding vector (1536 dimensions)
    metadata JSONB DEFAULT '{}'::jsonb,         -- Flexible metadata for filtering
    tag VARCHAR(100),                           -- Primary classification tag (e.g., 'boiler-maintenance')
    source VARCHAR(255),                        -- Source of the knowledge (e.g., 'user-manual')
    source_url TEXT,                            -- URL of the original source if applicable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE,  -- Track usage for potential pruning
    access_count INTEGER DEFAULT 0,             -- Track how often this embedding is used
    relevance_score FLOAT DEFAULT 0.0,          -- Optional manual override for relevance
    is_active BOOLEAN DEFAULT TRUE              -- Flag to temporarily disable entries
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_metadata ON public.knowledge_embeddings USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_knowledge_tag ON public.knowledge_embeddings(tag);
CREATE INDEX IF NOT EXISTS idx_embedding_vector ON public.knowledge_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100); -- Adjust lists parameter based on table size

-- Enable RLS
ALTER TABLE public.knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access" ON public.knowledge_embeddings
    FOR SELECT
    USING (is_active = TRUE);

CREATE POLICY "Admin full access" ON public.knowledge_embeddings
    FOR ALL
    USING (auth.role() = 'service_role');
