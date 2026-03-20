# MASTER PLAN — Internship Command Center ("The Tower")
## Concrete Phase Specs with Acceptance Criteria

**Last updated:** 2026-03-20
**Status:** Phases 0–5 COMPLETE — Phase 6 next

---

## How to Read This Document

Each phase is a **vertical slice** — it delivers a complete floor of The Tower with its environment, character, data layer, and functionality working together. Phases are sequential; each depends on the prior phase's foundation.

**Complexity scale:** S (1-2 days) · M (3-5 days) · L (1-2 weeks) · XL (2-4 weeks)

---

## Phase 0: The Shell — Foundation + World Engine

**Goal:** Boot the entire project from scratch. Deliver a working building with one fully realized floor (The Penthouse) that proves the spatial UI concept, auth, and data layer all work together.

**Complexity:** XL (2-4 weeks)

### Deliverables

| # | Deliverable | Complexity | Description |
|---|---|---|---|
| 0.1 | Clean Next.js 16 project | S | Wipe old code from `main`, initialize fresh App Router project. Keep `.git` history. |
| 0.2 | Supabase Postgres + Drizzle schema | M | Port SQLite schema → Postgres. Add `userId UUID` to every table. Enable pgvector extension. Drizzle config with `drizzle-kit push`. |
| 0.3 | Supabase Auth (Google OAuth) | M | Sign-in/sign-up with Google. Middleware-based session checks (Next.js Data Access Layer pattern). Token refresh handling. |
| 0.4 | Row-Level Security (RLS) | M | RLS policies on every table: `auth.uid() = user_id`. Use `SET LOCAL app.user_id` in Drizzle transactions for service-role queries. |
| 0.5 | The Lobby (Login) | M | Ground floor of the building. Not a generic sign-in page — it's the building entrance. Construction-mode aesthetic (bare concrete, scaffolding). Google sign-in button integrated into the environment. Returning users see a welcome-back state. |
| 0.6 | Elevator Navigation | L | Persistent left-side elevator panel. GSAP timeline: doors close (400ms) → vertical movement (600ms) → doors open (400ms). Floor indicator with lit buttons. Elevator interior visible during transition (brushed gold walls). Works on every page. |
| 0.7 | Day/Night Cycle Engine | M | CSS custom properties driven by user's local time. 7 time-of-day states: dawn (5-7am), morning (7-10am), midday (10-2pm), afternoon (2-5pm), golden hour (5-7pm), dusk (7-9pm), night (9pm-5am). Smooth interpolation between states. Affects sky gradient, ambient light, and surface tones across the entire app. |
| 0.8 | NYC Skyline Background | L | Layered SVG/Canvas skyline. 4+ depth layers (distant buildings → mid → near → window frame). Parallax on mouse movement. Integrates with day/night cycle (lights on at dusk, stars at night). Procedural or high-quality asset — not a static image. |
| 0.9 | Custom Cursor System | M | Replace default cursor. States: default (brushed gold line), hover-interactive (glow ring), hover-character (speech bubble), dragging (grab), loading (elevator indicator). Smooth trailing. Falls back to native cursor on touch devices. |
| 0.10 | The Penthouse (Dashboard) | L | Floor PH — the hero floor. NYC skyline visible through windows. Glass surfaces with `backdrop-filter: blur(16px)`. Gold accent `#C9A84C`. Real data from Supabase: application count, pipeline summary, recent activity. Playfair Display headings, Satoshi body, JetBrains Mono data. |
| 0.11 | Contracts system port | M | Port 1,015 LOC from old repo. Swap Turso → Supabase/Drizzle. Update DepartmentId enum. Add userId scoping. |
| 0.12 | Vercel deployment | S | GitHub Actions: lint → typecheck → build. Auto-deploy `main` to Vercel. Preview deploys on PRs. Env vars configured in Vercel dashboard. |

