# Post-Hardening Manual Steps

Everything in this file is **something a computer can't do for you**. The code
is already pushed to `main`. To fully activate the hardening, you have to do
five things in the real world. Each step says *where* to click, *what* to type,
and *how to tell it worked*.

Time budget: **15–25 minutes total**, done once.

---

## Step 1 — Generate and set `OAUTH_STATE_SECRET`

**Why:** the Gmail connect flow now signs its "state" parameter with a secret.
Without a secret, the kickoff route (`/api/gmail/auth`) will refuse to run.

**What to do**

1. Open a terminal on your Mac.
2. Paste this and hit Enter:

   ```bash
   openssl rand -base64 48
   ```

3. Copy the long string it prints (it will look like `H7k9…=`). This is your
   new secret. **Never share it. Never commit it.**
4. Go to **Vercel → Your Project → Settings → Environment Variables**.
5. Click **Add New**.
   - **Key:** `OAUTH_STATE_SECRET`
   - **Value:** paste the string
   - **Environments:** tick **Production**, **Preview**, and **Development**.
   - Click **Save**.
6. Open your local `.env.local` (in the project root) and add the same line:

   ```
   OAUTH_STATE_SECRET=<paste the same value here>
   ```

7. Redeploy (Vercel → **Deployments → … → Redeploy**, or just push any change).

**How to tell it worked**

- Visit `https://thetower.app/situation-room`, click "Connect Gmail".
- You should get bounced to Google's consent screen. If you get an error like
  `missing_state` or a 500, the secret is missing or mismatched between kickoff
  and callback environments.

---

## Step 2 — Run the new Supabase SQL migrations

**Why:** two new things need to exist in the database: a `stripe_webhook_events`
table (so Stripe events don't double-process) and the manual SQL files
reorganized under `src/db/manual/` so a clean clone of this project can be
reproduced from scratch.

There are five files in `src/db/manual/`. They are **idempotent** — running them
twice does nothing bad. If you have already run the earlier ones (000, 001, 002)
on an existing database, you only need **003** and **004**. If you are setting up a new
environment from scratch, run them in order.

**What to do**

1. Open your Supabase project → **SQL Editor** → **New query**.
2. In VS Code / Cursor, open `src/db/manual/003_stripe_webhook_events.sql`.
3. Copy the entire file's contents.
4. Paste into the Supabase SQL editor.
5. Click **Run**.
6. You should see `Success. No rows returned.` or similar.

**(Only if this is a brand-new Supabase project)** also run, in this order:

- `src/db/manual/000_post_push.sql`
- `src/db/manual/001_vector_search.sql`
- `src/db/manual/002_pipeline_stats_rpc.sql`
- `src/db/manual/003_stripe_webhook_events.sql`
- `src/db/manual/004_progression_milestones_unique.sql`

**How to tell it worked**

In the Supabase dashboard go to **Table Editor**. You should see a new table
called `stripe_webhook_events` in the left sidebar. It will be empty. That is
fine — it fills up the next time Stripe sends a webhook.

---

## Step 3 — Re-deploy and verify the Stripe webhook

**Why:** the webhook handler is now idempotent. You should confirm real Stripe
events still flow through it.

**What to do**

1. If you haven't redeployed since Step 1, redeploy now (Vercel →
   **Deployments → Redeploy**).
2. Wait for the deploy to turn green.
3. Go to **Stripe Dashboard → Developers → Webhooks**.
4. Click your webhook endpoint (the one pointing to
   `https://thetower.app/api/stripe/webhook`).
5. Click **Send test webhook** (top right).
6. Pick `customer.subscription.updated` from the event list and click **Send**.
7. You should see the event land with status **200**.

**How to tell it worked**

- Go to Supabase → **Table Editor → stripe_webhook_events**. You should see one
  row with the event id that Stripe just sent, and `status = 'processed'`.
- **Click "Send test webhook" again with the same event type**. You should see
  a second row inserted OR (more accurately) the handler returning `200 OK`
  immediately without any tier changes. The response body will contain
  `"duplicate": true` when Stripe retries the same event id.

If Stripe shows a red 4xx/5xx, open **Vercel → Logs** and search for
`stripe.webhook` — the structured logs will tell you exactly what failed
(missing secret, signature mismatch, handler error).

---

## Step 4 — Double-check your environment variables

**Why:** the app now validates every environment variable at boot. If you're
missing one, the first request after deploy fails with a readable error in
the logs. Better to catch it now.

**What to do**

Open **Vercel → Your Project → Settings → Environment Variables** and confirm
every row below is present for at least **Production**. (You do not need to set
every one — the ones marked *optional* are only required if you use that feature.)

**Required (the app will not start without these):**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

**Required for specific features:**

- `SUPABASE_SERVICE_ROLE_KEY` — webhooks, crons, OAuth token storage
- `ANTHROPIC_API_KEY` — all 8 C-suite chats
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — subscriptions + webhook
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GMAIL_REDIRECT_URI` — Gmail flow
- `ENCRYPTION_KEY` — 32-byte hex or base64, encrypts stored Google tokens
- `OAUTH_STATE_SECRET` — **just set in Step 1**
- `CRON_SECRET` — ≥ 16 chars, required by Vercel for cron routes in prod
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — rate limiting
- `NEXT_PUBLIC_APP_URL` — e.g. `https://thetower.app` (defaults to this)

