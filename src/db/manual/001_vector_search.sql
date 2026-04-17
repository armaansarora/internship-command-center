-- ================================================================
-- VECTOR SEARCH RPC FUNCTIONS
-- Run in Supabase SQL Editor after post-push.sql
-- ================================================================

-- Match company embeddings by cosine similarity
CREATE OR REPLACE FUNCTION match_company_embeddings(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.7,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  content text,
  similarity float,
  company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.company_id,
    ce.content,
    1 - (ce.embedding <=> query_embedding) AS similarity,
    c.name AS company_name
  FROM company_embeddings ce
  JOIN companies c ON c.id = ce.company_id
  WHERE ce.user_id = p_user_id
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Match job embeddings by cosine similarity
CREATE OR REPLACE FUNCTION match_job_embeddings(
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.7,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  application_id uuid,
  content text,
  similarity float,
  role text,
  company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    je.id,
    je.application_id,
    je.content,
    1 - (je.embedding <=> query_embedding) AS similarity,
    a.role,
    a.company_name
  FROM job_embeddings je
  JOIN applications a ON a.id = je.application_id
  WHERE je.user_id = p_user_id
    AND 1 - (je.embedding <=> query_embedding) > match_threshold
  ORDER BY je.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
