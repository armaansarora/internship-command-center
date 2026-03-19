# PROJECT CONTEXT — Internship Command Center ("The Tower")
## Operational Reference — Auto-Updated Every Interaction

**Last updated:** 2026-03-19T02:25:00-04:00 (EDT)
**Owner:** Armaan Arora (armaansarora20@gmail.com, GitHub: armaansarora)

---

## 0. SESSION BOOTSTRAP

1. `memory_search` for "internship command center project"
2. Read this file + `.env.local` for credentials
3. Read the doc relevant to your task:
   - Building a phase → `docs/MASTER-PLAN.md` (acceptance criteria, deliverables, testing)
   - Making UI decisions → `docs/VISION-SPEC.md` (spatial UI, characters, design tokens)
   - Choosing a library/pattern → `docs/TECH-BRIEF.md` (research findings, code patterns)
   - Understanding codebase → `docs/AUDIT.md` (keep/kill, LOC counts)
   - Schema questions → `docs/SCHEMA-DRAFT.md` (16 tables, RLS, pgvector)
   - Character behavior → `docs/CHARACTER-PROMPTS.md` (system prompts, voices)
   - File placement → `docs/FILE-STRUCTURE.md` (project tree)
4. Load skills: `website-building/webapp`, `design-foundations`, `coding-and-data`
5. Confirm connectors: `list_external_tools` for supabase, resend, github, vercel, gcal, google_drive
6. **Auto-update this file after every interaction.** Even minor things.

---

## 1. ARMAAN ARORA

