-- =============================================================================
-- Migration 0041 — Security-advisor RPC hardening
--
-- The Supabase security advisor flagged four SECURITY DEFINER functions as
-- EXECUTE-able by the `anon` / `authenticated` roles. SECURITY DEFINER runs
-- with the function OWNER's privileges, so a definer function reachable by an
-- untrusted role is a privilege-escalation surface unless it either (a) is
-- never meant to be called directly by a client, or (b) guards on auth.uid()
-- internally.
--
-- Each flagged object was resolved per a caller investigation — every
-- `.rpc("<name>")` call site and trigger usage in the application code was
-- traced (see overnight-backlog-report.html for the full findings):
--
--   handle_new_user()                  — TRIGGER-ONLY (on_auth_user_created on
--     auth.users). No application code calls it directly. REVOKE all client
--     EXECUTE. Trigger execution does NOT require the EXECUTE privilege, so
--     signup is unaffected. Stays SECURITY DEFINER (it must insert into
--     public.user_profiles during signup, bypassing RLS).
--
--   consume_ai_call_quota(uuid,integer) — SERVICE-ROLE ONLY. The sole caller
--     (src/lib/ai/quota.ts) uses the admin / service-role client. Migration
--     0023 already revoked PUBLIC and granted service_role; this idempotently
--     re-asserts the revoke from anon + authenticated so the posture is
--     explicit in history and the advisor clears.
--
--   bump_match_rate_limit(uuid,timestamptz,int) — REAL AUTHENTICATED CALLER.
--     src/lib/networking/rate-limit.ts calls it under the user's OWN session
--     (the session-bound client, NOT the admin client) via the
--     match-candidates route, always passing the session user's own id. So we
--     KEEP the grant to `authenticated` and instead add an internal auth.uid()
--     guard (mirroring migrations 0004 and 0040) so a caller can never bump
--     another user's counter even though the function is SECURITY DEFINER.
--
--   rls_auto_enable                    — NOT defined in this repo (no
--     migration, no caller, signature unknown). Deliberately NOT touched here:
--     a REVOKE against a function whose exact signature is unknown risks an
--     erroring migration. Flagged in overnight-backlog-report.html for the
--     owner to inspect and REVOKE via the dashboard.
--
--   comp_bands_budget (table)          — confirmed SERVICE-ROLE ONLY (RLS
--     deny-all from migration 0020 + REVOKE from migration 0033; the only
--     accessors, src/lib/comp-bands/budget.ts, require the admin client). No
--     change needed; recorded here for completeness.
--
-- All statements are idempotent and reversible. Rollback SQL is inline beneath
-- each section. No data change. Safe to re-run.
-- =============================================================================

-- ─────────────────────────── handle_new_user ───────────────────────────────
-- Trigger-only. Revoke direct EXECUTE from every client-facing role + PUBLIC.
-- The on_auth_user_created trigger still fires regardless: trigger execution
-- is governed by the trigger, not by the caller's EXECUTE privilege.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
--> statement-breakpoint
-- Rollback (NOT recommended — re-opens a definer trigger fn to direct calls):
--   GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC;

-- ─────────────────────── consume_ai_call_quota ─────────────────────────────
-- Service-role only (granted in 0023). Idempotently re-assert the revoke from
-- the client roles so production matches intent and the advisor clears.
-- service_role retains EXECUTE from migration 0023.
REVOKE EXECUTE ON FUNCTION public.consume_ai_call_quota(uuid, integer) FROM anon;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.consume_ai_call_quota(uuid, integer) FROM authenticated;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.consume_ai_call_quota(uuid, integer) FROM PUBLIC;
--> statement-breakpoint
-- Rollback (NOT recommended — re-opens the quota RPC to clients):
--   GRANT EXECUTE ON FUNCTION public.consume_ai_call_quota(uuid, integer) TO authenticated;

-- ─────────────────────── bump_match_rate_limit ─────────────────────────────
-- Real authenticated caller (match-candidates route, session-bound client).
-- KEEP the grant to `authenticated`; add an internal auth.uid() guard so this
-- SECURITY DEFINER function can never bump a different user's counter. This
-- mirrors the guard pattern in migration 0004 (vector RPCs) and 0040
-- (increment_memory_access). Behaviour for legitimate calls is unchanged: the
-- route always passes the session user's own id, which already equals
-- auth.uid().
CREATE OR REPLACE FUNCTION bump_match_rate_limit(
  p_user_id uuid,
  p_bucket timestamptz,
  p_limit int
)
RETURNS TABLE(allowed boolean, count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur int;
BEGIN
  -- Defence-in-depth: a SECURITY DEFINER function bypasses RLS, so guard that
  -- the caller can only ever bump their OWN counter row.
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'p_user_id must equal auth.uid()';
  END IF;

  INSERT INTO match_rate_limits (user_id, hour_bucket, count)
  VALUES (p_user_id, p_bucket, 1)
  ON CONFLICT (user_id, hour_bucket)
  DO UPDATE SET count = match_rate_limits.count + 1
  RETURNING match_rate_limits.count INTO cur;

  allowed := cur <= p_limit;
  count := cur;
  RETURN NEXT;
END;
$$;
--> statement-breakpoint

GRANT EXECUTE ON FUNCTION bump_match_rate_limit(uuid, timestamptz, int)
  TO authenticated;
--> statement-breakpoint
-- Rollback — restore the original (unguarded) body from migration 0022:
--   CREATE OR REPLACE FUNCTION bump_match_rate_limit(
--     p_user_id uuid, p_bucket timestamptz, p_limit int
--   ) RETURNS TABLE(allowed boolean, count int)
--   LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
--   DECLARE cur int;
--   BEGIN
--     INSERT INTO match_rate_limits (user_id, hour_bucket, count)
--     VALUES (p_user_id, p_bucket, 1)
--     ON CONFLICT (user_id, hour_bucket)
--     DO UPDATE SET count = match_rate_limits.count + 1
--     RETURNING match_rate_limits.count INTO cur;
--     allowed := cur <= p_limit; count := cur; RETURN NEXT;
--   END; $$;
--   GRANT EXECUTE ON FUNCTION bump_match_rate_limit(uuid, timestamptz, int) TO authenticated;
