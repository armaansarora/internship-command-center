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
- `npm run session:end:dry` — dry run of session:end
- `npm run t handoff --stdin` — tower handoff packet (replaces the legacy SESSION-STATE.json writer; see §8)

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
3. **GSAP Tree-Shaking:** All component GSAP imports route through `src/lib/gsap-init.ts` (the only file that imports `"gsap"` directly). When adding new GSAP-using components, import via `@/lib/gsap-init` — this is the tree-shaking contract.
4. **ProceduralSkyline:** Canvas-based renderer, defaults to "night" outside DayNightProvider context (intentional for lobby). Uses `useDayNight()` hook + `getSkyConfig()`.
5. **EntranceSequence:** Uses sessionStorage for "played" flag — appropriate for per-session entrance.
6. **Vercel Auto-deploy:** `main` branch gets automatic production deployment.
7. **Supabase REST client pattern:** `createClient()` from `@/lib/supabase/server` for server components, `@/lib/supabase/client` for client components.

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

> Auto-generated by `scripts/auto-organize-docs.ts`. Top 25 by LOC. Do not edit manually.

- `src/app/(authenticated)/settings/settings-client.tsx` (1341 LOC) — R0.7 — `user_profiles.deleted_at` as ISO string (or null). Drives
- `src/components/floor-3/crud/PrepPacketViewer.tsx` (1135 LOC)
- `src/app/lobby/lobby-client.tsx` (970 LOC) — Lobby client component — The Tower entrance.
- `src/components/floor-7/crud/ApplicationModal.tsx` (777 LOC)
- `src/components/floor-6/crud/ContactModal.tsx` (762 LOC) — private sticky-note, visible only to the owning user. NEVER
- `src/components/floor-3/crud/InterviewTimeline.tsx` (676 LOC)
- `src/components/floor-4/SituationRoomClient.tsx` (650 LOC)
- `src/components/floor-7/war-table/ApplicationCard.tsx` (638 LOC) — R9.6 — When true AND `application.status === "rejected"`, the inline
- `src/components/world/elevator/ElevatorPanel.tsx` (635 LOC) — ElevatorPanel (desktop) — the glass nav panel with floor buttons, tower
- `src/components/floor-3/drill/DrillStage.tsx` (582 LOC) — R6.6 — DrillStage.
- `src/components/floor-5/cmo-character/CMOCharacter.tsx` (554 LOC)
- `src/components/floor-1/CSuiteClient.tsx` (539 LOC) — R3.11 — pure decision helper for the `/`-keystroke listener. Opens the
- `src/components/floor-4/coo-character/COOCharacter.tsx` (526 LOC)
- `src/components/floor-2/orrery/Orrery.test.tsx` (514 LOC) — R9.3 + R9.4 — Orrery consumer wrapper tests.
- `src/components/floor-6/cio-character/CIOWhiteboard.tsx` (513 LOC) — derived from ResearchStats from companies-rest.ts
- `src/components/floor-3/BriefingRoomClient.tsx` (511 LOC)
- `src/components/floor-6/cio-character/CIOCharacter.tsx` (509 LOC)
- `src/components/floor-5/crud/DocumentEditor.tsx` (500 LOC)
- `src/components/floor-3/cpo-character/CPOCharacter.tsx` (477 LOC)
- `src/components/floor-6/RolodexLoungeClient.tsx` (475 LOC)
- `src/components/floor-5/crud/DocumentList.tsx` (449 LOC)
- `src/components/floor-3/cpo-character/CPOWhiteboard.tsx` (444 LOC)
- `src/components/floor-3/BriefingRoomScene.tsx` (443 LOC) — BriefingRoomScene — Floor 3 environment compositor.
- `src/components/floor-4/SituationRoomScene.tsx` (430 LOC) — SituationRoomScene — Floor 4 environment compositor.
- `src/components/floor-7/WarRoomClient.tsx` (429 LOC)

> 188 smaller components omitted — full list in `docs/KEY-COMPONENTS.md`.

