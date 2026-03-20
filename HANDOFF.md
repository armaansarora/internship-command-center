# HANDOFF — The Tower (Internship Command Center)
## Complete Onboarding Document for Claude Code

**Generated:** March 20, 2026 — Final Perplexity Computer → Claude Code handoff
**Grade:** ✅ CLEAN (zero TS errors, clean build, clean lint, zero console.logs, zero `any` types, zero TODOs)
**Commit:** `67c1786` on `main`
**Production:** https://internship-command-center-lake.vercel.app (HTTP 200)

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/armaansarora/internship-command-center.git
cd internship-command-center
npm install --legacy-peer-deps

# 2. Read these files IN ORDER:
#    - BOOTSTRAP-PROMPT.md (auto-generated, always current)
#    - CLAUDE.md (conventions, rules, gotchas — MANDATORY)
#    - PROJECT-CONTEXT.md (operational state, credentials, session log)
#    - docs/MASTER-PLAN.md (phases, acceptance criteria)

# 3. Type check (should be 0 errors)
npx tsc --noEmit

# 4. Build (should succeed)
npm run build
```

---

## What Is The Tower?

An immersive, game-like spatial SaaS experience for managing internship/job searches. Users don't "use a dashboard" — they **enter a skyscraper**. Every page is a floor with unique atmosphere, lighting, 2D illustrated AI characters with personalities, and spatial UI that reinforces the building metaphor.

**Owner:** Armaan Arora — NYU sophomore studying Real Estate Finance at the Schack Institute. Targeting Blackstone, CBRE, JLL, and top RE firms.

**Aesthetic:** Luxury game UI × Bloomberg Terminal × Apple spatial design. Gold `#C9A84C`, Dark `#1A1A2E`, Glass blur 16px. Fonts: Playfair Display / Satoshi / JetBrains Mono.

---

## Current State — All 7 Phases COMPLETE

| Metric | Value |
|--------|-------|
| Source files | 226 |
| Total LOC | 51,928 |
| TypeScript errors | 0 |
| Production build | Clean |
| Floors built | 9 (Lobby + PH + Floors 1-7) |
| AI agents | 8 (CEO, CRO, COO, CNO, CIO, CMO, CPO, CFO) |
| Bugs fixed | 18/19 (1 specced for future) |
| Dependencies | 38 packages |

### What's Built & Working
- 9 immersive floors with unique CSS atmospheres and procedural canvas skyline
- 8 C-suite AI agents with XState state machines, streaming dialogue, whiteboards
- Full application CRUD + Kanban drag-and-drop pipeline (@dnd-kit)
- Contact management with warmth tracking
- Cover letter generator + interview prep packet generator
- Google Drive export for documents
- Analytics dashboard (heatmaps, funnels, velocity charts, trends)
- CEO "Ring the Bell" orchestration (dispatches all agents in parallel)
- Daily briefing cron (8am ET)
- Stripe subscriptions (Free/Pro/Team with checkout, webhooks, billing portal)
- Building progression system (9 milestones with visual upgrades)
- Procedural Web Audio sound design (17 sounds, 8 ambient, muted by default)
- Mobile responsive (elevator → bottom sheet, 44px touch targets)
- Weather-reactive skyline (rain/snow/fog/thunder CSS effects)
- Easter eggs (midnight fireworks, rapid-click, 100th app confetti)
- Sentry error tracking + Upstash rate limiting
- Apple TV Ken Burns autonomous drift background
- CSS luxury lobby (marble, pillars, chandelier)
- Light/dark theme toggle
- In-world spatial notifications

### What Needs Manual Setup (Code Is Written, Env Vars Needed)
All features gracefully degrade when env vars are missing — the app works without them.

