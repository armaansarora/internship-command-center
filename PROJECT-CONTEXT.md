# PROJECT CONTEXT — Internship Command Center ("The Tower")
## Operational Reference — Auto-Updated Every Interaction

**Last updated:** 2026-03-18T18:45:00-04:00 (AST)
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

**Phase:** 0 — The Shell (IN PROGRESS)
**Branch:** `docs-handoff` (commit `8eefff0`)
**Last commit:** Phase 0 foundation — 247 files changed, 8,961 insertions, 39,786 deletions

### Completed (Tasks 0.1–0.4)
- ✅ Fresh Next.js 16 project (old code wiped, deps installed)
- ✅ 16-table Drizzle schema with RLS policies + type exports
- ✅ Supabase Auth: Google OAuth, middleware, server/client/admin clients
- ✅ Root layout: Playfair Display + Satoshi (Fontshare CDN) + JetBrains Mono
- ✅ Auth routing: `/` → `/penthouse` or `/lobby` based on session
- ✅ Lobby page: Google OAuth sign-in with Tower branding
- ✅ Authenticated layout with WorldShell (DayNightProvider + CustomCursor)
- ✅ FloorShell component (sky gradient, window tint, floor badge)
- ✅ All 9 floor stubs under `(authenticated)/` route group
- ✅ DayNightProvider (7 time states, updates every 60s, sets data-time on html)
- ✅ CustomCursor (7 contextual states, touch device fallback, RAF animation)
- ✅ Design token system in CSS (gold, dark, glass, day/night states)
- ✅ Tailwind v3 config with Tower tokens
- ✅ Generated migration SQL via `drizzle-kit generate` (353 lines)
- ✅ Clean TypeScript build, zero errors, all 15 routes compile

### Blocked
- ⏳ Schema push to Supabase — direct DB connection is IPv6-only (unreachable from build sandbox). Migration SQL generated and shared as `migration-full.sql`. **Action required: Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query → paste → Run).**

### Pending (Tasks 0.5–0.10)
- 0.5: NYC Skyline (layered SVG, parallax, day/night integration)
- 0.6: Elevator navigation (GSAP timeline, panel, floor indicator)
- 0.7: Lobby upgrade (construction-mode aesthetic, concierge)
- 0.8: Penthouse dashboard (real Supabase data, glass + gold cards)
- 0.9: Contracts system port (1,015 LOC → Supabase/Drizzle)
- 0.10: Deploy to Vercel + verify production

### File Structure (current)
```
src/
├── app/
│   ├── layout.tsx              # Root layout (fonts, meta)
│   ├── page.tsx                # Auth redirect
│   ├── globals.css             # Tokens, day/night, glass utilities
│   ├── lobby/
│   │   ├── page.tsx            # Server: auth check
│   │   └── lobby-client.tsx    # Client: Google OAuth
│   ├── (authenticated)/
│   │   ├── layout.tsx          # Auth gate + WorldShell
│   │   ├── world-shell.tsx     # Client: DayNight + Cursor
│   │   ├── penthouse/page.tsx  # Dashboard placeholder
│   │   ├── war-room/page.tsx   # Phase 1 stub
│   │   ├── rolodex-lounge/page.tsx
│   │   ├── writing-room/page.tsx
│   │   ├── situation-room/page.tsx
│   │   ├── briefing-room/page.tsx
│   │   ├── observatory/page.tsx
│   │   └── c-suite/page.tsx
│   └── api/auth/
│       ├── callback/route.ts   # OAuth callback
│       └── signout/route.ts    # Sign-out
├── components/world/
│   ├── DayNightProvider.tsx     # Time state context
│   ├── CustomCursor.tsx         # Gold cursor system
│   └── FloorShell.tsx           # Sky + window + floor badge
├── db/
│   ├── schema.ts               # 16 tables, RLS, types
│   ├── index.ts                # Drizzle client
│   └── migrations/             # Generated SQL
├── lib/
│   ├── supabase/{client,server,admin,middleware}.ts
│   ├── day-night.ts            # Time state calculation
│   └── utils.ts                # cn(), formatRelativeDate()
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
