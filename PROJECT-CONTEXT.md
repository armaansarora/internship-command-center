# PROJECT CONTEXT — Internship Command Center ("The Tower")
## Operational Reference — Auto-Updated Every Interaction

**Last updated:** 2026-03-20T17:57:00-04:00 (EDT)
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
| Timezone | America/New_York (EDT, UTC-4) |
| University | NYU Schack Institute of Real Estate, School of Professional Studies (Sophomore) |
| Major | Real Estate Finance |
| Background | Student, real estate internship search |
| Targets | Blackstone, CBRE, JLL, Cushman & Wakefield, Marcus & Millichap, Newmark, Colliers, Eastdil Secured, HFF, Walker & Dunlop, Hines, Brookfield |
| Working style | Analytical, direct. Cut the fat, keep the meat. Demands depth. Masters-degree-level code. |
| Model pref | System decides per task |
| Sources | web, vercel, gcal, google_drive, github_mcp_direct |

---

## 2. PROJECT OVERVIEW

Multi-tenant SaaS for automating internship/job searches. Users sign in, connect Google, and the system handles email parsing, application tracking, follow-ups, interview prep, cover letters, analytics, and AI agent orchestration. Planned for eventual sale.

**Codename:** The Tower
**UI Paradigm:** Immersive spatial building — elevator navigation, floor-based rooms, 2D illustrated characters (see docs/VISION-SPEC.md)
**Production URL:** https://internship-command-center-lake.vercel.app

### The Grand Vision
The Tower is a skyscraper that users physically enter and explore. It is NOT a dashboard with a theme — it is a world. Every page is a floor with its own atmosphere, lighting, characters, and personality. AI agents are 2D illustrated characters stationed at their posts in each floor's room, with idle animations, XState-driven state machines, and streaming dialogue panels styled as face-to-face conversations (not chatbot widgets).

The building metaphor is sacred: Lobby = login, Elevator = navigation (GSAP door animations), Floors = features, Windows = procedural skyline backdrop with day/night cycle, Characters = AI agents with personality. Target aesthetic: luxury game UI meets Bloomberg Terminal meets Apple spatial design.

Corporate hierarchy: CEO orchestrates 7 C-suite agents. CRO commands 5 specialist subagents. Each agent has scoped tools, Zod-validated schemas, personality injection, and domain expertise (real estate finance sector knowledge). Full spec in docs/CHAIN-OF-COMMAND.md.

---

## 3. PRODUCTION STACK

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Supabase Postgres |
| ORM | Drizzle (schema/migrations ONLY — runtime uses Supabase REST client) |
| Auth | Supabase Auth (Google OAuth) |
| AI/LLM | Vercel AI SDK v6 + Anthropic (Claude) + OpenAI (GPT-4o-mini for lightweight tasks) |
| Animations | GSAP (elevator, entrance, transitions) |
| Sound | Procedural Web Audio API (17 sound types, 8 ambient floor soundscapes) |
| Email | Resend |
| Cache/Rate Limit | Upstash Redis |
| Embeddings | pgvector (Supabase extension) |
| Hosting | Vercel |
| Payments | Stripe (Free $0 / Pro $29 / Team $79) |
| CI/CD | GitHub Actions |
| Monitoring | Sentry |
| State Machines | XState v5 (character interactions) |
| Drag & Drop | @dnd-kit (pipeline Kanban) |
| CSS | Tailwind v3 (JS config, NOT v4) |

**Rejected:** Neon (Supabase is all-in-one), Better Auth/NextAuth (Supabase Auth + RLS), Clerk/Auth0 (expensive, vendor lock-in), Google Sheets as DB, Drizzle for runtime queries from Vercel (IPv6 DB issue), tsParticles (performance), react-beautiful-dnd (deprecated).

---

## 4. CREDENTIALS

All credentials stored in `.env.local` (repo root, never committed).

| Service | Key Detail |
|---|---|
| Supabase | Project `jzrsrruugcajohvvmevg`, URL `https://jzrsrruugcajohvvmevg.supabase.co`, East US |
| Resend | API key in .env.local |
| Vercel | Project `prj_C6B6ZEsG5khpsISEzvgaMQzo9r5g`, Team `team_EC8AIyc155clLRjzrJ0fblpa` |
| GitHub | Repo `armaansarora/internship-command-center`, push protection ON |
| Stripe | Free ($0, prod_UBV0Ra2wpzYrcW), Pro ($29, prod_UBV066SmTMPUfl), Team ($79, prod_UBV0XnNh2HlQrz) |

