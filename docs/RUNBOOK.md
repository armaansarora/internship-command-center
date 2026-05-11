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

---


---

## Synthetic Canary (off-platform)

- **Schedule:** GitHub Actions, every 15 minutes.
- **Workflow:** `.github/workflows/canary.yml` (cron `*/15 * * * *`).
- **Spec:** `tests/canary/production.spec.ts` — Playwright, chromium-only.
- **Config:** `playwright.canary.config.ts` (isolated from the regular
  e2e config under `tests/e2e/`; no stub server, no dev server,
  hits real prod).
- **Heartbeat probe:** `GET /api/cron/canary-heartbeat`
  (`src/app/api/cron/canary-heartbeat/route.ts`).
  - Deliberately unauthenticated — it is the canary's liveness target.
  - Returns `{ ok: true, t: <unix-seconds>, build: <7-char-sha | "local"> }`.
  - Cache-controlled `no-store` so probes never see stale state.
  - Wrapped with `withCronHealth("canary-heartbeat", …)`, so every
    probe lands a row in `cron_runs` with success + duration.
- **Coverage:**
  1. `/` — must serve a page containing the brand string "The Tower".
  2. `/api/cron/canary-heartbeat` — must answer 200 with the JSON
     envelope above; timestamp must be within 5 minutes of "now".
  3. `/lobby` — must render a Google sign-in CTA (auth surface alive).
  The canary intentionally does NOT attempt OAuth (we don't store a
  service account); it asserts only that the auth surface renders.

### Why GitHub Actions, not Vercel Cron

The canary's job is to prove production is up. If the scheduler lives
on the same platform as production, a regional outage silences the
alarm. GitHub Actions runs on Microsoft Azure infrastructure — fully
independent from Vercel — so a Vercel outage trips the canary instead
of hiding it.

### Alert path

GitHub's built-in failure email to repo admins. No PagerDuty, no
Slack webhook. If the canary becomes noisy enough that email isn't
the right channel, wire a richer alert into the workflow's `failure()`
step — but until then, keep it boring.

### If the canary alert fires

1. **Open the failed run** in GitHub Actions (link in the email).
2. **Check the Playwright trace** uploaded as the `canary-traces`
   artifact — it captures DOM + network for each failing step.
3. **Quick triage by which assertion failed:**
   - Root brand string missing → likely a deploy that broke the
     marketing/layout chain, or a CDN edge serving a stale error page.
     Check the latest Vercel deployment and roll back if necessary.
   - Heartbeat 5xx or missing → serverless functions are not running.
     Check Vercel status, function logs, and recent deploys.
   - Lobby missing Google CTA → either the lobby route is broken
     (check `src/app/lobby/lobby-client.tsx` for recent edits) or the
     OAuth start endpoint (`/api/auth/google/start`) is failing to
     render its trigger button.
4. **Verify with `cron_runs`** that the heartbeat row stopped landing,
   not just that Playwright timed out talking to the network.
   - `select job_name, started_at, success, error_message from cron_runs
      where job_name = 'canary-heartbeat' order by started_at desc limit 10;`
5. **If it's transient** (one failed run, next one green): no action.
   GitHub Actions can flake on cold runners; one bad poll is noise.
6. **If it's persistent** (two-plus failures in a row): treat as a
   production incident. Page the on-call (currently: founder).

### Manual rerun

The workflow is `workflow_dispatch`-enabled — trigger a one-off run
from the Actions tab whenever you need a quick heartbeat check.

### Pointing the canary at a preview deployment

Set `CANARY_BASE_URL` to the preview URL when dispatching manually, or
override it in a branch fork of the workflow. The default is hardcoded
to `https://www.interntower.com` so a misconfigured environment can't
accidentally silence the production probe.

---

## Owner Watchdog (off-platform driver)

The `/api/cron/owner-watchdog` route is driven from a GitHub Actions
workflow rather than Vercel cron because the Hobby plan caps `vercel.json`
schedules at once-per-day, and the watchdog's value is sub-hour detection
of stale crons, failed Stripe webhooks, and AI cost spikes.

