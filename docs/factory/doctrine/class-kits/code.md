# 🧰 Class kit — code

*The most mechanized artifact class. Oracle + golden template + conventions. Cap: 150 lines.*

## Oracle (Rung 1 — mechanical, then Siege)
Gates, in order, fail-fast — ALL must pass before the Siege round even starts:
1. `npx tsc --noEmit`
2. lint
3. unit tests (vitest or equivalent) — written against the Orders' victory conditions
4. production build
5. e2e on the mission-critical flow(s) named in the Orders (Playwright)

Then the Siege (cross-model assault). "Tests green" is never the done-claim — survival is.

## Golden template (web app)
The Tower stack, proven in production at interntower.com:
- Next.js (App Router) + Supabase (auth + Postgres) + Tailwind, deployed on Vercel
- @supabase/ssr (never the deprecated auth-helpers)
- RLS on every table (`auth.uid() = user_id`); UUID PKs; timestamps `withTimezone`
- Drizzle for schema/migrations ONLY — runtime data access through the Supabase REST
  client (serverless + IPv6-only DB makes the pooler unreliable)
- Zod for validation at every boundary; fully typed, no `any`
- Server Components by default; `"use client"` only when needed

## Conventions
- Mine the target repo's CLAUDE.md / house rules at Recon and treat them as contract.
- Accessibility is not polish: aria attributes + prefers-reduced-motion from the start.
- No console.log / TODO / FIXME in shipped code.
- Migrations ship as numbered SQL with apply + rollback notes (see GOTCHAS: unattended).
- Secrets never in code or commits; push protection assumed ON.