### Vercel Environment Variables (set in Vercel dashboard)
| Variable | Source | Status |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ Set |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | ✅ Set |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ Set |
| `SUPABASE_DB_URL` | Supabase direct connection string | ✅ Set |
| `ANTHROPIC_API_KEY` | Anthropic console | ✅ Set |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | ✅ Set |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | ✅ Set |
| `STRIPE_SECRET_KEY` | Stripe dashboard | ⚠️ Needs setting |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard | ⚠️ Needs setting |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard | ⚠️ Needs setting |
| `UPSTASH_REDIS_REST_URL` | Upstash console | ⚠️ Needs provisioning |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash console | ⚠️ Needs provisioning |
| `OPENWEATHER_API_KEY` | OpenWeatherMap | ⚠️ Needs getting (free tier) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry project | ⚠️ Needs setting |
| `CRON_SECRET` | Self-generated | ⚠️ Needs setting |
| `OPENAI_API_KEY` | OpenAI console | ⚠️ Needs setting (for pgvector embeddings) |
| `RESEND_API_KEY` | Resend dashboard | Set in .env.local only |

### Connected Connectors (Perplexity Computer)
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

## 5. CURRENT STATE (as of Session 22, March 20, 2026)

### All 7 Phases COMPLETE — Code Built & Deployed
**Branch:** `main` (commit `67c1786`)
**Production:** `internship-command-center-lake.vercel.app` (HTTP 200)
**Source files:** 226 files
**Total LOC:** 51,928
**TypeScript errors:** 0
**Production build:** Clean
**Lint:** Clean
**Console.logs:** 0
**`any` types:** 0
**TODOs:** 0

### What's Built
- **9 floors** with unique visual atmospheres, CSS token systems, and immersive environments
- **8 C-suite AI agents** (CEO, CRO, COO, CNO, CIO, CMO, CPO, CFO) with XState character machines, streaming dialogue panels, whiteboards, and personality-injected system prompts
- **Full application CRUD** with Kanban drag-and-drop pipeline (@dnd-kit)
- **Contact management** with warmth tracking and networking intelligence
- **Cover letter generator** + interview prep packet generator
- **Google Drive export** for documents
- **Analytics dashboard** with heatmaps, conversion funnels, pipeline velocity, weekly trends
- **CEO orchestration** ("Ring the Bell" dispatches all agents in parallel)
- **Daily briefing cron** (8am ET, Vercel cron)
- **Stripe subscriptions** (Free/Pro/Team tiers with checkout, webhooks, billing portal)
- **Building progression** (9 milestones with visual upgrades)
- **Sound design** (procedural Web Audio API, 17 sounds, 8 ambient soundscapes, muted by default)
- **Mobile responsive** (elevator → bottom sheet with swipe-to-dismiss, 44px touch targets)
- **Weather-reactive skyline** (OpenWeatherMap API, rain/snow/fog/thunder CSS effects)
- **Easter eggs** (midnight fireworks, rapid-click, 100th app confetti, character backstory nameplates)
- **Sentry error tracking** + Upstash rate limiting
- **Procedural canvas skyline** with day/night cycle (7 time states)
- **Apple TV-style Ken Burns autonomous drift** (replaced mouse parallax)
- **Luxury lobby** (CSS-only reception hall with marble, pillars, chandelier)
- **In-world notifications** (spatial notification system, not generic toasts)
- **19 bugs found and fixed** (all 3 bug sprints complete)

### What's NOT Yet Working (Needs Manual Setup)
These features are coded but require environment variables or manual configuration:
1. **Stripe** — Products created in Stripe, but env vars not set in Vercel
2. **Upstash Redis** — Not provisioned yet (rate limiting will no-op)
3. **OpenWeatherMap** — No API key yet (weather effects will no-op)
4. **Sentry** — No DSN configured yet (error tracking will no-op)
5. **CRON_SECRET** — Not set in Vercel (daily briefing cron unprotected)
6. **pgvector** — Extension not yet enabled in Supabase (vector search will fail)
7. **OpenAI API key** — Needed for pgvector embeddings
8. **Google OAuth** — In Testing mode (7-day token expiry). Must publish to Production before real users
9. **Stripe Webhook** — Endpoint needs registering in Stripe Dashboard
10. **DB password rotation** — Was exposed during early setup. ROTATE IMMEDIATELY.

All code gracefully degrades — Stripe, Upstash, Sentry, OpenWeatherMap all no-op when their env vars aren't set.

### Known Code Issues (Non-Blocking)
1. **9 orphaned files** — Built components/hooks not yet imported into the component tree (listed in CLAUDE.md). All functional, just not wired.
2. **GSAP imports** — 3 files import `gsap` directly instead of through the centralized `gsap-init.ts` tree-shaking module.
3. **Large files** — 17 files exceed 500 LOC. Consider splitting when touching them.
4. **Limited test coverage** — 9 Vitest files exist (33 tests) focused on utilities/auth/rate-limit; no Playwright E2E suite yet.
5. **Lighthouse audit** — Not run yet. Performance scores unknown.

