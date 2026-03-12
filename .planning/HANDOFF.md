# Handoff: Internship Command Center v2.0

**Date:** 2026-03-11
**From:** Previous Claude instance (Phase 6 executed + verified)
**To:** New Claude instance
**Project root:** `/Users/armaanarora/Claude Code/internship-command-center`
**Planning root:** `/Users/armaanarora/Claude Code/.planning`

---

## What This Project Is

A personal command center for Armaan Arora's internship search — a full-stack Next.js app that tracks 75+ applications, generates AI cover letters, manages follow-ups, and surfaces what needs attention. V1.0 is complete. V2.0 is 75% complete (Phases 4-6 done, Phases 7-8 remaining).

## What v2.0 Delivers

Cloud database (Turso), Google OAuth sign-in, Gmail/Calendar integration, polished UI with animations, smarter AI features, networking/contacts layer, and Vercel deployment. The goal: Armaan opens the app from any device and instantly knows what needs his attention.

## Current State

- **v1.0:** COMPLETE — all features working, 24 tests passing
- **v2.0 Phase 4:** ✅ COMPLETE — Turso cloud SQLite, Auth.js v5 Google OAuth, protected routes
- **v2.0 Phase 5:** ✅ COMPLETE — Page transitions, command palette, toasts, skeletons, empty states, inline editing, mobile nav, swipeable cards. UAT: 10/11 pass, 1 skip.
- **v2.0 Phase 6:** ✅ COMPLETE — Gmail read/send, email thread view, calendar event creation, dashboard widgets. Verification: 11/11 must-haves.
- **v2.0 Phase 7:** ⏳ NOT PLANNED — Smarter AI & Networking (run `/gsd:plan-phase 7`)
- **Progress:** 75% of v2.0 (6 of 8 phases, Phase 7 needs planning)

Read the full state: `.planning/STATE.md`

---

## File Map (Read These)

### Core Planning Docs
| File | What It Contains |
|------|-----------------|
| `.planning/STATE.md` | Current position, progress, decisions, scan findings, blockers |
| `.planning/PROJECT.md` | Project description, core value, constraints, key decisions |
| `.planning/REQUIREMENTS.md` | All 93 requirements (45 v1 complete + 48 v2 active) with traceability |
| `.planning/ROADMAP.md` | Phase structure, goals, success criteria, dependencies |

### Phase 4 (COMPLETE)
| File | What It Contains |
|------|-----------------|
| `.planning/phases/04-cloud-migration-and-auth/04-01-PLAN.md` | Driver swap: better-sqlite3 → @libsql/client |
| `.planning/phases/04-cloud-migration-and-auth/04-02-PLAN.md` | Async migration: all sync DB calls → await |
| `.planning/phases/04-cloud-migration-and-auth/04-03-PLAN.md` | Auth.js v5 Google OAuth, route protection |

### Phase 5 (COMPLETE)
| File | What It Contains |
|------|-----------------|
| `.planning/phases/05-ui-ux-overhaul/05-01-PLAN.md` | Page transitions, command palette, toasts |
| `.planning/phases/05-ui-ux-overhaul/05-02-PLAN.md` | Loading skeletons, empty states, stagger animations |
| `.planning/phases/05-ui-ux-overhaul/05-03-PLAN.md` | Inline status/tier editing, gradient tier badges |
| `.planning/phases/05-ui-ux-overhaul/05-04-PLAN.md` | Mobile bottom tab bar, swipeable follow-up cards |
| `.planning/phases/05-ui-ux-overhaul/05-UAT.md` | UAT results: 10 pass, 0 issues, 1 skip |

### Phase 6 (COMPLETE)
| File | What It Contains |
|------|-----------------|
| `.planning/phases/06-gmail-and-calendar-integration/06-CONTEXT.md` | Implementation decisions: API client, email matching, calendar events, architecture |
| `.planning/phases/06-gmail-and-calendar-integration/06-RESEARCH.md` | Research summary: what exists, architecture decisions, plan structure |
| `.planning/phases/06-gmail-and-calendar-integration/06-01-PLAN.md` | Wave 1: Google API client factory + Gmail read + dashboard email widget (EMAIL-01,02,03) |
| `.planning/phases/06-gmail-and-calendar-integration/06-02-PLAN.md` | Wave 2: Email thread view + send follow-up via Gmail (EMAIL-04,05,06) |
| `.planning/phases/06-gmail-and-calendar-integration/06-03-PLAN.md` | Wave 2: Calendar API + interview/follow-up events + dashboard widget (CAL-01,02,03,04) |
| `.planning/phases/06-gmail-and-calendar-integration/06-VERIFICATION.md` | Verification: 11/11 must-haves passed |