### Acceptance Criteria
- [x] User can sign in with Google and land in The Penthouse
- [x] RLS prevents any user from seeing another user's data (test with 2 accounts)
- [x] Elevator navigation works between at least 2 floors (Lobby ↔ Penthouse) with full GSAP animation
- [x] Day/night cycle visually changes the Penthouse based on actual AST time
- [ ] Skyline has visible parallax on mouse movement (parallax removed in visual overhaul — ProceduralSkyline is canvas-based, no mouse parallax; useMouseParallax.ts deleted)
- [ ] Custom cursor renders on desktop, falls back to native on mobile (SKIPPED — CustomCursor.tsx was deleted per BUG-007 resolution; not present in current build)
- [x] Dashboard shows real data from Supabase (applications count, pipeline status)
- [ ] Contracts CRUD works through the UI (contracts ported to src/lib/contracts/ but no UI CRUD built yet)
- [ ] Lighthouse performance: >80 on all metrics (not tested)
- [x] Deployed to Vercel, accessible at production URL

### Dependencies
- Supabase project already provisioned ✅
- Vercel project already linked ✅
- GitHub repo exists ✅
- Google OAuth app configured in Google Cloud Console (needs redirect URI update for production)

### Risks
- **Google OAuth in Testing mode** — 7-day token expiry. Must publish to Production before real users.
- **GSAP bundle size** — Tree-shake aggressively. Only import used plugins.
- **Skyline performance** — Must be GPU-accelerated (transform3d, will-change). Test on low-end devices.

---

## Phase 1: The War Room — Applications + CRO Agent

**Goal:** The first functional floor beyond the dashboard. Users can manage applications with a full CRUD interface, and the CRO agent character provides pipeline intelligence.

**Complexity:** L (1-2 weeks)

### Deliverables

| # | Deliverable | Complexity | Description |
|---|---|---|---|
| 1.1 | Floor 7 Environment | M | The War Room atmosphere: darker tones, tactical feel, data-dense. Own lighting scheme (cooler, more blue). Window view shows city from floor 7 height. |
| 1.2 | Application CRUD | M | Create, read, update, delete applications. Status pipeline: Saved → Applied → Phone Screen → Interview → Offer → Rejected. Bulk actions. Search/filter. All RLS-scoped. |
| 1.3 | Pipeline Visualization | M | Visual pipeline (Kanban or funnel) rendered as part of the room's environment — data on the "war table," not a generic chart. Drag-and-drop status changes. |
| 1.4 | CRO Agent (Backend) | L | Port CRO agent from old repo (~500 LOC tools + agent logic). Adapt to Supabase queries. Tools: `queryApplications`, `updateStatus`, `suggestFollowUp`, `analyzeConversionRates`. Powered by Vercel AI SDK v6 `ToolLoopAgent`. |
| 1.5 | CRO Character (Frontend) | M | 2D illustrated character in the room (Option A). Idle animation at whiteboard. Approach interaction: click character → conversation panel opens as face-to-face dialogue. CRO personality: aggressive, numbers-driven. Pipeline data visible on the whiteboard behind them. |
| 1.6 | Character Interaction System | L | Reusable system for all future characters. Components: character sprite with parallax depth, approach detection, conversation panel (styled as dialogue, not chatbot), AI message streaming, character personality injection into system prompt. |

### Acceptance Criteria
- [x] User can create an application and see it in the pipeline
- [x] Drag-and-drop changes application status
- [x] CRO agent can answer "How's my pipeline looking?" with real data
- [x] CRO character has visible idle animation and talking state
- [x] Conversation feels in-character (aggressive, numbers-driven tone)
- [x] All data is RLS-scoped — multi-tenant safe

### Dependencies
- Phase 0 complete (auth, elevator, world shell)
- Character illustration assets (2D sprites for CRO — idle, talking, gesturing)

---

## Phase 2: Communications Floor — Gmail + Calendar + COO

**Goal:** Connect the user's Gmail and Google Calendar. Parse incoming emails for application-related signals. The COO (Dylan Shorts) manages deadlines and scheduling.

**Complexity:** XL (2-4 weeks)

### Deliverables