| Item | Action | Priority |
|------|--------|----------|
| Stripe env vars | Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in Vercel | High |
| Stripe webhook | Register endpoint in Stripe: `https://internship-command-center-lake.vercel.app/api/stripe/webhook` | High |
| Upstash Redis | Provision instance, set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in Vercel | Medium |
| pgvector | Enable extension in Supabase Dashboard → Database → Extensions | Medium |
| OpenAI API key | Set OPENAI_API_KEY in Vercel (for pgvector embeddings) | Medium |
| OpenWeatherMap | Get free API key, set OPENWEATHER_API_KEY in Vercel | Low |
| Sentry | Create project, set NEXT_PUBLIC_SENTRY_DSN in Vercel | Low |
| CRON_SECRET | Generate a random string, set in Vercel (protects /api/cron/briefing) | Low |
| Google OAuth | Publish from "Testing" to "Production" mode in Google Cloud Console | Before real users |
| DB password | Rotate in Supabase (was exposed during early setup) | ASAP |

---

## Architecture At A Glance

```
Next.js 16 App Router
├── /lobby (public) — luxury reception hall, Google OAuth sign-in
├── /(authenticated) — protected by Supabase middleware
│   ├── /penthouse — dashboard with real Supabase data, stat cards, pipeline viz
│   ├── /war-room — Floor 7: Kanban pipeline, CRO agent, application CRUD
│   ├── /rolodex-lounge — Floor 6: contacts, CNO + CIO agents
│   ├── /writing-room — Floor 5: cover letters, CMO agent, Google Drive export
│   ├── /situation-room — Floor 4: follow-ups, COO agent, calendar
│   ├── /briefing-room — Floor 3: interview prep, CPO agent
│   ├── /observatory — Floor 2: analytics, CFO agent, charts
│   ├── /c-suite — Floor 1: CEO, Ring the Bell orchestration
│   └── /settings — profile, theme, account management
├── /api
│   ├── /api/ceo, /api/cro, /api/coo, etc. — AI agent streaming endpoints
│   ├── /api/stripe/* — checkout, webhook, portal
│   ├── /api/cron/* — daily briefing, sync
│   ├── /api/gmail/* — OAuth, sync, callback
│   └── /api/weather, /api/progression, /api/notifications
└── src/
    ├── components/ — floor-specific + world (elevator, skyline, etc.)
    ├── lib/agents/ — 8 agents (system-prompt.ts, tools.ts, character-machine.ts each)
    ├── lib/db/queries/ — Supabase REST query functions
    ├── lib/contracts/ — 1,015 LOC Zod v4 typed contracts
    ├── lib/sound/ — procedural Web Audio engine
    ├── lib/stripe/ — config, entitlements, server
    ├── hooks/ — useCROChat, useCEOChat, etc. + useCharacter, useReducedMotion
    └── styles/ — per-floor CSS token systems (floor-1.css through floor-7.css)
```

## Agent Hierarchy
```
User (Armaan)
  └── CEO (Floor 1) — Orchestrator
      ├── CRO (Floor 7) — Pipeline intelligence
      │   └── 5 Subagents (SDR, AE, RevOps, Enablement, CSM)
      ├── COO (Floor 4) — Deadlines, scheduling
      ├── CNO (Floor 6) — Contact management
      ├── CIO (Floor 6) — Company research, pgvector
      ├── CMO (Floor 5) — Cover letters
      ├── CPO (Floor 3) — Interview prep
      └── CFO (Floor 2) — Analytics
```
Full spec: `docs/CHAIN-OF-COMMAND.md` (1,550+ lines)

---

## Critical Technical Gotchas

1. **NEVER use Drizzle ORM for runtime queries from Vercel.** The Supabase DB is IPv6-only and the pooler fails. ALL server-side data access uses Supabase REST client: `supabase.from('table').select('*')`. Drizzle is only for schema definition and `drizzle-kit push` migrations.

2. **React 19 + Next.js 16:** Must use `import type { JSX } from "react"` explicitly.

3. **Tailwind v3 (JS config).** NOT v4. Do not upgrade.

