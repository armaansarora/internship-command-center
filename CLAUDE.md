# The Tower — Internship Command Center

## Architecture
Next.js 16 (App Router) + Supabase Postgres + Drizzle ORM v1 + Vercel AI SDK v6 + @supabase/ssr
Deployed on Vercel. GSAP for animations. Tailwind v3 (JS config, NOT v4).
ProceduralSkyline (canvas-based renderer) with day/night cycle. LobbyBackground (CSS-only luxury reception).

## The Grand Vision
The Tower is not a dashboard. It is an immersive spatial experience — a skyscraper that the user physically enters, explores, and inhabits. Every page is a "floor" with its own atmosphere, lighting, characters, and personality. Navigation is an elevator with GSAP-animated door transitions. AI agents are 2D illustrated characters with idle animations, dialogue panels, and persistent memory. The user doesn't "use" software — they enter a building.

The building metaphor is sacred. Lobby = login. Elevator = navigation. Floors = features. Windows = background skyline. Characters = AI agents with personality and visual presence. This metaphor must never be broken. Every new feature must reinforce the spatial experience.

Target aesthetic: luxury game UI meets Bloomberg Terminal meets Apple spatial design. Not a "dashboard with a theme" — a world.

## Agent Hierarchy (Chain of Command)
```
User (Armaan)
  └── CEO (Floor 1, C-Suite) — Orchestrator, dispatches all agents via "Ring the Bell"
      ├── CRO (Floor 7, War Room) — Pipeline intelligence, aggressive, numbers-driven
      │   └── 5 Subagents: Job Discovery (SDR), Application Manager (AE),
      │       Pipeline Analyst (RevOps), Intel Briefer (Enablement), Offer Evaluator (CSM)
      ├── COO (Floor 4, Situation Room) — Deadlines, follow-ups, scheduling
      ├── CNO (Floor 6, Rolodex Lounge) — Contact management, networking warmth
      ├── CIO (Floor 6, Rolodex Lounge) — Company research, pgvector intelligence
      ├── CMO (Floor 5, Writing Room) — Cover letters, creative content
      ├── CPO (Floor 3, Briefing Room) — Interview prep, methodical preparation
      └── CFO (Floor 2, Observatory) — Analytics, conversion rates, pipeline velocity
```
Full hierarchy spec: `docs/CHAIN-OF-COMMAND.md` (1,550+ lines)
Character personality prompts: `docs/CHARACTER-PROMPTS.md`