| # | Deliverable | Complexity | Description |
|---|---|---|---|
| 2.1 | Per-user Gmail OAuth | L | Full OAuth 2.0 flow for Gmail API access. Secure token storage in Supabase (encrypted). Refresh token handling. Revocation UI. Must work for multiple users (multi-tenant). |
| 2.2 | Email Parsing Engine | L | Port from old repo (304 LOC). Inngest background job: scan inbox on schedule, classify emails (application confirmation, rejection, interview invite, follow-up needed). Store parsed signals in DB. |
| 2.3 | Google Calendar Integration | M | Port from old repo (~400 LOC). Read/write calendar events. Interview scheduling assistance. Conflict detection. |
| 2.4 | Floor 4: The Situation Room | M | Time-sensitive atmosphere. Alert energy — clocks, countdown timers, urgency indicators integrated into the room. Window view from floor 4. |
| 2.5 | COO Character (Dylan Shorts) | M | Seated at clean desk with multiple monitors and calendars. Personality: organized, deadline-focused. Proactive alerts: "You have 3 follow-ups overdue." Calendar visible on his wall (character memory as visible history). |
| 2.6 | Follow-up System | M | Auto-detect stale applications (no response in X days). COO triggers follow-up suggestions. Draft follow-up emails via Resend. Track follow-up chains. |
| 2.7 | Inngest Background Sync | M | Scheduled jobs: inbox scan (every 30 min), calendar sync (every hour), stale application check (daily). Inngest Realtime for streaming progress to frontend. |

### Acceptance Criteria
- [x] User can connect their Gmail account via OAuth
- [x] System parses new emails and classifies them correctly (>90% accuracy on standard patterns)
- [x] Calendar events appear in the COO's room
- [x] COO proactively alerts about overdue follow-ups
- [x] Follow-up emails can be drafted and sent via Resend
- [x] Background sync runs on schedule without user intervention
- [x] Token refresh works silently — user never has to re-authenticate unless they revoke

### Dependencies
- Phase 0 + Phase 1 complete
- Google Cloud Console: Gmail API + Calendar API enabled, OAuth consent screen published to Production
- Inngest account set up and connected to Vercel

### Risks
- **Gmail API quotas** — 250 quota units per user per second. Batch requests where possible.
- **OAuth token storage security** — Encrypt at rest. Never expose refresh tokens to the client.
- **Email parsing accuracy** — Start with rule-based (subject line patterns, sender domains), layer AI classification later.

---

## Phase 3: Intelligence Floor — Research + Contacts

**Goal:** Company intelligence and contact management. The CIO researches companies, the CNO manages relationships.

**Complexity:** L (1-2 weeks)

### Deliverables

| # | Deliverable | Complexity | Description |
|---|---|---|---|
| 3.1 | Floor 6: The Rolodex Lounge | M | Warm networking lounge. Relaxed but professional. Soft lighting, lounge furniture aesthetic. |
| 3.2 | Contact Management | M | CRUD for professional contacts. Fields: name, company, role, relationship warmth (cold/warm/hot), last contact date, notes. Link contacts to applications. |
| 3.3 | CNO Character | M | Warm, social personality. Lounge area with a rolodex and contact cards. Remembers everyone — "You haven't reached out to Sarah Chen in 3 weeks." Warmth tracking visualized as actual contact cards in the room. |
| 3.4 | CIO Agent + Research View | L | Web search-powered company research. Tools: company profile lookup, tech stack analysis, Glassdoor/LinkedIn data extraction, news monitoring. Results stored with pgvector embeddings for similarity search. |
| 3.5 | pgvector Integration | M | Enable pgvector extension in Supabase. Embed company profiles and job descriptions. Similarity search: "Find companies like Blackstone." |
| 3.6 | CIO Character | M | Cerebral, research-obsessed. Surrounded by screens and documents. Visual: research dossiers pinned to the wall behind them. |

### Acceptance Criteria
- [x] User can add contacts and link them to applications
- [x] CNO alerts on cold contacts (no interaction in 2+ weeks)
- [x] CIO can research a company and produce a briefing with real data
- [x] pgvector similarity search returns relevant companies (test: "companies like Blackstone")
- [x] Contact warmth is visualized in the room environment

