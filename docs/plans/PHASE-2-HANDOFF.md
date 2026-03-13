# Phase 2: Intelligence Layer — New Session Handoff

> Copy everything below the line into a new Claude Code window.

---

## Context

You're working on the **Internship Command Center (ICC)** — an AI-powered war room for managing Armaan's internship search. The codebase lives at:

```
/Users/armaanarora/Claude Code/internship-command-center
```

Read `CLAUDE.md` in the project root first. It has the architecture overview, key commands, and conventions.

## What Just Happened (Phase 1 — COMPLETE)

Phase 1 built the **CEO + CRO vertical slice** — the foundational bell-ring-to-briefing pipeline. It was verified end-to-end: **111 tests passing, clean build, dev server running, all API routes compiling**.

### What Phase 1 Delivered

**Agent Infrastructure:**
- CEO orchestrator agent (`src/lib/agents/ceo/index.ts`) — receives bell ring, decides which departments to dispatch, waits for results
- CRO agent (`src/lib/agents/cro/index.ts` + `tools.ts`) — pipeline management agent with Drizzle query tools
- Briefing compiler (`src/lib/agents/ceo/compile-briefing.ts`) — aggregates department results into a structured briefing
- Event bus (`src/lib/agents/event-bus.ts`) — in-memory pub/sub for SSE streaming per execution
- Notification bus (`src/lib/agents/notification-bus.ts`) — in-memory pub/sub for real-time notification delivery
- Notification router (`src/lib/agents/notification-router.ts`) — routes notifications to correct channels
- Agent logger (`src/lib/agents/logger.ts`) — writes to `agentLogs` table

**Contracts (single source of truth):**
- `src/contracts/events.ts` — 14 Inngest event schemas (Zod v4)
- `src/contracts/agent-protocol.ts` — agent definition, task, result types
- `src/contracts/departments/cro.ts` — CRO-specific result data + tool schemas
- `src/contracts/api.ts` — 9 API route request/response types + route manifest
- `src/contracts/notifications.ts` — notification types, push payload, channel routing
- `src/contracts/ui.ts` — component prop interfaces
- `src/contracts/index.ts` — barrel re-export

**API Routes (all auth-gated):**
- `POST /api/agents/bell` — triggers CEO dispatch via Inngest
- `GET /api/agents/stream` — SSE stream per execution (agent progress events)
- `GET /api/agents/briefing/latest` — latest compiled briefing
- `GET /api/agents/briefing/[id]` — specific briefing by ID
- `GET /api/notifications` — paginated notifications with unread counts
- `GET /api/notifications/stream` — SSE stream for real-time notifications
- `POST /api/outreach/[id]/approve` — approve pending outreach draft
- `POST /api/outreach/[id]/reject` — reject outreach draft

**Inngest Functions (registered in `/api/inngest`):**
- `ceoOrchestrator` — listens for `bell/ring`, dispatches departments
- `croAgent` — listens for `ceo/dispatch` where department=cro
- `compileBriefing` — listens for `briefing/compile`, aggregates results

**UI Components:**
- `BellButton` — ring the bell to trigger agent execution
- `AgentExecutionPanel` — real-time SSE-driven progress display
- `BriefingCard` — renders compiled briefing
- `NotificationBell` — in TopBar, SSE-connected, shows unread badge + toast
- `DashboardAgentSection` — orchestrates the above on the dashboard (`/`)

**DB Tables (already in schema.ts):**
`agentLogs`, `notifications`, `outreachQueue`, `applications`, `contacts`, `companies`, `userPreferences`, `emails`, `documents`, `interviews`, `calendarEvents`, `companyEmbeddings`, `jobEmbeddings`, `dailySnapshots`, `agentMemory`

**Test Coverage:** 18 test files, 111 tests — contracts, API routes, agents, integration flow, DB schema, auth, seed data.

