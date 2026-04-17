-- =============================================================================
-- Migration 0004 — Replicate `post-push.sql` + `vector-search.sql` as a
-- proper, version-controlled migration; harden vector search RPCs.
--
-- Why this exists:
--   * `src/db/post-push.sql` and `src/db/vector-search.sql` were previously
--     run-by-hand in the Supabase SQL Editor. There is no machine-checkable
--     evidence they were applied to production (audit/03-database.md §1.1,
--     §10 HIGH item 6, §4). Re-emitting them here makes the deploy idempotent
--     and detectable.
--   * `match_company_embeddings` and `match_job_embeddings` were declared
--     `SECURITY DEFINER` with `p_user_id uuid DEFAULT NULL`. SECURITY DEFINER
--     bypasses RLS, and a NULL user id collapsed the WHERE clause and
--     returned cross-user rows. Audit §3.4 / §10 MEDIUM #14 flag this as a
--     data-leakage vector.
--
-- Hardening applied:
--   1. Enable pgvector (idempotent).
--   2. (Re)create `handle_new_user` trigger so signups always get a profile.
--   3. (Re)create `update_updated_at` and attach to all 16 tables.
--   4. (Re)create HNSW indexes for the three vector columns.
--   5. Drop the old definer RPCs and recreate them as SECURITY INVOKER, with
--      `p_user_id` NOT NULL and an explicit `auth.uid() = p_user_id` guard.
--      RLS on company_embeddings / job_embeddings then becomes the second
--      line of defence rather than the only one.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. pgvector
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 2. Auth signup trigger — auto-create user_profiles row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3. updated_at maintenance trigger + attachments
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_applications_updated_at ON applications;
CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_contacts_updated_at ON contacts;
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_emails_updated_at ON emails;
CREATE TRIGGER trg_emails_updated_at BEFORE UPDATE ON emails FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_interviews_updated_at ON interviews;
CREATE TRIGGER trg_interviews_updated_at BEFORE UPDATE ON interviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER trg_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_outreach_queue_updated_at ON outreach_queue;
CREATE TRIGGER trg_outreach_queue_updated_at BEFORE UPDATE ON outreach_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_notifications_updated_at ON notifications;
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_agent_logs_updated_at ON agent_logs;
CREATE TRIGGER trg_agent_logs_updated_at BEFORE UPDATE ON agent_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_agent_memory_updated_at ON agent_memory;
CREATE TRIGGER trg_agent_memory_updated_at BEFORE UPDATE ON agent_memory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_daily_snapshots_updated_at ON daily_snapshots;
CREATE TRIGGER trg_daily_snapshots_updated_at BEFORE UPDATE ON daily_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_company_embeddings_updated_at ON company_embeddings;
CREATE TRIGGER trg_company_embeddings_updated_at BEFORE UPDATE ON company_embeddings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_job_embeddings_updated_at ON job_embeddings;
CREATE TRIGGER trg_job_embeddings_updated_at BEFORE UPDATE ON job_embeddings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_progression_milestones_updated_at ON progression_milestones;
CREATE TRIGGER trg_progression_milestones_updated_at BEFORE UPDATE ON progression_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 4. HNSW indexes for similarity search (cosine ops match the `<=>` operator
--    used in the RPCs below).
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_agent_memory_embedding
  ON agent_memory
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_company_emb
  ON company_embeddings
  USING hnsw (embedding vector_cosine_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_job_emb
  ON job_embeddings
  USING hnsw (embedding vector_cosine_ops);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 5. Vector search RPCs — SECURITY INVOKER + auth.uid() guard
--
--   `SECURITY INVOKER` makes the function execute as the calling user, so
--   PostgREST + RLS still apply. The explicit
--      IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN ... END IF;
--   prevents a caller from passing a different user's id even if RLS were
--   ever loosened.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS match_company_embeddings(vector(1536), int, float, uuid);
--> statement-breakpoint
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
--> statement-breakpoint

DROP FUNCTION IF EXISTS match_job_embeddings(vector(1536), int, float, uuid);
--> statement-breakpoint
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
--> statement-breakpoint
