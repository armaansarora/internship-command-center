# Secrets Rotation Runbook

Canonical list: `src/lib/env.ts`. Every secret the Tower runs on is listed below with what it does, where it lives, how to rotate it, and how to verify the new value is wired.

Commands assume the Vercel CLI (`npm i -g vercel`, then `vercel login` + `vercel link`) and that you have access to the project's Supabase dashboard, Stripe dashboard, Google Cloud Console, Upstash console, and Anthropic/OpenAI consoles.

After every rotation: `vercel env pull .env.local` locally, restart the dev server, and hit the relevant feature once to confirm the new value works. Any rotation that changes a server-only secret also requires a redeploy (`vercel --prod`) — Vercel does not hot-reload env vars into running Functions.

---

## Supabase

### `SUPABASE_SERVICE_ROLE_KEY`

- **Purpose:** Admin key used by `getSupabaseAdmin()` for RLS-bypassing operations (token storage, background jobs).
- **Lives in:** Vercel env (Production + Preview). Supabase dashboard → Project Settings → API.
- **Rotate:**
  1. Supabase dashboard → Project Settings → API → "Service role key" → **Reset**.
  2. Copy the new JWT.
  3. `vercel env rm SUPABASE_SERVICE_ROLE_KEY production` and `vercel env add SUPABASE_SERVICE_ROLE_KEY production` (paste new value). Repeat for `preview` if used there.
  4. `vercel --prod` to redeploy.
- **Verify:** Hit any endpoint that uses `getSupabaseAdmin()` (e.g. Gmail connect flow). Check `/api/health` if present. 401s from PostgREST = wrong key.

### `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

- **Purpose:** Browser-visible project URL + anon key.
- **Rotate:** Publishable key rotates on the same dashboard page as the service role key. Follow the same Vercel env steps. Verify by loading `/lobby` (client-side auth must succeed).

### `SUPABASE_DB_URL`

- **Purpose:** Postgres connection string used **only** by `drizzle-kit` locally (schema migrations). NOT used at runtime — see CLAUDE.md gotcha #1.
- **Rotate:** Supabase dashboard → Project Settings → Database → Reset database password. Update Vercel env. Verify with `npx drizzle-kit push` from a local checkout with fresh `.env.local`.

---

## Encryption

### `ENCRYPTION_KEY` — NON-TRIVIAL

This key encrypts the `google_tokens` column on `user_profiles`. Rotation is structurally different from every other secret because **rotating the key without migrating data bricks every stored OAuth token** — users lose Gmail/Calendar integration until they reconnect.

As of R0.3 the codebase supports a versioned prefix scheme (see `src/lib/gmail/oauth.ts` → `encryptForUser` / `decryptForUser`). Blobs are tagged `v2:…` and decryption dispatches on the prefix. This is the hook rotation must use.

Relevant source:

- `src/lib/crypto/keys.ts` — HKDF derivation: `deriveUserKey(userId, master)` with salt `tower.gmail.oauth.v1`.
- `src/lib/gmail/oauth.ts` — `encryptForUser`, `decryptForUser`, lazy migration inside `getGoogleTokens`.

**Option A — Re-encrypt every row before rotation (preferred for small user counts):**

1. Generate a new 32-byte key: `openssl rand -hex 32`. Call this `KEY_NEW`.
2. Write a one-shot script (run locally against prod with `SUPABASE_SERVICE_ROLE_KEY`):
   - `SELECT id, google_tokens FROM user_profiles WHERE google_tokens IS NOT NULL`.
   - For each row: decrypt with the current `ENCRYPTION_KEY` via `decryptForUser(userId, blob)`, then re-encrypt under `KEY_NEW` (temporarily export a `encryptWithMaster(userId, plaintext, master)` variant, OR simply set `process.env.ENCRYPTION_KEY = KEY_NEW` before calling `encryptForUser`).
   - Write the new blob back atomically.
3. Once every row is re-encrypted under `KEY_NEW`, rotate Vercel env: `vercel env rm ENCRYPTION_KEY production && vercel env add ENCRYPTION_KEY production` (paste `KEY_NEW`). Redeploy.
4. Verify by triggering a Gmail fetch for a test user.

**Option B — Dual-read (larger user counts, zero downtime):**

The current `v2:` scheme already supports this if you extend it to a per-key version tag. Minimum change:

1. Add `v2b:` branch to `decryptForUser` that derives the key from a **new** master (e.g. `ENCRYPTION_KEY_V2`). Keep the existing `v2:` branch unchanged.
2. Change `encryptForUser` to emit `v2b:` blobs (new master only).
3. Ship that change. Deploy.
4. Lazy migration in `getGoogleTokens` already re-encrypts stale blobs on successful read — over time every active user rotates to `v2b:`.
5. After 30–90 days (long enough that dormant users have logged in OR you accept they must reconnect), run a sweep script to re-encrypt any remaining `v2:` rows, then remove the `v2:` branch and drop the old `ENCRYPTION_KEY`.

**Never do:** swap `ENCRYPTION_KEY` in Vercel without migrating rows first. Every existing `v2:` blob becomes undecryptable garbage, and the failure mode is silent until a user's token refresh fires.

### `OAUTH_STATE_SECRET`