### Known Non-Issues
- All API endpoints return 401 without auth session (by design — Google OAuth)
- Inngest env vars (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`) not in `.env.local` — not needed for local dev mode
- `/agents` page is a placeholder ("Under Construction") — Phase 1 agent UI lives on dashboard

## Your Task: Phase 2 — Intelligence Layer

Build the three "input" departments that bring data INTO the system. These departments are dispatched by the CEO (already working) and follow the same contract-first pattern established in Phase 1.

### Phase 2 Deliverables

**1. CIO Agent (Chief Information Officer) — "The Library"**
- Company research intelligence: deep dives on companies Armaan is applying to
- Integrations: Tavily (already have API key), Firecrawl (need key), SEC EDGAR (free), FRED (free)
- Writes to: `companies` table (company intelligence), `companyEmbeddings` (vector search)
- Contract needed: `src/contracts/departments/cio.ts`
- Agent: `src/lib/agents/cio/index.ts` + `tools.ts`
- Inngest function: listens for `ceo/dispatch` where `department === "cio"`

**2. COO Agent (Chief Operating Officer) — "The Mail Room"**
- Email classification + calendar management
- Integrations: Gmail API (already configured in Google OAuth), Google Calendar API (same OAuth)
- Writes to: `emails` table (classified emails), `calendarEvents` table
- Updates: `applications` table (status changes based on email content)
- Contract needed: `src/contracts/departments/coo.ts`
- Agent: `src/lib/agents/coo/index.ts` + `tools.ts`
- Inngest function: listens for `ceo/dispatch` where `department === "coo"`

**3. CRO Agent Enhancement**
- CRO already exists from Phase 1 but only has basic Drizzle query tools
- Add: JSearch API integration for job discovery (need `JSEARCH_API_KEY`)
- Add: Lever API + Greenhouse API for ATS data
- Enhance tools in `src/lib/agents/cro/tools.ts`

**4. Research Page (`/research` — "Floor 80: The Library")**
- Currently a stub page — build it out
- Left panel (30%): searchable company list with tier badges
- Right panel (70%): full research profile (overview, culture, key people, news)
- "Request Deep Dive" button that dispatches CIO via bell ring

**5. Communications Page (`/communications` — "Floor 75: The Mail Room")**
- Currently a stub page — build it out
- Two-panel email client layout (Gmail integration)
- Left: email list with classification badges (Interview Invite, Rejection, Follow-up Needed)
- Right: threaded conversation view
- Outreach queue section showing pending drafts needing approval

### Architecture Patterns to Follow

Read the Phase 1 implementation for patterns — everything is contract-first:

1. **Contract first:** Define Zod schemas in `src/contracts/departments/<dept>.ts` before writing agent code
2. **Tests alongside:** Write contract tests, agent unit tests, and API tests
3. **Inngest event-driven:** Agents are triggered by Inngest events, not direct function calls
4. **CEO dispatches:** The CEO decides which departments to activate — new agents register as Inngest functions in `/api/inngest/route.ts`
5. **DB for inter-agent data:** All department results go to Turso tables. No direct agent-to-agent calls.
6. **SSE for UI updates:** Agent progress events flow through `eventBus` → SSE stream → browser

### Key Files to Read First

```
CLAUDE.md                                    # Project overview
src/contracts/index.ts                       # All contract exports
src/contracts/events.ts                      # Inngest event schemas
src/contracts/agent-protocol.ts              # Agent type system
src/contracts/departments/cro.ts             # Example department contract
src/lib/agents/cro/index.ts                 # Example agent (CRO)
src/lib/agents/cro/tools.ts                 # Example agent tools
src/lib/agents/ceo/index.ts                 # CEO orchestrator
src/app/api/inngest/route.ts                # Where agents register
src/db/schema.ts                            # All DB tables
docs/plans/2026-03-12-contract-first-architecture-design.md  # Full contract spec
docs/plans/2026-03-11-v2-implementation-plan.md              # Overall v2 plan
docs/plans/V2-INTEGRATION-ARCHITECTURE.md                     # Integration details
```

### Environment Variables

**Already in `.env.local`:**
- `ANTHROPIC_API_KEY` — for AI SDK agent calls
- `TAVILY_API_KEY` — for CIO company research
- `TURSO_DATABASE_URL` — local SQLite file
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — Google OAuth (also provides Gmail + Calendar access)

**Need to add for Phase 2:**
- `FIRECRAWL_API_KEY` — CIO web scraping (sign up at firecrawl.dev, free tier available)
- `FRED_API_KEY` — CIO economic data (free at fred.stlouisfed.org)
- `JSEARCH_API_KEY` — CRO job search (free tier at rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)
- `RESEND_API_KEY` — COO email sending (free 3K/mo at resend.com)

**Optional (can stub/skip initially):**
- `ADZUNA_APP_ID` + `ADZUNA_API_KEY` — secondary job source for CRO

### Design System

All UI follows "Boardroom" dark glassmorphism. See `.claude/rules/design-system.md`:
- Background: `#1A1A2E` (boardroom), `#252540` (cards), `#16213E` (sidebar)
- Accent: `#C9A84C` (champagne gold)
- Text: `#F5F0E8` (warm ivory), `#D4C5A9` (parchment)
- Glass cards: `bg-white/[0.03] backdrop-blur-[20px]`
- Fonts: Playfair Display (headings), Inter (body), JetBrains Mono (data)

### How to Verify

```bash
npm test          # All tests pass (111 existing + new Phase 2 tests)
npm run build     # Clean build, no type errors
npm run dev       # Dev server, new pages render, agents register in Inngest
```

### What NOT to Do

- Don't modify Phase 1 code unless fixing a bug
- Don't skip contracts — define types before implementing
- Don't make agents call each other directly — use Turso DB for data sharing
- Don't store Gmail data permanently in DB — fetch live from Gmail API on each view
- Don't build two-way calendar sync — one-way create only
