# PROJECT CONTEXT — Internship Command Center ("The Tower")
## Operational Reference — Auto-Updated Every Interaction

**Last updated:** 2026-03-19T15:31:00-04:00 (EDT)
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

All credentials stored in `.env.local` (repo root, never committed).

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

**Phase:** 0 — The Shell (COMPLETE) + Phase 0 Visual Overhaul (COMPLETE)
**Branch:** `main` (commit `b61d6d0`)
**Last commit:** Phase 0 complete visual overhaul — lobby, penthouse, skyline, elevator, floor stubs (`b61d6d0`)
**Production:** `internship-command-center-lake.vercel.app`
**LOC:** 6,854 across 46 source files

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

#### Phase 0 Visual Overhaul (Session 10 — replaced Immersive UI Rebuild)
Complete replacement of the CSS 3D parallax skyline system with a procedural Canvas renderer. Redesigned every screen for bigger, bolder, more immersive visuals.

**Replaced Components (old → new):**
- ✅ SkylineScene/SkylineLayers/AtmosphericEffects/DustMotes/WindowTint → `ProceduralSkyline.tsx` (818 lines, canvas-based)
- ✅ `ProceduralSkyline.tsx` — time-aware via `useDayNight()` + `getSkyConfig()`, 7 sky gradient palettes, animated window lights, stars fade at dawn, lobby defaults to night

**Redesigned Components:**
- ✅ `lobby-client.tsx` — 672 lines. Commanding text-5xl/7xl title, premium glass sign-in card, wider directory (max-w-lg), 500px spotlight, stronger vignette
- ✅ `penthouse-client.tsx` — 862 lines. Custom SVG icons (no emojis), text-3xl counters, stronger glass panels (0.82 opacity), Playfair headings
- ✅ `FloorShell.tsx` — 174 lines. Stronger vignette, 3 mullions at 15/50/85%, bottom fog, floor-specific ambient light (PH=gold, 7=blue, others=neutral), gold dot on floor badge
- ✅ `Elevator.tsx` — 450 lines. Richer nav panel (rgba(10,12,25,0.85), gold left edge), door brushed-metal texture, text-6xl counter, tooltips on buttons
- ✅ `globals.css` — 370 lines. Added: `.glass-panel`, `.glass-panel-gold`, fade-in/fade-in-scale animations, `.gold-glow`/`.gold-glow-strong`, scrollbar styling, `.floor-content`
- ✅ 7 floor stubs — each with unique visual atmosphere (War Room=tactical grid, Rolodex=amber lounge, Writing Room=ruled lines, Situation Room=alert pulses, Briefing Room=blueprint grid, Observatory=range rings, C-Suite=herringbone)

**Deleted (orphaned):**
- SkylineScene.tsx, SkylineLayers.tsx, AtmosphericEffects.tsx, DustMotes.tsx, WindowTint.tsx, SkylineSVG.tsx
- useMouseParallax.ts, useSkylineVariant.ts

**Kept from previous:**
- ✅ `EntranceSequence.tsx` — cinematic first-login (GSAP, 2s, sessionStorage skip)
- ✅ `useReducedMotion.ts` — SSR-safe reduced motion check
- ✅ `public/skyline/` images — kept as fallback assets

**Key Design Decisions:**
- Lobby's ProceduralSkyline defaults to "night" timeState (outside DayNightProvider context) — intentional, lobby always dark/moody
- Design tokens: Gold `#C9A84C`, Dark `#1A1A2E`, Glass blur 16px, Playfair Display/Satoshi/JetBrains Mono

**Audit (Session 10):**
- Pass 1: Found and removed orphaned `useMouseParallax.ts`
- Pass 2: All 5 questions return "nothing" — zero TS errors, clean build, no console.logs/TODOs/any types, 83 aria attributes, 7 role attributes
- CSS utility classes (glass-panel-gold, gold-glow, etc.) intentionally kept as design system infrastructure for Phase 1+

