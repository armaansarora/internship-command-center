# PROJECT CONTEXT — Internship Command Center ("The Tower")
## Operational Reference — Auto-Updated Every Interaction

**Last updated:** 2026-03-20T04:30:00-04:00 (EDT)
**Owner:** Armaan Arora (armaansarora20@gmail.com, GitHub: armaansarora)

---

## 0. SESSION BOOTSTRAP

1. `memory_search` for "internship command center project"
2. Read this file + `.env.local` for credentials
3. Read the doc relevant to your task:
   - Building a phase → `docs/MASTER-PLAN.md` (acceptance criteria, deliverables, testing)
   - Making UI decisions → `docs/VISION-SPEC.md` (spatial UI, characters, design tokens)
   - Choosing a library/pattern → `docs/TECH-BRIEF.md` (research findings, code patterns)
   - Understanding codebase → `docs/archive/AUDIT.md` (keep/kill, LOC counts — archived)
   - Schema questions → `docs/SCHEMA-DRAFT.md` (16 tables, RLS, pgvector)
   - Character behavior → `docs/CHARACTER-PROMPTS.md` (system prompts, voices)
   - AI hierarchy → `docs/CHAIN-OF-COMMAND.md` (CEO→CRO→5 subagents, system prompts, tools, RACI)
   - File placement → `BOOTSTRAP-PROMPT.md` (auto-generated project tree)
4. Load skills: `website-building/webapp`, `design-foundations`, `coding-and-data`
5. Confirm connectors: `list_external_tools` for supabase, resend, github, vercel, gcal, google_drive
6. **Auto-update this file after every interaction.** Even minor things.
7. **If you fix ANY bug:** Update `docs/BUG-TRACKER.md` — add changelog entry, move bug to CLOSED, update statistics. This is the living fix log.

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

Full audit in `docs/archive/AUDIT.md` (archived). Old repo: ~19,800 LOC, 200+ files. **Armaan approved audit 2026-03-18.**

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

> Auto-generated by `scripts/auto-organize-docs.ts`. Do not edit manually.

All planning docs are in `docs/`. Operational files stay in root.

| File | Purpose | Lines |
|---|---|---|
| `PROJECT-CONTEXT.md` | Operational context, credentials, stack, audit summary, session log (root) | ~350 |
| `BOOTSTRAP-PROMPT.md` | Auto-generated session entry point — source tree, build health, acceptance criteria (root) | ~550 |
| `CLAUDE.md` | Codebase summary, conventions, agent behavior rules, doc architecture (root) | ~240 |
| `docs/BUG-TRACKER.md` | Bug reports, fix log, sprint priorities | ~310 |
| `docs/CHAIN-OF-COMMAND.md` | AI agent hierarchy: CEO → CRO → 5 subagents, system prompts, tools, RACI | ~1590 |
| `docs/CHARACTER-PROMPTS.md` | System prompts for all 8 characters + Concierge, multi-tenant ready | ~230 |
| `docs/MASTER-PLAN.md` | 7 phases with deliverables, acceptance criteria, testing strategy | ~360 |
| `docs/SCHEMA-DRAFT.md` | 16-table Postgres schema: RLS, pgvector HNSW indexes, post-push SQL triggers | ~480 |
| `docs/TECH-BRIEF.md` | Research synthesis + Google OAuth setup, SDK patterns, gotchas | ~430 |
| `docs/VISION-SPEC.md` | Locked spatial UI spec: building, floors, characters, cursor, day/night, design tokens | ~250 |
| `docs/WAR-ROOM-BLUEPRINT.md` | Phase 1 implementation guide — architecture, CRO agent, DnD, design tokens | ~1480 |
| `docs/archive/` | Completed plans + research (7 files, reference only) | varies |


## 7. CURRENT STATE

**Phase:** 0 COMPLETE, Phase 1 IN PROGRESS — The War Room (code deployed, Vercel production live)
**Branch:** `main`
**Production:** `internship-command-center-lake.vercel.app`
**LOC:** ~9,200 across 50 source files
**Latest commit:** `d29842d` — fix(war-room): switch from Drizzle ORM to Supabase REST client

