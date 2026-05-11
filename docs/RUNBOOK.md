# On-Call Runbook

This runbook is the single page on-call (today: the founder) needs when a
Sentry alert fires. Each section maps 1:1 to an entry in
[`sentry/alerts.yaml`](../sentry/alerts.yaml). Anchors are load-bearing —
the validator (`scripts/validate-sentry-alerts.ts`) asserts that every alert
`runbook` field points to an anchor that exists in this file.

If you are reading this because an alert fired: scroll to the matching
section, run the verification steps, then take the smallest mitigation that
restores service. Escalation is rarely needed for these three; they are
designed to be diagnosable and reversible by a single operator.

---

## applying-alerts-to-sentry

Sentry alert rules are not provisioned automatically. To apply (or re-apply)
the rules in `sentry/alerts.yaml`:

1. Sign in to the project's Sentry org.
2. Navigate to **Alerts → Create Alert → Issue Alert**.
3. For each entry in `sentry/alerts.yaml`, create one alert with:
   - **Name** = `name`
   - **Filter (Tags)** = the `event` tag set by `log.error`/`log.warn`
     (from `src/lib/logger.ts`). The alert query format is
     `tags.event:<value>`.
   - **When** = `<comparator>` `<threshold>` events in the last
     `<window_minutes>` minutes.
   - **Action** = "Send a notification to (Owner email)". Slack/PagerDuty
     are optional — wire them only if configured in the workspace.
4. After creating, paste the Sentry alert URL into the corresponding section
   below (under "Sentry alert link") so future on-call can jump directly.

We deliberately keep this manual: the alert rules are part of the on-call
contract, and provisioning them via API risks silent drift between the YAML
and reality. The YAML is the contract; the dashboard is the runtime.

---

## agent_stream_failures

**What it means.** The Vercel AI SDK `streamText()` call inside
`createAgentRouteHandler` raised before the upstream LLM started streaming —
i.e. an agent route (`/api/{ceo,cro,cfo,cio,cmo,cno,coo,cpo}`) handed the
client a 500 with `{ "error": "Agent streaming failed" }`. Source:
`src/lib/ai/agents/shared-route-handler.ts` → `log.error("agent.stream_failed", ...)`.

**Likely causes.**
- AI Gateway / Anthropic upstream incident (rate limit, 5xx, model deprecation).
- Misconfigured provider credentials (`ANTHROPIC_API_KEY` rotated without
  redeploy, `AI_GATEWAY_API_KEY` revoked).
- A bad prompt-cache header or invalid `cacheControl` shape introduced in a
  recent deploy (every C-suite route runs through the same factory, so the
  burst will hit *all* agents).
- Anthropic SDK incompatibility after a dependency bump.

**Verification steps.**
- Sentry: filter `event:agent.stream_failed` for the last 15 min — check
  whether it's one agent (`tags.agent:<key>`) or all of them.
- `curl -i https://www.interntower.com/api/admin/sentry-probe` (owner-only)
  to confirm the path is reachable at all.
- Anthropic status: <https://status.anthropic.com/> + Vercel AI Gateway
  dashboard if AI Gateway is enabled.
- Vercel logs: `vercel logs --since 30m | grep agent.stream_failed` — the
  serialised `error.message` will name the upstream cause.

**Rollback / mitigation.**
- If it's all agents and started after a deploy: revert the latest deploy in
  Vercel (Promote previous → Production).
- If it's upstream: nothing to do but wait. The route returns 503 if no
  provider is configured, otherwise 500 — both are correct user-facing
  states.
- If it's credentials: rotate the missing env var in Vercel and redeploy.
  No code change needed.

**Escalation.** Don't wake anyone. The Watchdog cron already reports cron
breakage to the owner; chat outages are visible from the dashboard. If the
incident persists past 30 min and revenue surfaces (Stripe checkout, sign-up)
are also affected, then it's no longer a SentryRules alert — it's a full
outage and the owner should already be on it.

---

## outreach_sender_send_failures

**What it means.** The 5-minute cron `/api/cron/outreach-sender` attempted to
send queued outreach emails and Resend rejected them. Source:
`src/app/api/cron/outreach-sender/route.ts` →
`log.error("outreach_sender.send_failed", ...)`. Each failure leaves the row
in `outreach_queue` with `status='approved'`, so the next tick retries —
the alert fires when the retry loop is making no progress.

**Likely causes.**
- Resend API outage or rate limit hit.
- `RESEND_API_KEY` rotated without redeploy.
- Sender domain DKIM/SPF/DMARC alignment broke (e.g. DNS provider purged
  records).
