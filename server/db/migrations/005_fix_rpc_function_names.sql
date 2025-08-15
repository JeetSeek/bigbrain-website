-- Migration 005: Fix RPC Function Names
-- This migration adds a wrapper function to fix name mismatch in the RAG system

-- Record this migration in migrations table
INSERT INTO public.migrations (name, applied_at) 
VALUES ('005_fix_rpc_function_names.sql', CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Create a wrapper function for find_similar_documents that uses the name expected by the backend
CREATE OR REPLACE FUNCTION find_similar_knowledge(
    query_embedding VECTOR,
    match_threshold FLOAT,
    match_count INT,
    filter_tag TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT,
    tag VARCHAR(100),
    source VARCHAR(255),
    metadata JSONB
)
LANGUAGE SQL
AS $$
    -- Simply call the existing function with the same parameters
    SELECT * FROM find_similar_documents(
        query_embedding,
        match_threshold,
        match_count,
        filter_tag
    );
$$;

-- Add comment to document the wrapper function
COMMENT ON FUNCTION find_similar_knowledge IS 'Wrapper for find_similar_documents to maintain API compatibility with backend code';
