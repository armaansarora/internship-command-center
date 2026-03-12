# Roadmap: Internship Command Center

## Overview

This roadmap covers both the completed v1.0 milestone and the active v2.0 milestone. V1.0 delivered a functional local-first application tracker with AI cover letter generation in 3 phases. V2.0 transforms it into a polished, deployed product with cloud database, Gmail/Calendar integration, premium UI, smarter AI, networking, and Vercel deployment in 5 additional phases (4-8).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): v1.0 milestone (COMPLETE)
- Integer phases (4, 5, 6, 7, 8): v2.0 milestone (ACTIVE)
- Decimal phases (e.g., 4.1): Urgent insertions (marked with INSERTED)

### v1.0 Milestone (COMPLETE)

- [x] **Phase 1: Data Foundation and Application Tracker** - SQLite database, 75 seeded applications, sortable/filterable tracker with detail views, quick-add, status management, and dark-mode UI shell
- [x] **Phase 2: Attention Dashboard and Follow-Up System** - Homepage that surfaces urgent action items, status counters, activity feed, plus follow-up queue with auto-suggested timelines and snooze/dismiss
- [x] **Phase 3: Research Pipeline and AI Engine** - Tavily company research with caching, Claude-powered cover letter generation with voice matching and no-fabrication guarantees, AI-drafted follow-up emails, and live company detail views

### v2.0 Milestone (ACTIVE)

- [x] **Phase 4: Cloud Migration & Auth** - Turso cloud SQLite, Auth.js v5 with Google OAuth, protected routes, Gmail + Calendar API token access
- [x] **Phase 5: UI/UX Overhaul** - CSS page transitions, list stagger animations, toast notifications, command palette, loading skeletons, empty states, inline table editing, gradient tier badges, mobile bottom tab bar, swipeable follow-up cards
- [x] **Phase 6: Gmail & Calendar Integration** - Email sync with application matching, send follow-ups from app, Google Calendar events for interviews, dashboard widgets for upcoming events and unread emails
- [ ] **Phase 7: Smarter AI & Networking** - Interview prep generation, cover letter versioning with comparison, company comparison tables, contact/networking tracker with relationship warmth and referral chains
- [ ] **Phase 8: Deploy & Polish** - Vercel deployment with preview deploys, performance optimization, final polish pass, production readiness

## Phase Details

### Phase 1: Data Foundation and Application Tracker (COMPLETE)
**Goal**: Armaan can open the app, see all 75+ applications in a sortable table, click into any one for detail, add new applications, and update statuses — all in a clean dark-mode interface
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01 through DATA-05, TRACK-01 through TRACK-10, UI-01 through UI-07
**Status**: ✅ Complete (2026-03-06)
**Plans**: 3 plans (all complete)

Plans:
- [x] 01-01-PLAN.md -- Project bootstrap, database schema, seed 75+ applications
- [x] 01-02-PLAN.md -- Dark-mode UI shell, sidebar navigation, tracker table
- [x] 01-03-PLAN.md -- Application detail view, Server Actions, quick-add form

### Phase 2: Attention Dashboard and Follow-Up System (COMPLETE)
**Goal**: Dashboard landing page tells Armaan what needs attention — pending interviews, stale warm leads, overdue follow-ups
**Depends on**: Phase 1
**Requirements**: DASH-01 through DASH-06, FLLW-01 through FLLW-03, FLLW-06, FLLW-07
**Status**: ✅ Complete (2026-03-06)
**Plans**: 1 plan (complete)

Plans:
- [x] 02-01-PLAN.md -- Attention dashboard, follow-up queue, auto-suggested timelines

### Phase 3: Research Pipeline and AI Engine (COMPLETE)
**Goal**: Tailored cover letters grounded in live research, AI-drafted follow-up emails
**Depends on**: Phase 2
**Requirements**: TRACK-05, COVR-01 through COVR-10, FLLW-04, FLLW-05
**Status**: ✅ Complete (2026-03-06)
**Plans**: 1 plan (complete)

