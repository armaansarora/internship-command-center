-- 0031_perf_indexes.sql
-- Architect performance pass — composite indexes for two high-frequency
-- query shapes the existing index set does not cover.
--
-- 1. (user_id, applied_at)
--    Used by:
--      - getApplicationGauntletStats() in applications-rest.ts — the
--        authenticated layout fires this on every floor render to decide
--        whether the Observatory floor button is enabled. The query is
--        `select applied_at, created_at from applications
--           where user_id = $1
--           order by applied_at asc nulls last limit 1`
--        — without an index on `(user_id, applied_at)`, Postgres falls
--        back to a Bitmap Heap Scan on idx_apps_user_status (or worse, a
--        full user-scoped sort) every render.
--      - loadFirstApplicationByUser() in operations-rest.ts — the admin
--        Operations floor scans `applied_at asc` across N users. Same
--        index pays off when the planner can use a backward index
--        traversal per user.
--
--    The composite is `(user_id, applied_at NULLS LAST)` so the
--    Tower's gauntlet read (which fakes nulls-last via
--    `.order("applied_at", { ascending: true, nullsFirst: false })`)
--    can use an index-only scan.
--
-- 2. (user_id, status) on applications WHERE status = 'accepted' [PARTIAL]
--    Used by the Observatory floor's `hasOfferEverFired` check pre-fold-in.
--    The fold-in (this same patch removes the second REST call), so this
--    second index is redundant. Listed here intentionally to document the
--    decision: we did NOT add it.
--
-- All operations are `CREATE INDEX IF NOT EXISTS` — safe to apply multiple
-- times. The new index is `CONCURRENTLY` so it doesn't block writes on
-- production, BUT Drizzle migration runners that wrap statements in a
-- transaction will reject `CONCURRENTLY`. Supabase's SQL editor and
-- `psql -1` do NOT auto-wrap, so this file is safe there. If applied via
-- `drizzle-kit push`, drop the keyword and accept the brief lock on the
-- `applications` table (small table — millisecond-scale lock).
--
-- Privileges: no policy/role changes — indexes inherit table grants.

create index concurrently if not exists idx_apps_user_applied_at
    on public.applications (user_id, applied_at nulls last);

-- Re-analyze so the planner picks up the new index immediately. ANALYZE
-- is non-blocking and idempotent.
analyze public.applications;
