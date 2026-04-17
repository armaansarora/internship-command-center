# Audit Deploy Checklist — Session 23

**Read this first.** This is the dummy-proof, click-by-click, paste-by-paste guide for the manual steps a computer can't do for you. Everything in code is already pushed to `main` (commit `eed9dd9`). To fully activate the audit fixes, follow these steps in order.

**Time budget:** 20–30 minutes, done once.

**Order matters.** Each step assumes the previous one finished cleanly. Don't skip ahead.

If you have **NOT yet completed** `docs/POST-HARDENING-MANUAL-STEPS.md` (the doc from the prior remote work session), do **that one first**. It covers `OAUTH_STATE_SECRET`, the `stripe_webhook_events` table (their version), and `ENCRYPTION_KEY`. This doc covers the **additional** work from session 23.

---

## Before you start

You need:

- [ ] A computer with Terminal open, in the project folder (`cd "~/Documents/The Tower"`)
- [ ] Your **Supabase dashboard** open in a browser tab → https://supabase.com/dashboard
- [ ] Your **Vercel dashboard** open in a browser tab → https://vercel.com/dashboard
- [ ] About 30 minutes of uninterrupted time

You should know:

- [ ] Your Supabase project URL (it looks like `https://jzrsrruugcajohvvmevg.supabase.co`)
- [ ] You have admin access to the Supabase project
- [ ] You have admin access to the Vercel project

If any of those aren't true, fix that first.

---

## Step 1 — Apply the new database migrations to production

