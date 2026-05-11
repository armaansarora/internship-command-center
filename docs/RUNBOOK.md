# Operations Runbook

Operational playbook for The Tower. Each section: what runs, where it
runs, how to tell when it's broken, and what to do about it.

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