- **Schedule:** GitHub Actions, every 30 minutes.
- **Workflow:** `.github/workflows/owner-watchdog.yml`.
- **Endpoint:** `POST https://www.interntower.com/api/cron/owner-watchdog`
- **Auth:** `Authorization: Bearer ${{ secrets.CRON_SECRET }}` — same
  shared secret every other cron route checks via `verifyCronRequest`.

### Required repo secret

`CRON_SECRET` must be set in GitHub repository secrets
(Settings → Secrets and variables → Actions). The workflow exits with a
warning rather than failing if the secret is missing, so a fresh fork of
the repo never spams the Actions failure email.

### When this alerts

GitHub emails repo admins when the workflow itself fails (curl returns
non-200, or the workflow timeouts). The watchdog handler returns 200 in
all healthy and unhealthy in-app paths — incident emails come from
Resend (configured via `RESEND_API_KEY` + `OWNER_ALERT_EMAIL`), not from
this workflow.

### Pause without losing history

Disable the workflow from the Actions tab; the route remains callable
on demand via `workflow_dispatch`. The `incident_alerts` table keeps
the historical state machine — re-enabling the schedule does not
re-page closed incidents.

---

## Enable Operations Dashboard

The `/operations` route is the founder's read-only window onto the same
signals the Lighthouse Watchdog uses to decide when to page: cron
freshness, open incidents, AI spend vs the kill-switch cap, plus the
activation funnel from PR 2. Code ships dark — the route is gated by
`TOWER_OPERATIONS_DASHBOARD=1`, owner-only by user id, and `notFound()`s
(404) when either check fails.

### What this dashboard is, and is NOT

This dashboard is **read-only diagnostics**. It is NOT a source of
paging — the watchdog already emails the owner when it sees a stale
cron / failed webhook / hourly AI-cost spike. The dashboard is where you
go AFTER the alert lands to confirm what tripped before reaching for
mitigation. If the dashboard disagrees with the watchdog email, the
**watchdog wins** — it reads the same tables and is the authoritative
source.

### Required Vercel env vars

All of these must already be set for the rest of the app to run; this
section is the launch checklist of "what must be live before flipping
the flag." Verify via `vercel env ls production`.

| Variable | Why it matters |
| --- | --- |
| `TOWER_OPERATIONS_DASHBOARD` | Set to `1` to render. Any other value (including unset) renders 404. |
| `OWNER_USER_ID` or `OWNER_USER_IDS` | The route uses `isOwner(user.id)`; without this, even your account 404s. |
| `SUPABASE_SERVICE_ROLE_KEY` | All four panels read service-role-only tables (`engagement_events`, `cron_runs`, `incident_alerts`, `v_daily_ai_spend_cents`). |
| `KILL_AI_SPEND_USD` | The AI spend panel renders the bar against this cap. Defaults to `50`; override only if Stripe metering is wired. |

### Flip the flag

1. `vercel env add TOWER_OPERATIONS_DASHBOARD` → enter `1` → select
   **Production** (and Preview if you want to QA on a preview URL).
2. Trigger a redeploy: `git commit --allow-empty -m "chore: enable
   operations dashboard"` and push, OR re-deploy the latest production
   build from the Vercel dashboard. The env var is a build-time read for
   client bundles but `GATE_CONFIG.flags.operationsDashboardEnabled()`
   re-evaluates `process.env` per server render — a fresh deploy is
   simplest but technically unnecessary for the gate itself.
3. Sign in as the owner and visit `https://www.interntower.com/operations`.
4. Verify all four panel headers render: "Activation funnel", "Cron
   health", "Lighthouse incidents", "AI spend today". Empty states are
   fine on day 1 — the dashboard is supposed to look quiet when the
   watchdog has nothing to flag.

### Flip the flag back off

1. `vercel env rm TOWER_OPERATIONS_DASHBOARD production`.
2. Re-deploy (or wait for the next deploy). The route then 404s for
   everyone, including the owner. No data is lost; the underlying
   tables continue to feed the watchdog.

### Verify owner-only enforcement (manual)

