# External Integrations

**Analysis Date:** 2026-03-06

## APIs & External Services

**Backend-as-a-Service:**
- Supabase - Database, authentication, and leaderboard storage
  - SDK/Client: `@supabase/supabase-js` ^2.98.0, `@supabase/ssr` ^0.9.0
  - Client singleton: `bike-race/src/lib/supabase.ts`
  - Auth env var: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - URL env var: `NEXT_PUBLIC_SUPABASE_URL`

**Fonts:**
- Google Fonts (via Next.js) - Geist Sans and Geist Mono typefaces
  - Loaded via `next/font/google` in `bike-race/src/app/layout.tsx`
  - No separate API key required; handled by Next.js font optimization

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Client: `@supabase/supabase-js` (`createClient`) in `bike-race/src/lib/supabase.ts`
  - Tables used (inferred from queries in `bike-race/src/app/page.tsx`, `bike-race/src/components/AuthModal.tsx`, `bike-race/src/components/Leaderboard.tsx`):
    - `profiles` - User profiles with `id`, `username`, `total_stars` columns
    - `progress` - Per-user per-level progress with `user_id`, `level_id`, `stars`, `best_time` columns; unique constraint on `(user_id, level_id)`
    - `leaderboards` - Race time records with `user_id`, `level_id`, `time`, `bike_id`, `recorded_at` columns; joined with `profiles` via foreign key
    - `bike_unlocks` - Unlocked bikes per user with `user_id`, `bike_id` columns; unique constraint on `(user_id, bike_id)`

**File Storage:**
- Local filesystem only (static assets in `bike-race/public/`)

**Caching:**
- Browser `localStorage` - Used as offline/guest fallback for progress, unlocked bikes, and selected bike in `bike-race/src/app/page.tsx`
  - Key: `bikerace_progress`
  - Data: `{ progress, unlockedBikes, selectedBike }`

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: Email/password authentication via `supabase.auth.signUp()` and `supabase.auth.signInWithPassword()` in `bike-race/src/components/AuthModal.tsx`
  - Session retrieval: `supabase.auth.getSession()` on page load in `bike-race/src/app/page.tsx`
  - Guest mode: Supported - users can bypass auth and play as "Guest" with progress stored only in `localStorage`
  - No OAuth/social login providers detected

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- No structured logging framework; errors are caught with `try/catch` and displayed to the user in-UI (e.g., auth error messages in `bike-race/src/components/AuthModal.tsx`)

## CI/CD & Deployment

**Hosting:**
- Vercel (inferred from `bike-race/public/vercel.svg` and standard Next.js project structure)

**CI Pipeline:**
- None detected (no `.github/`, `.gitlab-ci.yml`, or similar config found)

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project API URL (referenced in `bike-race/src/lib/supabase.ts`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key (referenced in `bike-race/src/lib/supabase.ts`)

**Secrets location:**
- `bike-race/.env.local` - Local development environment file (not committed; in `.gitignore`)
- Both vars have the `NEXT_PUBLIC_` prefix, meaning they are embedded in the client-side bundle and visible in the browser — appropriate for the Supabase anon key but worth noting for security audits

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Browser APIs Used

- **Web Audio API** - Procedural sound synthesis for game events (engine noise, crash, finish, star collect, click, flip, unlock) in `bike-race/src/game/sounds.ts`; uses `AudioContext`, `OscillatorNode`, `GainNode`, `AudioBuffer`
- **HTML5 Canvas 2D API** - Game rendering in `bike-race/src/components/GameCanvas.tsx` via `bike-race/src/game/renderer.ts`
- **`performance.now()`** - High-precision timing for game loop and race clock in `bike-race/src/game/engine.ts`
- **`localStorage`** - Guest/offline progress persistence in `bike-race/src/app/page.tsx`

---

*Integration audit: 2026-03-06*
