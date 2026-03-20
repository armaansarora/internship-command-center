# BOOTSTRAP PROMPT — The Tower

> **Auto-generated** by `scripts/generate-bootstrap.ts` on Friday, March 20, 2026 at 12:07 AM EDT
> Run `npm run bootstrap` to regenerate. Auto-runs on every commit (Husky pre-commit hook).
> **DO NOT manually edit** — changes will be overwritten.

---

## Quick Start

1. Clone: `armaansarora/internship-command-center` (branch: `main`)
2. Read this file top to bottom
3. **Read `CLAUDE.md` — contains mandatory agent behavior rules (session state, context management, handoff). NON-NEGOTIABLE.**
4. Read `PROJECT-CONTEXT.md` for full operational context
5. Load skills: `website-building/webapp`, `design-foundations`, `recursive-audit`, `research-assistant`
6. Read `docs/MASTER-PLAN.md` for the next phase's acceptance criteria
7. Begin work on the TODO items below

## Status

- **Current state:** Phase 0 IN PROGRESS
- **Branch:** `main` (commit `742ea47`)
- **Production:** `internship-command-center-lake.vercel.app`
- **Total LOC:** 9,467 across 49 source files
- **Build:** Clean (zero TS errors)


## Session State (where we left off)

- **Current task:** General development
- **Deliverable:** unknown
- **Status:** in_progress
- **Last file touched:** `unknown`
- **Notes:** No feature commits this session (tooling/infra only).
- **State captured:** 2026-03-20T03:46:58.269Z

## Changes Since Last Bootstrap

```
742ea47 fix(sprint-2): BUG-001,002,005,011,012 — navigation, sign out, settings, user menu
```

## Acceptance Criteria — Progress

**Progress: 6 verified / 1 likely / 40 unverified** (of 47)

✅ User can sign in with Google and land in The Penthouse
    └─ Auth callback + Penthouse found
✅ RLS prevents any user from seeing another user's data (test with 2 accounts)
    └─ RLS policies in schema.ts
✅ Elevator navigation works between at least 2 floors (Lobby ↔ Penthouse) with full GSAP animation
    └─ Elevator.tsx found
✅ Day/night cycle visually changes the Penthouse based on actual AST time
    └─ DayNightProvider found
⬜ Skyline has visible parallax on mouse movement
    └─ No parallax hook
⬜ Custom cursor renders on desktop, falls back to native on mobile
    └─ No custom cursor
⬜ Dashboard shows real data from Supabase (applications count, pipeline status)
    └─ Not yet checked automatically
🟡 Contracts CRUD works through the UI
    └─ Contracts directory exists (no UI CRUD yet)
⬜ Lighthouse performance: >80 on all metrics
    └─ Lighthouse audit not automated yet
✅ Deployed to Vercel, accessible at production URL
    └─ Deployed to Vercel (see Production URL)
⬜ User can create an application and see it in the pipeline
    └─ No application CRUD found in src/
⬜ Drag-and-drop changes application status
    └─ No drag-and-drop implementation found
⬜ CRO agent can answer "How's my pipeline looking?" with real data
    └─ No CRO agent implementation found
⬜ CRO character has visible idle animation and talking state
    └─ No CRO agent implementation found
⬜ Conversation feels in-character (aggressive, numbers-driven tone)
    └─ No conversation system found
✅ All data is RLS-scoped — multi-tenant safe
    └─ RLS policies in schema.ts
⬜ User can connect their Gmail account via OAuth
    └─ Not yet checked automatically
⬜ System parses new emails and classifies them correctly (>90% accuracy on standard patterns)
    └─ Not yet checked automatically
⬜ Calendar events appear in the COO's room
    └─ Not yet checked automatically
⬜ COO proactively alerts about overdue follow-ups
    └─ Not yet checked automatically
⬜ Follow-up emails can be drafted and sent via Resend
    └─ Not yet checked automatically
⬜ Background sync runs on schedule without user intervention
    └─ Not yet checked automatically
⬜ Token refresh works silently — user never has to re-authenticate unless they revoke
    └─ Not yet checked automatically
⬜ User can add contacts and link them to applications
    └─ Not yet checked automatically
⬜ CNO alerts on cold contacts (no interaction in 2+ weeks)
    └─ Not yet checked automatically
