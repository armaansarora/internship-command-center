# BOOTSTRAP PROMPT — Phase 1: The War Room

---

**IMPORTANT**: Before following this summary, you MUST reload:
1. Skills listed in "Skills Loaded" section → use `load_skill` tool
2. Skill helpers listed in "Skill Helpers Loaded" section → use `read` tool with exact file paths

[CONTEXT SUMMARY]
Current time: Wednesday, March 18, 2026 at 8:07 PM EDT
User: armaansarora20@gmail.com
Email: armaansarora20@gmail.com

## TODO LIST
The Tower — Phase 1: The War Room

1. [pending] 1.1 — Floor 7 environment (darker tactical aesthetic, cooler blue tones)
2. [pending] 1.2 — Application CRUD (create, read, update, delete, all RLS-scoped)
3. [pending] 1.3 — Pipeline visualization (Kanban/funnel on the "war table", drag-and-drop)
4. [pending] 1.4 — CRO Agent backend (port ~500 LOC tools, Vercel AI SDK v6, Supabase queries)
5. [pending] 1.5 — CRO Character frontend (2D illustrated, idle animation, conversation panel)
6. [pending] 1.6 — Character interaction system (reusable for all future characters)
7. [pending] Wire real Supabase data into Penthouse dashboard (replace placeholder stats)
8. [pending] Run recursive audit after each major task

<connectors>
- google_cloud_vision_api__pipedream
- resend__pipedream
- vercel
- supabase__pipedream
- google_forms__pipedream
- jira_mcp_merge
- google_sheets__pipedream
- github_mcp_direct
- cloud_convert__pipedream
- youtube_analytics_api__pipedream
- gcal
- stripe
- google_drive
</connectors>

## User Instructions (CRITICAL — preserve verbatim)
- "Analytical, not emotional. Cut the fat, keep the meat."
- "Masters-degree-level code. Scalable multi-tenant SaaS."
- "Deep research always — never surface-level."
- "Auto-update PROJECT-CONTEXT.md after EVERY interaction."
- "System picks the best model per task."
- "Tell me exactly what I need to do manually that you can't do yourself."
- "Furthermore anything that doesn't work should be gotten rid of and things that are update should reflect across the whole system obviously."
- "Remember cut the fat keep the meat, keep everything organized and meat."
- "Run the skill which will make you do the readaudit skill for all the work you have done so far. It was made by me."
- Push protection ON — never commit secrets
- Fully typed TypeScript, no `any`
- Tailwind v3 (NOT v4) — JS config
- @supabase/ssr (NOT deprecated auth-helpers)
- Drizzle RLS uses third-argument array pattern, NOT `.withRLS()`

## SHARED ASSETS (use same name to update)
- tower_schema_migration
- manual_action_guide

## Phase 0 — COMPLETE (what exists)