### Phase 1 Progress
- ✅ 1.1–1.6: Floor 7 War Room implementation committed (commit `4efb3cc` — 24 files, ~5,800 LOC)
- ✅ Phase 1 DB migration run (`drizzle-kit push` — added `position`, `company_name`, `last_activity_at` columns + composite index)
- ✅ ANTHROPIC_API_KEY set in Vercel production env vars
- ✅ War Room Vercel fix: replaced Drizzle ORM (direct postgres) with Supabase REST client in `war-room/page.tsx` (commit `d29842d`)
- ⚠️ pgvector extension NOT yet enabled (user needs to run SQL in Supabase dashboard)
- ⚠️ DB password needs rotation (was exposed during setup — ROTATE IMMEDIATELY)

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

File structure auto-generated in BOOTSTRAP-PROMPT.md — always current.

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
| 11 | 2026-03-19 | **Phase 1 Deep Research — The War Room Blueprint.** Launched 5 parallel research subagents: (1) Kanban/pipeline UIs — @dnd-kit vs pragmatic-dnd, GSAP Flip, lexicographic ordering, WCAG 2.5.7 DnD. (2) CRO agent — AI SDK v5/v6 (package version confusion resolved: `ai: ^6.x` IS SDK 5), tool-use agents, `inputSchema:` not `parameters:`, `stopWhen:` not `maxSteps:`, `sendMessage()` not `append()`, Anthropic prompt caching. (3) Character system — Rive vs CSS sprites, XState v5 state machines, split-screen dialogue, typewriter streaming. (4) War room design — tactical/military aesthetics, color palette (navy/cyan vs Penthouse gold), glassmorphism, blueprint grids, XCOM/SHIELD/Iron Man HUD references. (5) Innovative features — zero-manual-status-updates (email detection), conversion rate benchmarking (Huntr 1.78M dataset), RE Finance vertical intelligence, gamification. Compiled into `docs/WAR-ROOM-BLUEPRINT.md` (1,445 lines). Recursive audit: 23 findings (2 critical — missing `position` column + Zod import path, 6 medium, 15 low). All findings appended to blueprint §10. Research files: 5 markdown docs totaling ~5,400 lines. |
| 12 | 2026-03-19 | **Chain of Command Spec — AI Hierarchy Deep Dive.** Continued from Session 11 context summary. All 3 hierarchy research subagents had already completed (3,076 lines: multi-agent orchestration patterns, CRO subagent specializations, domain-expert training methods). Synthesized into `docs/CHAIN-OF-COMMAND.md` (1,550+ lines). Defines full hierarchy: User → CEO (tower-ceo) → CRO (war-room-cro) → 5 specialist subagents (Job Discovery/SDR, Application Manager/AE, Pipeline Analyst/RevOps, Intel Briefer/Enablement, Offer Evaluator/CSM). Includes: production system prompts for all 7 agents, few-shot examples per subagent, RACI matrix, tool assignments (exclusive write tools, shared read tools), domain knowledge injection tables (RE Finance tiers, recruiting calendar, comp benchmarks, sector knowledge), 3-layer scope enforcement (tool restriction + prompt boundaries + output schema validation), full AI SDK v5/6 implementation code (nested agent-in-tool pattern, Inngest wiring), error handling + graceful degradation, CRO Intel Briefer vs CIO boundary clarification, contract amendments (new Zod schemas + tool definitions). Recursive audit: 11 findings in pass 1 (tool sharing claim, App Manager delegation contradiction, toModelOutput experimental status, missing tool definitions, CIO/Intel Briefer boundary), all fixed. Pass 2 clean. Updated WAR-ROOM-BLUEPRINT.md §11 with hierarchy summary. |
| 13 | 2026-03-20 | **Elevator + Lobby Background Hotfix Round.** Fixed 3 user-reported issues across 2 commits (`371bd44`, `e89f24e`). (1) **Elevator PH↔Lobby transitions**: removed skip-transition bypass for lobby, added `ELEVATOR_ARRIVING_KEY` sessionStorage coordination for cross-route unmount/remount. (2) **Lobby penthouse button**: changed from `<a href>` to `<button>` dispatching custom `elevator:navigate` DOM event — Elevator now listens for this event and triggers full GSAP door animation. (3) **Lobby background overhaul**: old images were portrait 1024x1536 on landscape screens (badly cropped, low-res). Regenerated all 4 AI images as 16:9 landscape using `gpt_image_1_5`, upscaled to 3840x2560 via ffmpeg lanczos+unsharp. Built Apple TV Saver-style Ken Burns animation: 4 unique keyframes (slow zoom + directional pan), 20s rotation per image, 2.5s crossfade, Fisher-Yates shuffle on mount, prefers-reduced-motion support. Smoother elevator easing (`power3.inOut`/`power3.out`), longer timings (0.5s/0.55s/0.6s). Recursive audit: CLEAN (all 5 questions returned nothing). 9,140 LOC across 50 files. |
| 14 | 2026-03-20 | **Documentation Restructuring & Staleness Prevention.** Diagnosed 3 structural problems: massive redundancy (9,110 lines/16 docs), no auto-update beyond bootstrap, too many docs to maintain. Created 4-tier doc architecture (Tier 1: auto-generated, Tier 2: living docs, Tier 3: reference specs, Tier 4: archive). Rewrote MASTER-PLAN.md (checked off 6/10 Phase 0 acceptance criteria). Cleaned PROJECT-CONTEXT.md (removed duplicated file tree, updated doc map, fixed stale refs to archived files). Rewrote CLAUDE.md completely (removed stale component refs like SkylineScene/SkylineLayers/useMouseParallax, added doc architecture section, updated key components). Archived 7 docs to `docs/archive/` (IMMERSIVE-UI-PLAN.md, AUDIT.md, 5 research files). Deleted FILE-STRUCTURE.md (replaced by auto-generated tree in bootstrap). Enhanced `scripts/generate-bootstrap.ts` with `checkDocFreshness()` — warns when MASTER-PLAN, VISION-SPEC, or TECH-BRIEF are >7 days old. Bootstrap tested clean: Phase 0 COMPLETE detected, no stale doc warnings. |