⬜ CIO can research a company and produce a briefing with real data
    └─ Not yet checked automatically
⬜ pgvector similarity search returns relevant companies (test: "companies like Blackstone")
    └─ Not yet checked automatically
⬜ Contact warmth is visualized in the room environment
    └─ Not yet checked automatically
⬜ User can generate a cover letter tailored to a specific application
    └─ Not yet checked automatically
⬜ Cover letter quality is professional (test against Blackstone, CBRE, JLL applications)
    └─ Not yet checked automatically
⬜ Interview prep packet includes company-specific research + role-specific questions
    └─ Not yet checked automatically
⬜ Documents export to Google Drive successfully
    └─ Not yet checked automatically
⬜ CMO and CPO characters respond in distinct personalities
    └─ Not yet checked automatically
⬜ Analytics show accurate, real-time data for the logged-in user
    └─ Not yet checked automatically
⬜ "Ring the bell" triggers all agents and produces a compiled briefing within 60 seconds
    └─ Not yet checked automatically
⬜ Daily briefing runs automatically at configured time
    └─ Not yet checked automatically
⬜ CEO character delivers briefing as a conversation scene
    └─ Not yet checked automatically
⬜ Characters remember previous interactions across sessions
    └─ Not yet checked automatically
⬜ Notifications appear in-world, not as generic toasts
    └─ Not yet checked automatically
⬜ User can subscribe to Pro plan via Stripe Checkout
    └─ Not yet checked automatically
⬜ Free tier correctly limits functionality (10 apps, no agents)
    └─ Not yet checked automatically
⬜ Building progression visually reflects user's actual milestones
    └─ Not yet checked automatically
⬜ Lighthouse performance: >90 on all metrics
    └─ Lighthouse audit not automated yet
⬜ App is usable on mobile (iPhone SE as baseline)
    └─ Not yet checked automatically
⬜ Sound design works when enabled, completely silent when disabled
    └─ Not yet checked automatically
⬜ Sentry captures errors in production
    └─ Not yet checked automatically
⬜ Rate limiting prevents >100 API calls/minute per user
    └─ Not yet checked automatically


## TODO — Next Phase

See docs/MASTER-PLAN.md for the next phase.

## User Instructions (CRITICAL — preserve verbatim)

- "Analytical, not emotional. Cut the fat, keep the meat."
- "Masters-degree-level code. Scalable multi-tenant SaaS."
- "Deep research always — never surface-level."
- "Auto-update PROJECT-CONTEXT.md after EVERY interaction."
- "System picks the best model per task."
- "Tell me exactly what I need to do manually that you can't do yourself."
- "Run multiple agents, use different sub-agents, use all the AI models available, optimize your workflow."
- Push protection ON — never commit secrets
- Fully typed TypeScript, no `any`
- Tailwind v3 (NOT v4) — JS config
- @supabase/ssr (NOT deprecated auth-helpers)
- Drizzle RLS uses third-argument array pattern, NOT `.withRLS()`

<connectors>
- stripe
- youtube_analytics_api__pipedream
- github_mcp_direct
- google_drive
- gcal
- google_sheets__pipedream
- resend__pipedream
- google_forms__pipedream
- google_cloud_vision_api__pipedream
- vercel
- supabase__pipedream
- cloud_convert__pipedream
- jira_mcp_merge
</connectors>

## Infrastructure

| Service | Detail |
|---|---|
| Repo | `armaansarora/internship-command-center` on `main` (commit `742ea47`) |
| Supabase | Project `jzrsrruugcajohvvmevg`, URL `https://jzrsrruugcajohvvmevg.supabase.co` |
| Vercel | Project `prj_C6B6ZEsG5khpsISEzvgaMQzo9r5g` |
| Production | `internship-command-center-lake.vercel.app` |
| Design tokens | Gold `#C9A84C`, Dark `#1A1A2E`, Glass blur 16px, Playfair Display/Satoshi/JetBrains Mono |

## Env Vars (names only — values in .env.local)

(no .env.local found)

## Source Tree (49 files, 9,467 LOC)

