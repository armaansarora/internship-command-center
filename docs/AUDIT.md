# Code Audit: internship-command-center (Old Repo)

**Audited:** 2026-03-18
**Codebase:** ~19,800 LOC across 200+ files
**Stack:** Next.js 16 + Turso (SQLite) + Drizzle + NextAuth + AI SDK v6 + Inngest + Tailwind v4 + shadcn/ui

> **NOTE:** This audit describes the OLD repo. The new stack uses Zod v3 (not v4), Supabase (not Turso), Supabase Auth (not NextAuth), and Tailwind v3 (not v4). See `TECH-BRIEF.md` for the current package list.

---

## Executive Summary

The old repo is a **completed v2 milestone** — 8 phases, 25 plans, deployed to Vercel. It has real infrastructure: a working agent system with Inngest orchestration, Gmail/Calendar integration, typed contracts, 2,500 lines of tests, and SSE-powered real-time notifications. But it's built on SQLite (Turso), uses NextAuth (not multi-tenant capable), has no RLS, and the UI is decent but far from the Penthouse Office vision.

**Bottom line:** ~40% is meat, ~60% is fat. The agent system, contracts, Gmail integration, and schema design are solid foundations. The UI, auth, database layer, and most planning docs are kill/rewrite.

---

## THE MEAT (Keep & Adapt)

### 1. Contract System (`src/contracts/`) — 1,015 LOC — KEEP
**Verdict: GOLD. Keep 100%.**

This is the best code in the repo. Typed Zod v4 contracts for every agent event, API response, and notification. The `EventMap`, `AgentProtocol`, department contracts, and SSE event types are production-grade patterns.

What's here:
- `agent-protocol.ts` — AgentDefinition, AgentTask, AgentResult, CeoDecision, BriefingSummary
- `events.ts` — BellRing, CeoDispatch, AgentComplete, AgentError, BriefingCompile, BriefingReady, OutreachDraft, NotificationCreate, ScheduledBriefing, ScheduledSnapshot + master EventMap
- `departments/cro.ts`, `cio.ts`, `coo.ts` — per-department tool schemas
- `api.ts` — SSE event types, API response schemas
- `notifications.ts` — notification channel schemas
- `ui.ts` — UI contract types

**Adaptation needed:** Change `DepartmentId` to include all 8 C-suite roles (currently only 7). Otherwise, these port directly.

### 2. Agent System (`src/lib/agents/`) — 1,815 LOC — KEEP (adapt DB layer)
**Verdict: STRONG MEAT. Keep logic, swap Turso → Supabase.**

- `ceo/index.ts` — Inngest-powered orchestrator that dispatches to departments in parallel, waits for results with timeout, compiles briefings. Clean step-based architecture.
- `cro/index.ts` — Full agentic loop with `generateText`, tool use, error handling, event bus publishing. Working AI SDK v6 agent.
- `cio/index.ts` + `cio/tools.ts` — Company research agent with web search, ATS lookup tools
- `coo/index.ts` + `coo/tools.ts` — Operations agent with deadline tracking, scheduling
- `event-bus.ts` — In-memory pub/sub for SSE streaming (35 LOC, elegant)
- `notification-bus.ts` + `notification-router.ts` — DB-backed notification creation + SSE push
- `logger.ts` — Agent execution logging (start/complete/fail pattern)

**Adaptation needed:** All DB calls use Turso/libSQL. Swap to Supabase client. The Inngest functions, AI SDK calls, and event bus are stack-agnostic.

### 3. Gmail Integration (`src/lib/gmail.ts`) — 304 LOC — KEEP
**Verdict: GOOD MEAT.**

Real Gmail API integration:
- `parseEmailHeaders()` — extracts From/To/Subject/Date from Gmail message format
- `getEmailBody()` — recursive multipart MIME traversal (text/plain preferred, falls back to text/html)
- `sendEmail()` — RFC 2822 message construction, base64url encoding, threading support
- `searchCompanyEmails()` — domain-based Gmail search
- `getUnreadApplicationEmails()` — batch company email scanning with rate limiting

**Adaptation needed:** Currently uses NextAuth session for OAuth tokens. Must rewire to use Supabase Auth's token storage (store Google refresh token in user metadata or a separate `oauth_tokens` table with RLS).

### 4. Calendar Integration (`src/lib/calendar.ts`, `calendar-actions.ts`) — KEEP
Working Google Calendar read/write. Same adaptation as Gmail — rewire OAuth token source.

### 5. Schema Design (`src/db/schema.ts`) — 517 LOC — ADAPT
**Verdict: GOOD BONES, needs surgery.**

15 tables covering the full domain: companies, applications, contacts, emails, documents, interviews, calendarEvents, outreachQueue, notifications, userPreferences, agentLogs, agentMemory, dailySnapshots, companyEmbeddings, jobEmbeddings.

**What to change:**
- SQLite (`sqliteTable`) → Postgres (`pgTable`)
- `text` IDs → `uuid` with `gen_random_uuid()`
- Add `userId` column to every table (multi-tenancy)
- `blob('embedding')` → `vector(1536)` using pgvector extension
- Add RLS policies for tenant isolation
- `integer('is_read', { mode: 'boolean' })` → `boolean('is_read')`
- Replace `text` timestamps → `timestamp` native Postgres type
- Add proper `enum` types instead of text enums