### Manual Steps (ALL COMPLETED as of Session 7)
1. ~~Run `migration-full.sql` in Supabase SQL Editor~~ DONE
2. ~~Run `src/db/post-push.sql` in Supabase SQL Editor~~ DONE
3. ~~Configure Google OAuth in Google Cloud Console + Supabase dashboard~~ DONE
4. ~~Set Vercel environment variables~~ DONE
5. ~~Merge `docs-handoff` → `main`~~ DONE
6. ~~Verify Supabase anon key format~~ DONE (eyJ* format confirmed)

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
│   │   ├── DayNightProvider.tsx     # Time state context (7 states, 60s updates)
│   │   ├── CustomCursor.tsx         # Gold cursor system (7 contextual states)
│   │   ├── FloorShell.tsx           # 174 LOC — vignette, mullions, fog, floor-specific ambient light
│   │   ├── ProceduralSkyline.tsx    # 818 LOC — Canvas renderer, time-aware, 7 sky palettes, stars, window lights
│   │   └── Elevator.tsx             # 450 LOC — GSAP doors, brushed-metal, text-6xl counter, tooltips
│   └── transitions/
│       └── EntranceSequence.tsx     # Cinematic first-login animation (GSAP, 2s)
├── hooks/
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
8. ~~⚠️ Supabase publishable key format~~ RESOLVED — `eyJ*` anon key confirmed working (Session 7)

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
| 8 | 2026-03-19 | **Bootstrap System Overhaul** — 10 improvements to session handoff infrastructure. (1) Husky pre-commit hook auto-regenerates BOOTSTRAP-PROMPT.md on every commit. (2) SESSION-STATE.json system for capturing mid-task state. (3) Build health check (tsc) embedded in bootstrap output. (4) Git diff since last bootstrap generation with commit tracking. (5) Acceptance criteria auto-tracking — parses MASTER-PLAN.md and checks code for evidence. (6) Dependency freshness check (npm outdated, major versions). (7) Vercel deploy status via check-vercel.ts. (8) Context budget estimation (~tokens for recommended reading files). (9) `npm run session:end` — single command chains type check → bootstrap → commit → push. (10) GitHub Actions CI guard for bootstrap staleness. Also: update-session-state.ts CLI, session-end.ts dry-run mode, fixed shell injection in commit message. 2-pass recursive audit clean. |
| 9 | 2026-03-19 | **Automation hardening** — Eliminated all manual commands from human workflow. Added 5 mandatory agent behavior rules to CLAUDE.md: (1) auto-update SESSION-STATE.json, (2) auto-run session:end, (3) Vercel check, (4) no dirty state, (5) context window management with 40/60/70% thresholds and mandatory handoff. Fixed bootstrap Quick Start to mandate CLAUDE.md reading (was previously telling agents to skip it). CLI scripts kept as fallbacks. **User reviewed live site and flagged immersive UI as poor quality** — skyline image doesn't fit page, UI components hard to see. Next session must do a complete visual overhaul before Phase 1. |
| 10 | 2026-03-19 | **Phase 0 Complete Visual Overhaul** — Replaced entire CSS 3D parallax skyline (SkylineScene, SkylineLayers, AtmosphericEffects, DustMotes, WindowTint) with `ProceduralSkyline.tsx` (818-line canvas renderer, time-aware, 7 sky palettes, animated window lights, stars). Redesigned lobby (672 LOC — commanding typography, premium glass sign-in, 500px spotlight), penthouse (862 LOC — custom SVG icons, text-3xl counters, stronger glass), FloorShell (174 LOC — stronger vignette, mullions, floor-specific ambient), Elevator (450 LOC — brushed-metal texture, tooltips, text-6xl counter), globals.css (370 LOC — glass utilities, animations, gold glows), and all 7 floor stubs with unique visual atmospheres. Deleted 8 orphaned files (6 components + 2 hooks). 6,854 LOC, 46 files. Commit `b61d6d0`, pushed to main. 2-pass recursive audit clean. |

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
- **ProceduralSkyline:** Canvas-based renderer replaces all photo-based skyline components. Defaults to "night" outside DayNightProvider context (intentional for lobby). Uses `useDayNight()` hook + `getSkyConfig()` for time-aware rendering
- **EntranceSequence:** Uses sessionStorage for "played" flag — appropriate for per-session entrance
- **Floor stubs:** Each has unique CSS atmosphere (grid patterns, gradients, animations) — not empty shells
- **Lenis:** Installed but not yet wired — planned for Phase 2 smooth scroll integration
- **Old skyline images:** `public/skyline/` still present as fallback assets, not currently referenced
