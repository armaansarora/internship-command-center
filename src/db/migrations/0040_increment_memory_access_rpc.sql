-- =============================================================================
-- Migration 0040 — atomic agent_memory access-count increment RPC
--
-- `getAgentMemories` previously bumped `access_count` by firing N parallel
-- read-modify-write UPDATEs (one per retrieved row) on every chat retrieval:
--   * an N+1 round-trip fan-out on a hot path, and
--   * a lost-update race — two concurrent retrievals both read count = k and
--     both write k + 1, losing an increment.
--
-- This RPC collapses the N updates into ONE atomic statement that increments
-- inside the database (`access_count = access_count + 1`), removing both the
-- fan-out and the race.
--
-- Security model mirrors migration 0004's hardened vector RPCs: SECURITY
-- INVOKER keeps RLS as the primary line of defence, and the explicit
-- `auth.uid()` guard + `WHERE user_id = p_user_id` is defence-in-depth so a
-- caller can never bump another user's rows even if RLS were ever loosened.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.increment_memory_access(
  p_ids uuid[],
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'p_user_id must equal auth.uid()';
  END IF;

  UPDATE public.agent_memory
  SET access_count = access_count + 1,
      last_accessed_at = now()
  WHERE id = ANY(p_ids)
    AND user_id = p_user_id;
END;
$$;
--> statement-breakpoint

GRANT EXECUTE ON FUNCTION public.increment_memory_access(uuid[], uuid) TO authenticated;
