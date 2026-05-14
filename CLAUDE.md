# The Tower — Internship Command Center

## Architecture
Next.js 16 (App Router) + Supabase Postgres + Drizzle ORM v1 + Vercel AI SDK v6 + @supabase/ssr.
Deployed on Vercel at https://www.interntower.com. GSAP for animations. Tailwind v3 (JS config, NOT v4).
ProceduralSkyline (canvas-based renderer) with day/night cycle. LobbyBackground (CSS-only luxury reception).

## The Grand Vision
The Tower is not a dashboard. It is an immersive spatial experience — a skyscraper that the user physically enters, explores, and inhabits. Every page is a "floor" with its own atmosphere, lighting, characters, and personality. Navigation is an elevator with GSAP-animated door transitions. AI agents are 2D illustrated characters with idle animations, dialogue panels, and persistent memory. The user doesn't "use" software — they enter a building.

The building metaphor is sacred. Lobby = login. Elevator = navigation. Floors = features. Windows = background skyline. Characters = AI agents with personality and visual presence. This metaphor must never be broken. Every new feature must reinforce the spatial experience.

Target aesthetic: luxury game UI meets Bloomberg Terminal meets Apple spatial design. Not a "dashboard with a theme" — a world.

## Floor Directory
| Floor | Room | Characters |
|-------|------|------------|
| PH | The Penthouse (Dashboard) | — |
| 7 | The War Room (Applications/Pipeline) | CRO |
| 6 | The Rolodex Lounge (Contacts/Networking) | CNO + CIO |
| 5 | The Writing Room (Cover Letters) | CMO |
| 4 | The Situation Room (Follow-ups/Calendar) | COO |
| 3 | The Briefing Room (Interview Prep) | CPO |
| 2 | The Observatory (Analytics) | CFO |
| 1 | The C-Suite (CEO's Office) | CEO |
| L | The Lobby (Login/Onboarding) | Otis |

Full agent hierarchy spec: `docs/CHAIN-OF-COMMAND.md`
Character voice prompts: `docs/CHARACTER-PROMPTS.md`
Spatial design metaphor: `docs/VISION-SPEC.md`

## Key Commands
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run lint` — eslint
- `npm test` — vitest run
- `npm run test:e2e` — Playwright e2e (requires stub server on :3001)
- `npx tsc --noEmit` — type check
- `npx drizzle-kit generate` — generate migration SQL
- `npm run env:init` — local env init helper
- `npm run art:status` — current character image pipeline status and next step
- `npm run art:operate` — strict character image pipeline operator; writes the next legal action packet
- `npm run art:plan|clean|ingest|split|master|qa|review|promote` — batch character asset factory

## Conventions
- Server Components by default; "use client" only when needed
- Zod v4 for all validation
- Fully typed TypeScript — no `any`
- `import type { JSX } from "react"` — explicit JSX namespace (React 19)
- Timestamps: `timestamp('...', { withTimezone: true })`
- UUIDs for all primary keys (`uuid('id').primaryKey().defaultRandom()`)
- RLS on every table: `auth.uid() = user_id`
- Drizzle RLS uses third-argument array pattern, NOT `.withRLS()`
- @supabase/ssr (NOT deprecated auth-helpers)
- Tailwind v3 with JS config (NOT v4 CSS config)
- Feature branches, atomic commits, push protection ON — never commit secrets
- All planning docs in `/docs/`
- Aria attributes on all interactive elements, prefers-reduced-motion respected
- No console.logs in shipped code
- No TODO/FIXME comments in shipped code

## Character Image Pipeline
The locked character style is `tower-flat-plus-depth-v1`: premium web-game sprites, strong silhouettes, clean raster shapes, subtle depth, adult professional energy, no ultra-realism, no fake-perfect AI people. The locked story tone is `Professional Scars`.

When Armaan says "Creative Production Engine" or asks to add/generate Tower visuals, run `npm run art:studio` and follow `.agents/skills/creative-production-engine/SKILL.md`. Every phase must run the Housekeeping Gate and the Continuous Improvement Gate.

For any character image work, run `npm run art:operate` first and read `docs/CHARACTER-IMAGE-OPERATIONS.md`. The operator command writes the next legal action packet under `.artlab/operators/`. Use `npm run art:status` for read-only inspection of promoted characters, run warnings, and the next recommended character.

Current anchor state:
- Otis Vale is promoted through `.artlab/runs/otis/2026-05-14-otis-pilot/run.json`.
- Otis works in the app, but the run intentionally keeps source warnings visible because prototype-sized sources were upscaled into 4K masters: `source-long-edge-below-4096` and `source-upscaled-to-master`.
- The active replacement run is `.artlab/runs/otis/2026-05-14-otis-native-v2/run.json`; finish native-quality Otis v2 before starting Mara Voss (`ceo`).
- Drafts and generated outputs stay in `.artlab`; only `npm run art:promote` can copy approved derivatives into `public/art`.
- `npm run art:clean` may remove volatile old run binaries, but live `public/art` files stay until a replacement run is approved and promoted.
- Promotion requires Armaan's exact phrase: `approved for app`.
- If the image process exposes a repeated manual workaround, strengthen the script, docs, and tests before continuing.

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
- No custom cursor — standard cursor with `cursor: pointer` on interactive elements
- No mouse-driven parallax — autonomous Apple TV-style Ken Burns drift
- No motion-sickness-inducing animations — slow, organic, barely perceptible movement

## Three Cadence Knobs
Business decisions live in three config files split by review cadence — edit values there and pages, sitemap, and legal copy pick them up automatically.

- `src/lib/config/legal-config.ts` (yearly, counsel-gated) — entity, governing law, support email, refund policy, retention SLA, sub-processors, eligibility/minimum age, last-revised date.
- `src/lib/config/pricing-config.ts` (monthly, revenue) — Free/Pro/Team tiers, monthly + yearly prices, free-tier caps, cost caps, annual discount %, `flags.pricingPublic`.
- `src/lib/config/gate-config.ts` (weekly, founder) — brand name/tagline/domain/canonical URL, sender email, beta mode, blocked countries, `flags.waitlistPublic` / `flags.plausibleEnabled`.

Stripe price IDs live alongside in `src/lib/stripe/config.ts`. CODEOWNERS gates legal-config to me; CI (`config-guard.yml`) runs vitest + tsc on every PR that touches these files and rejects any re-introduction of `LAUNCH_CONFIG`.

## Useful Scripts
- `scripts/seed-owner-data.ts` — re-seed the owner account with believable internship-search data (12 companies, 14 applications, 12 contacts, 6 interviews, 1 active offer, 31 days of snapshots). Run via:
  ```
  set -a && source .env.local && set +a && ./node_modules/.bin/tsx scripts/seed-owner-data.ts
  ```
- `scripts/stripe-bootstrap.sh` — bootstrap Stripe products + prices + webhook (already run for production; re-run only if rotating).
- `scripts/comp-bands-seed.ts` — seed comp data.
- `scripts/setup-env.sh` — local env init.

## Documentation
- `STRUCTURE.md` — **READ FIRST.** Complete file map. Where things live, "where do I look to do X" table, conventions.
- `docs/VISION-SPEC.md` — spatial UI metaphor (sacred)
- `docs/CHAIN-OF-COMMAND.md` — AI agent hierarchy
- `docs/CHARACTER-PROMPTS.md` — 8 agent system prompts
- `docs/LAUNCH-READY.md` — locked business decisions + remaining ops checklist