| Field | Value |
|---|---|
| Email | armaansarora20@gmail.com |
| GitHub | armaansarora (https://github.com/armaansarora) |
| Timezone | America/Puerto_Rico (AST, UTC-4) |
| Plan | Perplexity Max |
| Background | Student, real estate internship search |
| Targets | Blackstone, CBRE, JLL, Cushman & Wakefield, Marcus & Millichap, Newmark, Colliers, Eastdil Secured, HFF, Walker & Dunlop, Hines, Brookfield |
| Working style | Analytical, direct. Cut the fat, keep the meat. Demands depth. |
| Model pref | System decides per task |
| Sources | web, vercel, gcal, google_drive, github_mcp_direct |

---

## 2. PROJECT OVERVIEW

Multi-tenant SaaS for automating internship/job searches. Users sign in, connect Google, and the system handles email parsing, application tracking, follow-ups, interview prep, cover letters, analytics, and AI agent orchestration. Planned for eventual sale.

**Codename:** The Tower
**UI Paradigm:** Immersive spatial building — elevator navigation, floor-based rooms, 2D illustrated characters (see docs/VISION-SPEC.md)

---

## 3. PRODUCTION STACK

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Supabase Postgres |
| ORM | Drizzle |
| Auth | Supabase Auth (Google OAuth) |
| Background Jobs | Inngest |
| AI/LLM | Vercel AI SDK v6 + Anthropic |
| Animations | GSAP + Framer Motion |
| Email | Resend |
| Cache/Rate Limit | Upstash Redis |
| Embeddings | pgvector (Supabase extension) |
| Hosting | Vercel |
| Payments | Stripe |
| CI/CD | GitHub Actions |
| Monitoring | Sentry (Phase 2+) |

**Rejected:** Neon (Supabase is all-in-one), Better Auth/NextAuth (Supabase Auth + RLS), Clerk/Auth0 (expensive, vendor lock-in), Google Sheets as DB.

---

## 4. CREDENTIALS

All credentials stored in `/home/user/workspace/command-center/.env.local`.

| Service | Key Detail |
|---|---|
| Supabase | Project `jzrsrruugcajohvvmevg`, URL `https://jzrsrruugcajohvvmevg.supabase.co`, East US |
| Resend | API key in .env.local |
| Vercel | Project `prj_C6B6ZEsG5khpsISEzvgaMQzo9r5g`, Team `team_EC8AIyc155clLRjzrJ0fblpa` |
| GitHub | Repo `armaansarora/internship-command-center`, push protection ON |

### Vercel Environment Variables (set in Vercel dashboard)
| Variable | Source | Required By |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Phase 0 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | Phase 0 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Phase 0 (Inngest, background jobs) |
| `SUPABASE_DB_URL` | Supabase direct connection string | Phase 0 (Drizzle migrations) |
| `RESEND_API_KEY` | Resend dashboard | Phase 2 |
| `INNGEST_EVENT_KEY` | Inngest dashboard | Phase 2 |
| `INNGEST_SIGNING_KEY` | Inngest dashboard | Phase 2 |
| `ANTHROPIC_API_KEY` | Anthropic console | Phase 1 (agents) |
| `STRIPE_SECRET_KEY` | Stripe dashboard | Phase 6 |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard | Phase 6 |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | Phase 0 (auth) |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | Phase 0 (auth) |
| `UPSTASH_REDIS_REST_URL` | Upstash console | Phase 6 |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console | Phase 6 |

### Connected Connectors
| Connector | Status |
|---|---|
| github_mcp_direct | CONNECTED |
| vercel | CONNECTED |
| gcal | CONNECTED |
| google_drive | CONNECTED |
| supabase__pipedream | CONNECTED |
| resend__pipedream | CONNECTED |
| stripe | CONNECTED |
| google_sheets__pipedream | CONNECTED |

---

## 5. CODE AUDIT SUMMARY

Full audit in `docs/AUDIT.md`. Old repo: ~19,800 LOC, 200+ files. **Armaan approved audit 2026-03-18.**

### Keep (~7,000 LOC)
| Module | LOC | Adapt |
|---|---|---|
| Contracts | 1,015 | Update DepartmentId enum |
| Agent System | 1,815 | Swap Turso → Supabase |
| Gmail | 304 | Rewire OAuth token source |
| Calendar | ~400 | Rewire OAuth token source |
| Schema | 517 | SQLite→PG, add userId, RLS, pgvector |
| Agent Tools | ~500 | Swap DB layer |
| Tests | 2,531 | Update DB mocks |
| Hooks | ~300 | Keep as-is |

### Kill (~12,800 LOC)
All UI components, all pages, auth, DB connection, 147 planning docs, Sentry, service worker, Novel editor, SQLite migrations, old design tokens.

---

## 6. DOCUMENT MAP

All planning docs are in `docs/`. Operational files stay in root.

| File | Purpose | Lines |
|---|---|---|
| `PROJECT-CONTEXT.md` | THIS FILE — operational context, credentials, stack, audit summary (root) | ~200 |
| `BOOTSTRAP-PROMPT.md` | Copy-paste prompt for new chat sessions (root) | ~90 |
| `CLAUDE.md` | Codebase summary for AI coding assistants (root) | ~45 |
| `docs/MASTER-PLAN.md` | All 7 phases with deliverables, acceptance criteria, testing strategy, error handling | ~360 |
| `docs/VISION-SPEC.md` | Locked spatial UI spec: building, floors, characters, cursor, day/night, design tokens | ~250 |
| `docs/TECH-BRIEF.md` | Research synthesis + Google OAuth setup. ⚠️ warnings on Inngest Realtime, Drizzle RLS bugs, @supabase/ssr changes | ~430 |
| `docs/SCHEMA-DRAFT.md` | 16-table Postgres schema: RLS on ALL tables, pgvector HNSW indexes, post-push SQL triggers | ~470 |
| `docs/CHARACTER-PROMPTS.md` | System prompts for all 8 characters + Concierge. Multi-tenant ready ({USER_NAME} templating) | ~225 |
| `docs/FILE-STRUCTURE.md` | Complete project file tree: pages, components, lib, agents, types, tests | ~190 |
| `docs/AUDIT.md` | File-by-file keep/kill verdicts for old repo (reference) | ~180 |
| `.env.local` | All credentials (never commit) | — |
| `.env.example` | Template with all required env vars, organized by phase | ~45 |

**Old repo clone:** `/home/user/workspace/old-repo-audit/`

---

## 7. CURRENT STATE

**Phase:** 0 — The Shell (COMPLETE) + Immersive UI Rebuild (COMPLETE)
**Branch:** `main` (commit `f424ffd` + audit fix pending)
**Last commit:** Supabase data wiring for Penthouse (`f424ffd`)
**Production:** `internship-command-center-lake.vercel.app`

### Completed (All Tasks 0.1–0.10)

#### Foundation (0.1–0.4, commit `209ad16`)
- ✅ Fresh Next.js 16 project (old code wiped, deps installed)
- ✅ 16-table Drizzle schema with RLS policies + type exports
- ✅ Supabase Auth: Google OAuth, middleware, server/client/admin clients
- ✅ Root layout: Playfair Display + Satoshi (Fontshare CDN) + JetBrains Mono
- ✅ Auth routing: `/` → `/penthouse` or `/lobby` based on session
- ✅ Lobby page: Google OAuth sign-in with Tower branding
- ✅ Authenticated layout with WorldShell (DayNightProvider + CustomCursor)
- ✅ FloorShell component (sky gradient, window tint, floor badge)
- ✅ All 9 floor stubs under `(authenticated)/` route group — ALL wrapped in FloorShell
- ✅ DayNightProvider (7 time states, updates every 60s, sets data-time on html)
- ✅ CustomCursor (7 contextual states, touch device fallback, RAF animation)
- ✅ Design token system in CSS (gold, dark, glass, day/night states)
- ✅ Tailwind v3 config with Tower tokens
- ✅ Generated migration SQL via `drizzle-kit generate` (353 + 1 incremental lines)
- ✅ Recursive audit: 15 findings, all fixed (see commit `209ad16`)

#### Skyline (0.5, replaced by Immersive Rebuild)
- ✅ Original `Skyline.tsx` renamed to `SkylineSVG.tsx` (kept as fallback)
- ✅ **Replaced by photorealistic SkylineScene** (see Immersive UI Rebuild below)

#### Elevator (0.6, upgraded in Immersive Rebuild)
- ✅ `src/components/world/Elevator.tsx` — 318 lines, GSAP-powered
- ✅ Door open/close animation with GSAP timeline
- ✅ Floor counter with animated number display
- ✅ Fixed left position, auto-hide on Lobby/Penthouse
- ✅ `useReducedMotion()` custom hook for SSR safety
- ✅ Keyboard accessible: Enter/Space to toggle, arrow keys to navigate floors
- ✅ **Upgraded:** Dark wash overlay during floor transitions
- ✅ Imported in `world-shell.tsx` with `md:ml-16` offset for main content

#### Lobby Upgrade (0.7, audited)
- ✅ `src/app/lobby/lobby-client.tsx` — full rewrite with construction aesthetic
- ✅ Construction stripes, blueprint grid background
- ✅ Building directory showing all 9 floors with status (Coming Soon / Active)
- ✅ Returning user detection via Supabase session check
- ✅ Different messaging for new vs. returning users
- ✅ TowerMark SVG logo component
- ✅ Animated entrance sequence

#### Penthouse Dashboard (0.8, upgraded in Immersive Rebuild)
- ✅ `src/app/(authenticated)/penthouse/penthouse-client.tsx` — glass+gold dashboard over immersive skyline
- ✅ `src/app/(authenticated)/penthouse/page.tsx` — server component fetches Supabase data
- ✅ `src/app/(authenticated)/penthouse/penthouse-data.ts` — Supabase data fetcher with graceful degradation
- ✅ Stat cards: Applications, In Pipeline, Interviews, Response Rate — **REAL DATA from Supabase**
- ✅ Pipeline visualization (stages: Saved → Applied → Screen → Interview → Offer)
- ✅ Activity feed with relative timestamps
- ✅ Quick action buttons (disabled, Phase 1+)
- ✅ **Upgraded:** Glass panels with backdrop-blur over immersive background
- ✅ **Upgraded:** EntranceSequence cinematic first-login animation wrapper

#### Contracts Port (0.9, audited)
- ✅ `src/lib/contracts/` — 9 files, 1,015 LOC ported from old repo
- ✅ `events.ts` — TypedEventEmitter, event catalog
- ✅ `agent-protocol.ts` — AgentContext, message types, capabilities
- ✅ `api.ts` — API contract types, response envelopes, error codes
- ✅ `notifications.ts` — Notification system types, channels, preferences
- ✅ `ui.ts` — Floor, navigation, theme, cursor, animation types
- ✅ `index.ts` — Barrel export
- ✅ `departments/cro.ts` — CRO department contracts (pipeline, outreach)
- ✅ `departments/cio.ts` — CIO department contracts (integrations, API keys)
- ✅ `departments/coo.ts` — COO department contracts (scheduling, follow-ups)
- ✅ All Turso/Auth.js references removed, Supabase types used

#### Deploy (0.10)
- ✅ Production build passes (`next build` — zero errors, all routes compile)
- ✅ Code committed and pushed to `main` branch
- ✅ Production deployed at `internship-command-center-lake.vercel.app`

#### Immersive UI Rebuild (per docs/IMMERSIVE-UI-PLAN.md)
Complete replacement of SVG skyline with photorealistic CSS 3D parallax system.

**New Components:**
- ✅ `src/components/world/SkylineScene.tsx` — master immersive background (6-layer stack)
- ✅ `src/components/world/SkylineLayers.tsx` — CSS 3D perspective parallax (4 photo layers per variant)
- ✅ `src/components/world/AtmosphericEffects.tsx` — vignette, height fog, night bloom, sky fade
- ✅ `src/components/world/DustMotes.tsx` — tsParticles overlay (~40 particles, 30fps cap)
- ✅ `src/components/world/WindowTint.tsx` — glass effect with backdrop-filter
- ✅ `src/components/transitions/EntranceSequence.tsx` — cinematic first-login (GSAP, 2s, sessionStorage skip)

**New Hooks:**
- ✅ `src/hooks/useMouseParallax.ts` — RAF-based lerp mouse tracking, ref-stable loop
- ✅ `src/hooks/useSkylineVariant.ts` — day/night variant from DayNightProvider
- ✅ `src/hooks/useReducedMotion.ts` — SSR-safe reduced motion check

**Generated Assets:**
- ✅ `public/skyline/day/{sky,far,mid,near}.webp` + mobile + PNG variants (8 files)
- ✅ `public/skyline/night/{sky,far,mid,near}.webp` + mobile + PNG variants (8 files)
- ✅ `public/skyline/fallback.webp`, `fallback-day.webp`, `fallback-night.webp`
- ✅ `scripts/create-skyline-layers.py` — Python script that generated the layers

**Modified Files:**
- ✅ `FloorShell.tsx` — now uses SkylineScene instead of SVG Skyline
- ✅ `Elevator.tsx` — added dark wash overlay, uses shared useReducedMotion
- ✅ `penthouse-client.tsx` — glass panels, EntranceSequence wrapper, accepts real data
- ✅ `penthouse/page.tsx` — passes Supabase data to client

**New Dependencies:** `lenis` (installed, Phase 2 usage), `@tsparticles/react`, `@tsparticles/slim`, `@tsparticles/engine`

**Audit (Session 7):**
- Fixed: `useMouseParallax` RAF cascade (state in useCallback deps → ref-based stable loop)
- Fixed: Double dynamic import for DustMotes (removed redundant `dynamic()` in SkylineScene)
- Accepted: `as any` cast in DustMotes for tsParticles v3 RecursivePartial types
- Verified: All CSS vars defined, all imports resolvable, all key props present, aria attributes correct, no console.logs, no TODOs, TS strict clean

### Manual Steps Required (See MANUAL-GUIDE.md)
1. Run `migration-full.sql` in Supabase SQL Editor
2. Run `src/db/post-push.sql` in Supabase SQL Editor (triggers + pgvector)
3. Configure Google OAuth in Google Cloud Console + Supabase dashboard
4. Set Vercel environment variables
5. Merge `docs-handoff` → `main` for production deploy
6. Verify Supabase anon key format (`eyJ*` for REST API)

### File Structure (current)
```
src/
├── app/
│   ├── layout.tsx              # Root layout (fonts, meta)
│   ├── page.tsx                # Auth redirect
│   ├── globals.css             # Tokens, day/night, glass utilities
│   ├── lobby/
│   │   ├── page.tsx            # Server: auth check
│   │   └── lobby-client.tsx    # Client: construction aesthetic, returning user, TowerMark
│   ├── (authenticated)/
│   │   ├── layout.tsx          # Auth gate + WorldShell
│   │   ├── world-shell.tsx     # Client: DayNight + Cursor + Elevator, md:ml-16 offset
│   │   ├── penthouse/
│   │   │   ├── page.tsx            # Server: fetches Supabase data → PenthouseClient
│   │   │   ├── penthouse-client.tsx # Glass+gold dashboard with EntranceSequence
│   │   │   └── penthouse-data.ts   # Supabase queries (stats, pipeline, activity)
│   │   ├── war-room/page.tsx   # Phase 1 stub (FloorShell 7)
│   │   ├── rolodex-lounge/    # Phase 3 stub (FloorShell 6)
│   │   ├── writing-room/      # Phase 4 stub (FloorShell 5)
│   │   ├── situation-room/    # Phase 2 stub (FloorShell 4)
│   │   ├── briefing-room/     # Phase 4 stub (FloorShell 3)
│   │   ├── observatory/       # Phase 5 stub (FloorShell 2)
│   │   └── c-suite/           # Phase 5 stub (FloorShell 1)
│   └── api/auth/
│       ├── callback/route.ts   # OAuth callback
│       └── signout/route.ts    # Sign-out (NextResponse redirect)
├── components/
│   ├── world/
│   │   ├── DayNightProvider.tsx     # Time state context
│   │   ├── CustomCursor.tsx         # Gold cursor system
│   │   ├── FloorShell.tsx           # Immersive skyline + room content + floor badge
│   │   ├── SkylineScene.tsx         # Master immersive background (6-layer stack)
│   │   ├── SkylineLayers.tsx        # CSS 3D perspective parallax (4 photo layers)
│   │   ├── AtmosphericEffects.tsx   # Vignette, height fog, night bloom, sky fade
│   │   ├── DustMotes.tsx            # tsParticles overlay (~40 particles)
│   │   ├── WindowTint.tsx           # Glass effect with backdrop-filter
│   │   ├── SkylineSVG.tsx           # Old SVG skyline (fallback, renamed)
│   │   └── Elevator.tsx             # 318 LOC — GSAP doors, dark wash, floor counter
│   └── transitions/
│       └── EntranceSequence.tsx     # Cinematic first-login animation (GSAP)
├── hooks/
│   ├── useMouseParallax.ts    # RAF-based lerp mouse tracking (ref-stable)
│   ├── useSkylineVariant.ts   # Day/night variant from DayNightProvider
│   └── useReducedMotion.ts    # SSR-safe reduced motion check
├── db/
│   ├── schema.ts               # 16 tables, RLS, types, all FKs
│   ├── index.ts                # Drizzle client
│   ├── migrations/             # Generated SQL (0000 base + 0001 FK fix)
│   └── post-push.sql           # Triggers (handle_new_user, updated_at) + pgvector indexes
├── lib/
│   ├── supabase/{client,server,admin,middleware}.ts
│   ├── day-night.ts            # Time state calculation
│   ├── utils.ts                # cn(), formatRelativeDate()
│   └── contracts/              # 1,015 LOC — ported from old repo
│       ├── index.ts            # Barrel export
│       ├── events.ts           # TypedEventEmitter, event catalog
│       ├── agent-protocol.ts   # AgentContext, message types, capabilities
│       ├── api.ts              # API contract types, envelopes, error codes
│       ├── notifications.ts    # Notification types, channels, preferences
│       ├── ui.ts               # Floor, nav, theme, cursor, animation types
│       └── departments/
│           ├── cro.ts          # CRO contracts (pipeline, outreach)
│           ├── cio.ts          # CIO contracts (integrations, API keys)
│           └── coo.ts          # COO contracts (scheduling, follow-ups)
├── types/{ui,api,agents}.ts
└── middleware.ts               # Route protection

public/skyline/
├── day/{sky,far,mid,near}.{webp,png} + mobile variants
├── night/{sky,far,mid,near}.{webp,png} + mobile variants
└── fallback.webp, fallback-day.webp, fallback-night.webp
```

---

## 8. OPEN QUESTIONS

1. Google OAuth app in Testing mode — must publish before real users (Phase 2 deadline)
2. Custom domain? Not discussed yet
3. Stripe pricing tiers? Not decided yet
4. Character art source? AI-generated (Flux.1 + LoRA) vs. commissioned vs. open-source
5. Weather API provider? OpenWeatherMap free tier proposed
6. Sound assets? Royalty-free, procedural, or commissioned
7. Upstash Redis — not yet provisioned
8. ⚠️ Supabase publishable key format: `sb_publishable_*` — may need classic `eyJ*` anon key for REST API auth. Verify in Supabase dashboard → Settings → API.

---

## 9. SESSION LOG

| Session | Date | Work Done |
|---|---|---|
| 1 | 2026-03-18 | Created Phase 0 foundation: Next.js 16, 16-table schema, Auth, layout, all stubs |
| 2 | 2026-03-18 | Recursive audit (15 findings), all fixed. Commit `209ad16`. |
| 3 | 2026-03-18 | Started 0.5 Skyline, hit JSX type error mid-build. |
| 4 | 2026-03-18 | Fixed JSX → Built Skyline (0.5) → Elevator (0.6) → Lobby upgrade (0.7) → Penthouse (0.8) → Contracts (0.9, 1,015 LOC) → Deploy (0.10). Commit `dc73756`. Vercel preview READY. |
| 5 | 2026-03-18 | Updated PROJECT-CONTEXT.md, compiled MANUAL-GUIDE.md for Armaan. |
| 6 | 2026-03-18 | Final recursive audit: found missing `handle_new_user` trigger → created `src/db/post-push.sql`. Rewrote BOOTSTRAP-PROMPT.md for Phase 1 handoff. Updated MANUAL-GUIDE.md with post-push step. |
| 7 | 2026-03-19 | **Immersive UI Rebuild** (IMMERSIVE-UI-PLAN.md): Generated day+night NYC skyline photos, depth-separated into 4 layers each. Built SkylineScene (CSS 3D parallax), AtmosphericEffects, DustMotes, WindowTint, EntranceSequence, useMouseParallax, useSkylineVariant, useReducedMotion. Upgraded Elevator (dark wash), Penthouse (glass panels + real Supabase data). Fixed tsParticles v2/v3 conflict. Recursive audit: fixed RAF cascade in useMouseParallax, removed double dynamic import. All pushed to `main`. |

---

## 10. TECHNICAL NOTES

- **React 19 + Next.js 16:** JSX namespace must be explicitly imported: `import type { JSX } from "react"`
- **Elevator SSR safety:** Uses `useReducedMotion()` custom hook (not inline `window.matchMedia`)
- **Timer cleanup:** `tickTimersRef.current` tracks setTimeout IDs for cleanup on unmount
- **Drizzle RLS:** Third-argument array pattern, NOT `.withRLS()`
- **@supabase/ssr:** NOT deprecated auth-helpers
- **Tailwind:** v3 with JS config (NOT v4 with CSS config)
- **Old repo reference:** `/home/user/workspace/internship-command-center-8c4c1ad1/src/contracts/`
- **Vercel auto-deploy:** `main` gets production
- **tsParticles v3:** Uses `initParticlesEngine` + `loadSlim`, NOT v2 `init` prop pattern
- **tsParticles `as any` cast:** Required for deeply nested RecursivePartial types, documented with eslint-disable
- **useMouseParallax:** Uses ref-stable RAF loop (not useCallback with state deps) to avoid cascade teardown
- **SkylineLayers uses `<img>` not `next/image`:** Intentional — photos are inside CSS 3D perspective containers, `next/image` would interfere with absolute positioning and transforms
- **Lenis:** Installed but not yet wired — planned for Phase 2 smooth scroll integration
- **EntranceSequence:** Uses sessionStorage for "played" flag — appropriate for per-session entrance
