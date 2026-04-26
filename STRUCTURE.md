# File Structure — Where Things Live

A map of the repo so future sessions don't burn tokens hunting. Skim the top, then jump to the section you need.

---

## Top-level

```
src/         the app
scripts/     maintenance + seed scripts (6 files, all useful)
docs/        design specs (4 files)
tests/       Playwright E2E suite
public/      static assets (logos, OG, etc.)
```

---

## src/app/  — Next.js App Router

URL paths are determined by directory names. Auth-redirect lives in `src/proxy.ts` (`publicPaths` array gates which routes are reachable without a session).

### Public routes
```
src/app/lobby/                          login + onboarding entry
  lobby-client.tsx                      the entrance UI
  onboarding/ConciergeFlow.tsx          first-run concierge

src/app/(marketing)/                    public marketing
  layout.tsx                            shared chrome (header/footer)
  pricing/page.tsx                      reads STRIPE_PLANS + LAUNCH_CONFIG
  privacy/page.tsx                      renders src/lib/legal/privacy.ts
  terms/page.tsx                        renders src/lib/legal/terms.ts
  waitlist/page.tsx + WaitlistForm.tsx + actions.ts

src/app/robots.ts                       built from launch-config
src/app/sitemap.ts                      built from launch-config
src/app/opengraph-image.tsx             1200×630 OG card (Edge runtime)
src/app/layout.tsx                      root metadata, fonts, Plausible tag
```

### Authenticated floors
```
src/app/(authenticated)/
  penthouse/         Floor PH — dashboard
  war-room/          Floor 7  — applications/pipeline
  rolodex-lounge/    Floor 6  — contacts/networking
  writing-room/      Floor 5  — cover letters
  situation-room/    Floor 4  — follow-ups/calendar
  briefing-room/     Floor 3  — interview prep
  observatory/       Floor 2  — analytics
  c-suite/           Floor 1  — CEO orchestrator
  parlor/            Negotiation Parlor (annex of Floor 1)
  settings/          user settings
```

Each floor follows the same shape:
- `<floor>/page.tsx` — server component, fetches data
- `src/components/floor-N/<Floor>Client.tsx` — main client UI
- `src/components/floor-N/<feature>/` — sub-components

### API routes (URL = path)
```
src/app/api/
  ceo/, cro/, cfo/, cio/, cmo/, cno/, coo/, cpo/   8 AI agents
                                                   (all use createAgentRoute)
  stripe/checkout, stripe/portal, stripe/webhook
  cron/                                            14 scheduled jobs
                                                   (all wrapped withCronHealth)
  auth/callback, auth/signout
  account/delete, account/export                   GDPR
  admin/sentry-probe                               owner-only debug
  briefing/, calendar/, gmail/, drive/             integration data
  contacts/, documents/, networking/, offers/      floor data
  onboarding/, profile/, progression/              user state
  notifications/, outreach/, resumes/              cross-floor
  comp-bands/, ceo/, concierge/                    misc
  weather/, reports/, rejection-reflections/
  writing-room/                                    compose-stream, etc.
  waitlist/                                        marketing form ingest
```

---

## src/components/  — by floor (mostly)

```
src/components/
  floor-1/  CSuiteClient + dispatch graph + CEO desk
  floor-2/  Observatory (Orrery 3D, CFO whiteboard, satellites)
  floor-3/  Briefing Room (CPO drill, prep packets, binder)
  floor-4/  Situation Room (COO calendar, undo arcs, situation map)
  floor-5/  Writing Room (CMO live-compose, doc editor, document list)
  floor-6/  Rolodex Lounge (CNO/CIO, rolodex card, dossier wall)
  floor-7/  War Room (CRO, application card, war table, pipeline)
  penthouse/   dashboard widgets (skyline, stats, agent ring)
  parlor/      Negotiation Parlor UI (door, chairs, comp chart)
  agents/      shared agent character/dialogue components
  world/       cross-floor chrome (elevator, sky, transitions, world-shell)
  marketing/   LegalDocument renderer
  pricing/     PricingCards (used in settings billing)
  settings/    settings tab clients (NetworkingConsent, etc.)
  transitions/ shared route/elevator transitions
  ui/          generic UI primitives
  icons/       SVG icon components
  lobby/       lobby-specific (Otis, building directory)
```

---

## src/lib/  — shared utilities, helpers, infra