## Bootstrap Infrastructure
- `scripts/auto-organize-docs.ts` — **runs on every commit (Husky)**. Auto-archives stale docs, auto-generates Key Components (this section), auto-updates doc map table, auto-appends session logs. Zero manual doc maintenance.
- `scripts/generate-bootstrap.ts` — **runs on every commit (Husky)**. Generates BOOTSTRAP-PROMPT.md with: build health, git diff, acceptance criteria tracking, dep freshness, context budget, session state, doc freshness warnings.
- `scripts/session-end.ts` — chains type check → bootstrap → stage → commit → push into one command
- `.husky/pre-commit` — runs auto-organize-docs.ts → generate-bootstrap.ts → stages all modified docs
- `scripts/check-vercel.ts` — writes Vercel deploy status to .vercel-status.json (agent-invoked)
- `.github/workflows/bootstrap-check.yml` — CI guard that fails PR if bootstrap is stale
- `.handoff/YYYY-MM-DD-HHMM.md` — tower handoff packets carry mid-session task state (replaced SESSION-STATE.json)
- `.bootstrap-last-hash` — tracks last commit hash at generation time (gitignored)

## Mandatory Agent Behavior (NON-NEGOTIABLE)
Tower CLI is the session dial-tone. The human never runs session commands.

### 0. Session Start — Before Any Other Action
Run first, before reading any other file:
```bash
npm run t status && npm run t resume && cat .tower/autopilot.yml 2>/dev/null
```
Costs ~300 tokens, tells you the active phase, progress, last R-tagged commit, open blockers, lock state, the previous session's handoff notes, and whether autopilot is on. Do NOT read BOOTSTRAP-PROMPT.md, docs/NEXT-ROADMAP.md, or CLAUDE.md first unless the tower output is missing or empty.

**If `.tower/autopilot.yml` exists and `paused: false`:** go straight into Autopilot Mode (§8). Do not ask the user anything. Continue from where the previous session left off.

**Otherwise:** wait for the user's first message before doing anything.

Load targeted context on demand:
- `npm run t brief <phase>` — just that phase's brief from the roadmap
- `npm run t next` — suggested next task + blockers on it
- `npm run t phases` / `tower blocked` / `tower log` — focused queries
- Specific files via Read — only files the task actually touches

### 1. Skill Cascade — The Flow (MANDATORY for non-trivial work)
Every non-trivial task goes through this chain. No exceptions, no shortcuts, no cutting corners.

```
/superpowers:brainstorming
  → design the approach, get user sign-off, write docs/plans/YYYY-MM-DD-<topic>-design.md
/superpowers:writing-plans
  → produce bite-sized TDD plan at docs/plans/YYYY-MM-DD-<topic>.md
/superpowers:executing-plans          (serial work)
  /superpowers:subagent-driven-development   (when plan has independent tasks → parallel subagents)
  → execute task-by-task with TDD, commit per task
/superpowers:finishing-a-development-branch
  → verify tests, present merge/PR/discard options, cleanup
```

**Non-trivial means ANY of:**
- Starting a new R-phase from the roadmap
- Any task you're about to wrap with `tower start`
- Any change touching 3+ files
- Any new feature, refactor, or bug fix with non-obvious cause
- Adding a dependency, schema migration, or new API surface

**Trivial (cascade may be skipped):**
- Single-file edits under 20 lines with no new logic
- Typo, copy, or comment fixes
- Answering questions without writing code
- Running a command the user explicitly asked for (`git push`, `npm test`, etc.)

**Parallel work rule:** when the plan has independent tasks (different phases, different floors, different subsystems), prefer `/superpowers:subagent-driven-development` over `executing-plans` — it dispatches a fresh subagent per task and reviews between them.

