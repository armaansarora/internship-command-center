-- ============================================================
-- Phase 1 Migration: The War Room
--
-- HISTORICAL — DO NOT RE-RUN.
--
-- This file was the original out-of-band script that added
-- `position`, `company_name`, `last_activity_at` to the
-- applications table and enabled pgvector. Those columns are now
-- part of the canonical schema (`src/db/schema.ts`) and the
-- pgvector extension is enabled by migration 0004
-- (`src/db/migrations/0004_post_push_and_secure_rpcs.sql`).
--
-- Kept only for archival reference. The `IF NOT EXISTS` guards
-- mean re-running is safe but pointless.
-- ============================================================

-- 1. Add new columns to applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- 2. Add composite index for pipeline queries (Kanban sorting)
CREATE INDEX IF NOT EXISTS idx_apps_user_status_pos 
  ON public.applications (user_id, status, position);

-- 3. Enable pgvector extension (agent memory embeddings)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 4. Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'applications' 
  AND column_name IN ('position', 'company_name', 'last_activity_at')
ORDER BY ordinal_position;