### AI / Agents (the brains)
```
src/lib/agents/
  ceo/, cro/, cfo/, cio/, cmo/, cno/, coo/, cpo/   per-agent prompts + tools
  concierge/                                       Otis (lobby concierge)
  create-agent-route.ts                            shared route factory
                                                   (auth + rate limit + quota +
                                                    streaming)
  shared/                                          cross-agent helpers

src/lib/ai/
  model.ts                                         provider selection
  prompt-cache.ts                                  Anthropic cache helpers
  telemetry.ts                                     recordAgentRun
  structured/                                      structured-output schemas
  quota.ts                                         consumeAiQuota gate
                                                   (used in createAgentRoute
                                                    + bespoke AI routes)
```

### Stripe / Auth / Supabase
```
src/lib/stripe/
  config.ts                                        STRIPE_PLANS (price IDs)
  server.ts                                        createCheckoutSession,
                                                   tierFromPriceId
  entitlements.ts                                  getUserTier, canUseAgents
  agent-access.ts                                  paid-tier gate
  webhook handler logic
                                                   (route at app/api/stripe/webhook)

src/lib/auth/
  require-user.ts                                  getUser-or-401
  owner.ts                                         isOwner(userId)
                                                   (env.OWNER_USER_ID)
  cron.ts                                          verifyCronRequest

src/lib/supabase/
  server.ts                                        createClient() — server
  client.ts                                        client-side client
  admin.ts                                         service-role client
  middleware.ts                                    auth middleware logic
                                                   (called by src/proxy.ts)
```

### Database
```
src/lib/db/
  queries/<table>-rest.ts                          Supabase REST query helpers
                                                   (use these at runtime)

src/db/schema.ts                                   Drizzle schema (49KB,
                                                   schema-only — NEVER use
                                                   `db` object at runtime)
src/db/migrations/                                 0000–0023.sql
src/db/manual/                                     hand-written SQL
src/db/manual/auth-email-templates/                4 HTML templates already
                                                   pasted into Supabase dashboard
```

### Cross-cutting
```
src/lib/cron/health.ts                             withCronHealth wrapper
                                                   (used in all 14 cron routes)
src/lib/legal/{privacy,terms}.ts                   legal copy source
src/lib/notifications/                             pneumatic-tube notifications
src/lib/preferences/                               user preferences
src/lib/account/                                   account export/delete
src/lib/audit/                                     audit log helpers
src/lib/crypto/                                    AES-256-GCM for OAuth tokens
src/lib/jobs/                                      job discovery (CRO)
src/lib/pdf/                                       PDF generation
src/lib/utils/, validators/, constants/, actions/  generic helpers
```

### Floor-specific helpers (lib-side)
```
src/lib/lobby/, onboarding/, progression/          lobby + onboarding logic
src/lib/orrery/                                    Observatory data (R3F-ready)
src/lib/parlor/, comp-bands/                       Parlor, Levels.fyi lookup
src/lib/situation/                                 deadlines, follow-ups
src/lib/contacts/                                  warmth helpers
src/lib/resumes/                                   resume helpers
src/lib/voice/, audio/, speech/                    Briefing Room voice pipeline
```

### External integrations
```
src/lib/gmail/                                     Gmail OAuth + sync
src/lib/calendar/                                  Google Calendar sync
src/lib/networking/                                cross-user matching
src/lib/email/                                     Resend transactional
```

### Infra root files
```
src/lib/launch-config.ts          ★ SINGLE TWEAK KNOB — pricing, beta gate,
                                    retention, refund, eligibility, sub-procs.
                                    Edit values here; pages, sitemap, legal
                                    copy, quotas pick them up automatically.
src/lib/env.ts                    Zod-validated env (use env() not process.env)
src/lib/logger.ts                 Structured logger (use log.info etc.)
src/lib/rate-limit.ts             Per-user-per-tier rate limit (Upstash)
src/lib/rate-limit-middleware.ts  Wrapper for API routes
src/lib/gsap-init.ts              GSAP tree-shake contract — all GSAP imports
                                  go through here, not direct `gsap`
src/lib/day-night.ts              Day/night cycle (7 time states)
src/lib/skyline-engine.ts         Procedural skyline canvas renderer
src/lib/easter-eggs.ts
```

---

## scripts/

```
scripts/seed-owner-data.ts        re-seed owner with realistic data:
                                    set -a; source .env.local; set +a
                                    ./node_modules/.bin/tsx \
                                      scripts/seed-owner-data.ts
scripts/stripe-bootstrap.sh       create Stripe products + prices + webhook
                                  (already run for production)
scripts/comp-bands-seed.ts        seed Levels.fyi comp data
scripts/init-env.ts               local env init helper (`npm run env:init`)
scripts/setup-env.sh              env init shell helper
scripts/create-skyline-layers.py  procedural skyline asset generator
```

