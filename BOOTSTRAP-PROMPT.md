# BOOTSTRAP PROMPT — The Tower

> **Auto-generated** by `scripts/generate-bootstrap.ts` on Thursday, March 19, 2026 at 3:30 PM EDT
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

- **Current state:** Phase 0 COMPLETE + Immersive UI Rebuild COMPLETE
- **Branch:** `main` (commit `166f919`)
- **Production:** `internship-command-center-lake.vercel.app`
- **Total LOC:** 7,271 across 47 source files
- **Build:** Clean (zero TS errors)


## Session State (where we left off)

- **Current task:** Phase 0 Overhaul — complete visual redesign of all Phase 0 components
- **Deliverable:** 0.x
- **Status:** complete
- **Last file touched:** `src/components/world/ProceduralSkyline.tsx`
- **Notes:** Complete Phase 0 visual overhaul: Lobby redesign (commanding typography, premium glass), Penthouse redesign (SVG icons, better glass panels, stronger hierarchy), FloorShell improvements (atmospheric effects, floor-specific lighting), Elevator polish (better nav panel, door textures), ProceduralSkyline time-awareness (day/night sky gradients), 7 unique floor stubs, globals.css utilities, dead code cleanup.
- **State captured:** 2026-03-19T19:30:00.000Z

## Acceptance Criteria — Progress

**Progress: 1 verified / 0 likely / 5 unverified** (of 6)

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


## TODO — Next Phase

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
- [ ] User can create an application and see it in the pipeline
- [ ] Drag-and-drop changes application status
- [ ] CRO agent can answer "How's my pipeline looking?" with real data
- [ ] CRO character has visible idle animation and talking state
- [ ] Conversation feels in-character (aggressive, numbers-driven tone)
- [ ] All data is RLS-scoped — multi-tenant safe

### Dependencies
- Phase 0 complete (auth, elevator, world shell)
- Character illustration assets (2D sprites for CRO — idle, talking, gesturing)

---

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
| Repo | `armaansarora/internship-command-center` on `main` (commit `166f919`) |
| Supabase | Project `jzrsrruugcajohvvmevg`, URL `https://jzrsrruugcajohvvmevg.supabase.co` |
| Vercel | Project `prj_C6B6ZEsG5khpsISEzvgaMQzo9r5g` |
| Production | `internship-command-center-lake.vercel.app` |
| Design tokens | Gold `#C9A84C`, Dark `#1A1A2E`, Glass blur 16px, Playfair Display/Satoshi/JetBrains Mono |

## Env Vars (names only — values in .env.local)

(no .env.local found)

## Source Tree (47 files, 7,271 LOC)

| Directory | LOC |
|---|---|
| `src/components/world` | 1652 |
| `src/app/(authenticated)/penthouse` | 1066 |
| `src/app/lobby` | 696 |
| `src/lib/contracts` | 696 |
| `src/app` | 454 |
| `src/db` | 442 |
| `src/lib/contracts/departments` | 328 |
| `src/app/(authenticated)/c-suite` | 236 |
| `src/app/(authenticated)/rolodex-lounge` | 233 |
| `src/app/(authenticated)/briefing-room` | 191 |
| `src/app/(authenticated)/observatory` | 191 |
| `src/app/(authenticated)/situation-room` | 190 |
| `src/app/(authenticated)/war-room` | 183 |
| `src/app/(authenticated)/writing-room` | 168 |
| `src/lib/supabase` | 121 |
| `src/components/transitions` | 109 |
| `src/types` | 84 |
| `src/lib` | 80 |
| `src/app/(authenticated)` | 56 |
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
src/components/world/CustomCursor.tsx
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
<summary>33 packages</summary>

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
| `BOOTSTRAP-PROMPT.md` | 333 | 3,775 |
| `PROJECT-CONTEXT.md` | 405 | 6,466 |
| `docs/MASTER-PLAN.md` | 361 | 6,827 |
| `CLAUDE.md` | 139 | 2,256 |
| **Total** | **1238** | **19,324** |

> ⚠️ Reading all recommended files consumes ~19,324 tokens. Prioritize: this file → CLAUDE.md (mandatory) → PROJECT-CONTEXT.md → MASTER-PLAN.md.


## Technical Notes (Gotchas)

- **React 19 + Next.js 16:** JSX namespace must be explicitly imported: `import type { JSX } from "react"`
- **Elevator SSR safety:** Uses `useReducedMotion()` custom hook (not inline `window.matchMedia`)
- **Timer cleanup:** `tickTimersRef.current` tracks setTimeout IDs for cleanup on unmount
- **Drizzle RLS:** Third-argument array pattern, NOT `.withRLS()`
- **@supabase/ssr:** NOT deprecated auth-helpers
- **Tailwind:** v3 with JS config (NOT v4 with CSS config)
- **Old repo reference:** `/home/user/workspace/internship-command-center-8c4c1ad1/src/contracts/`
- **Vercel auto-deploy:** `main` gets production
- **tsParticles v3:** Uses `initParticlesEngine` + `loadSlim`, NOT v2 `init` prop pattern
- **tsParticles `as any` cast:** Required for deeply nested RecursivePartial types, documented with eslint-disable
- **useMouseParallax:** Uses ref-stable RAF loop (not useCallback with state deps) to avoid cascade teardown
- **SkylineLayers uses `<img>` not `next/image`:** Intentional — photos are inside CSS 3D perspective containers, `next/image` would interfere with absolute positioning and transforms
- **Lenis:** Installed but not yet wired — planned for Phase 2 smooth scroll integration
- **EntranceSequence:** Uses sessionStorage for "played" flag — appropriate for per-session entrance

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