| 15 | 2026-03-20 | **Full doc auto-organization system.** Built auto-organize-docs.ts: (1) auto-archive stale unreferenced docs, (2) auto-generate CLAUDE.md Key Components from src/ tree, (3) auto-generate doc map table with real line counts, (4) auto-append session logs from SESSION-STATE.json. Wired into Husky pre-commit. Idempotent. Files: scripts/auto-organize-docs.ts, .husky/pre-commit, CLAUDE.md, PROJECT-CONTEXT.md, package.json. |
| 16 | 2026-03-20 | **Phase 1 build committed + War Room production fix.** Phase 1 code already on `main` (commit `4efb3cc`). User provided Supabase credentials, created `.env.local`, ran `drizzle-kit push` for schema migration. War Room page returned 500 on Vercel — diagnosed as Drizzle ORM direct postgres connection failing from Vercel serverless (DB is IPv6-only at `db.jzrsrruugcajohvvmevg.supabase.co`, Supabase pooler returned "Tenant not found"). Fix: rewrote `war-room/page.tsx` to use Supabase REST client (like Penthouse does) — all queries + server actions now use `supabase.from()` instead of Drizzle `db.select()`. Added snake_case→camelCase mapping for `Application` type. Commit `d29842d`, deployed as `dpl_9EBBdP7w1kLVnLG3rbtz6cd4Raef`, build READY in iad1. TypeScript clean. Zero runtime errors. Remaining: enable pgvector extension, rotate DB password. |
| 17 | 2026-03-20 | **Phase 4 Complete — All phases wired.** Phase 4: CMO + CPO agents, Writing Room (Floor 5), Briefing Room (Floor 3), Google Drive export. All 6 agents operational (CRO, COO, CNO, CIO, CMO, CPO). Zero TS errors, clean Next.js build. Files: src/app/(authenticated)/briefing-room/page.tsx, src/app/(authenticated)/writing-room/page.tsx, src/app/api/cmo/route.ts, src/app/api/cpo/route.ts, src/app/api/drive/export/route.ts, src/components/floor-3/BriefingRoomClient.tsx, src/components/floor-3/BriefingRoomScene.tsx, src/components/floor-3/BriefingRoomTicker.tsx, src/components/floor-3/cpo-character/CPOCharacter.tsx, src/components/floor-3/cpo-character/CPODialoguePanel.tsx, src/components/floor-3/cpo-character/CPOWhiteboard.tsx, src/components/floor-3/crud/InterviewTimeline.tsx, src/components/floor-3/crud/PrepPacketViewer.tsx, src/components/floor-5/WritingRoomClient.tsx, src/components/floor-5/WritingRoomScene.tsx, src/components/floor-5/WritingRoomTicker.tsx, src/components/floor-5/cmo-character/CMOCharacter.tsx, src/components/floor-5/cmo-character/CMODialoguePanel.tsx, src/components/floor-5/cmo-character/CMOWhiteboard.tsx, src/components/floor-5/crud/DocumentEditor.tsx, src/components/floor-5/crud/DocumentList.tsx, src/hooks/useCMOChat.ts, src/hooks/useCPOChat.ts, src/lib/agents/cmo/character-machine.ts, src/lib/agents/cmo/system-prompt.ts, src/lib/agents/cmo/tools.ts, src/lib/agents/cpo/character-machine.ts, src/lib/agents/cpo/system-prompt.ts, src/lib/agents/cpo/tools.ts, src/lib/db/queries/documents-rest.ts, src/lib/utils/google-drive-export.ts, src/styles/floor-3.css, src/styles/floor-5.css. |
| 18 | 2026-03-20 | **Phase 5 complete — all phases wired.** Phase 5: CEO + CFO agents, Observatory (Floor 2), C-Suite (Floor 1), Ring the Bell, daily briefing cron, agent memory, in-world notifications, analytics dashboard. Phase 1 CRUD fixed (Drizzle→REST). All floor CSS imported. 8 agents operational. 203 source files, 47,559 LOC. Zero TS errors. |
| 19 | 2026-03-20 | **CRO Agent implementation.** This session: 1 commits. Work: feat: Phase 5 complete — Observatory, C-Suite, CEO/CFO agents, Ring the Bell, daily briefing, notifications Files: src/app/(authenticated)/c-suite/page.tsx, src/app/(authenticated)/observatory/page.tsx, src/app/(authenticated)/world-shell.tsx, src/app/api/ceo/route.ts, src/app/api/cfo/route.ts, src/app/api/cron/briefing/route.ts, src/app/api/notifications/[id]/read/route.ts, src/app/api/notifications/route.ts, src/app/globals.css, src/components/floor-1/CSuiteClient.tsx, src/components/floor-1/CSuiteScene.tsx, src/components/floor-1/CSuiteTicker.tsx, src/components/floor-1/RingTheBell.tsx, src/components/floor-1/ceo-character/CEOCharacter.tsx, src/components/floor-1/ceo-character/CEODialoguePanel.tsx. |
---