### Research (Domain Knowledge)
| File | What It Contains |
|------|-----------------|
| `.planning/research/turso-migration.md` | Turso/libSQL migration guide |
| `.planning/research/auth-gmail-calendar.md` | Auth.js v5, Google OAuth, Gmail/Calendar API patterns |
| `.planning/research/ui-polish.md` | Motion animations, sonner toasts, cmdk patterns |
| `.planning/research/networking-ai.md` | Contact schema, warmth scoring, interview prep |

---

## Phase Pipeline (v2.0)

| Phase | Name | Status | What It Delivers |
|-------|------|--------|-----------------|
| ~~4~~ | ~~Cloud Migration & Auth~~ | ✅ Complete | Turso cloud DB, Auth.js Google OAuth, protected routes |
| ~~5~~ | ~~UI/UX Overhaul~~ | ✅ Complete | Transitions, toasts, palette, skeletons, inline editing, mobile |
| ~~6~~ | ~~Gmail & Calendar~~ | ✅ Complete | Gmail read/send, email threads, calendar events, dashboard widgets |
| **7** | **Smarter AI & Networking** | **Needs planning → `/gsd:plan-phase 7`** | Interview prep, letter versions, company compare, contacts |
| 8 | Deploy & Polish | Needs planning | Vercel deployment, performance, final polish |

---

## Critical Decisions Already Made

1. **Turso over Supabase** — same SQL dialect as current SQLite, driver swap not schema rewrite
2. **Auth.js v5 with JWT strategy** — tokens in encrypted cookie, no database session tables
3. **Next.js 16 uses `proxy.ts`** — NOT `middleware.ts` for route protection (silently fails)
4. **`prompt: "consent"` + `access_type: "offline"`** — both MANDATORY for Google refresh tokens
5. **Google OAuth must be published to Production** — Testing mode = 7-day token expiry
6. **CSS-based page transitions** — AnimatePresence key-based remounting breaks React SSR Suspense hydration. LayoutTransition uses useRef + direct DOM style manipulation.
7. **sonner** for toasts — shadcn-compatible
8. **motion** package for stagger animations, badges, swipe gestures (NOT for page transitions)
9. **Warmth scoring** — compute-on-read with exponential decay, not cron-based
10. **Skip Vercel AI SDK** — project already uses @anthropic-ai/sdk directly
11. **Radix Select + table row navigation** — onClick stopPropagation on SelectTrigger is sufficient; onPointerDown blocks Radix internal handlers
12. **No email storage in DB** — fetch live from Gmail API on each view (avoids sync complexity, keeps email data in Gmail)
13. **Calendar events: one-way create only** — app creates events in Google Calendar, no two-way sync or webhooks
14. **`googleapis` package** — official Google API client, already installed (v171.4.0)

---

## External Setup Already Done

### Turso ✅
- Turso CLI installed, DB imported
- `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env.local`
- Local dev uses `file:./data/internship.db`

### Google Cloud ✅
- Project "Internships" created at console.cloud.google.com
- Gmail API + Google Calendar API enabled
- OAuth consent screen configured (External, test users added)
- OAuth Client ID created (Web application)
- `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `ALLOWED_EMAILS` in `.env.local`
- OAuth scopes include: `openid`, `email`, `profile`, `gmail.readonly`, `gmail.send`, `calendar.readonly`, `calendar.events`

### ⚠️ Google OAuth in Testing Mode
- Refresh tokens expire after 7 days in Testing mode
- Must publish to Production before Vercel deploy (Phase 8)

---

## Architecture Overview

### Data Flow
```
User → Next.js App Router → Server Components → Drizzle ORM → Turso (cloud SQLite)
                          → Server Actions → Drizzle ORM → Turso
                          → Auth.js v5 → Google OAuth → JWT cookie (includes accessToken)
                                                      ↓
                          → src/lib/google.ts → Gmail API (read emails, send follow-ups)
                                              → Calendar API (create interview/reminder events)
