-- ================================================================
-- VECTOR SEARCH RPC FUNCTIONS — reference copy
--
-- This file is kept for documentation only. The authoritative source
-- is the drizzle migration:
--   src/db/migrations/0004_post_push_and_secure_rpcs.sql
--
-- The migration is what gets applied to production via drizzle-kit.
-- Edit BOTH files (or only the migration and copy back) when changing
-- RPC signatures.
--
-- Hardening summary (vs. the original SECURITY DEFINER version):
--   * `SECURITY INVOKER` so RLS still applies.
--   * `p_user_id` is required (no DEFAULT NULL).
--   * Function raises if `p_user_id <> auth.uid()` to block cross-user reads.
-- ================================================================

-- Match company embeddings by cosine similarity
CREATE OR REPLACE FUNCTION match_company_embeddings(
  query_embedding vector(1536),
  match_count int,
  match_threshold float,
  p_user_id uuid
)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  content text,
  similarity float,
  company_name text
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'p_user_id must equal auth.uid()';
  END IF;

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
  match_count int,
  match_threshold float,
  p_user_id uuid
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
SECURITY INVOKER
AS $$
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'p_user_id must equal auth.uid()';
  END IF;

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
