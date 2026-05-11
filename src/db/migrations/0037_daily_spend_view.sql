-- 0037_daily_spend_view.sql
-- Lighthouse SpendBrake — global per-day Anthropic spend rollup.
--
-- Why this view exists
-- --------------------
-- The per-user AI quota in `consume_ai_call_quota` (see migration 0023) caps
-- each user at N calls/day. That is enough to bound a single abuser, but it
-- is NOT enough to bound the *aggregate* daily bill. A free-tier flash flood
-- (one viral tweet, hundreds of new signups in an hour) can multiply per-user
-- caps into a four-figure overnight Anthropic invoice before any human notices.
--
-- This view is the read surface for the global SpendBrake: it sums every
-- `cost_cents` row in `agent_logs` for the current UTC day and exposes it as
-- a single scalar the brake can compare to a dollar cap. The brake fires the
-- moment the day's bill crosses `KILL_AI_SPEND_USD`, and from that moment
-- forward `consumeAiQuota` returns `allowed: false, reason: "global_spend_cap"`
-- for every non-owner caller. The brake auto-releases at UTC midnight when
-- the day's rollup resets.
--
-- Strategy
-- --------
-- 1. `date_trunc('day', created_at AT TIME ZONE 'UTC')::date` groups every log
--    into a UTC day bucket. We pick UTC over the user's local timezone so the
--    cap is a single global threshold (otherwise a Pacific-coast user could
--    "extend the day" by 7 hours).
-- 2. `SUM(cost_cents)` aggregates the day. `agent_logs.cost_cents` is a
--    `numeric(10, 2)` populated by `recordAgentRun` in
--    `src/lib/ai/telemetry.ts`. NULLs are skipped by SUM, so partial rows
--    (failed calls that never recorded a cost) do not penalize the rollup.
-- 3. `COALESCE(..., 0)` keeps the column non-null when the only rows for the
--    day all have NULL cost_cents (e.g. brake-fired telemetry rows that
--    record `cost_cents = 0` already, but defensive in case the future adds
--    NULL-cost rows).
--
-- Security posture
-- ----------------
-- VIEWs in Postgres run under `security_invoker = off` by default, which
-- means the view inherits the *creator's* (postgres) privileges, not the
-- caller's. Combined with the explicit `REVOKE ALL ... FROM anon,
-- authenticated` below, the only role that can read this view is
-- service_role — i.e. the spend-brake helper inside server-side Node
-- handlers. Authenticated clients cannot poll the daily bill and infer how
-- close The Tower is to its kill-switch.
--
-- Idempotent: `CREATE OR REPLACE VIEW` is safe to re-run.
--
-- Rollback:
--   DROP VIEW IF EXISTS public.v_daily_ai_spend_cents;

CREATE OR REPLACE VIEW public.v_daily_ai_spend_cents AS
SELECT
    date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS day,
    COALESCE(SUM(cost_cents), 0)::numeric(14, 2)            AS total_cost_cents
FROM public.agent_logs
WHERE cost_cents IS NOT NULL
GROUP BY 1;

COMMENT ON VIEW public.v_daily_ai_spend_cents IS
    'SpendBrake rollup — sum of agent_logs.cost_cents per UTC day. Read by '
    'src/lib/ai/spend-brake.ts. Service-role only; do not GRANT to clients.';

REVOKE ALL ON public.v_daily_ai_spend_cents FROM anon;
REVOKE ALL ON public.v_daily_ai_spend_cents FROM authenticated;
GRANT SELECT ON public.v_daily_ai_spend_cents TO service_role;
