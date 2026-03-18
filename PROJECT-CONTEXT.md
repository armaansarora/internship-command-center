# PROJECT CONTEXT — Internship Command Center ("The Tower")
## Operational Reference — Auto-Updated Every Interaction

**Last updated:** 2026-03-18T17:21:00-04:00 (AST)
**Owner:** Armaan Arora (armaansarora20@gmail.com, GitHub: armaansarora)

---

## 0. SESSION BOOTSTRAP

1. `memory_search` for "internship command center project"
2. Read this file + `.env.local` for credentials
3. Read the doc relevant to your task:
   - Building a phase → `MASTER-PLAN.md` (acceptance criteria, deliverables)
   - Making UI decisions → `VISION-SPEC.md` (spatial UI, characters, design tokens)
   - Choosing a library/pattern → `TECH-BRIEF.md` (research findings, code patterns)
   - Understanding codebase → `AUDIT.md` (keep/kill, LOC counts)
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
**UI Paradigm:** Immersive spatial building — elevator navigation, floor-based rooms, 2D illustrated characters (see VISION-SPEC.md)

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

Full audit in `AUDIT.md`. Old repo: ~19,800 LOC, 200+ files. **Armaan approved audit 2026-03-18.**

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

| File | Purpose | Lines |
|---|---|---|
| `PROJECT-CONTEXT.md` | THIS FILE — operational context, credentials, stack, audit summary | ~160 |
| `MASTER-PLAN.md` | All 7 phases with deliverables, acceptance criteria, dependencies, complexity | ~300 |
| `VISION-SPEC.md` | Locked spatial UI spec: building, floors, characters, cursor, day/night, design tokens | ~250 |
| `TECH-BRIEF.md` | Research synthesis: GSAP, Supabase/Drizzle/RLS, Inngest, AI SDK, character pipeline. Includes ⚠️ warnings on Inngest Realtime (dev preview), Drizzle RLS migration bugs, @supabase/ssr API changes | ~400 |
| `SCHEMA-DRAFT.md` | Full Postgres schema: 16 tables, userId on every table, RLS policies, pgvector columns, Zod validation. Ready to copy into `src/db/schema.ts` | ~430 |
| `CHARACTER-PROMPTS.md` | System prompts for all 8 C-Suite characters + Concierge. Shared preamble, personality specs, voice examples, domain assignments | ~220 |
| `FILE-STRUCTURE.md` | Complete Next.js 16 project file tree: pages, components (world/characters/rooms/ui/data), lib, agents, Inngest functions, hooks | ~170 |
| `BOOTSTRAP-PROMPT.md` | Copy-paste prompt for new chat sessions — loads skills, reads context files, starts Phase 0 | ~90 |
| `AUDIT.md` | File-by-file keep/kill verdicts | ~180 |
| `ARCHITECTURE.md` | Architecture doc (update to match current stack) | ~100 |
| `.env.local` | All credentials (never commit) | — |

**Old repo clone:** `/home/user/workspace/old-repo-audit/`

---

## 7. CURRENT STATE

**Phase:** Pre-build (Phase 0 not started)
**Branch:** `docs-handoff` has all planning docs (8 files). `main` has old code (will be wiped in Phase 0).
**Blockers:** None. Everything is green.
**Next action:** Start Phase 0 — The Shell.
**Last audit:** 2026-03-18. Self-audit identified and fixed: Drizzle RLS API correction, Inngest Realtime stability warning, @supabase/ssr pattern update, Tailwind v3/v4 note. Created SCHEMA-DRAFT.md, CHARACTER-PROMPTS.md, FILE-STRUCTURE.md.

---

## 8. OPEN QUESTIONS

1. Google OAuth app in Testing mode — must publish before real users (Phase 2 deadline)
2. Custom domain? Not discussed yet
3. Stripe pricing tiers? Not decided yet
4. Character art source? AI-generated (Flux.1 + LoRA) vs. commissioned vs. open-source
5. Weather API provider? OpenWeatherMap free tier proposed
6. Sound assets? Royalty-free, procedural, or commissioned
7. Upstash Redis — not yet provisioned
