# Internship Command Center (ICC)

## Architecture
Next.js 16 + Turso (libSQL) + Drizzle ORM + Vercel AI SDK v4.x + Inngest + Auth.js
Deployed on Vercel. Sentry for errors. Tailwind v4 + shadcn/ui.

## Agent System
Corporate hierarchy: CEO orchestrates 7 C-suite agents (CIO, CRO, CMO, COO, CPO, CNO, CFO).
Each agent uses AI SDK generateText/streamText + Zod tool schemas.
Inter-agent communication via Turso DB + Inngest events.

## Design System (Boardroom)
Dark glassmorphism. Primary: #1A1A2E. Accent: #C9A84C (gold).
Fonts: Playfair Display (headings), Inter (body), JetBrains Mono (data).
All components use shadcn/ui + Boardroom token overrides.

## Key Commands
- `pnpm dev` — dev server
- `pnpm build` — production build
- `pnpm test` — vitest
- `pnpm lint` — eslint
- `pnpm db:push` — push schema to Turso
- `pnpm db:studio` — Drizzle Studio

## Conventions
- Server Components by default; "use client" only when needed
- Zod v4 for all validation
- ISO 8601 timestamps (TEXT columns)
- TEXT primary keys (hex random)
- Feature branches, atomic commits