**Tower + skill cascade interaction:**
- `tower start <id>` happens DURING `executing-plans` (inside each task's commit cycle), not before the cascade starts
- `tower handoff` happens AFTER `finishing-a-development-branch`, as the very last step
- If you're about to run `tower start` and you haven't been through brainstorming + writing-plans for this work, stop and back up — you skipped the cascade.

**Violation handling:** if mid-work you realize the cascade wasn't run, stop, back up, and run it. Do not keep going "since we're already here." That's exactly the drift the cascade exists to prevent.

### 2. Ledger Mutations (during the execute step)
- Mark task start: `npm run t start R2.3` (acquires phase lock automatically)
- Commit with phase tag on the subject line: `[Rn/n.n] type: what you did`
  The commit-msg hook warns (never blocks) on untagged src/ commits or unknown tags.
- Mark task done: `npm run t done R2.3` (records HEAD sha into the ledger)
- Record a blocker: `npm run t block R2.3 "reason in quotes"`
- Undo a mistaken mutation: `npm run t undo`

### 3. Session End — Automatic Handoff
At the 70% context threshold, at task completion, or when the user says wrap up, pipe soft fields to handoff as JSON:
```bash
cat <<'EOF' | npm run t handoff -- --stdin
{
  "contextUsedPct": 72,
  "decisions": [{"text": "chose linear decay", "why": "simpler"}],
  "surprises": ["Vercel scheduled fns don't retry"],
  "filesInPlay": ["src/lib/decay.ts"],
  "next": ["resolve B1", "ship R2.3"],
  "contextNotes": "trigger assumes trailing 7-day window"
}
EOF
```
This auto-writes `.handoff/YYYY-MM-DD-HHMM.md`, releases the phase lock, commits as `chore(handoff): …`. Next session reads it via `tower resume`.

### 4. Context Window Management
- **~40% YELLOW** — mention to the user, no action.
- **~60% ORANGE** — warn, finish current task, avoid starting new large tasks.
- **~70% RED** — mandatory handoff via `npm run t handoff`, then summarize and hand off.

Estimate conservatively — round up, hand off early rather than late. Large file reads and long tool outputs burn context fastest.

### 5. Never Leave Dirty State
If interrupted, the ledger YAML should already describe current state. Use `tower start` / `done` / `block` for ledger mutations — do not hand-edit `.ledger/*.yml` during active work (direct edits are fine for correcting mistakes via `tower undo`).

### 6. Vercel Status — When Relevant
Run `npx tsx scripts/check-vercel.ts` after deploy-related work or if the user asks about deploy status.

### 7. Bug Tracker Protocol
If you fix a bug or discover new issues, update `docs/BUG-TRACKER.md` — dated entry with session number and commit hash.

### 8. Autopilot Mode — Set-and-Forget

**Trigger phrases (any of):**
- "autopilot"
- "set and forget"
- "run the tower"
- "autopilot R<n>–R<m>" / "autopilot through R<n>" / "autopilot until done"
- any variant that clearly grants autonomous execution of roadmap phases

**On trigger, Claude immediately:**
1. Writes `.tower/autopilot.yml`:
   ```yaml
   paused: false
   scope: all               # or "R0-R5" / "R3-only" / etc.
   started: <ISO timestamp>
   started_by: <session id>
   max_blockers: 3
   ```
2. Begins work without further questions. Only escalates under the rules below.

**Skill-cascade overrides when autopilot is on:**
| Skill | Normal behavior | Autopilot behavior |
|-------|-----------------|--------------------|
| `brainstorming` | Present design, get user approval per section | Present design to SELF — self-approve if choices fall within the phase's Brief (Intent/Anchors/Proof) and the §5 Reference Library. Still write the design doc. |
| `writing-plans` | Offer subagent-driven vs parallel-session choice | Default to `subagent-driven-development` when plan has independent tasks; `executing-plans` otherwise. Never ask. |
| `executing-plans` | Pause after every 3 tasks for review | Do not pause between batches. Run phase to completion. |
| `subagent-driven-development` | Review between subagents | Review happens internally (Claude reads subagent output, decides, continues). No user gate. |
| `finishing-a-development-branch` | Present 4 merge/PR/keep/discard options | Always push to origin. No menu. |
| `tower handoff` | Fire on wrap-up | Fire on phase completion AND at 70% context. After handoff at 70%, exit the session cleanly. |

**Escalation — the ONLY reasons to interrupt autopilot:**
1. **Missing secret** — env var not set for a credential/API key/OAuth token the phase needs
2. **Business decision not in roadmap** — e.g., exact pricing tiers, legal copy, user-facing wording where the voice guide is ambiguous. The roadmap's Briefs + Reference Library are the source of truth; escalate only when genuinely silent.
3. **Destructive action outside normal dev flow** — dropping tables, force-pushing `main`, removing directories that aren't in the current task
4. **Same test fails 3 attempts in a row** with distinct fix strategies → record blocker, move to next unblocked phase
5. **Schema migration that would touch >10% of user-owned rows** — get confirmation before running
6. **User says "pause autopilot" / "stop" / "wait"** — set `paused: true` in the flag file, stop, await instructions

**Self-resolve (do NOT escalate) for:**
- Design / color / motion / copy choices — pick from Reference Library, document in ledger `decisions`, move on
- Library picks — use what the roadmap gestures at, or industry-standard, document why, move on
- Refactor vs rewrite judgment — pick the smaller surface, note rationale, move on
- Naming, folder layout, file structure — follow existing project conventions, move on
- Test flakes (retry with stability fix) — flake-fix and continue

**Blocker routing within autopilot:**
- Non-escalation blocker on phase N? → `tower block R<N>.<n> "<reason>"`, then `tower next`, continue on whatever phase is unblocked.
- If all phases in scope are blocked? → fire final handoff, set `paused: true`, wait for user.

**Phase-complete verification (MANDATORY — use `tower accept`):**
To flip `acceptance.met: true` on a phase ledger, autopilot MUST use:
```bash
npm run t accept <Rn>
```
This command structurally runs the full verify gate (tasks complete + blockers empty + drift clean + tests + tsc + build + lint) and refuses the flip on any ✗. It also auto-advances `.tower/autopilot.yml` to the next phase's scope.

**Do NOT write `acceptance.met: true` directly into the ledger YAML.** That bypass caused the R5.4 drift where acceptance was marked with 9/10 tasks complete. The `tower accept` gate exists specifically to prevent that.

If verify fails, do NOT pass `--force`. Instead: fix the failing check, or open a blocker via `tower block` and move to next phase if one's available. `--force` is reserved for the partner (human) to use when a knowing, explicit bypass is called for.

**Context rotation in autopilot:**
- At 60%: note in handoff draft, keep working.
- At 70%: `tower handoff --stdin` with current state, commit, then **exit the session cleanly** with a final message summarizing what's been done and what autopilot will continue with next session.
- Next session's §0 startup finds `paused: false` and resumes automatically. No user interaction needed between sessions *if* the user is running a daemon loop (see below). If not, the user just types "continue" and autopilot picks up.

**Ending autopilot (any of):**
- All phases in scope complete → `paused: true`, final summary, done.
- Accumulated `max_blockers` escalation-tier blockers → `paused: true`, summary + ranked list of what's needed from user.
- User says stop / pause → `paused: true`, partial summary.

**The initial sign-off is the ONLY interactive moment.** After "autopilot" is said, the only things that surface to the user are (a) genuine escalations per the list, (b) handoffs at context limits, (c) the final completion report.

**Optional daemon for true OS-level set-and-forget:** the user can run a bash loop in their terminal:
```bash
while ! grep -q 'paused: true' .tower/autopilot.yml 2>/dev/null; do
  claude --prompt "Read CLAUDE.md §0 and continue."
done
```
Each iteration is a fresh Claude session that reads autopilot state and continues until 70% context, then exits. The loop restarts until autopilot ends itself. The user goes to sleep; the tower builds itself.

## Documentation Architecture
Docs are organized into 3 tiers to prevent staleness and duplication:

### Tier 1: Auto-Generated (always current)
- `BOOTSTRAP-PROMPT.md` — regenerated on every commit via Husky. Source tree, build health, acceptance criteria, deps, session state. THE single entry point for new sessions.

### Tier 2: Living Docs (updated by agents each session)
- `PROJECT-CONTEXT.md` — operational log, credentials, session history
- `.handoff/*.md` — tower handoff packets carry mid-session task state
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
