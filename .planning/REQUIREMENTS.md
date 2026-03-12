# Requirements: Internship Command Center

**Defined:** 2026-03-06
**Updated:** 2026-03-09 (v2.0 milestone)
**Core Value:** When Armaan opens the app — from his laptop, phone, or school computer — he instantly knows what needs his attention: new email responses, upcoming interviews on his calendar, warm leads going cold, overdue follow-ups, and who to reach out to next.

## v1 Requirements (COMPLETE)

All v1 requirements shipped and verified. See v1.0 roadmap for details.

### Data Foundation — COMPLETE
- [x] **DATA-01**: SQLite database with WAL mode, Drizzle ORM schema
- [x] **DATA-02**: Application record with all fields (company, role, tier, sector, status, date, platform, contact, notes)
- [x] **DATA-03**: 75 seeded applications
- [x] **DATA-04**: Company research cache (Tavily + 7-day TTL)
- [x] **DATA-05**: Resume data as typed TypeScript constants (lib/resume.ts)

### Application Tracking — COMPLETE
- [x] **TRACK-01** through **TRACK-10**: Full tracker with sorting, filtering, search, detail views, status management, quick-add, color-coded tiers and statuses

### Dashboard — COMPLETE
- [x] **DASH-01** through **DASH-06**: Attention-first dashboard with urgent items, status counters, activity feed, quick-add

### Cover Letter Engine — COMPLETE
- [x] **COVR-01** through **COVR-10**: Full cover letter pipeline with Tavily research, Claude generation, voice matching, no-fabrication guarantees, copy/download/edit

### Follow-Up System — COMPLETE
- [x] **FLLW-01** through **FLLW-07**: Auto-suggested timelines, overdue alerts, dedicated queue, AI-drafted emails, snooze/dismiss

### UI & Design — COMPLETE
- [x] **UI-01** through **UI-07**: Dark mode, clean typography, responsive layout, sidebar navigation

---

## v2 Requirements (ACTIVE)

Requirements for v2.0 milestone. Transforms the bare-bones local prototype into a polished, deployed product with real integrations.

### Cloud Migration

- [x] **CLOUD-01**: Migrate from better-sqlite3 to Turso (@libsql/client) — all Drizzle queries become async, same SQL dialect
- [x] **CLOUD-02**: All existing tables (applications, companies, cover_letters, follow_ups, company_research) migrated to Turso with data preserved
- [x] **CLOUD-03**: Auth token storage via JWT strategy (encrypted cookie) — no database session tables needed. *(Updated from original "new tables added" — the approved v2.0 design uses JWT strategy, not database adapter, so Auth.js `accounts`/`sessions`/`users`/`verification_tokens` tables are unnecessary. See 04-RESEARCH.md.)*
- [x] **CLOUD-04**: Environment variables: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN configured for both dev and production
- [x] **CLOUD-05**: App works identically after migration — all existing features functional against Turso

### Authentication

- [x] **AUTH-01**: Auth.js v5 with Google OAuth provider — single sign-in flow
- [x] **AUTH-02**: Whitelist enforcement — only armaan.arora@nyu.edu and armaansarora20@gmail.com can sign in
- [x] **AUTH-03**: JWT strategy with automatic token refresh for Gmail and Calendar API access
- [x] **AUTH-04**: OAuth scopes include: openid, profile, email, gmail.readonly, gmail.send, calendar.events, calendar.readonly
- [x] **AUTH-05**: All routes protected — unauthenticated users redirected to sign-in page
- [x] **AUTH-06**: Sign-out functionality with session cleanup

### Gmail Integration

- [x] **EMAIL-01**: Read application-related emails via Gmail API (messages.list with filters)
- [x] **EMAIL-02**: Match incoming emails to applications by company name/domain
- [x] **EMAIL-03**: Unread application responses surfaced on dashboard as attention items
- [x] **EMAIL-04**: Email thread view on application detail page
- [x] **EMAIL-05**: Send follow-up emails directly from app via Gmail API (no copy-paste workflow)
- [x] **EMAIL-06**: Sent emails logged in activity feed

### Calendar Integration

- [x] **CAL-01**: Auto-create Google Calendar events for interviews
- [x] **CAL-02**: Follow-up reminders as calendar events with notifications
- [x] **CAL-03**: "Add to Calendar" button on follow-ups and interview items
- [x] **CAL-04**: Upcoming events (next 7 days) shown on dashboard widget

### UI/UX Overhaul

- [x] **UX-01**: Framer Motion page transitions between routes (AnimatePresence + FrozenRouter pattern)
- [x] **UX-02**: Framer Motion list animations — stagger effects on application list, attention items
- [x] **UX-03**: Toast notifications (sonner) for all user mutations (add, update, delete, generate, send)
- [x] **UX-04**: Command palette (cmdk — already installed) wired up with command+K for global search and navigation
- [x] **UX-05**: Loading skeletons on all data-fetching pages (dashboard, tracker, detail, cover letters)
- [x] **UX-06**: Empty states with CTAs for every page (no applications yet, no follow-ups pending, etc.)
- [x] **UX-07**: Inline table editing — update status and tier directly in the tracker table without opening detail view
- [x] **UX-08**: Mobile-responsive bottom tab bar replacing sidebar on small screens
- [x] **UX-09**: Micro-interactions: hover effects, press states, gradient tier badges
- [x] **UX-10**: Swipe actions on mobile cards (swipe to dismiss follow-up, swipe to change status)

