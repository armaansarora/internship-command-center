-- ============================================================
-- Phase 1 Migration: The War Room
-- Run this in Supabase SQL Editor (Dashboard > SQL > New Query)
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