- A specific malformed batch of drafts — invalid recipients, oversized
  bodies — poisoning every send in the window.

**Verification steps.**
- Sentry: drill into one event and read the redacted `error.message` — it
  is the Resend error string verbatim.
- Vercel logs:
  `vercel logs /api/cron/outreach-sender --since 1h | grep send_failed`.
- SQL (Supabase SQL editor):
  ```sql
  select id, type, length(body) as body_len,
         created_at, approved_at
  from outreach_queue
  where status='approved' and sent_at is null
  order by approved_at asc
  limit 20;
  ```
  If a handful of IDs dominate, the failure is per-row; if everything is
  affected, it's upstream.
- Resend dashboard: API logs panel will show the same failure with raw
  status codes.

**Rollback / mitigation.**
- Per-row poisoning: set those specific rows to `status='failed'` in the
  Supabase dashboard. The cron will skip them and resume on the rest.
- Upstream Resend outage: do nothing. Rows stay `approved`, the cron retries
  every 5 min, and once Resend recovers the queue drains on its own. The
  database is the source of truth.
- Credentials: rotate `RESEND_API_KEY` in Vercel and redeploy.
- DNS alignment: re-verify SPF/DKIM/DMARC in the Resend domain panel and at
  the registrar — propagation is slow, so do this *before* anything else
  if the alert is also coincident with a DNS change.

**Escalation.** Don't wake anyone. Outreach is not a synchronous user
surface — drafts queue for at least the undo window before this cron sees
them, so a multi-hour outage is at most "delivery is delayed." If Resend is
hard-down for >24 h, consider a flag to suspend approvals via
`flags.outreachEnabled` in `gate-config.ts` (does not exist yet — add only
if outage repeats).

---

## ai_quota_rpc_errors

**What it means.** The atomic Postgres function `consume_ai_call_quota` —
called by every AI agent route to enforce the per-user-per-day cap — threw
something other than the expected `ai_quota_exceeded` raise. Source:
`src/lib/ai/quota.ts` → `log.error("ai_quota.rpc_error", ...)`. The function
fails *open* (the route lets the call through), so this alert is about
infrastructure health, not a user-blocking incident.

**Likely causes.**
- Supabase Postgres connectivity / RPC routing issue (the most common cause
  of `rpc_error` since the function call itself is trivial).
- Migration drift — the `consume_ai_call_quota(uuid, integer)` signature
  changed without the call site being updated, returning an "function does
  not exist" or arg-mismatch error.
- `ai_call_quotas` row constraint violation introduced by a parallel
  migration (rare).
- Service-role JWT for `getSupabaseAdmin()` expired or revoked.

**Verification steps.**
- Sentry: pull the `error.code` and `error.msg` from a recent event. A
  Postgres error code (e.g. `42883`) tells you exactly what the function
  thinks is wrong.
- SQL:
  ```sql
  select proname, pg_get_function_identity_arguments(oid)
  from pg_proc
  where proname = 'consume_ai_call_quota';
  ```
  Should return one row with `p_user_id uuid, p_cap integer`. If empty or
  different, a migration is missing in production.
- `select * from ai_call_quotas where quota_date = current_date limit 5;` —
  if this errors with the same Postgres code, the database is the issue.
- Supabase status: <https://status.supabase.com/>.

**Rollback / mitigation.**
- Migration drift: revert the offending migration via Supabase CLI or
  re-apply the one that defines the function (`src/db/manual/` has the
  canonical SQL).
- Service-role token: rotate `SUPABASE_SERVICE_ROLE_KEY` in Vercel and
  redeploy.
- Upstream Supabase outage: nothing to do. The route fails open, so users
  are not blocked. The Watchdog cron will surface the broader incident.
- If the rate of `rpc_error` is approaching the cap rate, consider a
  manual override: set `PRICING_CONFIG.costCaps.freeAiCallsPerDay` to a
  low number in `pricing-config.ts` to throttle abuse during the outage.
  Revert when the database recovers.

**Escalation.** Don't wake anyone. The quota fails open, which means the
worst-case is a transient over-spend on AI costs — bounded by the per-route
rate limiter (`src/lib/rate-limit-middleware.ts`, tier B). If `rpc_error`
sustains for >2 h and AI spend on the Anthropic dashboard is climbing past
the daily cost cap, then it's worth a manual pause via Vercel env
(`AI_AGENTS_DISABLED=true` is a hypothetical flag — does not exist yet, add
only after this scenario fires once).