## 10. TECHNICAL NOTES

> Canonical technical notes live in CLAUDE.md. This section captures additional session-specific discoveries.

- **React 19 + Next.js 16:** JSX namespace must be explicitly imported: `import type { JSX } from "react"`
- **Elevator SSR safety:** Uses `useReducedMotion()` custom hook (not inline `window.matchMedia`)
- **Timer cleanup:** `tickTimersRef.current` tracks setTimeout IDs for cleanup on unmount
- **Drizzle RLS:** Third-argument array pattern, NOT `.withRLS()`
- **@supabase/ssr:** NOT deprecated auth-helpers
- **Tailwind:** v3 with JS config (NOT v4 with CSS config)
- **Old repo reference:** `/home/user/workspace/internship-command-center-8c4c1ad1/src/contracts/`
- **Vercel auto-deploy:** `main` gets production
- **War Room DB pattern:** Server components use Supabase REST client (`createClient()` from `@/lib/supabase/server`), NOT Drizzle ORM direct postgres. Drizzle's `db` object requires a direct TCP connection to postgres which fails from Vercel serverless (IPv6-only DB, pooler unreliable). All future server components should follow the Penthouse/War Room pattern: `supabase.from('table').select('*')`.
- **Supabase DB connectivity from Vercel:** Direct connection (`db.jzrsrruugcajohvvmevg.supabase.co:5432`) is IPv6-only. Supabase transaction pooler (`aws-0-us-east-1.pooler.supabase.com:6543`) returns "Tenant or user not found". Use REST API via Supabase client.
- **ProceduralSkyline:** Canvas-based renderer replaces all photo-based skyline components. Defaults to "night" outside DayNightProvider context (intentional for lobby). Uses `useDayNight()` hook + `getSkyConfig()` for time-aware rendering
- **EntranceSequence:** Uses sessionStorage for "played" flag — appropriate for per-session entrance
- **Floor stubs:** Each has unique CSS atmosphere (grid patterns, gradients, animations) — not empty shells
- **Lenis:** Installed but not yet wired — planned for Phase 2 smooth scroll integration
- **Old skyline images:** `public/skyline/` still present as fallback assets, not currently referenced