### 6. Agent Tools (`src/lib/agents/*/tools.ts`) — KEEP
CRO tools (queryApplications, updateStatus, suggestFollowUp, analyzeConversionRates, searchJobs, lookupAtsJob), CIO tools (company research, web search), COO tools (deadline tracking). Real tool implementations with DB queries.

### 7. Inngest Client (`src/lib/inngest/client.ts`) — KEEP
Already configured. Just needs env var updates.

### 8. Tests (`src/__tests__/`) — 2,531 LOC — ADAPT
30+ test files covering agents, contracts, API routes, DB, and integration flows. Good test patterns using Vitest + MSW mocks. Keep the test structure, update DB mocks.

### 9. CI Pipeline (`.github/workflows/ci.yml`) — KEEP
Lint → Typecheck → Test → Build pipeline. Update env vars and secrets.

### 10. Hooks (`src/hooks/`) — KEEP
- `use-agent-stream.ts` — SSE hook for real-time agent updates
- `use-notification-stream.ts` — SSE hook for notification bell
- `use-mobile.ts` — responsive detection

---

## THE FAT (Kill or Completely Rewrite)

### 1. UI Components (`src/components/`) — 7,975 LOC — KILL
**Verdict: FAT. Start fresh.**

Current UI is functional but generic — standard shadcn cards, basic tables, no glassmorphism, no elevator sidebar, no Penthouse Office aesthetic. Every component needs to be rebuilt from scratch for the premium vision. The shadcn/ui base components (`src/components/ui/`) are fine to keep, but all custom components are disposable.

### 2. Pages (`src/app/*/page.tsx`) — 1,026 LOC — KILL
Same issue. Pages are basic CRUD views. Rebuild with the Penthouse aesthetic.

### 3. Auth System (`src/auth.ts`) — 101 LOC — KILL
**Verdict: KILL. Replace with Supabase Auth.**

NextAuth with Google provider and `ALLOWED_EMAILS` allowlist. This is single-tenant by design — hardcoded email list, no multi-tenant support, no user table, no organizations. Supabase Auth handles Google OAuth, magic link, multi-tenancy, and RLS integration out of the box.

### 4. Database Connection (`src/db/index.ts`) — KILL
Turso/libSQL client. Replace with Supabase client + Drizzle adapter for Postgres.

### 5. Planning Docs (`.planning/`) — KILL
147 planning files from the old v2 milestone. All complete, all based on old architecture decisions. New ARCHITECTURE.md replaces this.

### 6. Sentry Config (`sentry.*.config.ts`) — KILL for now
Premature. Add back in Phase 2 when there's real traffic to monitor.

### 7. Design Tokens (`src/lib/design-tokens.ts`) — KILL
Old Boardroom theme tokens. Replace with Penthouse Office system.

### 8. Service Worker (`public/sw.js`) — KILL
PWA offline caching. Premature for this stage.

### 9. Novel Editor Integration — KILL
Rich text editor for notes. Overkill — a textarea with markdown preview is sufficient.

### 10. Migrations (`src/db/migrations/`) — KILL
SQLite migrations. Supabase migrations will be fresh.

---

## VERDICTS BY FILE COUNT

| Category | Files | LOC | Verdict |
|----------|-------|-----|---------|
| Contracts | 8 | 1,015 | **KEEP 100%** |
| Agent System | 12 | 1,815 | **KEEP** (swap DB) |
| Gmail/Calendar | 6 | ~700 | **KEEP** (swap auth) |
| Schema | 1 | 517 | **ADAPT** (SQLite→PG) |
| Hooks | 3 | ~300 | **KEEP** |
| Tests | 30 | 2,531 | **ADAPT** |
| CI | 1 | 60 | **KEEP** |
| Inngest | 1 | ~30 | **KEEP** |
| UI Components | 40+ | 7,975 | **KILL** |
| Pages | 12 | 1,026 | **KILL** |
| Auth | 1 | 101 | **KILL** |
| DB Connection | 1 | ~50 | **KILL** |
| Planning Docs | 147 | ~15K | **KILL** |
| Sentry/SW/Misc | 5 | ~200 | **KILL** |

**Keep/Adapt: ~7,000 LOC (~35%)**
**Kill: ~12,800 LOC (~65%)**

---

## MIGRATION PLAN

### What carries forward (port to new stack):
1. All contracts → copy directly, update DepartmentId enum
2. Agent functions → keep Inngest functions, swap `db.select()/insert()` calls to Supabase
3. Gmail/Calendar libs → keep, rewire OAuth token source
4. Schema → rewrite as Postgres with pgTable, uuid, vector, boolean, timestamp, RLS
5. Tests → keep structure, update DB mocks to Supabase
6. Hooks → keep, they're React-only
7. CI → update secrets

### What gets rebuilt from scratch:
1. Auth → Supabase Auth (Google OAuth, magic link, multi-tenant)
2. DB → Supabase Postgres (connection pooling, RLS, realtime subscriptions)
3. UI → Penthouse Office glassmorphism, elevator sidebar, premium feel
4. Pages → New layouts with the aesthetic
5. Storage → Supabase Storage for documents
6. Email sending → Resend instead of raw Gmail API for outbound

### New additions (not in old repo):
1. Supabase RLS policies for every table
2. Upstash Redis for rate limiting + caching
3. pgvector for embeddings (replace SQLite blob)
4. Supabase Realtime subscriptions (replace SSE event bus for some use cases)
5. Multi-tenant user table with organization support
6. Stripe integration for subscription billing
