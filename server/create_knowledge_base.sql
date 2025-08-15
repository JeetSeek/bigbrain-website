-- Enable the pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the knowledge_base table for RAG functionality
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI embeddings are 1536 dimensions
  tag TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster vector similarity searches
CREATE INDEX ON public.knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create a function for similarity search
CREATE OR REPLACE FUNCTION find_similar_knowledge(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  filter_tag TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  tag TEXT,
  source TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.content,
    k.tag,
    k.source,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM knowledge_base k
  WHERE
    (filter_tag IS NULL OR k.tag = filter_tag)
    AND 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
