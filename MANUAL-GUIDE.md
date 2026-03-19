# The Tower — Manual Action Guide
## Everything Armaan Must Do Before Production Works

**Date:** 2026-03-18
**Status:** Phase 0 code is COMPLETE. Production build passes. Vercel preview is live.
**What's left:** 5 manual steps that require dashboard access I can't reach.

---

## Quick Summary

| # | Task | Time | Difficulty |
|---|---|---|---|
| 1 | Run database migration in Supabase | 2 min | Easy |
| 1b | Run post-push SQL (triggers + pgvector) | 1 min | Easy |
| 2 | Get the correct Supabase anon key | 2 min | Easy |
| 3 | Set up Google OAuth | 10 min | Medium |
| 4 | Set Vercel environment variables | 3 min | Easy |
| 5 | Merge branch + trigger production deploy | 2 min | Easy |

**Total estimated time: ~20 minutes.**

---

## Step 1: Run Database Migration in Supabase SQL Editor

**Why:** The 16-table schema (users, applications, contacts, etc.) needs to exist in your Supabase Postgres database. I generated the SQL but can't connect to Supabase's IPv6-only direct DB from this sandbox.

**The file:** `migration-full.sql` — already shared with you in Session 1. It's also in the repo at `src/db/migrations/`.

### Instructions

