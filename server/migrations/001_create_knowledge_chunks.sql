-- Enable extensions
create extension if not exists vector;
create extension if not exists pgcrypto;

-- Knowledge chunks table for RAG
create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  make text,
  model text,
  system text,
  fault_code text,
  source_type text,
  source_id text,
  source_url text,
  embedding vector(1536) not null,
  created_at timestamptz default now()
);

-- HNSW index for fast ANN search
create index if not exists knowledge_chunks_embedding_hnsw on public.knowledge_chunks using hnsw (embedding vector_cosine_ops);

-- Helper function to perform ANN search with optional filters
create or replace function public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_count int,
  filter jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  make text,
  model text,
  system text,
  fault_code text,
  source_type text,
  source_url text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    kc.id,
    kc.content,
    kc.metadata,
    kc.make,
    kc.model,
    kc.system,
    kc.fault_code,
    kc.source_type,
    kc.source_url,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  where
    (filter ? 'make' is false or kc.make ilike ('%' || filter->>'make' || '%')) and
    (filter ? 'model' is false or kc.model ilike ('%' || filter->>'model' || '%')) and
    (filter ? 'fault_code' is false or kc.fault_code ilike ('%' || filter->>'fault_code' || '%'))
  order by kc.embedding <=> query_embedding
  limit match_count;
end;
$$;
