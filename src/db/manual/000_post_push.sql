-- ================================================================
-- POST-PUSH SQL — reference copy
--
-- This file is kept for documentation/manual-recovery only. The
-- authoritative source is the drizzle migration:
--   src/db/migrations/0004_post_push_and_secure_rpcs.sql
--
-- That migration is what gets applied to production via drizzle-kit.
-- Edit BOTH files (or only the migration and copy back here) when
-- changing the auth/updated_at triggers or the HNSW indexes.
-- ================================================================

-- 1. Enable pgvector (required for agent_memory, company_embeddings, job_embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Auto-create user_profiles row when a new user signs up via Supabase Auth
--    This is CRITICAL: without it, auth works but profile queries return null.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires after each new signup in auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Auto-update updated_at timestamp on any row modification
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with timestamps
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_emails_updated_at BEFORE UPDATE ON emails FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_interviews_updated_at BEFORE UPDATE ON interviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_calendar_events_updated_at BEFORE UPDATE ON calendar_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_outreach_queue_updated_at BEFORE UPDATE ON outreach_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_agent_logs_updated_at BEFORE UPDATE ON agent_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_agent_memory_updated_at BEFORE UPDATE ON agent_memory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_daily_snapshots_updated_at BEFORE UPDATE ON daily_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_company_embeddings_updated_at BEFORE UPDATE ON company_embeddings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_job_embeddings_updated_at BEFORE UPDATE ON job_embeddings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_progression_milestones_updated_at BEFORE UPDATE ON progression_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. HNSW vector indexes for similarity search
CREATE INDEX IF NOT EXISTS idx_agent_memory_embedding ON agent_memory
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_company_emb ON company_embeddings
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_job_emb ON job_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- 5. Guard sensitive billing/auth columns from direct client-side updates
--    (service role writes are still allowed for Stripe webhooks and OAuth handlers)
CREATE OR REPLACE FUNCTION public.guard_user_profile_sensitive_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
      RAISE EXCEPTION 'subscription_tier is managed by billing workflows';
    END IF;

    IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
      RAISE EXCEPTION 'stripe_customer_id is managed by billing workflows';
    END IF;

    IF NEW.google_tokens IS DISTINCT FROM OLD.google_tokens THEN
      RAISE EXCEPTION 'google_tokens are managed by OAuth handlers';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_user_profiles_sensitive ON user_profiles;
CREATE TRIGGER trg_guard_user_profiles_sensitive
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_profile_sensitive_fields();