1. Open **[Supabase Dashboard](https://supabase.com/dashboard/project/jzrsrruugcajohvvmevg)**
2. Click **SQL Editor** in the left sidebar
3. Click **New Query** (top right)
4. Paste the entire contents of `migration-full.sql`
5. Click **Run** (or Cmd+Enter / Ctrl+Enter)
6. You should see "Success. No rows returned." — that's correct, DDL statements don't return rows.

### Step 1b: Run Post-Push SQL (Triggers + pgvector)

**Immediately after the migration succeeds**, run a second SQL file:

1. Still in **SQL Editor**, click **New Query** again
2. Paste the contents of `src/db/post-push.sql` (in the repo)
3. Click **Run**

This creates:
- **`handle_new_user()` trigger** — automatically creates a `user_profiles` row when someone signs up. Without this, sign-in works but the app can't find the user's profile.
- **`update_updated_at()` triggers** — auto-updates the `updated_at` column on every row edit (all 16 tables).
- **pgvector extension + HNSW indexes** — required for AI agent memory and company embeddings.

### Verify It Worked

1. Click **Table Editor** in the left sidebar
2. You should see 16 tables:
   - `users`, `organizations`, `organization_members`, `applications`, `contacts`
   - `application_contacts`, `events`, `tasks`, `documents`, `email_threads`
   - `email_messages`, `agent_sessions`, `agent_messages`, `agent_memories`
   - `notifications`, `user_preferences`
3. Click on any table (e.g., `users`) — it should show the column structure with no data yet.

### If Something Goes Wrong

- **"relation already exists" error:** The tables were already created. This is fine — skip this step.
- **"permission denied" error:** Make sure you're logged into the correct Supabase project (`jzrsrruugcajohvvmevg`).
- **Syntax error:** Copy the SQL again from the migration file — make sure you got the entire file, not a partial paste.

---

## Step 2: Get the Correct Supabase Anon Key

**Why:** The current `.env.local` has a `sb_publishable_*` format key. Supabase's REST API and `@supabase/ssr` client library require the classic JWT-format anon key that starts with `eyJ*`. Without this, auth and all client-side Supabase calls will fail silently.

### Instructions

1. In the **[Supabase Dashboard](https://supabase.com/dashboard/project/jzrsrruugcajohvvmevg)**, go to **Settings** (gear icon, bottom of left sidebar)
2. Click **API** in the settings menu
3. Under **Project API keys**, find the **anon / public** key
   - It should start with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - This is different from the `sb_publishable_*` key
4. Copy this key

### Where to Put It

Update the value in two places:

**A. Local `.env.local`** (for local development):
```
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUz...  (paste the full key here)
```

**B. Vercel environment variables** (Step 4 below):
Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to this same `eyJ*` key.

### Important Note

If the Supabase dashboard only shows the `sb_publishable_*` format and no `eyJ*` key, your project may be on a newer Supabase version. In that case:
- Try using the `sb_publishable_*` key as-is and see if auth works
- If it doesn't, check Supabase docs for "anon key migration" or generate a new project API key

---

## Step 3: Set Up Google OAuth

**Why:** The Tower uses "Sign in with Google" via Supabase Auth. This requires a Google Cloud OAuth app that tells Google "this website is allowed to sign users in."

### Part A: Create Google Cloud OAuth Credentials

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**
2. Select or create a project (name it "The Tower" or "Internship Command Center")
3. In the left sidebar: **APIs & Services** → **OAuth consent screen**
4. Choose **External** user type → **Create**
5. Fill in:
   - **App name:** The Tower
   - **User support email:** armaansarora20@gmail.com
   - **Developer contact email:** armaansarora20@gmail.com
   - Leave everything else default
6. Click **Save and Continue** through Scopes (no changes needed) and Test Users
7. Now go to **APIs & Services** → **Credentials**
8. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
9. Choose **Web application**
10. **Name:** The Tower (Supabase)
11. **Authorized JavaScript origins:** Add these:
    ```
    https://internship-command-center-lake.vercel.app
    http://localhost:3000
    ```
12. **Authorized redirect URIs:** Add this EXACTLY:
    ```
    https://jzrsrruugcajohvvmevg.supabase.co/auth/v1/callback
    ```
    (This is your Supabase project's auth callback URL)
13. Click **Create**
14. You'll get a **Client ID** and **Client Secret** — copy both.

### Part B: Configure Supabase Auth

1. Go to **[Supabase Dashboard](https://supabase.com/dashboard/project/jzrsrruugcajohvvmevg)**
2. In left sidebar: **Authentication** → **Providers**
3. Find **Google** in the list and click to expand
4. Toggle **Enable Sign in with Google** to ON
5. Paste your **Client ID** and **Client Secret** from Part A
6. Click **Save**

### Part C: Update Your Env Files

Add to `.env.local`:
```
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
```

### Testing Note

The Google OAuth app starts in **Testing mode**, which means only emails you add as "Test Users" can sign in. For now that's fine (just add your own email). Before real users use The Tower (Phase 2+), you'll need to publish the app through Google's verification process.

---

## Step 4: Set Vercel Environment Variables

**Why:** The deployed site on Vercel needs the same credentials your local dev environment uses. Without these, the production site can't connect to Supabase.

### Instructions

1. Go to **[Vercel Dashboard](https://vercel.com/)** → Your project **internship-command-center**
2. Click **Settings** tab → **Environment Variables**
3. Add each variable below. For **Environment**, select all three: **Production**, **Preview**, **Development**.

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jzrsrruugcajohvvmevg.supabase.co` | Exact URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The `eyJ*` key from Step 2 | NOT the `sb_publishable_*` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `REDACTED_SUPABASE_KEY` | Keep this secret — never expose client-side |
| `GOOGLE_CLIENT_ID` | From Step 3 Part A | Ends in `.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | From Step 3 Part A | Starts with `GOCSPX-` |

4. Click **Save** for each one.

### Variables NOT Needed Yet (Future Phases)

These are placeholders — you'll set them when you build those phases:
- `ANTHROPIC_API_KEY` — Phase 1 (AI agents)
- `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` — Phase 2 (background jobs)
- `RESEND_API_KEY` — Phase 2 (email sending, already have key)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Phase 6 (payments)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — Phase 6 (rate limiting)

---

## Step 5: Merge Branch + Deploy to Production

**Why:** All Phase 0 code is on the `docs-handoff` branch. Vercel's production deployment is configured to deploy from `main`. Merging makes the new code go live.

### Option A: Merge via GitHub (Recommended)

1. Go to **[GitHub repo](https://github.com/armaansarora/internship-command-center)**
2. Click **Pull requests** tab
3. Click **New pull request**
4. Set:
   - **base:** `main`
   - **compare:** `docs-handoff`
5. Click **Create pull request**
6. Title: "Phase 0: The Shell — complete foundation"
7. Click **Merge pull request** → **Confirm merge**
8. Vercel will auto-deploy to production within ~60 seconds.

### Option B: Change Production Branch in Vercel (Alternative)

If you'd rather not merge yet:
1. Go to **[Vercel Dashboard](https://vercel.com/)** → Your project
2. Click **Settings** → **Git**
3. Under **Production Branch**, change from `main` to `docs-handoff`
4. Save. Vercel will redeploy from `docs-handoff` as production.

### Verify Production Deploy

1. After merge/branch change, go to **[Vercel Dashboard](https://vercel.com/)** → **Deployments**
2. Wait for the latest deployment to show **Ready** (green checkmark)
3. Visit **[https://internship-command-center-lake.vercel.app](https://internship-command-center-lake.vercel.app)**
4. You should see The Tower lobby with the construction aesthetic
5. Try "Sign in with Google" — if Step 3 was done correctly, it should redirect to Google, then back to the Penthouse

---

## Verification Checklist

After completing all 5 steps, verify everything works:

- [ ] **Database:** Supabase Table Editor shows 16 tables
- [ ] **Auth:** Visiting the production URL shows the Lobby
- [ ] **Sign In:** "Sign in with Google" works and redirects to Penthouse
- [ ] **Dashboard:** Penthouse shows glass+gold stat cards (with placeholder data)
- [ ] **Elevator:** On desktop, left-side elevator panel appears with floor buttons
- [ ] **Skyline:** Background shows NYC skyline that changes with time of day
- [ ] **Build:** Vercel deployment shows no build errors

---

## Troubleshooting

### "Invalid API key" or blank page after deploy
→ Check Vercel env vars. The `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must be the `eyJ*` anon key, not the `sb_publishable_*` key. After changing env vars, trigger a redeploy (Vercel → Deployments → three-dot menu → Redeploy).

### Google sign-in redirects but fails
→ Check the redirect URI in Google Cloud Console. It must be EXACTLY: `https://jzrsrruugcajohvvmevg.supabase.co/auth/v1/callback` — no trailing slash, no typos.

### Sign-in works but stays on Lobby
→ The middleware might not detect the session. Check browser dev console for errors. Most likely the Supabase publishable key is wrong.

### Skyline/Elevator not rendering
→ These are client components that need JavaScript. If the site loads but looks plain, check for JS errors in the browser console (F12 → Console tab).

### "Module not found" build error on Vercel
→ Make sure you merged the `docs-handoff` branch (not an older branch). The `main` branch has old code that's missing the new files.

---

## What's Next (Phase 1)

Phase 0 is the foundation. Phase 1 ("The War Room") adds:
- Real Supabase data queries replacing placeholder stats
- AI agent integration (Anthropic Claude)
- Application tracking with real CRUD
- Email parsing pipeline

Start a new chat session and reference `PROJECT-CONTEXT.md` for full state.