**Optional:**

- `RESEND_API_KEY` — only if you send outreach email
- `OPENAI_API_KEY` — only if you use embeddings
- `OPENWEATHER_API_KEY` — skyline weather, falls back to "clear" if missing
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` — error tracking
- `SUPABASE_DB_URL` — only used by `npm run db:generate` locally

**If you use `.env.local`, add the same list there for local dev.** The
`.env.example` file in the repo is kept in sync and is the canonical list.

**How to tell it worked**

Open **Vercel → Logs** after your next deploy. If you see a log line starting
with `Invalid or missing environment variables:` the app is telling you
exactly which var is wrong. Fix it and redeploy.

---

## Step 5 — Rotate `ENCRYPTION_KEY` if you haven't already

**Why:** this is the AES-256-GCM key that encrypts Google OAuth tokens in the
database. It must be exactly 32 bytes. You already have one set; this step is
just a sanity check that it's the right length so the OAuth flow doesn't blow
up the first time you reconnect Gmail.

**What to do**

1. On your Mac, paste this to check current length:

   ```bash
   echo -n "$ENCRYPTION_KEY" | wc -c
   ```

   (Or just read the value from Vercel's env vars UI.)

2. It should be either **64 characters** (hex) or a base64 string that decodes
   to 32 bytes. If it's anything else, generate a fresh one:

   ```bash
   openssl rand -hex 32
   ```

3. Set in Vercel under `ENCRYPTION_KEY` (Production + Preview + Development).
4. **If you rotate this key, any previously-connected users will need to
   reconnect Gmail once** (their stored tokens become undecryptable). For a new
   project this doesn't matter.

**How to tell it worked**

Open `/situation-room`, click "Connect Gmail", complete the Google flow. You
should land back on `/situation-room?gmail=connected`. Any error here means the
key is wrong length — check Vercel logs for `gmail.oauth` entries.

---

## Optional — Delete documentation bloat

**This is entirely optional and purely cosmetic. Skip it if you're not sure.**

The repository root has **six long-form planning docs** (`BOOTSTRAP-PROMPT.md`,
`HANDOFF.md`, `PROJECT-CONTEXT.md`, `CLAUDE.md`, `SESSION-STATE.json`, plus
`docs/*.md`). They total more words than the actual source code. They are
auto-maintained by the scripts in `scripts/auto-organize-docs.ts` and
`scripts/session-end.ts`. If that workflow is not useful to you, delete:

- `BOOTSTRAP-PROMPT.md`
- `HANDOFF.md`
- `SESSION-STATE.json`
- `docs/archive/*`
- Anything in `scripts/` you don't recognize

Keep: `README.md`, `CLAUDE.md` (contains real architecture notes), and
`docs/MASTER-PLAN.md` + `docs/SCHEMA-DRAFT.md` + `docs/VISION-SPEC.md` +
`docs/WAR-ROOM-BLUEPRINT.md` (these are actual reference material).

I did **not** delete any of these automatically — they're your call.

---

## Sanity checklist

Run this in your main checkout at `/Users/armaanarora/internship-command-center`
to make sure everything still works locally:

```bash
cd /Users/armaanarora/internship-command-center
npm install           # already done, but safe to re-run
npm run lint          # should print nothing
npm run test          # should say "28 passed"
npm run build         # should finish with a route table and no errors
```

If any of those fail, **do not deploy.** Open an issue / ping me with the
error output — something went wrong in sync.

---

## What to do if something breaks in production

1. Open **Vercel → Logs**. Filter by the route that's broken.
2. Look for any line starting with `"level":"error"` — every error path in the
   new code emits structured JSON logs.
3. Common messages and what they mean:
   - `stripe.webhook.signature_verification_failed` — `STRIPE_WEBHOOK_SECRET`
     is wrong or Stripe is sending from a webhook you didn't configure.
   - `stripe.webhook.duplicate` — not an error; this is the new idempotency
     guard rejecting a retry. Safe to ignore.
   - `gmail.oauth.invalid_state` with `reason: "expired"` — user took more
     than 10 minutes to complete consent; they should retry.
   - `gmail.oauth.invalid_state` with `reason: "nonce_mismatch"` — user
     started one OAuth session and finished another (e.g. two tabs). Harmless.
   - `agent.load_context_failed` — one of the agent stats queries threw. Check
     the same log line for `userId` and inspect that user's data.
   - `cron.briefing.user_failed` — one user failed during the daily briefing;
     cron continues with the rest. Check `userId` and re-run manually if needed.
4. If in doubt, rollback: **Vercel → Deployments** → find the last green
   deploy before this one → **… → Promote to Production**.

---

**You are done.** After Steps 1–5 the project is in the hardened state
described in the code review. Everything else is already live on `main`.