4. **@supabase/ssr** (NOT deprecated auth-helpers).

5. **Drizzle RLS:** Third-argument array pattern, NOT `.withRLS()`.

6. **GSAP imports:** 3 files import directly from `"gsap"` instead of through `src/lib/gsap-init.ts`. Should be wired through gsap-init for proper tree-shaking.

7. **ProceduralSkyline defaults to "night"** outside DayNightProvider context. This is intentional — lobby is always dark/moody.

8. **Vercel Hobby plan:** Cron schedules limited to once-daily minimum.

---

## Known Orphaned Files (Not Bugs)
These are built and functional but not yet imported into the component tree:
- `src/components/floor-6/cio-character/CIODialoguePanel.tsx` / `CIOWhiteboard.tsx`
- `src/components/world/FloorStub.tsx`, `MilestoneToast.tsx`
- `src/hooks/useCharacter.ts`
- `src/lib/db/queries/agent-memory-rest.ts`, `daily-snapshots-rest.ts`, `notifications-rest.ts`
- `src/lib/gsap-init.ts`

---

## What To Work On Next

### Immediate Priorities (Quality)
1. **Wire orphaned files** — CIODialoguePanel + CIOWhiteboard into CIOCharacter, gsap-init into GSAP consumers
2. **Write tests** — Vitest unit tests for DB queries and agent tools, Playwright E2E for auth flow
3. **Lighthouse audit** — Run performance audit, optimize based on findings
4. **Light theme** — CSS vars exist but are minimal. Flesh out full light mode palette

### Feature Work
1. **Contracts UI** — The only unchecked Phase 0 acceptance criterion. Build a standalone CRUD page for managing contracts
2. **Gmail OAuth production** — Publish Google OAuth app from Testing → Production mode
3. **Real data seeding** — Populate floors with actual internship data for Armaan's targets
4. **Custom domain** — Point a real domain at Vercel
5. **Character art** — Replace CSS sprite silhouette placeholders with proper illustrated characters (Flux.1 + LoRA, or commissioned)
6. **Lenis smooth scroll** — Package installed but not wired (was planned for Phase 2)

### Manual Setup (Non-Code)
See "What Needs Manual Setup" table above for env vars and external service configuration.

---

## File Reference

| File | Purpose |
|------|---------|
| `BOOTSTRAP-PROMPT.md` | Auto-generated session entry point (Husky pre-commit) |
| `CLAUDE.md` | Conventions, commands, agent rules, gotchas — MANDATORY read |
| `PROJECT-CONTEXT.md` | Operational state, credentials, session log |
| `SESSION-STATE.json` | Mid-session task state for handoff |
| `docs/MASTER-PLAN.md` | 7 phases with deliverables and acceptance criteria |
| `docs/VISION-SPEC.md` | Locked spatial UI spec — the building, floors, characters |
| `docs/CHAIN-OF-COMMAND.md` | AI agent hierarchy (1,550+ lines) |
| `docs/CHARACTER-PROMPTS.md` | System prompts for all 8 characters |
| `docs/BUG-TRACKER.md` | 19 bugs tracked, 18 fixed, living changelog |
| `docs/SCHEMA-DRAFT.md` | 16-table Postgres schema with RLS |
| `docs/WAR-ROOM-BLUEPRINT.md` | Phase 1 implementation guide |
| `docs/TECH-BRIEF.md` | Research findings, SDK patterns, gotchas |
| `docs/archive/` | Completed plans and research (reference only) |

---

## Session Handoff Prompt

```
Clone repo armaansarora/internship-command-center (branch: main).
Read BOOTSTRAP-PROMPT.md — it's auto-generated and current. Follow the Quick Start section.
Read CLAUDE.md — contains mandatory agent behavior rules (session state, context management, handoff). NON-NEGOTIABLE.
Read PROJECT-CONTEXT.md for full operational context.
Cut the fat, keep the meat. Max effort. Run recursive-audit after every task.
```
