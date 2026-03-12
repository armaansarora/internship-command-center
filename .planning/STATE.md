---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Milestone
status: Turso production DB populated with 85 rows, migration script ready
stopped_at: Completed 08-02-PLAN.md
last_updated: "2026-03-12T00:27:00Z"
last_activity: "2026-03-11 — Phase 8 Plan 02 executed (Turso production DB setup and data migration)"
progress:
  total_phases: 8
  completed_phases: 7
  total_plans: 25
  completed_plans: 24
  percent: 96
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-09)

**Core value:** When Armaan opens the app — from his laptop, phone, or school computer — he instantly knows what needs his attention: new email responses, upcoming interviews, warm leads going cold, overdue follow-ups, and who to reach out to next.
**Current focus:** Milestone v2.0 — Phase 7 (Smarter AI & Networking) COMPLETE. Ready for Phase 8 (Deploy).

## Current Position

Phase: 8 of 8 — Deploy & Polish (6 of 7 plans complete)
Plan: 08-02 complete. 08-06 is next.
Status: Turso production DB populated with 85 rows, migration script ready
Last activity: 2026-03-11 — Phase 8 Plan 02 executed (Turso production DB setup and data migration)

Progress: [█████████░] 96% (24 of 25 plans complete)

## What's Next

**Phase 8: Deploy & Polish (Plan 06)**
- Plan 02 COMPLETE: Turso production DB created, schema pushed, 85 rows migrated
- Next: Plan 06 (GitHub repo creation, README, Vercel deployment, production verification)

## Performance Metrics

**Velocity (v1.0):**
- Total plans completed: 5 (3 in Phase 1, 1 in Phase 2, 1 in Phase 3)
- Average duration: ~30 min per plan
- Total execution time: ~3 hours across two sessions

**By Phase (v1.0):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Data Foundation | 3 | ~90 min | ~30 min |
| 2. Dashboard & Follow-Ups | 1 | ~30 min | ~30 min |
| 3. AI Engine + Integration | 1 | ~60 min | ~60 min |

**v2.0:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 4. Cloud Migration & Auth | 3/3 | 13 min | ~4 min |
| 5. UI/UX Overhaul | 4/4 | 12 min | ~3 min |

*Updated after each plan completion*
| Phase 04 P02 | 4min | 2 tasks | 11 files |
| Phase 04 P03 | 5min | 2 tasks | 13 files |
| Phase 05 P01 | 4min | 2 tasks | 12 files |
| Phase 05 P02 | 3min | 2 tasks | 10 files |
| Phase 05 P03 | 3min | 2 tasks | 9 files |
| Phase 05 P04 | 2min | 2 tasks | 4 files |
| Phase 06 P01 | 2min | 2 tasks | 6 files |
| Phase 06 P02 | 3min | 2 tasks | 5 files |
| Phase 06 P03 | 5min | 2 tasks | 7 files |

| Phase 07 P02 | 6min | 2 tasks | 15 files |

**v2.0 Phase 6 Total: ~10 min across 3 plans, 9 commits**