- **Purpose:** HMAC signs the `state` parameter on OAuth flows (CSRF protection). See `src/lib/auth/oauth-state.ts`.
- **Lives in:** Vercel env, server-only.
- **Rotate:**
  1. `openssl rand -base64 48`.
  2. `vercel env rm OAUTH_STATE_SECRET production && vercel env add OAUTH_STATE_SECRET production`.
  3. Redeploy. Any OAuth flows mid-flight at the rotation moment will fail their callback — users see a "state mismatch" error and retry. Acceptable.
- **Verify:** Click "Connect Gmail" end-to-end.

---

## Google OAuth

### `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

- **Purpose:** Identify the Tower to Google's OAuth server.
- **Lives in:** Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client.
- **Rotate (secret only — ID is public):**
  1. In Cloud Console, open the OAuth client, click **Reset Secret**.
  2. Copy new secret.
  3. `vercel env rm GOOGLE_CLIENT_SECRET production && vercel env add GOOGLE_CLIENT_SECRET production`.
  4. Redeploy.
- **Verify:** "Connect Gmail" flow completes. Token refresh on an existing user still works (uses the new client secret).

### `GMAIL_REDIRECT_URI`

- **Purpose:** Must exactly match a redirect URI registered on the OAuth client.
- **Rotate:** Only when the deploy URL changes. Update both (a) Google Cloud Console authorised redirect URIs and (b) Vercel env. Changing one without the other produces `redirect_uri_mismatch`.

---

## AI Providers

### `ANTHROPIC_API_KEY`

- **Purpose:** All CEO/CRO/CMO/etc. agent calls via Vercel AI SDK.
- **Lives in:** Vercel env + Anthropic Console (console.anthropic.com → API Keys).
- **Rotate:**
  1. Create new key in console.
  2. `vercel env rm ANTHROPIC_API_KEY production && vercel env add ANTHROPIC_API_KEY production`.
  3. Redeploy.
  4. Revoke old key in console **after** verifying.
- **Verify:** Ring the Bell on Floor 1 and dispatch any agent.

### `OPENAI_API_KEY`

- Same procedure as Anthropic. Console: platform.openai.com → API Keys. Used for embeddings / fallback models (pgvector company intel).

---

## Cron & Webhooks

### `CRON_SECRET`

- **Purpose:** Shared secret the Vercel cron handlers verify on incoming requests (see `/api/cron/*` routes).
- **Rotate:**
  1. `openssl rand -base64 32`.
  2. `vercel env rm CRON_SECRET production && vercel env add CRON_SECRET production`.
  3. Redeploy. Vercel automatically injects the new value into scheduled invocations.
- **Verify:** `vercel logs --prod` on the next scheduled cron tick — no 401s.

---

## Stripe

### `STRIPE_SECRET_KEY`

- **Purpose:** Server-side Stripe SDK calls (subscription sync, billing portal).
- **Rotate:**
  1. Stripe Dashboard → Developers → API keys → **Roll** secret key (choose an expiry for the old key, e.g. 24h).
  2. `vercel env rm STRIPE_SECRET_KEY production && vercel env add STRIPE_SECRET_KEY production`.
  3. Redeploy within the expiry window.
- **Verify:** Open a test user's billing portal from the Settings page.

### `STRIPE_WEBHOOK_SECRET`

- **Purpose:** Verifies webhook signatures at `/api/stripe/webhook`.
- **Rotate:** Stripe Dashboard → Developers → Webhooks → endpoint → **Roll secret**. Update Vercel env, redeploy. Webhooks sent during the overlap window are signed with the old secret — Stripe retries so brief gaps are fine.
- **Verify:** Trigger a test event from Stripe Dashboard → webhook → Send test → check 200 response.

### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

- Same Dashboard page as the secret key. Client-visible by design — rotate only on compromise.

---

## Rate Limiting

### `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

- Backing store for rate limiters (`@upstash/ratelimit`).
- **Rotate:** Upstash console → Redis → your DB → REST API → **Rotate Read/Write token**. `vercel env rm UPSTASH_REDIS_REST_TOKEN production && vercel env add UPSTASH_REDIS_REST_TOKEN production`. Redeploy. Verify by hammering a rate-limited endpoint until you see the 429.

---

## Email

### `RESEND_API_KEY`

- Outbound email delivery (transactional + outreach). Resend dashboard → API Keys → create new → update Vercel env → redeploy → delete old. Verify by sending a test email.

---

## Third-Party Data

### `OPENWEATHER_API_KEY`

- Low-stakes: feeds weather overlays on the skyline. Failure = no rain/snow effects. openweathermap.org → API keys → create new → update Vercel env → redeploy → delete old. Verify by checking devtools Network for a successful `api.openweathermap.org` call on any floor.

---

## Observability

### `NEXT_PUBLIC_SENTRY_DSN`

- **Purpose:** Client-side error ingestion. DSN is public by design; rotate only on compromise.
- **Rotate:** Sentry → Settings → Projects → [project] → Client Keys (DSN) → **Generate New Key**. Update Vercel env, redeploy.
- **Verify:** Throw a test error, confirm it lands in Sentry.

### `SENTRY_ORG`, `SENTRY_PROJECT`

- Not secrets — identify where build uploads source maps. Change only if the Sentry project is renamed or moved.

---

## Post-Rotation Checklist

After any rotation: updated in Vercel (all envs that use it) → redeployed (`vercel --prod`) → pulled into local dev (`vercel env pull .env.local`) → verified the affected feature → old credential revoked (or grace window noted) → incident-driven rotations logged in `docs/BUG-TRACKER.md`.