| Directory | LOC |
|---|---|
| `src/components/world` | 1903 |
| `src/app/(authenticated)/penthouse` | 1411 |
| `src/app/lobby` | 903 |
| `src/lib/contracts` | 696 |
| `src/app` | 680 |
| `src/app/(authenticated)/settings` | 517 |
| `src/db` | 442 |
| `src/lib/contracts/departments` | 328 |
| `src/components/ui` | 290 |
| `src/app/(authenticated)/c-suite` | 284 |
| `src/app/(authenticated)/briefing-room` | 269 |
| `src/app/(authenticated)/situation-room` | 266 |
| `src/app/(authenticated)/rolodex-lounge` | 250 |
| `src/app/(authenticated)/observatory` | 247 |
| `src/app/(authenticated)/war-room` | 236 |
| `src/app/(authenticated)/writing-room` | 180 |
| `src/lib/supabase` | 121 |
| `src/components/transitions` | 109 |
| `src/app/(authenticated)` | 86 |
| `src/lib` | 80 |
| `src/types` | 74 |
| `src/app/api/auth/callback` | 42 |
| `src/hooks` | 22 |
| `src` | 20 |
| `src/app/api/auth/signout` | 11 |

<details>
<summary>Full file list</summary>

```
src/app/(authenticated)/briefing-room/page.tsx
src/app/(authenticated)/c-suite/page.tsx
src/app/(authenticated)/layout.tsx
src/app/(authenticated)/observatory/page.tsx
src/app/(authenticated)/penthouse/page.tsx
src/app/(authenticated)/penthouse/penthouse-client.tsx
src/app/(authenticated)/penthouse/penthouse-data.ts
src/app/(authenticated)/rolodex-lounge/page.tsx
src/app/(authenticated)/settings/page.tsx
src/app/(authenticated)/settings/settings-client.tsx
src/app/(authenticated)/situation-room/page.tsx
src/app/(authenticated)/war-room/page.tsx
src/app/(authenticated)/world-shell.tsx
src/app/(authenticated)/writing-room/page.tsx
src/app/api/auth/callback/route.ts
src/app/api/auth/signout/route.ts
src/app/globals.css
src/app/layout.tsx
src/app/lobby/lobby-client.tsx
src/app/lobby/page.tsx
src/app/page.tsx
src/components/transitions/EntranceSequence.tsx
src/components/ui/UserMenu.tsx
src/components/world/DayNightProvider.tsx
src/components/world/Elevator.tsx
src/components/world/FloorShell.tsx
src/components/world/ProceduralSkyline.tsx
src/db/index.ts
src/db/schema.ts
src/hooks/useReducedMotion.ts
src/lib/contracts/agent-protocol.ts
src/lib/contracts/api.ts
src/lib/contracts/departments/cio.ts
src/lib/contracts/departments/coo.ts
src/lib/contracts/departments/cro.ts
src/lib/contracts/events.ts
src/lib/contracts/index.ts
src/lib/contracts/notifications.ts
src/lib/contracts/ui.ts
src/lib/day-night.ts
src/lib/supabase/admin.ts
src/lib/supabase/client.ts
src/lib/supabase/middleware.ts
src/lib/supabase/server.ts
src/lib/utils.ts
src/middleware.ts
src/types/agents.ts
src/types/api.ts
src/types/ui.ts
```
</details>

## Dependencies

<details>
<summary>34 packages</summary>

```
@ai-sdk/anthropic: ^3.0.58
@supabase/ssr: ^0.9.0
@supabase/supabase-js: ^2.99.2
@tailwindcss/typography: ^0.5.19
@tsparticles/engine: ^3.9.1
@tsparticles/react: ^3.0.0
@tsparticles/slim: ^3.9.1
@types/node: ^20
@types/react: ^19
@types/react-dom: ^19
ai: ^6.0.116
autoprefixer: ^10.4.27
clsx: ^2.1.1
drizzle-kit: ^0.31.10
drizzle-orm: ^0.45.1
drizzle-zod: ^0.8.3
eslint: ^9
eslint-config-next: 16.2.0
framer-motion: ^12.38.0
gsap: ^3.14.2
happy-dom: ^20.8.4
husky: ^9.1.7
lenis: ^1.3.19
next: 16.2.0
next-themes: ^0.4.6
postcss: ^8.5.8
postgres: ^3.4.8
react: 19.2.4
react-dom: 19.2.4
tailwind-merge: ^3.5.0
tailwindcss: ^3.4.19
typescript: ^5
vitest: ^4.1.0
zod: ^4.3.6
```
</details>

