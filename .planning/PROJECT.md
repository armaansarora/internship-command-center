# Internship Command Center

## What This Is

A personal command center for Armaan Arora's internship search — a full-stack web app that surfaces what needs attention right now, tracks 100+ applications across tiers, generates tailored cover letters powered by real company research and Claude API, manages follow-up outreach, integrates with Gmail and Google Calendar, and tracks networking contacts. Deployed to Vercel for anywhere-access. This is a real daily-driver tool for an active job hunt, not a demo.

## Core Value

When Armaan opens the app — from his laptop, phone, or school computer — he instantly knows what needs his attention: new email responses, upcoming interviews on his calendar, warm leads going cold, overdue follow-ups, and who to reach out to next. Everything else serves this.

## Milestones

### v1.0 — Foundation (COMPLETE)
Delivered: Application tracker, attention dashboard, follow-up system, cover letter engine, company research, dark-mode UI. All local-first on SQLite.

### v2.0 — Production-Ready (ACTIVE)
Goal: Transform from bare-bones local prototype to polished, deployed product with Gmail/Calendar integration, premium UI, smarter AI, and networking layer.

Key themes:
- **Cloud migration** — Turso (cloud SQLite) + Auth.js for Google OAuth
- **UI/UX overhaul** — Framer Motion, toasts, command palette, loading states, mobile polish
- **Email integration** — Gmail API for reading responses and sending follow-ups directly
- **Calendar integration** — Google Calendar for interviews and follow-up reminders
- **Smarter AI** — Interview prep, cover letter versioning, company comparison
- **Networking** — Contact tracking, referral chains, relationship warmth
- **Deployment** — Vercel with preview deploys and custom domain

## Requirements

### Validated (v1.0 — shipped and working)

- [x] Attention-first dashboard showing urgent items (interviews, stale warm leads, overdue follow-ups)
- [x] Application tracker with sortable/filterable list of all 75+ applications
- [x] Click any application to see rich company detail (live Tavily research, not hardcoded)
- [x] Priority tier system (T1: RE Finance, T2: Real Estate, T3: Finance, T4: Other)
- [x] Status tracking with visual states (Applied, In Progress, Interview, Under Review, Rejected, Offer)
- [x] AI cover letter engine using Claude API with real resume and writing style
- [x] Cover letter output matches Armaan's voice (honest, grounded, specific)
- [x] Company research via Tavily API with SQLite caching (7-day TTL)
- [x] Follow-up system with auto-suggested timelines based on tier and status
- [x] Quick-add for new applications with smart defaults
- [x] Seed database with 75 applications
- [x] Clean dark-mode UI with sidebar navigation
- [x] AI-drafted follow-up emails with context-aware templates

### Active (v2.0)

- [ ] Cloud database (Turso) so app works from any device
- [ ] Google OAuth sign-in with Gmail + Calendar API access
- [ ] Gmail integration — read application responses, send follow-ups from app
- [ ] Google Calendar integration — interview events, follow-up reminders
- [ ] Framer Motion page transitions and list animations
- [ ] Toast notifications for all user actions
- [ ] Command palette (⌘K) for global search and navigation
- [ ] Loading skeletons on all data-fetching pages
- [ ] Empty states with CTAs for every page
- [ ] Inline table editing for status/tier
- [ ] Mobile-responsive bottom tab bar
- [ ] Interview prep generation (company overview, likely questions, talking points)
- [ ] Cover letter version history with side-by-side comparison
- [ ] Company comparison (2-3 companies, structured table)
- [ ] Contact/networking tracker with relationship warmth
- [ ] Referral chain tracking (who introduced who)
- [ ] Vercel deployment with preview deploys

### Out of Scope

- Handshake/LinkedIn scraping — too fragile, APIs change constantly
- Mobile native app — responsive web is sufficient
- Heavy analytics (pie charts, conversion rates, pipeline velocity) — Armaan explicitly hates this
- Multi-user / team features — single-user personal tool
- Job discovery / search — this tracks applications, doesn't find jobs

## Context

Armaan is an NYU Schack Institute of Real Estate student (B.S. in Real Estate, concentration in RE Finance, expected May 2028). He has 100+ internship applications out across RE Finance, Real Estate, Finance, and other sectors. He has a HireVue interview pending at JPMorgan and a warm referral at Merrill Lynch through his dad.

V1.0 was a ground-up rebuild after a failed first attempt. It succeeded — all features work, AI is verified with live APIs, 21 tests passing. But the app feels "bare bones" and needs polish, integrations, and deployment to become a true daily-driver.

### Key Data Points (for cover letter engine)
- **Education:** NYU Schack, B.S. Real Estate (RE Finance concentration), 3.58 GPA / 3.87 Major GPA, Dean's List
- **Experience:** National Lecithin (Summer Analyst Intern, May-Aug 2025) — A/P, A/R, AI modernization, supplier negotiations
- **Leadership:** SREG Mentorship Program, Schack RE Club
- **Coursework:** RE Finance, RE Accounting & Tax, RE Development, RE Law, Urban RE Economics
- **Currently taking (Spring 2026):** Calculus I, Political Economy of Education, RE Finance, RE Development, RE Accounting & Tax

## Constraints

- **Database:** Turso (cloud SQLite via libSQL) — migrated from local SQLite in v2.0
- **Auth:** Auth.js v5 with Google OAuth (single-user, whitelisted accounts)
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514) for generation
- **Research:** Tavily API for live company research (free tier, 1000 searches/month)
- **Email:** Gmail API via OAuth tokens from Auth.js
- **Calendar:** Google Calendar API via same OAuth tokens
- **Stack:** Next.js 16.1.6, React 19, Tailwind CSS v4, shadcn/ui, Drizzle ORM
- **Design:** Dark mode, minimal, clean. Framer Motion for feel. No dashboard overload.
- **Data integrity:** Cover letters must NEVER fabricate facts. Only verified research and real resume data.
- **Deploy:** Vercel (serverless, free tier, preview deploys)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite → Turso | Cloud SQLite — same dialect, driver swap, minimal migration. Free tier generous. | v2.0 |
| Auth.js + Google OAuth | One flow gives app auth + Gmail tokens + Calendar tokens. JWT with auto-refresh. | v2.0 |
| Framer Motion for animations | Orchestrated animations, exit animations, layout animations. CSS-only can't do this. | v2.0 |
| sonner for toasts | shadcn-compatible, accessible, minimal bundle size. | v2.0 |
| Vercel for hosting | Zero-config Next.js hosting. Preview deploys. Free tier sufficient for personal tool. | v2.0 |
| Turso over Supabase | Same SQL dialect as current SQLite. Driver swap, not schema rewrite. | v2.0 |
| JWT over DB sessions | Simpler for single-user. No session table needed. Tokens in cookie. | v2.0 |
| Contacts as separate table | Not every application has a contact. Flexible many-to-many via company name. | v2.0 |

---
*Last updated: 2026-03-09 — v2.0 milestone initialized*