**Why:** Session 23 created 3 new SQL migrations that fix critical bugs. Without these in production, you have:
- **Cross-user data corruption risk** (two users sharing a Gmail or Calendar event ID will overwrite each other)
- **Unauthorized RLS bypass** in vector-search RPCs (a SQL refactor could leak embeddings across tenants)
- **Failing upserts** on `daily_snapshots`, `company_embeddings`, `job_embeddings`, `progression_milestones` (`ON CONFLICT` clauses point to constraints that don't exist)
- **Sequential scans** on hot tables once you grow past ~10K rows per user

These migrations fix all four. They are **safe to apply** to a live database — they only ADD constraints and indexes; they don't drop any data.

### 1.1 — Open the Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Click your project (the one named after The Tower, probably "internship-command-center" or similar)
3. In the left sidebar, click **SQL Editor** (looks like a `</>` icon)
4. Click the **+ New query** button (top right)

### 1.2 — Run migration 0003 (composite uniques + indexes)

This is the most important migration of the three.

1. In your terminal, run:
   ```bash
   cat "src/db/migrations/0003_composite_uniques_and_indexes.sql" | pbcopy
   ```
   This copies the migration to your clipboard. (`pbcopy` is the Mac clipboard command.)

2. Switch back to the Supabase SQL Editor browser tab.

3. Click into the empty query area and paste (Cmd+V).

4. **Read the top comment block of what you pasted.** It explains what's happening. Skim it so you know what you're running.

5. Click the green **RUN** button (bottom right of the editor) — or press **Cmd+Enter**.

6. **What success looks like:** Bottom panel shows "Success. No rows returned" with a green checkmark. Several `CREATE INDEX` and `ALTER TABLE` statements should have run.

7. **What failure looks like:**
   - **"relation 'emails' does not exist"** → Your DB hasn't been initialized yet. Stop. Run the earlier migrations 0000, 0001, 0002 first (in order, same way).
   - **"could not create unique index" / "duplicate key value violates unique constraint"** → You have rows in `emails` or `calendar_events` that already share a `user_id + gmail_id` combo (extremely rare for an internship-tracker app). Tell me before doing anything else.
   - **"extension 'pg_trgm' is not available"** → Run this first in a separate query, then retry: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`

### 1.3 — Run migration 0004 (post-push + secure RPCs)

This replicates the old `post-push.sql` (HNSW vector indexes + `handle_new_user` trigger) AND hardens the vector-search RPCs from `SECURITY DEFINER` (which bypassed RLS) to `SECURITY INVOKER` with required `p_user_id`.

1. In your terminal:
   ```bash
   cat "src/db/migrations/0004_post_push_and_secure_rpcs.sql" | pbcopy
   ```

2. Back to Supabase SQL Editor → click **+ New query** (don't reuse the previous query window — start fresh).

3. Paste (Cmd+V).

4. Click **RUN**.

5. **What success looks like:** "Success" with green checkmark. You'll see `CREATE OR REPLACE FUNCTION`, `CREATE INDEX` (the HNSW vector indexes), and `CREATE TRIGGER` operations succeed.

6. **What failure looks like:**
   - **"extension 'vector' is not available"** → Go to **Database → Extensions** in the left sidebar, search for `vector`, and click the toggle to enable it. Then retry this migration.
   - **"trigger 'on_auth_user_created' already exists"** → That's fine, the migration uses `IF NOT EXISTS` patterns. If the error blocks the rest, copy the SQL line that failed, comment it out (`--`), and re-run.

### 1.4 — Skip migration 0005

Migration `0005_left_thaddeus_ross.sql` is an intentional no-op (a placeholder to keep drizzle-kit happy). Do NOT run it manually — it does nothing useful.

### 1.5 — Run the Stripe webhook events table (if not already)

This was created during the prior remote-work session. Check if it's already been applied:

1. In Supabase SQL Editor, run:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_name = 'stripe_webhook_events';
   ```

2. **If it returns 1 row** → already applied, skip to Step 2.

3. **If it returns 0 rows** → apply it now:
   ```bash
   cat "src/db/manual/003_stripe_webhook_events.sql" | pbcopy
   ```
   Paste into a new SQL Editor query, click RUN. Until this table exists, every Stripe webhook will return a 500 error and you'll silently lose payment events.

### 1.6 — Verify Step 1 worked

Paste this into a new Supabase SQL Editor query and run it:

```sql
-- Should return 1 row each
SELECT 'emails composite unique' AS check, COUNT(*) FROM pg_indexes
  WHERE indexname = 'emails_user_gmail_id_unique';
SELECT 'calendar_events composite unique', COUNT(*) FROM pg_indexes
  WHERE indexname = 'calendar_events_user_event_id_unique';
SELECT 'daily_snapshots composite unique', COUNT(*) FROM pg_indexes
  WHERE indexname = 'daily_snapshots_user_date_unique';
SELECT 'companies trigram index', COUNT(*) FROM pg_indexes
  WHERE indexname = 'idx_companies_name_trgm';
SELECT 'stripe_webhook_events table', COUNT(*) FROM information_schema.tables
  WHERE table_name = 'stripe_webhook_events';
SELECT 'match_company_embeddings is invoker', COUNT(*) FROM pg_proc
  WHERE proname = 'match_company_embeddings' AND prosecdef = false;
```

**You're done with Step 1 when** every row in the result shows `count = 1`. If any show `0`, something didn't apply — re-run that specific migration.

---

## Step 2 — Refresh the schema snapshot

**Why:** During the conflict resolution, my old `stripe_events` schema reference was replaced with the better `stripe_webhook_events` from the remote work, but the auto-generated snapshot file (`src/db/migrations/meta/0005_snapshot.json`) still has the old name. This is harmless until you next run `drizzle-kit generate` — at which point it'll create a confusing diff. Better to fix now.

1. In your terminal:
   ```bash
   cd "~/Documents/The Tower"
   npm run db:generate
   ```

2. **What success looks like:** Output says either "No schema changes, nothing to migrate" (best case) or it generates a tiny snapshot-only update (also fine). 

3. If it generated a small migration file you don't want, delete it:
   ```bash
   ls -lt src/db/migrations/*.sql | head -3
   # If you see a fresh one named 0006_something.sql that you didn't expect:
   # rm src/db/migrations/0006_*.sql
   # And remove its entry from src/db/migrations/meta/_journal.json
   ```

4. Commit any snapshot changes:
   ```bash
   git add src/db/migrations/
   git commit -m "chore: refresh drizzle schema snapshot after rebase"
   git push origin main
   ```

**You're done with Step 2 when** `npm run db:generate` says "No schema changes" or you've committed the snapshot.

---

## Step 3 — Set the new environment variables in Vercel

Session 23 introduced **one new optional env var** that unlocks AI Gateway (multi-provider AI failover + cost analytics + 60-90% prompt cache savings).

If you skipped `docs/POST-HARDENING-MANUAL-STEPS.md`, you also need to set `OAUTH_STATE_SECRET` and `ENCRYPTION_KEY` from there. Do those first, then come back.

### 3.1 — Set `AI_GATEWAY_API_KEY` (optional but strongly recommended)

**Why:** The audit found that all AI calls hit Anthropic directly. If Anthropic has an outage, your entire app breaks. AI Gateway routes through Vercel with automatic fallback to OpenAI/Google when Claude is down, AND gives you per-user cost analytics. Setup is 5 minutes.

1. Go to https://vercel.com/dashboard
2. Click your project (probably "internship-command-center")
3. Top nav → **Settings** → left sidebar → **AI Gateway**
4. Click **Get Started** (or **Enable** if it's disabled)
5. Once enabled, Vercel auto-creates an API key. Click **Copy** to copy it.
6. Now go to **Settings → Environment Variables**
7. Click **Add New**
   - **Key:** `AI_GATEWAY_API_KEY`
   - **Value:** paste the key from step 5
   - **Environments:** check **Production**, **Preview**, AND **Development**
   - Click **Save**
8. Open your local `.env.local` (or create it if missing — never commit it):
   ```bash
   echo "AI_GATEWAY_API_KEY=<paste-the-same-value-here>" >> .env.local
   ```

**You're done with Step 3.1 when** the env var shows up in Vercel → Settings → Environment Variables list.

### 3.2 — Verify all critical env vars exist

In Vercel → Settings → Environment Variables, confirm these are ALL set for **Production**:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `CRON_SECRET` (≥ 32 chars — generate with `openssl rand -hex 32`)
- [ ] `OAUTH_STATE_SECRET` (≥ 32 chars — see POST-HARDENING-MANUAL-STEPS.md Step 1)
- [ ] `ENCRYPTION_KEY` (exactly 64 hex chars — see POST-HARDENING-MANUAL-STEPS.md Step 5)
- [ ] `GOOGLE_CLIENT_ID` (if using Gmail)
- [ ] `GOOGLE_CLIENT_SECRET` (if using Gmail)
- [ ] `GMAIL_REDIRECT_URI` (if using Gmail)
- [ ] `AI_GATEWAY_API_KEY` (just set)

If any are missing, your production app will throw at runtime when it touches that feature. Set them.

---

## Step 4 — Verify the Vercel deploy

The push to `main` from session 23 should auto-trigger a Vercel deploy. Verify it succeeded.

1. Go to https://vercel.com/dashboard → your project → **Deployments** tab
2. Find the most recent deployment. It should reference commit `eed9dd9` (or a more recent one if you committed in Step 2).
3. **What success looks like:** Status badge says **Ready** in green.
4. **What failure looks like:**
   - **"Building"** → wait 1-2 minutes, refresh
   - **"Error"** → click into the deployment, scroll the build logs, find the red error line. Most likely a missing env var. Set it (Step 3) and click **Redeploy** (top right of the deployment page).
   - **"Canceled"** → someone pushed another commit on top. Find the newer deployment and check that one.

5. Once Ready, click the deployment URL (probably `thetower.app` or your custom domain).
6. The lobby should load. If it does, you're past the riskiest part.

**You're done with Step 4 when** the production URL loads the lobby without errors.

---

## Step 5 — Smoke test the new features

Verify the session 23 work actually works in production. Don't skip this — the whole point of pushing was to use it.

### 5.1 — Test AI orchestrator (CEO dispatch)

1. Open the production URL, sign in
2. Take the elevator to **Floor 1 — The C-Suite**
3. Click **Ring the Bell** (the brass bell on the desk)
4. Type a question that touches multiple agents, like: *"What's my pipeline status this week?"*
5. **What success looks like:** You see real-time progress cards appear for each agent the CEO dispatches (CRO for pipeline, CFO for analytics, etc.). After a few seconds, the CEO synthesizes a coherent answer.
6. **What failure looks like:**
   - Stuck on "thinking" forever → check browser console (Cmd+Opt+I → Console). Likely an env var is missing. Recheck Step 3.
   - "ANTHROPIC_API_KEY is required" → set it in Vercel.

### 5.2 — Test Stripe webhook idempotency

1. In Stripe Dashboard → Developers → Webhooks → click your endpoint
2. Click **Send test webhook** (top right)
3. Choose `customer.subscription.created` event type, click **Send**
4. **What success looks like:** Stripe shows 200 response. Check Supabase: `SELECT * FROM stripe_webhook_events ORDER BY received_at DESC LIMIT 1;` — you should see the event row.
5. Click **Send test webhook** AGAIN with the same event type. Stripe should still show 200. Re-query Supabase — you should see the row's `processed_at` and `status` updated, NOT a duplicate row inserted.

### 5.3 — Test cron auth is fail-CLOSED

1. From your terminal:
   ```bash
   curl -i https://thetower.app/api/cron/briefing
   ```
2. **What success looks like:** Returns `HTTP/1.1 401 Unauthorized`. (Before this fix, it would have returned 200 and started running.)
3. **What failure looks like:** Returns 200 → cron auth is broken (fail-OPEN). Verify `CRON_SECRET` is set in Vercel and not blank.

### 5.4 — Test schema snapshot is sane

In your terminal:
```bash
cd "~/Documents/The Tower"
npm run db:generate
```

Should say "No schema changes". If it generates anything, the live DB drifted from the schema. Compare and reconcile.

**You're done with Step 5 when** all four sub-tests pass.

---

## Sanity Checklist

Final pass — copy this into a note app and tick each one as you go:

- [ ] Step 1: All migrations applied. Verification SQL returns `count=1` for all six checks.
- [ ] Step 2: `npm run db:generate` says "No schema changes" (or any drift was committed).
- [ ] Step 3.1: `AI_GATEWAY_API_KEY` set in Vercel for Production+Preview+Development.
- [ ] Step 3.2: All 13 critical env vars set.
- [ ] Step 4: Latest Vercel deployment is Ready (green badge), production URL loads.
- [ ] Step 5.1: Ring the Bell on CEO floor returns multi-agent response.
- [ ] Step 5.2: Stripe test webhook lands once, second copy is deduped.
- [ ] Step 5.3: `curl /api/cron/briefing` returns 401.
- [ ] Step 5.4: Schema snapshot matches live DB.

---

## If something breaks in production

**Don't panic.** You can roll back in 60 seconds.

### Rollback the Vercel deploy

1. Vercel Dashboard → your project → **Deployments**
2. Find a previous Ready deployment from before session 23 (commit `2065817` or earlier)
3. Click the **⋯** menu on that deployment → **Promote to Production**
4. Production switches back instantly. The bad code is no longer serving traffic.

### Rollback the database

Migrations 0003 and 0004 only ADD things (constraints, indexes, functions). They don't drop data. You don't need to "rollback" them — leaving them in place won't hurt anything even if you roll back the code.

The exception: if you ran `manual/003_stripe_webhook_events.sql` and it created the table for the first time, you can leave it; the new code expects it.

### Rollback the rebase locally

Your safety branch is gone (cleaned up after successful push), but the original commit hash still exists in your local reflog for ~30 days.

```bash
git reflog | head -10
# Find the line "HEAD@{N}: rebase finished: returning to refs/heads/main"
# Then:
git reset --hard HEAD@{N+1}  # one before the rebase finish
```

This puts your local back to your pre-rebase state. Then you can re-attempt anything.

### When to message me

If at any point:
- A SQL migration errors out with something other than the expected errors above
- Vercel deploy stays Errored after you've checked env vars
- Production URL returns 500 and you can't tell why from the Vercel logs

Don't keep clicking around — message me with the exact error text and I'll diagnose.

---

## What to do after everything passes

Once the checklist is fully ticked, the audit fixes are LIVE.

You'll start seeing:
- **Stripe webhook events** appearing in Supabase as you take payments
- **Anthropic prompt-cache hits** in your AI Gateway analytics (Vercel dashboard → AI Gateway → Analytics) — you should see input cache reads dominating after the first 5-10 conversations per user
- **Agent memories** growing in the `agent_memory` table
- **Cost-cents** values appearing in `agent_logs` table → flowing into CFO floor analytics (was always $0 before)

The remaining audit items (MilestoneToast wiring, the 3-month product roadmap from `audit/07-product-extensions.md`) are next — but they're feature work, not deploy work. Tackle those when you're ready.

You can delete this file after the checklist is done.
