# Phase 2 — Intelligence Layer: Handoff Document

> **Status:** COMPLETE. 157 tests pass, build succeeds, all pages render. Audited 2026-03-12 — all "remaining" items found already implemented.

## Completed Work

### Agents (all registered in `src/app/api/inngest/route.ts`)

| Agent | Directory | Contract | Tests |
|-------|-----------|----------|-------|
| CIO ("The Library") | `src/lib/agents/cio/` | `src/contracts/departments/cio.ts` | `src/__tests__/agents/cio/` + `src/__tests__/contracts/cio.test.ts` |
| COO ("The Mail Room") | `src/lib/agents/coo/` | `src/contracts/departments/coo.ts` | `src/__tests__/agents/coo/` + `src/__tests__/contracts/coo.test.ts` |
| CRO (enhanced) | `src/lib/agents/cro/` | `src/contracts/departments/cro.ts` | `src/__tests__/agents/cro/` + `src/__tests__/contracts/cro.test.ts` (13 tests) |
| CEO (multi-dept) | `src/lib/agents/ceo/` | — | `src/__tests__/integration/bell-to-briefing.test.ts` (12 tests) |

### CIO Tools
- `searchCompany` — Tavily API with advanced depth
- `scrapeUrl` — Firecrawl markdown scraping
- `lookupSecFilings` — SEC EDGAR with graceful fallback
- `getEconomicData` — FRED API observations
- `upsertCompany` — Drizzle ORM upsert (lookup by domain then name)

### COO Tools
- `fetchRecentEmails` — Gmail API via googleapis + OAuth from `auth()`
- `classifyEmail` — Stores metadata in `emails` table (no body storage)
- `createCalendarEvent` — Google Calendar API + local `calendarEvents` row
- `updateApplicationFromEmail` — Updates application status, links email

### CRO New Tools
- `searchJobs` — JSearch RapidAPI integration
- `lookupAtsJob` — Lever/Greenhouse public API

### CEO Orchestrator Changes
- `DEPARTMENTS` constant: `["cro", "cio", "coo"]`
- Dispatches 3 separate `ceo/dispatch` events via individual Inngest steps
- Waits for 3 `agent/complete` events with department-specific `if` expressions
- Per-department error/timeout handling
- All results aggregated into `departmentResults` array for briefing

### UI Pages

**`/research`** — Two-panel layout
- Left (30%): Searchable company list with tier badges, research freshness
- Right (70%): Company profile (overview, key people, news, market context)
- "Request Deep Dive" button (placeholder — not wired to CIO dispatch yet)
- Files: `src/components/research/`, `src/lib/research-queries.ts`

**`/communications`** — Two-panel email client
- Header: "The Mail Room" with Inbox/Outreach tab toggle
- Left (35%): Classified email list with filter tabs (All, Interview, Follow-up, Offer, Rejection, Other)
- Right (65%): Email thread view with Reply/Forward buttons
- Outreach tab: Pending drafts with Approve/Reject buttons
- Files: `src/components/communications/`, `src/lib/communication-queries.ts`

### Infrastructure
- `.env.example` has: FIRECRAWL_API_KEY, FRED_API_KEY, JSEARCH_API_KEY, RESEND_API_KEY
- DB queries wrapped in try/catch for graceful empty-state rendering (tables may not exist locally)

## Remaining Work

None — all items moved to Completed (see below).

### Previously Listed as "Remaining" — Found Already Implemented (2026-03-12 audit)

All 5 items originally listed as "not started" were audited and found to be already implemented in the codebase:

1. **Auth.js Access Token Forwarding** — DONE. `src/auth.ts` jwt+session callbacks forward `access_token`. COO tools (`src/lib/agents/coo/tools.ts`) consume `session.accessToken`.

2. **"Request Deep Dive" Button** — DONE. `src/components/research/company-list.tsx` has `handleDeepDive()` that POSTs to `/api/agents/bell` with loading/error states.

3. **Reply/Forward Buttons** — DONE. `src/components/communications/email-thread.tsx` onClick handlers open Gmail compose via `window.open()`.

4. **Sidebar Navigation** — DONE. `src/components/layout/sidebar.tsx` has `/research` (icon: Globe, color: #80F) and `/communications` (icon: Mail, color: #75F).

5. **Seed Data** — DONE. `src/db/seed.ts` seeds 8 companies, 75 applications, 7 emails. Schema push + seed verified working.

### Test Count Verification (2026-03-12)
25 test files, 157 tests, all passing. Build succeeds. Pages /research and /communications render with HTTP 200.
