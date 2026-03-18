# PROJECT CONTEXT — Internship Command Center ("The Tower")
## Operational Reference — Auto-Updated Every Interaction

**Last updated:** 2026-03-18T19:52:00-04:00 (AST)
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

**Phase:** 0 — The Shell (COMPLETE — pending manual steps)
**Branch:** `docs-handoff` (commit `dc73756`)
**Last commit:** Phase 0 complete: skyline, elevator, lobby, penthouse, contracts — production build passes
**Vercel Preview:** `internship-command-center-fhl391gov-armaan-aroras-projects.vercel.app` (READY)
**Production:** `internship-command-center-lake.vercel.app` (still on old `main` — needs branch merge)

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

#### Skyline (0.5, audited)
- ✅ `src/components/world/Skyline.tsx` — 337 lines, 4-layer parallax SVG
- ✅ 4 depth layers: far buildings, mid buildings, near buildings, water/foreground
- ✅ Day/night color transitions via `useDayNight()` context
- ✅ Window lights system: random on/off per time period
- ✅ Responsive: fills viewport width, positioned at bottom of FloorShell
- ✅ JSX namespace explicitly imported (`import type { JSX } from "react"`)
- ✅ Integrated into FloorShell.tsx

#### Elevator (0.6, audited)
- ✅ `src/components/world/Elevator.tsx` — 301 lines, GSAP-powered
- ✅ Door open/close animation with GSAP timeline
- ✅ Floor counter with animated number display
- ✅ Fixed left position, auto-hide on Lobby/Penthouse
- ✅ `useReducedMotion()` custom hook for SSR safety (not inline `window.matchMedia`)
- ✅ Keyboard accessible: Enter/Space to toggle, arrow keys to navigate floors
- ✅ Imported in `world-shell.tsx` with `md:ml-16` offset for main content

#### Lobby Upgrade (0.7, audited)
- ✅ `src/app/lobby/lobby-client.tsx` — full rewrite with construction aesthetic
- ✅ Construction stripes, blueprint grid background
- ✅ Building directory showing all 9 floors with status (Coming Soon / Active)
- ✅ Returning user detection via Supabase session check
- ✅ Different messaging for new vs. returning users
- ✅ TowerMark SVG logo component
- ✅ Animated entrance sequence

#### Penthouse Dashboard (0.8, audited)
- ✅ `src/app/(authenticated)/penthouse/penthouse-client.tsx` — NEW, glass+gold dashboard
- ✅ `src/app/(authenticated)/penthouse/page.tsx` — now delegates to PenthouseClient
- ✅ Stat cards: Applications, Interviews, Response Rate, Active Contacts
- ✅ Pipeline visualization (stages: Applied → Screen → Interview → Offer)
- ✅ Activity feed with timestamps
- ✅ Quick action buttons for all major features
- ✅ Placeholder data — ready for real Supabase queries in Phase 1

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
- ✅ Code committed (`dc73756`) and pushed to `docs-handoff` branch
- ✅ Vercel preview auto-deployed and READY
- ⏳ Production deploy requires `docs-handoff` → `main` merge (manual)

### Manual Steps Required (See MANUAL-GUIDE.md)
1. Run `migration-full.sql` in Supabase SQL Editor
2. Configure Google OAuth in Google Cloud Console + Supabase dashboard
3. Set Vercel environment variables
4. Merge `docs-handoff` → `main` for production deploy
5. Verify Supabase anon key format (`eyJ*` for REST API)

### File Structure (current — commit `dc73756`)
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
│   │   │   ├── page.tsx        # Server: delegates to PenthouseClient
│   │   │   └── penthouse-client.tsx  # Glass+gold dashboard, stats, pipeline, activity
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
├── components/world/
│   ├── DayNightProvider.tsx     # Time state context
│   ├── CustomCursor.tsx         # Gold cursor system
│   ├── FloorShell.tsx           # Sky + window + floor badge + Skyline import
│   ├── Skyline.tsx              # 337 LOC — 4-layer parallax SVG, day/night colors
│   └── Elevator.tsx             # 301 LOC — GSAP doors, floor counter, useReducedMotion
├── db/
│   ├── schema.ts               # 16 tables, RLS, types, all FKs
│   ├── index.ts                # Drizzle client
│   └── migrations/             # Generated SQL (0000 base + 0001 FK fix)
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

---

## 10. TECHNICAL NOTES

- **React 19 + Next.js 16:** JSX namespace must be explicitly imported: `import type { JSX } from "react"`
- **Elevator SSR safety:** Uses `useReducedMotion()` custom hook (not inline `window.matchMedia`)
- **Timer cleanup:** `tickTimersRef.current` tracks setTimeout IDs for cleanup on unmount
- **Drizzle RLS:** Third-argument array pattern, NOT `.withRLS()`
- **@supabase/ssr:** NOT deprecated auth-helpers
- **Tailwind:** v3 with JS config (NOT v4 with CSS config)
- **Old repo reference:** `/home/user/workspace/internship-command-center-8c4c1ad1/src/contracts/`
- **Vercel auto-deploy:** `docs-handoff` gets preview deploys, `main` gets production