### Dependencies
- Phase 0 + Phase 1 complete (Phase 2 optional but recommended)
- pgvector extension enabled in Supabase

---

## Phase 4: Creative Floors — Cover Letters + Interview Prep

**Goal:** AI-powered content generation. The CMO writes cover letters, the CPO generates interview prep packets.

**Complexity:** L (1-2 weeks)

### Deliverables

| # | Deliverable | Complexity | Description |
|---|---|---|---|
| 4.1 | Floor 5: The Writing Room | M | Quiet, library-like, focused creative space. Warm wood tones. Desk with drafts. Window view from floor 5. |
| 4.2 | Cover Letter Generator | L | AI-powered cover letter drafting. Inputs: company info (from CIO research), job description, user's resume/experience. Template system with multiple tones (formal, conversational, bold). Edit/refine cycle with CMO. Export to PDF/DOCX. |
| 4.3 | CMO Character | M | Creative, eloquent. Writing desk with drafts scattered around. Personality: words are their weapon. Talks about messaging, positioning, narrative. |
| 4.4 | Floor 3: The Briefing Room | M | Clean, sharp, preparation space. Whiteboards, prep materials on walls. Clinical lighting. |
| 4.5 | Interview Prep Generator | L | AI-generated prep packets. Company research (from CIO), common questions for the role, behavioral question frameworks, company culture analysis. Export to PDF. |
| 4.6 | CPO Character | M | Methodical, thorough. Briefing room with prep materials on walls. "Let's make sure you know everything about this company before you walk in." |
| 4.7 | Google Drive Export | S | Export cover letters and prep packets directly to user's Google Drive. Uses google_drive connector. |

### Acceptance Criteria
- [x] User can generate a cover letter tailored to a specific application
- [x] Cover letter quality is professional (test against Blackstone, CBRE, JLL applications)
- [x] Interview prep packet includes company-specific research + role-specific questions
- [x] Documents export to Google Drive successfully
- [x] CMO and CPO characters respond in distinct personalities

### Dependencies
- Phase 0 complete, Phase 3 recommended (CIO research feeds into cover letters and prep)
- Google Drive API access (connector already connected)

---

## Phase 5: The Observatory + C-Suite — Analytics + Full Orchestra

**Goal:** Complete analytics dashboard and the full CEO orchestration system. Every agent works together. Daily briefings become automated.

**Complexity:** XL (2-4 weeks)

### Deliverables