Plans:
- [x] 03-01-PLAN.md -- Tavily research, Claude cover letter engine, AI follow-up emails

---

### Phase 4: Cloud Migration & Auth
**Goal**: App works from any device (laptop, phone, school computer) with cloud database and Google OAuth sign-in that also provides Gmail + Calendar API access
**Depends on**: Phase 3 (builds on all existing v1 functionality)
**Requirements**: CLOUD-01, CLOUD-02, CLOUD-03, CLOUD-04, CLOUD-05, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. App connects to Turso cloud SQLite — all 75+ applications visible, all CRUD operations work, all AI features work with async queries
  2. User can sign in with Google OAuth (armaan.arora@nyu.edu or armaansarora20@gmail.com) and non-whitelisted users are rejected
  3. All routes are protected — unauthenticated access redirects to sign-in page
  4. OAuth tokens include Gmail and Calendar API scopes — tokens stored in JWT cookie and auto-refreshed
  5. better-sqlite3 is fully removed — no native C++ dependencies remain
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md -- Database driver swap: better-sqlite3 to @libsql/client, Drizzle config update, test rewrites
- [x] 04-02-PLAN.md -- Async migration: convert all lib functions and page components to async/await
- [x] 04-03-PLAN.md -- Auth.js v5 Google OAuth, route protection, sign-in/sign-out UI, whitelist enforcement

### Phase 5: UI/UX Overhaul
**Goal**: The app feels premium — smooth page transitions, toast feedback on every action, command palette for power users, loading states that prevent layout shift, and mobile-friendly navigation
**Depends on**: Phase 4 (needs async data layer and auth)
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, UX-08, UX-09, UX-10
**Success Criteria** (what must be TRUE):
  1. Page transitions animate smoothly between all routes (no hard cuts) via CSS-based fade+slide transitions
  2. Every mutation (add app, update status, generate letter, send email) shows a toast notification confirming success or failure
  3. ⌘K opens command palette with search across applications, navigation to any page, and quick actions
  4. All data-fetching pages show loading skeletons (not blank screens or spinners) during load
  5. Empty states on every page guide the user to take action (e.g., "No follow-ups pending — you're all caught up!")
  6. App is usable on mobile with bottom tab bar and touch-friendly interactions
**Status**: ✅ Complete (2026-03-11)
**Plans**: 4 plans (all complete)

Plans:
- [x] 05-01-PLAN.md -- Page transitions (LayoutTransition), command palette (⌘K), toast notifications (sonner)
- [x] 05-02-PLAN.md -- Loading skeletons, empty states, stagger list animations
- [x] 05-03-PLAN.md -- Inline status/tier editing in tracker table, gradient tier badges
- [x] 05-04-PLAN.md -- Mobile bottom tab bar, swipeable follow-up cards

### Phase 6: Gmail & Calendar Integration
**Goal**: Armaan can see email responses from companies directly in the app, send follow-up emails without copy-paste, and manage interview calendar events — all without leaving the command center
**Depends on**: Phase 4 (needs OAuth tokens with Gmail + Calendar scopes)
**Requirements**: EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05, EMAIL-06, CAL-01, CAL-02, CAL-03, CAL-04
**Success Criteria** (what must be TRUE):
  1. Dashboard shows unread application-related emails matched to companies — user sees new responses without checking Gmail
  2. Application detail page shows email thread history for that company
  3. User can send a follow-up email directly from the app and it appears in their Gmail sent folder
  4. User can create a Google Calendar event for an interview with one click — event appears on their real calendar
  5. Dashboard widget shows upcoming calendar events for the next 7 days
**Status**: ✅ Complete (2026-03-11)
**Plans**: 3 plans (all complete)

Plans:
- [x] 06-01-PLAN.md -- Google API client factory, Gmail read library, dashboard email widget
- [x] 06-02-PLAN.md -- Email thread view on detail page, send follow-up via Gmail API
- [x] 06-03-PLAN.md -- Calendar API library, interview/follow-up event creation, dashboard calendar widget

