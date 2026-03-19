# The Tower — Internship Command Center

## Architecture
Next.js 16 (App Router) + Supabase Postgres + Drizzle ORM v1 + Vercel AI SDK v6 + Inngest v3 + @supabase/ssr
Deployed on Vercel. GSAP + Framer Motion for animations. Tailwind v3 (JS config, NOT v4).
Photorealistic CSS 3D parallax skyline with day/night crossfade, atmospheric effects, dust motes.

## Agent System
Corporate hierarchy: CEO orchestrates 7 C-suite agents (CIO, CRO, CMO, COO, CPO, CNO, CFO).
Each agent uses AI SDK v6 generateText with tools + Zod schemas.
Inter-agent communication via Inngest events. Agent memory via pgvector.
Contracts (1,015 LOC Zod v4 types) in `src/lib/contracts/`.

## Design System (The Tower)
Immersive spatial UI — building metaphor, not a dashboard. Each page is a "floor."
Primary dark: #1A1A2E. Gold accent: #C9A84C. Glass: backdrop-filter blur(16px).
Fonts: Playfair Display (headings), Satoshi (body), JetBrains Mono (data).
Day/night cycle driven by user's local time. NYC photorealistic skyline with CSS 3D parallax.

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
- All planning docs in `/docs/` directory
- Aria attributes on all interactive elements, prefers-reduced-motion respected

## Immersive Skyline System
- `SkylineScene.tsx` — master 6-layer stack (sky gradient → day layers → night layers → atmosphere → particles → glass)
- `SkylineLayers.tsx` — CSS 3D perspective with 4 depth-separated photo layers per variant
- `AtmosphericEffects.tsx` — vignette, height fog, night bloom, sky fade (CSS-only)
- `DustMotes.tsx` — tsParticles v3 (~40 particles, `initParticlesEngine` + `loadSlim`)
- `WindowTint.tsx` — glass overlay with backdrop-filter
- `useMouseParallax.ts` — RAF-based lerp, ref-stable loop (no useCallback state deps)
- `useSkylineVariant.ts` — day/night from DayNightProvider
- `EntranceSequence.tsx` — cinematic first-login (GSAP, sessionStorage skip)
- Photos in `public/skyline/{day,night}/{sky,far,mid,near}.{webp,png}`

## Bootstrap Infrastructure
- `scripts/generate-bootstrap.ts` — generates BOOTSTRAP-PROMPT.md with: build health, git diff, acceptance criteria tracking, dep freshness, context budget, session state
- `scripts/session-end.ts` — chains type check → bootstrap → stage → commit → push into one command
- `scripts/update-session-state.ts` — CLI fallback to update SESSION-STATE.json manually (prefer agent auto-update)
- `.husky/pre-commit` — auto-regenerates BOOTSTRAP-PROMPT.md on every commit
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

## Key Docs
- `BOOTSTRAP-PROMPT.md` — auto-generated handoff (auto-runs on commit, includes build health + criteria tracking)
- `PROJECT-CONTEXT.md` — operational context, credentials, session log
- `docs/MASTER-PLAN.md` — 7 phases, acceptance criteria
- `docs/VISION-SPEC.md` — spatial UI spec (locked)
- `docs/TECH-BRIEF.md` — research, AI SDK v6 patterns, Drizzle gotchas
- `docs/CHARACTER-PROMPTS.md` — system prompts for 8 agents
- `docs/SCHEMA-DRAFT.md` — 16-table schema with RLS
- `docs/IMMERSIVE-UI-PLAN.md` — skyline implementation plan (COMPLETED)