Before public launch, confirm the gate from an incognito browser:

1. Sign in as a non-owner test account (any free-tier user other than
   the configured owner UUID).
2. Visit `/operations`. Expected: 404. No founder content in the body.
3. Sign out. Visit `/operations`. Expected: 302/307 redirect to `/lobby`.

The same three checks run in CI via `page.test.tsx` (server-side gate
proof) and `tests/e2e/operations-founder-view.spec.ts` (browser-level
proof). If those tests fail, the gate is broken — do not ship.

### Where the panels source their data

| Panel | Source | Reader |
| --- | --- | --- |
| Activation funnel | `engagement_events` + `agent_dispatches` + `applications` | `lib/db/queries/operations-rest.ts` |
| Cron health | `cron_runs` | `lib/observability/production-health.ts` |
| Lighthouse incidents | `incident_alerts` | `lib/db/queries/operations-ops-rest.ts` |
| AI spend | `v_daily_ai_spend_cents` (view) | `lib/db/queries/operations-ops-rest.ts` |

The cron-health and incident-alerts panels share their source tables
with the Lighthouse Watchdog cron, by design — the dashboard is the
read-only window; the watchdog is the writer.

---

## Enable Trust Console

The Trust Console at `/settings/privacy` is shipped DARK behind
`TOWER_TRUST_CONSOLE`. Code is in production, but the user-facing
surface only renders when the env var is `"1"`. Owners (per
`OWNER_USER_ID` / `OWNER_USER_IDS`) always see a preview badge.

### Pre-flip checklist

Run through these BEFORE flipping the flag. The Trust Console is a
brand-defining surface — every gap is visible and the modal language
is uncompromising. The cost of shipping it half-broken is a trust hit
we cannot retract.

- `npx tsc --noEmit` is green on `main`.
- `npm test` is green for the privacy bundle:
  `vitest run src/app/\(authenticated\)/settings/privacy/__tests__/ src/lib/db/queries/__tests__/trust-console-rest.test.ts src/components/trust-console/`.
- `npm run build` succeeds. The Trust Console page is in the App
  Router and the build fails closed if any of the server-action wirings
  drift.
- The cron stack is healthy: `vercel logs --since 30m | grep export-worker`
  shows the worker ticking. The Trust Console "Download archive" path
  depends on the cron worker landing the artifact in
  `exports/<userId>/<ts>.zip` AND stamping
  `data_export_status = 'delivered'`.
- The owner watchdog (GitHub Actions) is enabled — if the Trust Console
  reveals a backlog of `data_export_status = 'failed'` rows, the
  watchdog is the channel that surfaces it.

### Flip

1. Vercel → Settings → Environment Variables → Production.
2. Set `TOWER_TRUST_CONSOLE = 1`. Mark "Production" only —
   preview deploys stay dark so PR reviewers cannot accidentally hit a
   live trust surface.
3. Promote the next deploy (or trigger a redeploy from the dashboard
   so the new env var is picked up). The flag is read at request time
   via `GATE_CONFIG.flags.trustConsoleEnabled()`, so even existing
   warm Lambdas pick it up after a deploy.

### Verification

- `curl -i https://www.interntower.com/settings/privacy` while signed in
  as the owner returns 200 with the retention banner present
  (`grep "retention SLA"` against the HTML body). When the flag is on,
  the owner-preview badge disappears.
- Sign in as a non-owner account and hit the same URL — it should NOT
  redirect to `/settings`.
- In the browser, click "Request export". The polling banner
  ("Status: queued · checking again every 4 s") should appear and
  flip to "Download archive" within the cron tick budget
  (~5 min). The link is a signed URL that resolves to the user's
  archive.
- The audit feed at the bottom of the page renders REAL `audit_logs`
  rows under RLS — never mocks.

### Rollback

Set `TOWER_TRUST_CONSOLE` to anything other than `"1"` (or unset it)
and redeploy. The route flips back to the redirect-non-owners shape
within seconds. Audit rows already written by users who exercised the
revoke or export flow remain in `audit_logs` — the rollback is a
visibility flip only, never a data delete.