### Phase 7: Smarter AI & Networking
**Goal**: AI helps Armaan prepare for interviews, compare companies, and manage versions of cover letters. Networking layer tracks contacts, relationship warmth, and referral chains.
**Depends on**: Phase 5 (needs polished UI components for new features)
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, NET-01, NET-02, NET-03, NET-04, NET-05, NET-06
**Success Criteria** (what must be TRUE):
  1. User can generate interview prep for any company — gets company overview, likely questions, talking points, and recent news
  2. Cover letter versions are stored and retrievable — user can compare two versions side-by-side and mark favorites
  3. User can compare 2-3 companies in a structured table (culture, size, recent deals, fit assessment)
  4. Contacts page shows all networking contacts with relationship warmth indicators and referral chains
  5. Contact cards appear on application detail pages — "Who do I know at [Company]?" is instantly answerable
  6. Relationship warmth auto-decays — contacts go cold after 30 days without interaction
**Plans**: 3 plans

Plans:
- [ ] 07-01-PLAN.md -- Contacts schema, data layer, warmth tracking, contacts page with table and form
- [ ] 07-02-PLAN.md -- Cover letter versioning with auto-save, side-by-side comparison, interview prep generation
- [ ] 07-03-PLAN.md -- Company comparison via tracker checkboxes, contact cards on detail page, enhanced follow-up templates

### Phase 8: Deploy & Polish
**Goal**: App is deployed to Vercel, accessible from anywhere, and polished to production quality with Vercel/Stripe-inspired visual redesign, PWA support, and production infrastructure
**Depends on**: Phase 7 (all features complete)
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05
**Success Criteria** (what must be TRUE):
  1. App is deployed to Vercel and accessible via URL from any device
  2. GitHub pushes auto-deploy to production; branches get preview deploys
  3. All environment variables (Turso, Google OAuth, Claude, Tavily) are configured in Vercel
  4. Dashboard loads in < 2 seconds on production
  5. All features work identically in production as in local development
**Plans**: 7 plans

Plans:
- [ ] 08-01-PLAN.md -- Production infrastructure: Sentry, security headers, bundle analyzer, .env.example, .gitignore
- [x] 08-02-PLAN.md -- Turso production DB setup and data migration script
- [ ] 08-03-PLAN.md -- Visual redesign foundation: blue-violet palette, light mode default, PageHeader, sidebar, sign-in page
- [ ] 08-04-PLAN.md -- Visual redesign pages: dashboard overhaul, tracker card grid view toggle
- [ ] 08-05-PLAN.md -- PWA support: manifest, service worker, favicon set, OG image, meta tags
- [ ] 08-06-PLAN.md -- GitHub repo creation, README, Vercel deployment, production verification
- [ ] 08-07-PLAN.md -- Visual polish: PageHeader on remaining pages, enhanced empty states with SVG illustrations

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Data Foundation and Application Tracker | 3/3 | ✅ Complete | 2026-03-06 |
| 2. Attention Dashboard and Follow-Up System | 1/1 | ✅ Complete | 2026-03-06 |
| 3. Research Pipeline and AI Engine | 1/1 | ✅ Complete | 2026-03-06 |
| 4. Cloud Migration & Auth | 3/3 | ✅ Complete | 2026-03-09 |
| 5. UI/UX Overhaul | 4/4 | ✅ Complete | 2026-03-11 |
| 6. Gmail & Calendar Integration | 3/3 | ✅ Complete | 2026-03-11 |
| 7. Smarter AI & Networking | 2/3 | In Progress|  |
| 8. Deploy & Polish | 6/7 | In Progress|  |

**Milestone v1.0: COMPLETE** — All 3 phases delivered, 21 tests passing, all AI features verified with live APIs.
**Milestone v2.0: IN PROGRESS** — Phases 4-6 complete, 2 phases remaining (7-8).