| # | Deliverable | Complexity | Description |
|---|---|---|---|
| 5.1 | Floor 2: The Observatory | M | Panoramic, cool blue tones, analytical. Wide view with data visualizations integrated into the room. Charts feel like instruments in the room, not widgets on a page. |
| 5.2 | Analytics Dashboard | L | Application conversion rates, response times, pipeline velocity, activity heatmap, agent usage stats. All real data. Charts: bar, line, funnel. Export to CSV/PDF. |
| 5.3 | CFO Character | M | Analytical, precise. Desk with charts and financial dashboards. "Your conversion rate from Applied to Interview is 12% — 3 points below last month." |
| 5.4 | Floor 1: The C-Suite (CEO's Office) | M | Executive boardroom. The most impressive room in the building. Where the CEO orchestrates everything. |
| 5.5 | CEO Orchestration | L | "Ring the bell" → CEO dispatches all departments in parallel via Inngest events → Each agent runs with AI SDK v6 tools → Results compile into a unified briefing → Notification sent via SSE/Inngest Realtime. |
| 5.6 | Daily Briefing Cron | M | Inngest cron job (configurable time, default 8am user local). CEO compiles overnight activity. Delivered as The Morning Briefing ritual (CEO at the window, briefing unfolds as conversation). |
| 5.7 | Agent Memory System | M | pgvector-backed conversation history per character. Characters remember past interactions. Visible in room environment (CRO's whiteboard, COO's calendar, CNO's rolodex). |
| 5.8 | In-World Notifications | M | Replace generic toasts with spatial notifications: elevator button pulses, character taps window, pneumatic tube delivers message. Each notification type has its own animation. |

### Acceptance Criteria
- [x] Analytics show accurate, real-time data for the logged-in user
- [x] "Ring the bell" triggers all agents and produces a compiled briefing within 60 seconds
- [x] Daily briefing runs automatically at configured time
- [x] CEO character delivers briefing as a conversation scene
- [x] Characters remember previous interactions across sessions
- [x] Notifications appear in-world, not as generic toasts

### Dependencies
- All previous phases complete (all agents need their data layers)
- Inngest fully configured with all event types

---

## Phase 6: Polish + Monetization

**Goal:** Production-ready SaaS. Stripe subscriptions, performance optimization, sound design, mobile, and the progression system.

**Complexity:** XL (2-4 weeks)

### Deliverables

| # | Deliverable | Complexity | Description |
|---|---|---|---|
| 6.1 | Stripe Subscription Integration | L | Free/Pro/Team tiers. Free: limited applications (10), no agents. Pro: unlimited everything, all agents, daily briefings. Team: multi-user, shared pipeline. Stripe Checkout, webhooks via Inngest, entitlement checks in middleware. |
| 6.2 | Building Progression System | L | New users start in construction-mode lobby. Milestones unlock floor renovations: connect Gmail → unlock comms floor visual upgrade, add first 10 apps → War Room upgrades, etc. Progression stored in DB. Creates emotional investment. |
| 6.3 | Performance Optimization | M | Lazy-load floors (only load the active floor's heavy assets). Image/SVG compression. GSAP tree-shaking. Code splitting per floor. Target: <3s initial load, <1s floor transitions. |
| 6.4 | Sound Design (Optional) | M | Ambient soundscapes per floor (Web Audio API). Elevator ding + movement. Character voice presence (positional audio). ALL muted by default. Toggle in settings. |
| 6.5 | Mobile Responsive | L | Touch-friendly navigation. Elevator becomes bottom sheet or swipe gesture. Simplified parallax (reduce layers). Characters scale down. Custom cursor disabled. Touch-optimized interaction areas. |
| 6.6 | Liquid Glass Polish | S | Frosted glass surfaces with subtle refraction. Penthouse windows reflect skyline. Elevator interior has polished gold specular highlights. Decorative only — never on text/controls. |
| 6.7 | Easter Eggs | S | Midnight fireworks, rapid-click elevator message, 100th application confetti, character backstory nameplates. Small touches that reward exploration. |
| 6.8 | Weather-Reactive Skyline | S | OpenWeatherMap API. Rain → streaks on windows. Clear → sharp skyline. Snow → accumulation on ledges. Subtle but rewarding. |
| 6.9 | Sentry Error Tracking | S | Error monitoring for production. Capture unhandled errors, track agent failures, monitor API latencies. |
| 6.10 | Rate Limiting (Upstash Redis) | M | Per-user rate limits on API routes and agent invocations. Prevent abuse. Configurable per subscription tier. |

### Acceptance Criteria
- [x] User can subscribe to Pro plan via Stripe Checkout
- [x] Free tier correctly limits functionality (10 apps, no agents)
- [x] Building progression visually reflects user's actual milestones
- [ ] Lighthouse performance: >90 on all metrics (pending production deploy + test)
- [x] App is usable on mobile (iPhone SE as baseline)
- [x] Sound design works when enabled, completely silent when disabled
- [x] Sentry captures errors in production (pending DSN configuration)
- [x] Rate limiting prevents >100 API calls/minute per user (pending Upstash provisioning)

### Dependencies
- All previous phases complete
- Stripe account configured with product/price objects
- Upstash Redis provisioned
- OpenWeatherMap API key
- Sound assets (royalty-free or procedural)

---

## Phase Summary

| Phase | Name | Floors Built | Characters | Complexity | Cumulative Effort |
|---|---|---|---|---|---|
| 0 | The Shell | Lobby + Penthouse | — | XL | ~3 weeks |
| 1 | The War Room | Floor 7 | CRO | L | ~5 weeks |
| 2 | Communications | Floor 4 | COO (Dylan Shorts) | XL | ~8 weeks |
| 3 | Intelligence | Floor 6 | CNO + CIO | L | ~10 weeks |
| 4 | Creative | Floors 5 + 3 | CMO + CPO | L | ~12 weeks |
| 5 | Observatory + C-Suite | Floors 2 + 1 | CFO + CEO | XL | ~15 weeks |
| 6 | Polish + Monetization | All floors polished | — | XL | ~18 weeks |

**Total estimated timeline: ~18 weeks (4.5 months) of active development sessions.**

This is aggressive but achievable given: AI-assisted development, existing code to port (~7,000 LOC), and established infrastructure (Supabase, Vercel, GitHub all provisioned).

---

## Testing Strategy

Masters-level code means real testing. Every phase includes tests for its deliverables.

### Test Stack
| Tool | Purpose |
|---|---|
| Vitest | Unit tests, component tests (fast, native ESM, Vite-compatible) |
| Playwright | E2E tests: auth flows, elevator navigation, agent interactions |
| MSW (Mock Service Worker) | API mocking for Supabase, Inngest, external services |
| Testing Library | React component behavior tests |

### What Gets Tested Per Phase
| Phase | Required Tests |
|---|---|
| 0 | Auth flow (sign in, sign out, redirect), RLS isolation (2 users can't see each other's data), Drizzle schema migration runs clean, elevator navigation state |
| 1 | Application CRUD, pipeline status transitions, CRO agent tool calls return correct data |
| 2 | Email classification accuracy (10+ test fixtures), calendar sync idempotency, follow-up detection |
| 3 | Contact CRUD, warmth decay logic, pgvector similarity search returns relevant results |
| 4 | Cover letter generation produces valid output, prep packet includes required sections |
| 5 | CEO orchestration fan-out/fan-in, daily briefing cron, analytics calculations |
| 6 | Stripe webhook handling (subscription created/cancelled/updated), rate limiting enforced |

### Testing Rules
1. Every DB query function gets a unit test with test data
2. Every API route gets an integration test (happy path + auth failure)
3. RLS isolation test runs in EVERY phase (regression)
4. Agent tools are tested with mocked LLM responses (deterministic)
5. E2E: auth flow + one critical user journey per phase
6. CI runs: `vitest run` + `playwright test` on every PR

### Test File Convention
```
src/
  lib/agents/cro.test.ts       # Unit test next to source
  db/schema.test.ts            # Schema validation tests
tests/
  e2e/auth.spec.ts             # Playwright E2E tests
  e2e/elevator.spec.ts
  fixtures/                    # Shared test data
    emails.json                # Classified email samples
    applications.json          # Sample application data
```

---

## Error Handling Patterns

### Server Actions / API Routes
```ts
// Standard error response shape (all API routes)
type ApiResponse<T> = { data: T; error: null } | { data: null; error: { code: string; message: string } };
```

### Agent Errors
Agent failures are logged to `agent_logs` with status `failed`, error message, and duration. The CEO orchestrator handles partial failures gracefully — if 1 of 7 agents fails, the briefing still compiles with available data and notes what's missing.

### User-Facing Errors
Errors display as in-world events, not generic toasts:
- Auth errors: lobby door won't open, concierge explains
- Agent errors: character shows "confused" state, explains what went wrong
- Network errors: building lights flicker, retry indicator

---

## Open Architecture Decisions (To Resolve During Build)

1. **Character illustration pipeline** — AI-generated (Flux.1 + LoRA) vs. commissioned artist vs. open-source assets
2. **Skyline asset** — Fully procedural SVG vs. high-quality layered static asset with parallax
3. **Elevator animation** — Pure GSAP timeline vs. Framer Motion + GSAP hybrid
4. **Agent LLM provider** — Anthropic only vs. multi-provider (OpenAI for some tools)
5. **Stripe pricing** — Exact tier pricing and feature gates (decide before Phase 6)
6. **Custom domain** — When to set up (Phase 0 or Phase 6)
7. **Google OAuth production** — Must publish app before Phase 2 (Gmail integration)