---

## docs/

```
docs/VISION-SPEC.md          spatial UI metaphor (sacred — read first)
docs/CHAIN-OF-COMMAND.md     AI agent hierarchy spec (66KB — long, skim)
docs/CHARACTER-PROMPTS.md    8 agent system prompts (voice/personality)
docs/LAUNCH-READY.md         locked business decisions + remaining ops
                             checklist (§0 has the table of decisions)
```

---

## tests/

```
tests/e2e/                   Playwright E2E (security/abuse/concurrency/
                             scale/failure scenarios)
tests/                       (root) shared test helpers
src/**/*.test.ts             unit + integration (vitest, ~1575 tests)
src/app/__tests__/*.proof.test.ts   proof tests for invariants
```

E2E requires a stub Supabase server on `:3001` (auto-started by Playwright globalSetup).

---

## "Where do I look to do X?"

| Task | File |
|---|---|
| Change pricing tier names / amounts | `src/lib/launch-config.ts` (display) + `src/lib/stripe/config.ts` (Stripe IDs) |
| Change refund / retention / age policy | `src/lib/launch-config.ts` |
| Edit privacy / terms copy | `src/lib/legal/{privacy,terms}.ts` (rendered into routes automatically) |
| Add a new public marketing page | `src/app/(marketing)/<route>/page.tsx` + add to `src/proxy.ts` `publicPaths` + add to `src/app/sitemap.ts` |
| Add a new floor / authenticated route | `src/app/(authenticated)/<floor>/page.tsx` + `src/components/floor-N/<Floor>Client.tsx` + add to `FLOORS` in `src/types/ui.ts` |
| Change an AI agent's voice | `src/lib/agents/<agent>/system-prompt.ts` |
| Change an AI agent's tools | `src/lib/agents/<agent>/tools.ts` |
| Change AI quota cap | `src/lib/launch-config.ts` (`costCaps.{free,paid}AiCallsPerDay`) |
| Add a new cron job | `src/app/api/cron/<name>/route.ts` (wrap with `withCronHealth`) + add schedule to `vercel.json` |
| Database table changes | `src/db/schema.ts` → `npx drizzle-kit generate` → apply via Supabase MCP or dashboard |
| Database queries at runtime | `src/lib/db/queries/<table>-rest.ts` (Supabase REST — never the Drizzle `db` object) |
| Onboarding flow edits | `src/app/lobby/onboarding/ConciergeFlow.tsx` + `src/app/lobby/lobby-client.tsx` |
| Lobby UI / sign-in | `src/app/lobby/lobby-client.tsx` |
| Settings UI | `src/app/(authenticated)/settings/settings-client.tsx` (1355 LOC, big file) |
| Owner-only feature gates | `import { isOwner } from "@/lib/auth/owner"` |
| Get current user (server) | `import { getUser } from "@/lib/supabase/server"` |
| Get current tier | `import { getUserTier } from "@/lib/stripe/entitlements"` |
| Re-seed owner test data | `bash scripts/seed-owner-data.ts` (after `vercel env pull --yes .env.local`) |
| Cron health table | `cron_runs` (owner-only RLS) |
| Quota table | `ai_call_quotas` (atomic `consume_ai_call_quota` RPC) |
| Waitlist signups | `waitlist_signups` (RLS deny-all, admin-only) |

---

## Conventions (one-liners)

- Server Components by default; `"use client"` only when needed.
- Zod v4 for all validation (`import z from "zod/v4"`).
- `import type { JSX } from "react"` (React 19 explicit JSX).
- Database at runtime → Supabase REST (`createClient()` from `@/lib/supabase/server`). NEVER the Drizzle `db` object.
- Database for migrations → Drizzle Kit only.
- All cron route handlers are wrapped with `withCronHealth("name", handler)`.
- All AI agent routes go through `createAgentRoute` (which calls `consumeAiQuota`).
- All GSAP imports go through `@/lib/gsap-init` (tree-shake contract).
- Aria attributes on all interactive elements; `prefers-reduced-motion` respected.
- No `console.log` in shipped code; use `log.info/warn/error` from `@/lib/logger`.
- No TODO/FIXME comments in shipped code.
- `launch-config.ts` is the single source of truth for business decisions.
