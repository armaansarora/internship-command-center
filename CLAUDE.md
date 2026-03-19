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
- `npx tsc --noEmit` — type check (run before committing)
- `npx drizzle-kit generate` — generate migration SQL
- `npx tsx scripts/generate-bootstrap.ts` — regenerate BOOTSTRAP-PROMPT.md

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

## Key Docs
- `BOOTSTRAP-PROMPT.md` — auto-generated handoff (run `npx tsx scripts/generate-bootstrap.ts`)
- `PROJECT-CONTEXT.md` — operational context, credentials, session log
- `docs/MASTER-PLAN.md` — 7 phases, acceptance criteria
- `docs/VISION-SPEC.md` — spatial UI spec (locked)
- `docs/TECH-BRIEF.md` — research, AI SDK v6 patterns, Drizzle gotchas
- `docs/CHARACTER-PROMPTS.md` — system prompts for 8 agents
- `docs/SCHEMA-DRAFT.md` — 16-table schema with RLS
- `docs/IMMERSIVE-UI-PLAN.md` — skyline implementation plan (COMPLETED)