### Smarter AI

- [x] **AI-01**: Interview prep generation — company overview, likely questions, talking points, recent news for a specific company
- [x] **AI-02**: Cover letter version history — store every generation, mark favorites
- [x] **AI-03**: Cover letter side-by-side comparison of two versions
- [x] **AI-04**: Company comparison — select 2-3 companies, structured table comparing culture/size/deals/fit
- [x] **AI-05**: Enhanced follow-up templates — context-aware (thank-you vs. cold follow-up vs. referral nudge vs. post-interview)

### Networking Layer

- [x] **NET-01**: Contacts table: name, company, email, phone, role, relationship type (recruiter, referral, alumni, cold contact)
- [x] **NET-02**: Contact cards displayed on application detail pages
- [x] **NET-03**: "Who do I know at [Company]?" search
- [x] **NET-04**: Relationship warmth tracking with auto-decay (cold after 30 days no contact)
- [x] **NET-05**: Referral chain tracking (introduced_by foreign key — self-referential)
- [x] **NET-06**: Contacts page with list view, add/edit contact form

### Deployment

- [ ] **DEPLOY-01**: Vercel deployment with auto-deploy from GitHub on push
- [ ] **DEPLOY-02**: Preview deploys per branch
- [ ] **DEPLOY-03**: All environment variables configured in Vercel (Turso, Google OAuth, Claude API, Tavily API)
- [x] **DEPLOY-04**: App accessible from any device (laptop, phone, school computer)
- [x] **DEPLOY-05**: Performance: dashboard loads in < 2 seconds on Vercel

## Out of Scope

| Feature | Reason |
|---------|--------|
| Handshake/LinkedIn scraping | Too fragile, APIs change constantly |
| Mobile native app | Responsive web is sufficient |
| Heavy analytics (pie charts, conversion rates) | Armaan explicitly hates this |
| Multi-user / team features | Single-user personal tool |
| Job discovery / search | This tracks applications, doesn't find jobs |
| Kanban board view | Wrong abstraction at 100+ applications |
| Auto-apply / bulk apply | Defeats the purpose of tailored outreach |

## Traceability

### v1 Requirements -> Phases 1-3 (COMPLETE)

All 45 v1 requirements delivered across Phases 1-3. See v1.0 ROADMAP.md.

### v2 Requirements -> Phases 4-8

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLOUD-01 | Phase 4 | Complete |
| CLOUD-02 | Phase 4 | Complete |
| CLOUD-03 | Phase 4 | Complete |
| CLOUD-04 | Phase 4 | Complete |
| CLOUD-05 | Phase 4 | Complete |
| AUTH-01 | Phase 4 | Complete |
| AUTH-02 | Phase 4 | Complete |
| AUTH-03 | Phase 4 | Complete |
| AUTH-04 | Phase 4 | Complete |
| AUTH-05 | Phase 4 | Complete |
| AUTH-06 | Phase 4 | Complete |
| UX-01 | Phase 5 | Complete |
| UX-02 | Phase 5 | Complete |
| UX-03 | Phase 5 | Complete |
| UX-04 | Phase 5 | Complete |
| UX-05 | Phase 5 | Complete |
| UX-06 | Phase 5 | Complete |
| UX-07 | Phase 5 | Complete |
| UX-08 | Phase 5 | Complete |
| UX-09 | Phase 5 | Complete |
| UX-10 | Phase 5 | Complete |
| EMAIL-01 | Phase 6 | Complete |
| EMAIL-02 | Phase 6 | Complete |
| EMAIL-03 | Phase 6 | Complete |
| EMAIL-04 | Phase 6 | Complete |
| EMAIL-05 | Phase 6 | Complete |
| EMAIL-06 | Phase 6 | Complete |
| CAL-01 | Phase 6 | Complete |
| CAL-02 | Phase 6 | Complete |
| CAL-03 | Phase 6 | Complete |
| CAL-04 | Phase 6 | Complete |
| AI-01 | Phase 7 | Complete |
| AI-02 | Phase 7 | Complete |
| AI-03 | Phase 7 | Complete |
| AI-04 | Phase 7 | Complete |
| AI-05 | Phase 7 | Complete |
| NET-01 | Phase 7 | Complete |
| NET-02 | Phase 7 | Complete |
| NET-03 | Phase 7 | Complete |
| NET-04 | Phase 7 | Complete |
| NET-05 | Phase 7 | Complete |
| NET-06 | Phase 7 | Complete |
| DEPLOY-01 | Phase 8 | Pending |
| DEPLOY-02 | Phase 8 | Pending |
| DEPLOY-03 | Phase 8 | Pending |
| DEPLOY-04 | Phase 8 | Complete |
| DEPLOY-05 | Phase 8 | Complete |

**Coverage:**
- v1 requirements: 45 total (all COMPLETE)
- v2 requirements: 48 total
- Mapped to phases: 48
- Unmapped: 0

---
*Requirements defined: 2026-03-06*
*v2.0 requirements added: 2026-03-09*
*CLOUD-03 updated: 2026-03-09 (JWT strategy replaces DB tables requirement)*
