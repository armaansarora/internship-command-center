# The Tower — Internship Command Center

## Architecture
Next.js 16 (App Router) + Supabase Postgres + Drizzle ORM v1 + Vercel AI SDK v6 + Inngest v3 + @supabase/ssr
Deployed on Vercel. GSAP + Framer Motion for animations. Tailwind v3.

## Agent System
Corporate hierarchy: CEO orchestrates 7 C-suite agents (CIO, CRO, CMO, COO, CPO, CNO, CFO).
Each agent uses AI SDK v6 generateText with tools + Zod schemas.
Inter-agent communication via Inngest events. Agent memory via pgvector.

## Design System (The Tower)
Immersive spatial UI — building metaphor, not a dashboard.
Primary dark: #1A1A2E. Gold accent: #C9A84C. Glass: backdrop-filter blur(16px).
Fonts: Playfair Display (headings), Satoshi (body), JetBrains Mono (data).
Day/night cycle driven by user's local time. NYC skyline with parallax.

## Key Commands
- `pnpm dev` — dev server
- `pnpm build` — production build
- `pnpm test` — vitest
- `pnpm test:e2e` — playwright
- `pnpm lint` — eslint
- `pnpm db:push` — push schema to Supabase via Drizzle
- `pnpm db:studio` — Drizzle Studio
- `pnpm db:generate` — generate migrations

## Conventions
- Server Components by default; "use client" only when needed
- Zod v3 for all validation
- Timestamps: `timestamp('...', { withTimezone: true })` — native Postgres
- UUIDs for all primary keys (`uuid('id').primaryKey().defaultRandom()`)
- RLS on every table: `auth.uid() = user_id`
- Feature branches, atomic commits, push protection ON
- All planning docs in `/docs/` directory

## Key Docs
- `docs/MASTER-PLAN.md` — 7 phases, acceptance criteria, testing strategy
- `docs/VISION-SPEC.md` — spatial UI spec (locked)
- `docs/TECH-BRIEF.md` — research findings, code patterns, package list
- `docs/SCHEMA-DRAFT.md` — 16-table Postgres schema with RLS
- `docs/CHARACTER-PROMPTS.md` — system prompts for all 8 agents
- `docs/FILE-STRUCTURE.md` — target project file tree
- `PROJECT-CONTEXT.md` — operational context (auto-updated)