### Architecture
- **Next.js 16** (App Router) + **Supabase Postgres** + **Drizzle ORM** + **Vercel AI SDK v6**
- **React 19**: JSX namespace must be explicitly imported: `import type { JSX } from "react"`
- **GSAP** for elevator door transitions, **Framer Motion** for component animations
- **Tailwind v3** with JS config, Tower design tokens (Gold #C9A84C, Dark #1A1A2E, Glass blur 16px)
- **Fonts**: Playfair Display (headings), Satoshi via Fontshare CDN (body), JetBrains Mono (data)

### What's Built (2,463 LOC in src/)
| Component | File | LOC | Description |
|---|---|---|---|
| Root layout | `src/app/layout.tsx` | 64 | Fonts, metadata, globals.css |
| Auth redirect | `src/app/page.tsx` | 17 | Routes to /penthouse or /lobby |
| Middleware | `src/middleware.ts` | 19 | Session refresh, public path whitelist |
| Auth layout | `src/app/(authenticated)/layout.tsx` | 22 | Auth gate → WorldShell |
| WorldShell | `src/app/(authenticated)/world-shell.tsx` | 32 | DayNight + Cursor + Elevator, `md:ml-16` offset |
| Lobby | `src/app/lobby/lobby-client.tsx` | 260 | Construction aesthetic, building directory, returning user detection, TowerMark SVG |
| Penthouse | `src/app/(authenticated)/penthouse/penthouse-client.tsx` | 271 | Glass+gold dashboard, stat cards, pipeline viz, activity feed (PLACEHOLDER DATA) |
| Skyline | `src/components/world/Skyline.tsx` | 336 | 4-layer parallax SVG, day/night color transitions |
| Elevator | `src/components/world/Elevator.tsx` | 318 | GSAP door animation, floor counter, useReducedMotion hook |
| FloorShell | `src/components/world/FloorShell.tsx` | 76 | Sky gradient + Skyline + window tint + floor badge |
| DayNightProvider | `src/components/world/DayNightProvider.tsx` | 75 | 7 time states, CSS custom properties |
| CustomCursor | `src/components/world/CustomCursor.tsx` | 130 | 7 contextual states, touch fallback |
| Schema | `src/db/schema.ts` | 428 | 16 tables, RLS policies, type exports |
| Contracts | `src/lib/contracts/` (9 files) | 1,015 | Events, agent protocol, API types, department contracts |
| Types | `src/types/` (3 files) | 81 | UI types (Floor, TimeState, CursorState, ElevatorState), API response, Agent config |
| Supabase clients | `src/lib/supabase/` (4 files) | 117 | Server, client, admin, middleware |
| Utilities | `src/lib/utils.ts` + `day-night.ts` | 78 | cn(), formatRelativeDate(), time state calc |
| Floor stubs | 7 files | ~140 | War Room, Rolodex, Writing Room, Situation Room, Briefing Room, Observatory, C-Suite |

### Key Patterns Already Established
- **Server Components by default**, `"use client"` only when needed
- **Auth flow**: `getUser()` for reads, `requireUser()` for gates (redirects to /lobby)
- **FloorShell wrapping**: Every authenticated page wraps content in `<FloorShell floorId="X">`
- **Elevator SSR safety**: `useReducedMotion()` custom hook (not inline `window.matchMedia`)
- **Timer cleanup**: `tickTimersRef.current` tracks setTimeout IDs for cleanup on unmount
- **Zod v4** for all validation (contracts use `zod/v4` import)
- **No localStorage/sessionStorage** — uses cookies and server state only

### What's NOT Built Yet (Phase 0 gaps to close in Phase 1)
- **Penthouse uses placeholder data** — stat cards show "—", pipeline shows 0 total, activity feed is empty. Must wire real Supabase queries once schema is pushed.
- **Contracts are type-only** — nothing in `src/app/` or `src/components/` imports them yet. Phase 1 wires them.
- **No API routes beyond auth** — no `/api/applications`, no `/api/agents`, nothing.
- **No server actions** — all forms are placeholder.

## Phase 1 Scope (from MASTER-PLAN.md)

### Deliverables
| # | Deliverable | Complexity | Description |
|---|---|---|---|
| 1.1 | Floor 7 Environment | M | War Room atmosphere: darker, tactical, data-dense. Cooler blue lighting. |
| 1.2 | Application CRUD | M | Full CRUD. Status pipeline: Saved → Applied → Phone Screen → Interview → Offer → Rejected. Search/filter. RLS-scoped. |
| 1.3 | Pipeline Visualization | M | Visual Kanban/funnel as part of the room environment — data on the "war table." Drag-and-drop status changes. |
| 1.4 | CRO Agent (Backend) | L | Port ~500 LOC CRO tools. Vercel AI SDK v6 `generateText` with tools. Supabase queries. Tools: `queryApplications`, `updateStatus`, `suggestFollowUp`, `analyzeConversionRates`. |
| 1.5 | CRO Character (Frontend) | M | 2D illustrated character. Idle animation at whiteboard. Click → conversation panel. Personality: aggressive, numbers-driven. |
| 1.6 | Character Interaction System | L | Reusable for all 8 characters. Components: character sprite with parallax depth, approach detection, conversation panel (styled as dialogue, not chatbot), AI message streaming, character personality injection. |

### Acceptance Criteria
- [ ] User can create an application and see it in the pipeline
- [ ] Drag-and-drop changes application status
- [ ] CRO agent can answer "How's my pipeline looking?" with real data
- [ ] CRO character has visible idle animation and talking state
- [ ] Conversation feels in-character (aggressive, numbers-driven tone)
- [ ] All data is RLS-scoped — multi-tenant safe
- [ ] Penthouse dashboard shows real data (not placeholders)

### Dependencies (must be done before Phase 1 code works)
- Armaan must complete MANUAL-GUIDE.md steps: migration SQL, post-push SQL, Google OAuth, Vercel env vars, branch merge
- Old repo CRO agent code reference: `/home/user/workspace/internship-command-center-8c4c1ad1/src/contracts/departments/cro.ts` (already ported to `src/lib/contracts/departments/cro.ts`)
- Old repo agent system: `/home/user/workspace/internship-command-center-8c4c1ad1/src/agents/` (~1,815 LOC to adapt)

## Key Infrastructure

| Service | Detail |
|---|---|
| **Repo** | `armaansarora/internship-command-center` on `docs-handoff` branch (commit `ce72f38`) |
| **Supabase** | Project `jzrsrruugcajohvvmevg`, URL `https://jzrsrruugcajohvvmevg.supabase.co` |
| **Vercel** | Project `prj_C6B6ZEsG5khpsISEzvgaMQzo9r5g`, Team `team_EC8AIyc155clLRjzrJ0fblpa` |
| **Preview** | `internship-command-center-fhl391gov-armaan-aroras-projects.vercel.app` (READY) |
| **Production** | `internship-command-center-lake.vercel.app` (needs branch merge) |

## Critical Context Files (READ THESE)
1. `/home/user/workspace/command-center/PROJECT-CONTEXT.md` — full operational context, updated session log
2. `/home/user/workspace/command-center/docs/MASTER-PLAN.md` — Phase 1 acceptance criteria (lines 65-93)
3. `/home/user/workspace/command-center/docs/VISION-SPEC.md` — spatial UI spec, character system
4. `/home/user/workspace/command-center/docs/CHARACTER-PROMPTS.md` — CRO personality and system prompt
5. `/home/user/workspace/command-center/docs/TECH-BRIEF.md` — Vercel AI SDK v6 patterns, Inngest, Drizzle
6. `/home/user/workspace/command-center/.env.local` — credentials (⚠️ publishable key needs update — see MANUAL-GUIDE.md)

## Skills Loaded (must reload)
- `website-building/webapp`
- `design-foundations`
- `coding-and-data`
- `recursive-audit`

## Skill Helpers Loaded (must re-read)
- `/home/user/workspace/skills/website-building/shared/01-design-tokens.md`
- `/home/user/workspace/skills/website-building/shared/02-typography.md`

## Session History
| Session | Work Done |
|---|---|
| 1 | Created Phase 0 foundation: Next.js 16, 16-table schema, Auth, layout, all stubs |
| 2 | Recursive audit (15 findings), all fixed. Commit `209ad16`. |
| 3 | Started 0.5 Skyline, hit JSX type error mid-build. |
| 4 | Fixed JSX → Skyline (0.5) → Elevator (0.6) → Lobby (0.7) → Penthouse (0.8) → Contracts (0.9, 1,015 LOC) → Deploy (0.10). Commit `dc73756`. |
| 5 | Updated PROJECT-CONTEXT.md, MANUAL-GUIDE.md. Final audit: found missing `handle_new_user` trigger — created `post-push.sql`. Rewrote BOOTSTRAP-PROMPT.md for Phase 1 handoff. Commit `ce72f38`+ |

## Technical Notes (Gotchas)
- **React 19 + Next.js 16:** JSX namespace must be `import type { JSX } from "react"` — not global
- **Elevator SSR:** Uses `useReducedMotion()` custom hook, not inline `window.matchMedia`
- **Timer cleanup:** `tickTimersRef.current` tracks setTimeout IDs for cleanup on unmount
- **Drizzle RLS:** Third-argument array pattern, NOT `.withRLS()`
- **@supabase/ssr:** NOT deprecated auth-helpers
- **Tailwind:** v3 with JS config (NOT v4 with CSS config)
- **Supabase key:** `.env.local` has `sb_publishable_*` format — may need classic `eyJ*` anon key for REST API
- **Vercel auto-deploy:** `docs-handoff` gets preview deploys, `main` gets production
- **No `any` types** — everything fully typed TypeScript