### Recent Architecture Refactors
1. **Dialogue panels unified** — Floor dialogue UIs now share `src/components/agents/dialogue/*` primitives with per-floor wrappers.
2. **Character machines standardized** — All 8 character machine modules now use `src/lib/agents/create-character-machine.ts` with extension hooks for CMO/CPO/CNO.
3. **Page actions extracted** — Floor page mutations moved from inline page server actions into `src/lib/actions/*` and domain query mutation modules.

---

## 6. DOCUMENT MAP

> Auto-generated by `scripts/auto-organize-docs.ts`. Do not edit manually.

All planning docs are in `docs/`. Operational files stay in root.

| File | Purpose | Lines |
|---|---|---|
| `PROJECT-CONTEXT.md` | Operational context, credentials, stack, audit summary, session log (root) | ~280 |
| `BOOTSTRAP-PROMPT.md` | Auto-generated session entry point — source tree, build health, acceptance criteria (root) | ~810 |
| `CLAUDE.md` | Codebase summary, conventions, agent behavior rules, doc architecture (root) | ~460 |
| `docs/ARCHITECTURE-MAP.md` | This document is the fastest way to understand how the app is organized today. | ~90 |
| `docs/AUDIT-DEPLOY-CHECKLIST.md` | **Read this first.** This is the dummy-proof, click-by-click, paste-by-paste gui | ~370 |
| `docs/BUG-TRACKER.md` | Bug reports, fix log, sprint priorities | ~310 |
| `docs/CHAIN-OF-COMMAND.md` | AI agent hierarchy: CEO → CRO → 5 subagents, system prompts, tools, RACI | ~1590 |
| `docs/CHARACTER-PROMPTS.md` | System prompts for all 8 characters + Concierge, multi-tenant ready | ~260 |
| `docs/MASTER-PLAN.md` | 7 phases with deliverables, acceptance criteria, testing strategy | ~370 |
| `docs/NEXT-ROADMAP.md` | **Audience.** Any Claude session working on The Tower. And Armaan, once per phas | ~950 |
| `docs/POST-HARDENING-MANUAL-STEPS.md` | Everything in this file is **something a computer can't do for you**. The code | ~270 |
| `docs/R1-AUDIT.md` | **Generated:** 2026-04-22 (autopilot) | ~110 |
| `docs/SCHEMA-DRAFT.md` | 16-table Postgres schema: RLS, pgvector HNSW indexes, post-push SQL triggers | ~480 |
| `docs/SECRETS-ROTATION.md` | Canonical list: `src/lib/env.ts`. Every secret the Tower runs on is listed below | ~200 |
| `docs/SECURITY-HEADERS-REPORT.md` | **Date:** 2026-04-22 | ~40 |
| `docs/TECH-BRIEF.md` | Research synthesis + Google OAuth setup, SDK patterns, gotchas | ~430 |
| `docs/VISION-SPEC.md` | Locked spatial UI spec: building, floors, characters, cursor, day/night, design tokens | ~260 |
| `docs/WAR-ROOM-BLUEPRINT.md` | Phase 1 implementation guide — architecture, CRO agent, DnD, design tokens | ~1480 |
| `docs/archive/` | Completed plans + research (7 files, reference only) | varies |


## 7. OPEN QUESTIONS

1. Google OAuth app in Testing mode — must publish before real users
2. Custom domain? Not discussed yet
3. Character art source? Currently CSS sprite silhouette placeholders
4. DB password rotation — was exposed, needs rotation
5. Upstash Redis — not yet provisioned
6. Light theme CSS vars — dark mode is complete, light mode toggle exists but light vars are minimal

---

## 8. SESSION LOG