| Phase 07 P01 | 6min | 2 tasks | 14 files |
| Phase 07 P03 | 5min | 2 tasks | 9 files |
| Phase 08 P01 | 3min | 2 tasks | 10 files |
| Phase 08 P03 | 4min | 2 tasks | 5 files |
| Phase 08 P07 | 8min | 2 tasks | 7 files |
| Phase 08 P04 | 4min | 2 tasks | 8 files |
| Phase 08 P05 | 4min | 2 tasks | 13 files |
| Phase 08 P02 | 5min | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2.0 Design]: Approach A — Turso + Auth.js + Vercel selected over Supabase and self-hosted alternatives
- [v2.0 Design]: 5-phase structure (4-8) — Cloud/Auth first, then UI, then Gmail/Calendar, then AI/Networking, then Deploy
- [v2.0 Design]: Turso over Supabase — same SQL dialect as current SQLite, driver swap not schema rewrite
- [v2.0 Design]: Auth.js v5 with JWT strategy — single OAuth flow provides app auth + Gmail + Calendar tokens
- [v2.0 Design]: sonner for toasts — shadcn-compatible, accessible, minimal bundle
- [v2.0 Design]: Contacts as separate table — not every application has a contact, many-to-many via company
- [v2.0 Research]: better-sqlite3 → @libsql/client requires all queries become async (await)
- [v2.0 Research]: Google OAuth Testing mode limits refresh tokens to 7 days — must publish to Production
- [v2.0 Research]: Warmth scoring should be compute-on-read with exponential decay, not cron-based
- [v2.0 Research]: Skip Vercel AI SDK — project already uses @anthropic-ai/sdk directly, adding another layer is unnecessary
- [v2.0 Research]: Self-referential FK in Drizzle needs foreignKey() operator, not inline .references()
- [v2.0 Execution]: file:./data/internship.db as TURSO_DATABASE_URL for local dev (same file, different driver)
- [v2.0 Execution]: Disabled vitest file parallelism to prevent SQLite BUSY locks with @libsql/client
- [Phase 04]: auth.ts placed in src/ (not project root) so @/auth import alias works
- [Phase 04]: Module augmentation for JWT uses @auth/core/jwt (not next-auth/jwt) for correct type resolution
- [Phase 04]: proxy.ts must be in src/ (not project root) when using Next.js 16 src-directory structure
- [Phase 04]: Google Cloud OAuth configured (project "Internships", armaansarora20@gmail.com as test user)
- [Phase 04]: Full OAuth flow verified: proxy redirect → sign-in page → Google consent → dashboard with session
- [Phase 05]: EmptyState uses href+Link instead of onClick for server component compatibility
- [Phase 05]: Toast feedback on all server action call sites with explicit toast id to prevent flooding
- [Phase 05]: Created FollowUpList client wrapper to animate server-rendered follow-up lists
- [Phase 05]: Created updateApplicationTier server action for inline tier editing
- [Phase 05]: BottomTabBar uses Link for navigation, matching sidebar pattern
- [Phase 05]: SwipeableCard uses useAnimation controls to animate card off-screen before callback
- [Phase 05]: CSS-based page transitions (not AnimatePresence) — AnimatePresence key-based remounting breaks React SSR Suspense hydration
- [Phase 05]: Removed onPointerDown stopPropagation from Radix Select triggers — it blocks Radix's internal open handler; onClick stopPropagation is sufficient
- [Phase 05]: Click-target guard on TableRow onClick skips navigation when clicking Select elements
- [Phase 05 Optimization]: Dashboard queries parallelized with Promise.all() (~3x faster load)
- [Phase 05 Optimization]: getStatusCounts() uses SQL GROUP BY COUNT(*) instead of loading all apps into memory
- [Phase 05 Optimization]: getActionItems() uses SQL WHERE filters instead of fetching ALL applications
- [Phase 05 Optimization]: getSuggestedFollowUps() uses SQL NOT IN subquery instead of JS filtering
- [Phase 06 Design]: No email storage in DB — fetch live from Gmail API on each view (avoids sync complexity)
- [Phase 06 Design]: Calendar events one-way create only — no two-way sync, no webhooks
- [Phase 06 Design]: getGoogleClient() factory in src/lib/google.ts returns { gmail, calendar } using session.accessToken
- [Phase 06 Design]: Email matching by company domain heuristic + subject search, not stored mapping
- [Phase 06 Design]: Server actions for all Gmail/Calendar mutations (not API routes)
- [Phase 06]: EmailWidget is server component receiving data as props, email fetching independent from Promise.all with .catch()
- [Phase 06]: Company domain heuristic: lowercase, strip special chars, append .com for email matching
- [Phase 06]: Email body extraction uses recursive multipart traversal preferring text/plain over text/html
- [Phase 06]: Send button disabled with title tooltip when no contactEmail — no modal prompt needed
- [Phase 06]: CalendarWidget is server component receiving events as props, matching EmailWidget pattern
- [Phase 06]: Calendar + email fetching in parallel Promise.all with independent .catch() for graceful degradation
- [Phase 06]: Follow-up calendar button is icon-only (CalendarPlus, ghost variant) per CONTEXT.md small icon spec
- [Phase 07 Design]: Interview prep lives as section on application detail page, auto-generates on interview status
- [Phase 07 Design]: Cover letter auto-save to DB, active version pinning, side-by-side comparison (no diff)
- [Phase 07 Design]: Company comparison via tracker checkboxes → modal/drawer overlay
- [Phase 07 Design]: Contacts as separate table with warmth compute-on-read (exponential decay, cold after 30 days)
- [Phase 07 Design]: Contact cards inline on detail page ("Who do I know?"), referral chains via introduced_by FK
- [Phase 07 Research]: Zero new dependencies — all libraries already installed
- [Phase 07 Research]: Self-referential FK uses foreignKey() operator in Drizzle
- [Phase 07 Research]: Three new DB tables: contacts, cover_letters, interview_prep
- [Phase 07 Execution]: db.batch() for setActiveCoverLetter -- atomic deactivation + activation
- [Phase 07 Execution]: Each interview prep generation creates new row (never overwrites)
- [Phase 07 Execution]: next/cache mock added for revalidatePath in vitest server action tests
- [Phase 07 Execution]: Interview prep + email thread fetched in parallel with Promise.all on detail page
- [Phase 07 Execution]: Contacts self-referential FK uses foreignKey() operator (not inline .references())
- [Phase 07 Execution]: Warmth formula: exponential decay e^(-t/13), hot<=7d, warm<=30d, cold>30d
- [Phase 07 Execution]: TURSO_DATABASE_URL added to vitest.config env for test DB access
- [Phase 07 Execution]: Contact form uses Sheet slide-out with react-hook-form + zod validation
- [Phase 07]: Company comparison uses Claude structured JSON output with regex extraction fallback
- [Phase 07]: Contact cards use warmth-colored left borders for visual hierarchy
- [Phase 07]: Follow-up email template type auto-selects thank-you when status is interview
- [Phase 07]: Comparison clipboard uses tab-separated format for spreadsheet paste compatibility
- [Phase 08]: Sentry source map upload disabled when no SENTRY_AUTH_TOKEN for Turbopack compatibility
- [Phase 08]: DSN-guarded Sentry.init() so monitoring is opt-in without configured DSN
- [Phase 08]: Blue-violet hue ~275 as brand accent color in oklch color space
- [Phase 08]: ThemeProvider enableSystem for OS-level theme preference detection
- [Phase 08]: Gradient utility classes (.gradient-brand, .gradient-header) for reuse across pages
- [Phase 08]: CSS animation over motion library to preserve EmptyState server component compatibility
- [Phase 08]: 5 contextual SVG illustration variants for EmptyState visual differentiation
- [Phase 08]: Hero stats derived from existing queries (no extra DB calls), greeting uses time-of-day
- [Phase 08]: View toggle syncs to URL search params for bookmarkable table/card state
- [Phase 08]: ApplicationsView client wrapper pattern for server data + client UI state
- [Phase 08]: Sharp for icon generation -- already installed, produces real PNGs at all sizes
- [Phase 08]: ServiceWorkerRegistration as client component with useEffect for browser-only side effects
- [Phase 08]: Network-first SW caching strategy for fresh content with offline fallback
- [Phase 08]: opengraph-image.tsx convention for automatic OG meta tag injection
- [Phase 08]: Turso DB in iad1 (US East) for proximity to NYU
- [Phase 08]: Migration batched at 50 rows for Turso request size limits
- [Phase 08]: Idempotency check: skip if production has data, --force to override

### Codebase Scan Findings (2026-03-11)

**Applied (HIGH priority):**
- ✅ Dashboard queries parallelized with Promise.all()
- ✅ getStatusCounts() SQL aggregation
- ✅ getActionItems() SQL WHERE filtering
- ✅ getSuggestedFollowUps() SQL NOT IN subquery

**Deferred (MEDIUM/LOW — for future phases):**
- Lazy-load CompanyResearchView and CoverLetterGenerator with React.lazy()
- Add security headers to next.config.ts (CSP, X-Frame-Options) — Phase 8
- Server actions per-route auth checks — Phase 8
- npm audit 5 moderate vulnerabilities (esbuild, hono) — Phase 8
- Google OAuth publish to Production mode — Phase 8

### Pending Todos

- (none)

### Blockers/Concerns

- Google OAuth app is in Testing mode (7-day refresh token expiry). Must publish to Production before Vercel deploy (Phase 8).
- proxy.ts must live in src/ (not project root) for Next.js 16 src-directory projects.

## Session Continuity

Last session: 2026-03-12T00:27:00Z
Stopped at: Completed 08-02-PLAN.md
Resume file: None