```

### Key Files
| File | Purpose |
|------|---------|
| `src/auth.ts` | Auth.js v5 config, Google provider, JWT callbacks, token refresh |
| `src/proxy.ts` | Next.js 16 route protection (replaces middleware.ts) |
| `src/db/index.ts` | Drizzle ORM + @libsql/client connection |
| `src/db/schema.ts` | Database schema (applications, followUps, coverLetters, researchCache) |
| `src/lib/dashboard.ts` | Dashboard queries (action items, status counts, activity) |
| `src/lib/follow-ups.ts` | Follow-up queries (pending, overdue, suggested) |
| `src/lib/actions.ts` | Server actions for application CRUD |
| `src/components/layout/layout-transition.tsx` | CSS page transitions (NO Framer Motion) |
| `src/components/shared/command-palette.tsx` | ⌘K command palette |
| `src/lib/google.ts` | Google API client factory — `getGoogleClient()` returns `{ gmail, calendar }` |
| `src/lib/gmail.ts` | Gmail read/send: `searchCompanyEmails()`, `getFullEmailThread()`, `sendEmail()` |
| `src/lib/gmail-actions.ts` | Server actions for Gmail: `fetchUnreadEmails()`, `sendFollowUpEmail()` |
| `src/lib/calendar.ts` | Calendar API: `listUpcomingEvents()`, `createInterviewEvent()`, `createFollowUpReminder()` |
| `src/lib/calendar-actions.ts` | Server actions for Calendar: `addInterviewToCalendar()`, `addFollowUpToCalendar()` |
| `src/components/dashboard/email-widget.tsx` | Dashboard widget showing unread application-related emails |
| `src/components/dashboard/calendar-widget.tsx` | Dashboard widget showing upcoming calendar events |
| `src/components/detail/email-thread.tsx` | Email thread view with expand/collapse on detail pages |
| `src/components/detail/add-to-calendar.tsx` | Inline interview scheduling form on detail pages |
| `src/components/follow-ups/draft-email.tsx` | AI-generated follow-up emails + "Send via Gmail" button |
| `src/app/applications/[id]/page.tsx` | Application detail page with email thread + calendar |

### Performance Optimizations Applied
- Dashboard queries parallelized with `Promise.all()`
- `getStatusCounts()` uses SQL `GROUP BY COUNT(*)` (not JS aggregation)
- `getActionItems()` uses SQL `WHERE` filters (not load-all + filter)
- `getSuggestedFollowUps()` uses SQL `NOT IN` subquery (not two queries + JS filtering)

---

## How to Execute

This project uses the **GSD (Get Shit Done) skill system**.

### Immediate Next Step

```
/gsd:plan-phase 7
```

Phase 7 (Smarter AI & Networking) needs planning. Requirements: AI-01..AI-05, NET-01..NET-06.

### After Phase 7 Planning

For each remaining phase (7, 8):
1. `/gsd:plan-phase {N}` — researches and creates plans
2. `/gsd:execute-phase {N}` — executes the plans

### Useful GSD Commands
- `/gsd:progress` — check current state and route to next action
- `/gsd:verify-work` — validate built features through UAT
- `/gsd:pause-work` — create handoff if you run out of context
- `/gsd:resume-work` — pick up where last instance left off

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16.1.6 | App Router, React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui | Dark mode default |
| Database | Turso (cloud SQLite) | Drizzle ORM, @libsql/client |
| Auth | Auth.js v5 | Google OAuth, JWT strategy, Gmail+Calendar scopes |
| AI | Anthropic Claude API | claude-sonnet-4-20250514, @anthropic-ai/sdk |
| Research | Tavily API | Live company research, 7-day cache |
| Animations | motion (Framer Motion) | Stagger lists, badges, swipe cards (NOT page transitions) |
| Toasts | sonner | shadcn-compatible |
| Command Palette | cmdk | ⌘K search + navigation |
| Deploy | Vercel (Phase 8) | Zero-config Next.js hosting |

---

## Gotchas & Pitfalls

1. **proxy.ts not middleware.ts** — Next.js 16 renamed it. Using middleware.ts silently fails.
2. **proxy.ts must be in src/** — NOT project root, for src-directory projects.
3. **AnimatePresence breaks SSR** — Key-based remounting loses Suspense boundary markers. Use CSS transitions.
4. **Radix Select onPointerDown** — Don't add onPointerDown stopPropagation; it blocks Radix's internal handler. Use onClick only.
5. **Google OAuth Testing mode** — 7-day refresh token expiry. Must publish to Production mode before deploy.
6. **All DB calls are async** — @libsql/client is async unlike better-sqlite3. Every .all(), .get(), .run() needs await.
7. **motion package still needed** — Used by tier-badge, status-badge, animated-list, swipeable-card. Do NOT remove.
8. **Gmail API requires base64url encoding** — use `Buffer.from(message).toString('base64url')` for RFC 2822 messages, NOT standard base64.
9. **`googleapis` is already installed** (v171.4.0) — no `npm install` needed for Phase 6.

---

## Deferred Scan Findings (Phase 8)

These were identified during codebase scan but deferred to Phase 8 (Deploy & Polish):
- Add security headers to next.config.ts (CSP, X-Frame-Options, CORS)
- Add per-route auth checks to server actions (currently only root layout checks auth)
- Fix 5 moderate npm audit vulnerabilities (esbuild CORS bypass, hono prototype pollution)
- Lazy-load CompanyResearchView and CoverLetterGenerator with React.lazy()
- Google OAuth: publish to Production mode and create new credentials

---

## Git State

- All tests passing (24/24)
- TypeScript compiles clean
- Dev server runs on port 3000 with turbopack

---

*Generated by previous Claude instance after Phase 5 completion, optimization pass, and Phase 6 context/research prep. Last updated: 2026-03-11. Read the file map above for full context.*