## Floor Directory
| Floor | Room | Character | Status |
|-------|------|-----------|--------|
| PH | The Penthouse (Dashboard) | — | ✅ Built |
| 7 | The War Room (Applications/Pipeline) | CRO | ✅ Built |
| 6 | The Rolodex Lounge (Contacts/Networking) | CNO + CIO | ✅ Built |
| 5 | The Writing Room (Cover Letters) | CMO | ✅ Built |
| 4 | The Situation Room (Follow-ups/Calendar) | COO | ✅ Built |
| 3 | The Briefing Room (Interview Prep) | CPO | ✅ Built |
| 2 | The Observatory (Analytics) | CFO | ✅ Built |
| 1 | The C-Suite (CEO's Office) | CEO | ✅ Built |
| L | The Lobby (Login/Onboarding) | — | ✅ Built |

## Key Commands
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — eslint
- `npx tsc --noEmit` — type check
- `npx drizzle-kit generate` — generate migration SQL
- `npm run bootstrap` — regenerate BOOTSTRAP-PROMPT.md (also auto-runs on every commit via Husky)
- `npm run session:end -- --message "..."` — session-end workflow (agent runs this, not human)

### Fallback CLIs (only if agent automation fails)
- `npm run session:state -- --task "..." --deliverable "1.2" --status "in_progress"` — manual session state update
- `npm run session:state:clear` — reset session state
- `npm run session:end:dry` — dry run of session:end

## Conventions
- Server Components by default; "use client" only when needed
- Zod v4 for all validation
- Fully typed TypeScript — no `any`
- `import type { JSX } from "react"` — explicit JSX namespace (React 19)
- Timestamps: `timestamp('...', { withTimezone: true })` — native Postgres
- UUIDs for all primary keys (`uuid('id').primaryKey().defaultRandom()`)
- RLS on every table: `auth.uid() = user_id`
- Drizzle RLS uses third-argument array pattern, NOT `.withRLS()`
- @supabase/ssr (NOT deprecated auth-helpers)
- Tailwind v3 with JS config (NOT v4 CSS config)
- Feature branches, atomic commits, push protection ON — never commit secrets
- All planning docs in `/docs/`, archived docs in `/docs/archive/`
- Aria attributes on all interactive elements, prefers-reduced-motion respected
- No console.logs in shipped code
- No TODO/FIXME comments in shipped code

## Critical Technical Gotchas
1. **DB Access from Vercel Serverless:** NEVER use Drizzle ORM's `db` object in server components or API routes deployed to Vercel. The Supabase DB is IPv6-only at `db.jzrsrruugcajohvvmevg.supabase.co:5432` and the pooler returns "Tenant not found." ALL server-side data access MUST use the Supabase REST client: `supabase.from('table').select('*')`. Drizzle is only used for schema definition and migrations (`drizzle-kit push`).
2. **React 19 + Next.js 16:** JSX namespace must be explicitly imported: `import type { JSX } from "react"`
3. **GSAP Tree-Shaking:** `src/lib/gsap-init.ts` exists as a centralized import point, BUT currently lobby-client.tsx, EntranceSequence.tsx, and Elevator.tsx import directly from `"gsap"`. This is a known issue — should be wired through gsap-init.ts.
4. **ProceduralSkyline:** Canvas-based renderer, defaults to "night" outside DayNightProvider context (intentional for lobby). Uses `useDayNight()` hook + `getSkyConfig()`.
5. **EntranceSequence:** Uses sessionStorage for "played" flag — appropriate for per-session entrance.
6. **Vercel Auto-deploy:** `main` branch gets automatic production deployment.
7. **Supabase REST client pattern:** `createClient()` from `@/lib/supabase/server` for server components, `@/lib/supabase/client` for client components.

## Known Orphaned Files (Not Bugs — Intentionally Kept)
These files are built and functional but not yet imported into the component tree. They exist as ready-to-wire infrastructure:
- `src/components/floor-6/cio-character/CIODialoguePanel.tsx` — CIO dialogue (CIOCharacter.tsx doesn't import it yet)
- `src/components/floor-6/cio-character/CIOWhiteboard.tsx` — CIO research display
- `src/components/world/FloorStub.tsx` — Generic "Coming Soon" floor template
- `src/components/world/MilestoneToast.tsx` — Gold milestone notification (wired but dynamically loaded)
- `src/hooks/useCharacter.ts` — Generic character interaction hook
- `src/lib/db/queries/agent-memory-rest.ts` — Agent memory CRUD (built for Phase 5 memory system)
- `src/lib/db/queries/daily-snapshots-rest.ts` — Daily snapshot queries
- `src/lib/db/queries/notifications-rest.ts` — Notification CRUD
- `src/lib/gsap-init.ts` — Centralized GSAP import (not yet wired — see gotcha #3)

## Design System (The Tower)
Immersive spatial UI — building metaphor, not a dashboard. Each page is a "floor."
- Primary dark: `#1A1A2E`
- Gold accent: `#C9A84C`
- Glass: `backdrop-filter: blur(16px)`, opacity 0.85-0.92
- Fonts: Playfair Display (headings), Satoshi (body), JetBrains Mono (data)
- Day/night cycle driven by user's local time (7 time states)
- Canvas-based procedural skyline with animated window lights
- No custom cursor (removed per user preference) — standard cursor with `cursor: pointer` on interactive elements
- No mouse-driven parallax (removed for performance) — autonomous Apple TV-style Ken Burns drift
- No motion-sickness-inducing animations — slow, organic, barely perceptible movement

## Key Components

> Auto-generated by `scripts/auto-organize-docs.ts`. Do not edit manually.

- `src/components/floor-3/crud/PrepPacketViewer.tsx` (1135 LOC)
- `src/app/lobby/lobby-client.tsx` (967 LOC) — Lobby client component — The Tower entrance.
- `src/components/floor-7/crud/ApplicationModal.tsx` (761 LOC)
- `src/components/floor-6/crud/ContactModal.tsx` (713 LOC)
- `src/components/floor-3/crud/InterviewTimeline.tsx` (676 LOC)
- `src/components/world/elevator/ElevatorPanel.tsx` (635 LOC) — ElevatorPanel (desktop) — the glass nav panel with floor buttons, tower
- `src/components/floor-4/SituationRoomClient.tsx` (586 LOC)
- `src/app/(authenticated)/settings/settings-client.tsx` (566 LOC) — SettingsClient — account management and preferences.
- `src/components/floor-5/cmo-character/CMOCharacter.tsx` (554 LOC)
- `src/components/floor-7/war-table/ApplicationCard.tsx` (539 LOC)
- `src/components/floor-4/coo-character/COOCharacter.tsx` (526 LOC)
- `src/components/floor-6/cio-character/CIOWhiteboard.tsx` (510 LOC) — derived from ResearchStats from companies-rest.ts
- `src/components/floor-6/cio-character/CIOCharacter.tsx` (509 LOC)
- `src/components/floor-5/crud/DocumentEditor.tsx` (500 LOC)
- `src/app/(authenticated)/penthouse/penthouse-client.tsx` (479 LOC)
- `src/components/floor-3/cpo-character/CPOCharacter.tsx` (477 LOC)
- `src/components/floor-6/RolodexLoungeClient.tsx` (475 LOC)
- `src/components/floor-5/crud/DocumentList.tsx` (449 LOC)
- `src/components/floor-3/cpo-character/CPOWhiteboard.tsx` (444 LOC)
- `src/components/floor-3/BriefingRoomScene.tsx` (443 LOC) — BriefingRoomScene — Floor 3 environment compositor.
- `src/components/floor-4/SituationRoomScene.tsx` (430 LOC) — SituationRoomScene — Floor 4 environment compositor.
- `src/components/world/EasterEggs.tsx` (423 LOC) — Shown below an idle character.
- `src/components/world/Elevator.tsx` (411 LOC) — When navigating between lobby ↔ authenticated pages the Elevator unmounts on
- `src/components/floor-3/BriefingRoomClient.tsx` (402 LOC)
- `src/components/floor-4/coo-character/COOWhiteboard.tsx` (376 LOC)
- `src/components/floor-5/cmo-character/CMOWhiteboard.tsx` (371 LOC)
- `src/components/floor-6/cno-character/CNOCharacter.tsx` (367 LOC)
- `src/components/floor-5/WritingRoomClient.tsx` (353 LOC)
- `src/components/floor-5/WritingRoomScene.tsx` (352 LOC) — WritingRoomScene — Floor 5 environment compositor.
- `src/components/floor-7/war-table/WarTable.tsx` (347 LOC)
- `src/components/floor-7/cro-character/CROCharacter.tsx` (344 LOC)
- `src/components/floor-7/WarRoomClient.tsx` (341 LOC)
- `src/components/floor-7/crud/ApplicationSearch.tsx` (334 LOC)
- `src/components/world/MilestoneToast.tsx` (332 LOC) — MilestoneToast — gold notification that appears when a milestone is unlocked.
- `src/components/floor-1/RingTheBell.tsx` (328 LOC) — The CEO orchestrator dispatch tool name that drives this card
- `src/components/floor-6/RolodexLoungeScene.tsx` (328 LOC) — RolodexLoungeScene — Floor 6 environment compositor.
- `src/components/floor-6/cno-character/CNOWhiteboard.tsx` (320 LOC)
- `src/components/pricing/PricingCards.tsx` (306 LOC)
- `src/components/floor-7/WarRoomScene.tsx` (298 LOC) — WarRoomScene — Floor 7 environment compositor.
- `src/components/floor-7/cro-character/CROWhiteboard.tsx` (297 LOC)
- `src/components/ui/UserMenu.tsx` (294 LOC) — UserMenu — account dropdown (top-right of authenticated pages).
- `src/components/floor-1/CSuiteScene.tsx` (248 LOC) — CSuiteScene — Floor 1 C-Suite boardroom environment.
- `src/components/world/LobbyBackground.tsx` (245 LOC) — LobbyBackground — Apple TV Saver-style Ken Burns backgrounds.
- `src/components/floor-1/CSuiteClient.tsx` (241 LOC) — Watch the CEO chat's UIMessage stream for `tool-dispatchTo<X>` parts and
- `src/components/world/ErrorBoundary.tsx` (241 LOC) — ErrorBoundary — in-world error display using "the building's lights flicker" metaphor.
- `src/components/floor-6/crud/ContactSearch.tsx` (237 LOC)
- `src/components/floor-2/cfo-character/CFOCharacter.tsx` (235 LOC)
- `src/components/world/elevator/ElevatorDoors.tsx` (234 LOC) — ElevatorDoors — the full-screen transition overlay composed of:
- `src/components/floor-2/ObservatoryScene.tsx` (223 LOC) — ObservatoryScene — Floor 2 environment compositor.
- `src/components/world/NotificationToast.tsx` (221 LOC)
- `src/components/floor-2/analytics/ActivityHeatmap.tsx` (218 LOC) — ActivityHeatmap — 7×4 grid (4 weeks × 7 days) showing daily activity.
- `src/components/agents/dialogue/AgentDialoguePanel.tsx` (213 LOC)
- `src/components/floor-1/ceo-character/CEOCharacter.tsx` (212 LOC)
- `src/components/floor-2/analytics/PipelineVelocity.tsx` (210 LOC) — PipelineVelocity — bar chart showing average days per pipeline stage.
- `src/components/floor-2/ObservatoryClient.tsx` (208 LOC)
- `src/components/world/FloorStub.tsx` (204 LOC) — Full CSS color used for:
- `src/components/floor-6/contact-grid/ContactGrid.tsx` (202 LOC)
- `src/components/floor-2/cfo-character/CFOWhiteboard.tsx` (201 LOC)
- `src/components/penthouse/PipelineNodes.tsx` (200 LOC) — PipelineNodes renders:
- `src/components/world/FloorShell.tsx` (200 LOC) — FloorShell — wraps each floor's content with the immersive procedural skyline.
- `src/components/world/ProceduralSkyline.tsx` (200 LOC) — Canvas-based procedural renderer
- `src/components/floor-2/analytics/WeeklyTrend.tsx` (199 LOC) — WeeklyTrend — SVG line chart showing applications per week over 8 weeks.
- `src/components/floor-7/war-table/PipelineColumn.tsx` (198 LOC)
- `src/components/penthouse/ActivityFeed.tsx` (195 LOC) — Maps each activity type to a CSS colour token.
- `src/components/ui/SoundToggle.tsx` (194 LOC) — SoundToggle — small fixed speaker button (bottom-right).
- `src/components/floor-6/contact-grid/ContactCard.tsx` (190 LOC)
- `src/components/floor-5/WritingRoomTicker.tsx` (188 LOC) — WritingRoomTicker — bottom scrolling status strip showing live document data.
- `src/components/floor-3/BriefingRoomTicker.tsx` (187 LOC) — BriefingRoomTicker — bottom scrolling status strip showing live interview prep data.
- `src/components/world/elevator/ElevatorButton.tsx` (187 LOC) — ElevatorButton — single floor button with tooltip (desktop) or plain
- `src/components/floor-6/RolodexLoungeTicker.tsx` (183 LOC) — RolodexLoungeTicker — bottom scrolling status strip showing live networking data.
- `src/components/world/WeatherEffects.tsx` (174 LOC) — WeatherEffects — absolutely positioned over the skyline, behind floor content.
- `src/components/floor-1/ceo-character/CEODialoguePanel.tsx` (173 LOC) — Called whenever the chat's messages or status change. Used by the parent
- `src/components/floor-4/SituationRoomTicker.tsx` (171 LOC) — SituationRoomTicker — bottom scrolling status strip showing live
- `src/components/floor-7/WarRoomTicker.tsx` (170 LOC) — WarRoomTicker — bottom scrolling status strip showing live pipeline data.
- `src/components/floor-7/war-table/ColumnHeader.tsx` (152 LOC)
- `src/components/icons/PenthouseIcons.tsx` (152 LOC)
- `src/components/floor-2/ObservatoryTicker.tsx` (145 LOC)
- `src/components/floor-1/CSuiteTicker.tsx` (141 LOC)
- `src/components/agents/dialogue/AgentMessageList.tsx` (140 LOC)
- `src/components/floor-2/analytics/ConversionFunnel.tsx` (137 LOC) — ConversionFunnel — SVG funnel visualization showing pipeline stages.
- `src/components/penthouse/QuickActionCard.tsx` (136 LOC) — QuickActionCard — disabled glass button with icon, phase badge,
- `src/components/world/NotificationSystem.tsx` (135 LOC) — NotificationSystem — in-world spatial notification manager.
- `src/components/transitions/EntranceSequence.tsx` (132 LOC) — EntranceSequence — cinematic first-login entrance animation.
- `src/components/floor-5/cmo-character/CMODialoguePanel.tsx` (128 LOC)
- `src/components/floor-1/ceo-character/CEOWhiteboard.tsx` (126 LOC) — CEOWhiteboard — Actually a wall display / control panel.
- `src/components/penthouse/StatCard.tsx` (126 LOC) — StatCard — animated counter inside a GlassPanel.
- `src/components/world/SoundProvider.tsx` (103 LOC) — SoundProvider — wraps the application to expose sound controls.
- `src/components/penthouse/GlassPanel.tsx` (101 LOC) — GlassPanel — frosted-glass card with:
- `src/components/floor-3/cpo-character/CPODialoguePanel.tsx` (100 LOC)
- `src/components/floor-6/cio-character/CIODialoguePanel.tsx` (100 LOC)
- `src/components/floor-6/cno-character/CNODialoguePanel.tsx` (94 LOC)
- `src/components/floor-7/cro-character/CRODialoguePanel.tsx` (92 LOC)
- `src/components/floor-4/coo-character/COODialoguePanel.tsx` (87 LOC)
- `src/components/agents/dialogue/AgentMessageBubble.tsx` (82 LOC)
- `src/components/floor-2/cfo-character/CFODialoguePanel.tsx` (81 LOC)
- `src/components/agents/dialogue/AgentChatInput.tsx` (80 LOC)
- `src/components/world/DayNightProvider.tsx` (72 LOC) — DayNightProvider — sets `data-time` on <html> based on the user's local time.
- `src/components/agents/dialogue/AgentQuickActions.tsx` (55 LOC)
- `src/components/agents/dialogue/AgentToolCallIndicator.tsx` (49 LOC)
- `src/components/world/MilestoneToastContainer.tsx` (18 LOC) — Mount-once container for the milestone toast system.
## Bootstrap Infrastructure
- `scripts/auto-organize-docs.ts` — **runs on every commit (Husky)**. Auto-archives stale docs, auto-generates Key Components (this section), auto-updates doc map table, auto-appends session logs. Zero manual doc maintenance.
- `scripts/generate-bootstrap.ts` — **runs on every commit (Husky)**. Generates BOOTSTRAP-PROMPT.md with: build health, git diff, acceptance criteria tracking, dep freshness, context budget, session state, doc freshness warnings.
- `scripts/session-end.ts` — chains type check → bootstrap → stage → commit → push into one command
- `scripts/update-session-state.ts` — CLI fallback to update SESSION-STATE.json manually (prefer agent auto-update)
- `.husky/pre-commit` — runs auto-organize-docs.ts → generate-bootstrap.ts → stages all modified docs
- `scripts/check-vercel.ts` — writes Vercel deploy status to .vercel-status.json (agent-invoked)
- `.github/workflows/bootstrap-check.yml` — CI guard that fails PR if bootstrap is stale
- `SESSION-STATE.json` — captures mid-session task state for handoff (committed to repo)
- `.bootstrap-last-hash` — tracks last commit hash at generation time (gitignored)

## Mandatory Agent Behavior (NON-NEGOTIABLE)
These are automatic obligations. The human should never need to run session commands.

### 1. Session State — Update Continuously
Write `SESSION-STATE.json` directly (no CLI needed) at these trigger points:
- **Session start**: Set `status` to `in_progress`, `currentTask` to whatever you're working on.
- **Task pivot**: Whenever you switch to a different task or deliverable.
- **Blocker hit**: If something blocks progress, set `blocker` immediately.
- **Before every commit**: Ensure SESSION-STATE.json reflects current reality.

Format:
```json
{
  "currentTask": "Phase 1: The War Room — building task board",
  "deliverable": "1.3",
  "status": "in_progress",
  "blocker": null,
  "lastFileTouched": "src/app/war-room/page.tsx",
  "notes": "Task board CRUD complete, wiring up real-time subscriptions next.",
  "updatedAt": "2026-03-19T07:30:00.000Z"
}
```

### 2. Session End — Run Automatically Before Closing Out
Before ending any session, the agent MUST:
1. Write final SESSION-STATE.json reflecting current state
2. Update PROJECT-CONTEXT.md with session log entry
3. Run: `npm run session:end -- --message "session N: description of what was done"`

This commits + pushes everything. The human does NOTHING.

### 3. Vercel Status — Check When Relevant
Run `npx tsx scripts/check-vercel.ts` after any deploy-related work or if the user asks about deploy status. The bootstrap generator picks it up automatically.

### 4. Never Leave Dirty State
If a session is interrupted or errors out, the last valid SESSION-STATE.json should still describe where things stand. Always update state BEFORE doing risky operations, not after.

### 5. Context Window Management — SUPER CONSERVATIVE
The agent MUST monitor its own context usage and proactively end the session before degradation.

**Trigger thresholds:**
- **~40% context used → YELLOW.** Mention to the user: "Context is around 40%, still healthy but keeping an eye on it." No action needed yet.
- **~60% context used → ORANGE.** Warn the user: "Context is at ~60%. I recommend wrapping up the current task and handing off soon." Start finishing current work, avoid starting new large tasks.
- **~70% context used → RED. Mandatory handoff.** Stop all new work immediately. Execute full session-end procedure (rules 1-2 above). Then tell the user:
  1. Exactly what was completed
  2. Exactly what's left
  3. The new session prompt: `Clone repo armaansarora/internship-command-center (branch: main). Read BOOTSTRAP-PROMPT.md — it's auto-generated and current. Follow the Quick Start section. Cut the fat, keep the meat.`

**How to estimate context usage:**
- Track cumulative tokens read/written throughout the session
- Every file read, tool output, and response adds to context
- Large file reads (100+ lines), long tool outputs, and multi-step conversations burn context fast
- When in doubt, round UP — better to hand off early than to degrade

**Rules:**
- NEVER start a new major task past 60%
- NEVER ignore the 70% threshold — session-end is mandatory, not optional
- The human should never experience degraded output quality. Hand off BEFORE that happens.
- After session-end at 70%, the agent's final message must include the new session prompt above

### 6. Bug Tracker Protocol
If you fix ANY bug or discover new issues:
- Update `docs/BUG-TRACKER.md` — add changelog entry, move bug to CLOSED, update statistics
- This is the living fix log. Every fix gets a dated entry with session number and commit hash.

## Documentation Architecture
Docs are organized into 3 tiers to prevent staleness and duplication:

### Tier 1: Auto-Generated (always current)
- `BOOTSTRAP-PROMPT.md` — regenerated on every commit via Husky. Source tree, build health, acceptance criteria, deps, session state. THE single entry point for new sessions.

### Tier 2: Living Docs (updated by agents each session)
- `PROJECT-CONTEXT.md` — operational log, credentials, session history
- `SESSION-STATE.json` — mid-session task state
- `docs/BUG-TRACKER.md` — bug reports and fix log

### Tier 3: Reference Specs (stable, rarely change)
- `CLAUDE.md` — THIS FILE. Conventions, commands, agent behavior rules.
- `docs/MASTER-PLAN.md` — 7 phases with acceptance criteria (update criteria checkboxes as work completes)
- `docs/VISION-SPEC.md` — spatial UI spec (locked)
- `docs/TECH-BRIEF.md` — research findings, SDK patterns, gotchas
- `docs/CHARACTER-PROMPTS.md` — system prompts for 8 agents
- `docs/SCHEMA-DRAFT.md` — 16-table schema with RLS
- `docs/WAR-ROOM-BLUEPRINT.md` — Phase 1 implementation guide
- `docs/CHAIN-OF-COMMAND.md` — AI agent hierarchy spec

### Tier 4: Archive (completed work, reference only)
- `docs/archive/` — completed plans (IMMERSIVE-UI-PLAN.md, AUDIT.md) and research reports. Do not read unless specifically needed.

**Rule: Never duplicate information across tiers.** If it's auto-generated in Tier 1, don't manually maintain it in Tier 2 or 3.