| Session | Date | Work Done |
|---|---|---|
| 1 | 2026-03-18 | Created Phase 0 foundation: Next.js 16, 16-table schema, Auth, layout, all stubs |
| 2 | 2026-03-18 | Recursive audit (15 findings), all fixed. Commit `209ad16`. |
| 3 | 2026-03-18 | Started 0.5 Skyline, hit JSX type error mid-build. |
| 4 | 2026-03-18 | Fixed JSX → Built Skyline (0.5) → Elevator (0.6) → Lobby upgrade (0.7) → Penthouse (0.8) → Contracts (0.9, 1,015 LOC) → Deploy (0.10). Commit `dc73756`. Vercel preview READY. |
| 5 | 2026-03-18 | Updated PROJECT-CONTEXT.md, compiled MANUAL-GUIDE.md for Armaan. |
| 6 | 2026-03-18 | Final recursive audit: found missing `handle_new_user` trigger → created `src/db/post-push.sql`. Rewrote BOOTSTRAP-PROMPT.md for Phase 1 handoff. |
| 7 | 2026-03-19 | Immersive UI Rebuild: SkylineScene CSS 3D parallax, EntranceSequence, all skyline components. |
| 8 | 2026-03-19 | Bootstrap System Overhaul: Husky pre-commit, SESSION-STATE.json, build health, CI guard. |
| 9 | 2026-03-19 | Automation hardening: 5 mandatory agent behavior rules, context window thresholds. User flagged UI quality issues. |
| 10 | 2026-03-19 | Phase 0 Complete Visual Overhaul: ProceduralSkyline (canvas), redesigned lobby/penthouse/elevator/FloorShell/all floor stubs. 6,854 LOC. |
| 11 | 2026-03-19 | Phase 1 Deep Research: 5 parallel agents, WAR-ROOM-BLUEPRINT.md (1,445 lines), 23 findings fixed. |
| 12 | 2026-03-19 | Chain of Command Spec: CHAIN-OF-COMMAND.md (1,550+ lines), full agent hierarchy, RACI matrix. |
| 13 | 2026-03-20 | Bug Sprint 1: Performance fix (ProceduralSkyline v5), removed custom cursor, removed text parallax, Apple TV drift, fixed penthouse scroll/clickability. |
| 14 | 2026-03-20 | Bug Sprint 2: Floor navigation, back-to-lobby, sign out, UserMenu, settings page, dark/light mode. |
| 15 | 2026-03-20 | Bug Sprint 3: Lobby background (CSS luxury reception), hover state audit, sound design spec. Doc restructuring. Auto-organize-docs.ts system. |
| 16 | 2026-03-20 | Phase 1 build on Vercel + War Room production fix (Drizzle→REST). 5 additional bugs found and fixed (BUG-015 through BUG-019). |
| 17 | 2026-03-20 | Phases 2-4 complete: COO, CNO, CIO, CMO, CPO agents. Writing Room, Briefing Room, Situation Room, Rolodex Lounge. Google Drive export. |
| 18 | 2026-03-20 | Phase 5 complete: CEO + CFO agents, Observatory, C-Suite, Ring the Bell, daily briefing cron, agent memory, in-world notifications, analytics dashboard. 203 files, 47,559 LOC. |
| 19-20 | 2026-03-20 | Phase 6 complete: Stripe subscriptions, building progression, GSAP tree-shaking, sound design (Web Audio API), mobile responsive, liquid glass, easter eggs, weather skyline, Sentry, Upstash rate limiting. 226 files, 51,921 LOC. |
| 21 | 2026-03-20 | Cron schedule fix, Vercel rebuild trigger, lazy-init supabaseAdmin fix. |
| 22 | 2026-03-20 | Final handoff preparation session. Full audit, doc rewrite, Claude Code handoff package. |

---

## 9. TECHNICAL NOTES

> Canonical technical notes live in CLAUDE.md. This section captures additional session-specific discoveries.

- **War Room DB pattern:** Server components use Supabase REST client (`createClient()` from `@/lib/supabase/server`), NOT Drizzle ORM direct postgres. Drizzle's `db` object requires a direct TCP connection to postgres which fails from Vercel serverless (IPv6-only DB, pooler unreliable). All future server components should follow the Penthouse/War Room pattern: `supabase.from('table').select('*')`.
- **Supabase DB connectivity from Vercel:** Direct connection (`db.jzrsrruugcajohvvmevg.supabase.co:5432`) is IPv6-only. Supabase transaction pooler (`aws-0-us-east-1.pooler.supabase.com:6543`) returns "Tenant or user not found". Use REST API via Supabase client.
- **ProceduralSkyline:** Canvas-based renderer replaces all photo-based skyline components. Defaults to "night" outside DayNightProvider context (intentional for lobby). Uses `useDayNight()` hook + `getSkyConfig()` for time-aware rendering
- **EntranceSequence:** Uses sessionStorage for "played" flag — appropriate for per-session entrance. Three-state pattern: null→true (animate)/false (skip).
- **Floor stubs:** Each has unique CSS atmosphere (grid patterns, gradients, animations) — not empty shells
- **Old skyline images:** `public/skyline/` still present as fallback assets, not currently referenced
- **Vercel Hobby plan:** Cron schedules limited to once-daily minimum. Changed from 6-hourly to daily.
- **supabaseAdmin lazy-init:** `src/lib/supabase/admin.ts` uses lazy initialization to prevent build-time env var crash when SUPABASE_SERVICE_ROLE_KEY isn't set.