### Stale Dependencies (major version behind)

- **@types/node**: 20.19.37 → 25.5.0 (major)
- **eslint**: 9.39.4 → 10.0.3 (major)
- **tailwindcss**: 3.4.19 → 4.2.2 (major)

## Context Budget

| File | Lines | ~Tokens |
|---|---|---|
| `BOOTSTRAP-PROMPT.md` | 387 | 4,255 |
| `PROJECT-CONTEXT.md` | 401 | 7,588 |
| `docs/MASTER-PLAN.md` | 361 | 6,827 |
| `CLAUDE.md` | 139 | 2,256 |
| **Total** | **1288** | **20,926** |

> ⚠️ Reading all recommended files consumes ~20,926 tokens. Prioritize: this file → CLAUDE.md (mandatory) → PROJECT-CONTEXT.md → MASTER-PLAN.md.


## Technical Notes (Gotchas)

- **React 19 + Next.js 16:** JSX namespace must be explicitly imported: `import type { JSX } from "react"`
- **Elevator SSR safety:** Uses `useReducedMotion()` custom hook (not inline `window.matchMedia`)
- **Timer cleanup:** `tickTimersRef.current` tracks setTimeout IDs for cleanup on unmount
- **Drizzle RLS:** Third-argument array pattern, NOT `.withRLS()`
- **@supabase/ssr:** NOT deprecated auth-helpers
- **Tailwind:** v3 with JS config (NOT v4 with CSS config)
- **Old repo reference:** `/home/user/workspace/internship-command-center-8c4c1ad1/src/contracts/`
- **Vercel auto-deploy:** `main` gets production
- **ProceduralSkyline:** Canvas-based renderer replaces all photo-based skyline components. Defaults to "night" outside DayNightProvider context (intentional for lobby). Uses `useDayNight()` hook + `getSkyConfig()` for time-aware rendering
- **EntranceSequence:** Uses sessionStorage for "played" flag — appropriate for per-session entrance
- **Floor stubs:** Each has unique CSS atmosphere (grid patterns, gradients, animations) — not empty shells
- **Lenis:** Installed but not yet wired — planned for Phase 2 smooth scroll integration
- **Old skyline images:** `public/skyline/` still present as fallback assets, not currently referenced

## Key Docs

| File | Purpose |
|---|---|
| `PROJECT-CONTEXT.md` | Full operational context — credentials, stack, audit summary, session log |
| `CLAUDE.md` | Codebase summary for AI coding assistants |
| `docs/MASTER-PLAN.md` | 7 phases with deliverables, acceptance criteria, testing |
| `docs/VISION-SPEC.md` | Spatial UI spec (locked) — building, floors, characters, design tokens |
| `docs/TECH-BRIEF.md` | Research findings, AI SDK v6 patterns, Drizzle gotchas |
| `docs/CHARACTER-PROMPTS.md` | System prompts for all 8 C-suite agents |
| `docs/SCHEMA-DRAFT.md` | 16-table Postgres schema with RLS |
| `docs/IMMERSIVE-UI-PLAN.md` | Immersive skyline implementation plan (COMPLETED) |
| `docs/FILE-STRUCTURE.md` | Target project file tree |

## Skills to Load

- `website-building/webapp` — fullstack web app patterns
- `design-foundations` — color, typography, visual hierarchy
- `recursive-audit` — 5-question self-audit loop (run after every task)
- `research-assistant` — web research patterns

## Workflow Rules

1. **Start:** Clone repo → read this file → read PROJECT-CONTEXT.md → load skills → read MASTER-PLAN.md for current phase
2. **During:** Commit after each major milestone. Run `npx tsc --noEmit` before committing.
3. **End:** Run `npm run session:end` (autonomous 10-step pipeline: type check → auto-detect state → bootstrap regen → stage → commit → push → verify sync → generate handoff prompt)
4. **Always:** No `any` types. No console.logs. No TODO comments in shipped code. Aria attributes on interactive elements. prefers-reduced-motion respected.

## Session State Management

`npm run session:end` handles this automatically — it auto-detects session state from git history and writes `SESSION-STATE.json`. No manual state management needed. The handoff prompt is printed to stdout and saved to `HANDOFF.md`.
