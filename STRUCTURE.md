# File Structure — Where Things Live

A map of the repo so future sessions don't burn tokens hunting. Skim the top, then jump to the section you need.

---

## Top-level

```
src/                            the app
scripts/                        maintenance, seed, dev, and art pipeline scripts
docs/                           design specs, testing, runbooks, character art canon
.artlab/                        non-production character art lab, run ledgers, QA boards
sentry/                         versioned Sentry alert rules (alerts.yaml)
tests/                          Playwright E2E + off-platform canary
  tests/e2e/                    local stub-server Playwright suite
  tests/canary/                 off-platform synthetic canary against real prod
public/                         static assets (4 lobby bgs, approved art, favicon)
.github/workflows/              CI + scheduled jobs
  config-guard.yml              vitest + tsc on cadence-config PRs
  hardening-e2e.yml             Playwright HARSH suite on src/ PRs + weekly
  canary.yml                    off-platform synthetic canary (every 15 min)
playwright.config.ts            default config — local e2e (stub server)
playwright.canary.config.ts     canary-only — hits real prod, no stub
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
  pricing/page.tsx                      reads STRIPE_PLANS + PRICING/LEGAL/GATE
  privacy/page.tsx                      renders src/lib/legal/privacy.ts
  terms/page.tsx                        renders src/lib/legal/terms.ts
  waitlist/page.tsx + WaitlistForm.tsx + actions.ts
  campus/page.tsx                       campus / .edu landing variant
  season-pass/page.tsx                  Season Pass landing

src/app/robots.ts                       built from gate-config
src/app/sitemap.ts                      built from gate + legal + pricing configs
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
  activate/          5-minute activation gauntlet (onboarding cross-floor)
  operations/        owner-only ops dashboard
  milestones/        progression milestones view
  actions/           shared server actions (cross-floor)
```

Each floor follows the same shape:
- `<floor>/page.tsx` — server component, fetches data
- `src/components/floor-N/<Floor>Client.tsx` — main client UI
- `src/components/floor-N/<feature>/` — sub-components

### API routes (URL = path)
```
src/app/api/
  ceo/, cro/, cfo/, cio/, cmo/, cno/, coo/, cpo/   8 AI agents
                                                   (all use
                                                    createAgentRouteHandler)
  stripe/checkout, stripe/portal, stripe/webhook
  cron/                                            15 Vercel-scheduled jobs +
                                                   2 off-platform handlers.
                                                   All wrapped withCronHealth.
                                                   owner-watchdog runs every 30m
                                                   from GitHub Actions (Hobby
                                                   plan caps Vercel cron at
                                                   daily). outreach-sender
                                                   enforces a 3-layer blast
                                                   brake (pending freeze, per-
                                                   tick ceiling, per-user daily
                                                   cap). rolling-invites drains
                                                   the waitlist daily under
                                                   gateConfig.beta.rolling*.
                                                   canary-heartbeat is the
                                                   public unauth probe hit by
                                                   GitHub Actions every 15m.
  auth/callback, auth/signout
  account/delete, account/export                   GDPR (export queues +
                                                   the export/status route
                                                   that the Trust Console
                                                   polls for delivery)
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
  trust-console/  Trust Console primitives (TrustHeader,
                  ConsentTimeline, AuditFeed, RevokeButton)
                  — composed by /settings/privacy
  transitions/ shared route/elevator transitions
  ui/          generic UI primitives
  icons/       SVG icon components
  lobby/       lobby-specific (Otis, building directory)
  visual-assets/ reusable approved-art renderers
```

---

## src/lib/  — shared utilities, helpers, infra

### AI / Agents (the brains)
```
src/lib/agents/
  ceo/, cro/, cfo/, cio/, cmo/, cno/, coo/, cpo/   per-agent prompts + tools
  concierge/                                       Otis (lobby concierge)
  offer-evaluator/                                 system prompt for the
                                                   Parlor offer-eval agent
  shared/                                          cross-agent helpers

src/lib/ai/agents/
  shared-route-handler.ts                          createAgentRouteHandler —
                                                   shared API route factory
                                                   (auth + rate limit + quota +
                                                    cached system prompt +
                                                    streaming + memory write).
                                                   Used by every
                                                   src/app/api/<agent>/route.ts
  ceo-orchestrator.ts                              CEO dispatch graph

src/lib/ai/
  model.ts                                         provider selection
  prompt-cache.ts                                  Anthropic cache helpers
  telemetry.ts                                     recordAgentRun
  structured/                                      structured-output schemas
  quota.ts                                         consumeAiQuota gate
                                                   (used in
                                                    createAgentRouteHandler
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
src/db/migrations/                                 0000–0037.sql
src/db/manual/                                     hand-written SQL
src/db/manual/auth-email-templates/                4 HTML templates already
                                                   pasted into Supabase dashboard
```

### Cross-cutting
```
src/lib/cron/health.ts                             withCronHealth wrapper
                                                   (used in all 14 cron routes)
src/lib/ai/spend-brake.ts                          global daily Anthropic-bill
                                                   kill-switch (fails CLOSED)
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
src/lib/visual-assets/                             typed manifest, character
                                                   metadata, CharacterArtRun
                                                   contract, production asset
                                                   validation, sprite processing
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
src/lib/config/                   ★ THREE CADENCE KNOBS — split by review
                                    cadence so the right human edits the right
                                    file. Pages, sitemap, legal copy, and
                                    quotas read directly from these.
  legal-config.ts                   yearly, counsel-gated — entity, governing
                                    law, refund, retention, sub-processors,
                                    eligibility, support email, revised-on
  pricing-config.ts                 monthly, revenue — Free/Pro/Team tiers
                                    and prices, caps, costCaps, annual %,
                                    flags.pricingPublic
  gate-config.ts                    weekly, founder — brand name/tagline/
                                    domain/url(), sender email, beta mode,
                                    blocked countries, waitlist + plausible
                                    flags
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
scripts/dev-preview.ts            `npm run dev:preview` — dev preview
                                  harness (auth-stub, ports)
scripts/art-pipeline.ts           `npm run art:operate`, `npm run art:status`,
                                  plus character asset factory commands:
                                  plan, clean, ingest, split, master, derive, qa,
                                  review, promote
scripts/validate-sentry-alerts.ts CLI validator for sentry/alerts.yaml
                                  (same logic as the vitest regression in
                                  src/lib/observability/sentry-alerts.test.ts)
```

---

## docs/

```
docs/VISION-SPEC.md          spatial UI metaphor (sacred — read first)
docs/CHAIN-OF-COMMAND.md     AI agent hierarchy spec (66KB — long, skim)
docs/CHARACTER-PROMPTS.md    8 agent system prompts (voice/personality)
docs/CHARACTER-BIBLE.md      Season 1 cast canon and visual DNA
docs/ART-BIBLE.md            Tower art style, prompt rules, quality ladder
docs/CHARACTER-ART-PIPELINE.md   approval gates and batch character factory
docs/CHARACTER-IMAGE-OPERATIONS.md  start-here runbook for future image work
docs/CHARACTER-IMAGE-SESSION-PROMPT.md  copy-paste prompt for fresh sessions
docs/CREATIVE-PRODUCTION-ENGINE.md  Creative Production Engine architecture,
                             Housekeeping Gate, Continuous Improvement Gate
docs/LAUNCH-READY.md         locked business decisions + remaining ops
                             checklist (§0 has the table of decisions)
docs/RUNBOOK.md              on-call runbook — one paragraph per Sentry
                             alert (mirrors sentry/alerts.yaml ids)
docs/TESTING.md              vitest + Playwright patterns (read before
                             adding a new test suite)
docs/RUNBOOK.md              operations playbook (synthetic canary,
                             triage steps, alert paths)
```

---

## .artlab/  — Character image workshop

```
.artlab/characters/<characterId>/     references, masters, QA, staged-public,
                                      ARTIFACTS.md inventory
.artlab/runs/<characterId>/<runId>/   run.json, prompts, incoming sources,
                                      split sprites, review boards, browser QA
```

Run `npm run art:operate` before continuing image work; use `npm run art:status`
for read-only inspection. Current live Otis run:
`.artlab/runs/otis/2026-05-14-otis-pilot/run.json`.
Active Otis replacement run:
`.artlab/runs/otis/2026-05-14-otis-native-v2/run.json`.

For broader visual work, use the Creative Production Engine. When Armaan says
"Creative Production Engine" or asks to add/generate Tower visuals, run
`npm run art:studio` and follow `.agents/skills/creative-production-engine/SKILL.md`.
Every phase must run the Housekeeping Gate and the Continuous Improvement Gate.

---

## sentry/

```
sentry/alerts.yaml           versioned Sentry alert rules (3 today —
                             agent_stream_failures, outreach_sender_
                             send_failures, ai_quota_rpc_errors). Validated
                             by src/lib/observability/sentry-alerts.test.ts
                             and scripts/validate-sentry-alerts.ts. Upload
                             procedure: docs/RUNBOOK.md#applying-alerts-to-
                             sentry.
```

---

## tests/

```
tests/e2e/                   Playwright E2E (security/abuse/concurrency/
                             scale/failure scenarios)
tests/                       (root) shared test helpers
src/**/*.test.ts             unit + integration (vitest, ~2285 tests across
                             297 spec files)
src/app/__tests__/*.proof.test.ts   proof tests for invariants
```

E2E requires a stub Supabase server on `:3001` (auto-started by Playwright globalSetup).

---

## "Where do I look to do X?"

| Task | File |
|---|---|
| Change pricing tier names / amounts | `src/lib/config/pricing-config.ts` (display) + `src/lib/stripe/config.ts` (Stripe IDs) |
| Change refund / retention / age policy | `src/lib/config/legal-config.ts` |
| Change brand name / canonical URL / beta mode | `src/lib/config/gate-config.ts` |
| Edit privacy / terms copy | `src/lib/legal/{privacy,terms}.ts` (rendered into routes automatically) |
| Add a new public marketing page | `src/app/(marketing)/<route>/page.tsx` + add to `src/proxy.ts` `publicPaths` + add to `src/app/sitemap.ts` |
| Add a new floor / authenticated route | `src/app/(authenticated)/<floor>/page.tsx` + `src/components/floor-N/<Floor>Client.tsx` + add to `FLOORS` in `src/types/ui.ts` |
| Change an AI agent's voice | `src/lib/agents/<agent>/system-prompt.ts` |
| Change an AI agent's tools | `src/lib/agents/<agent>/tools.ts` |
| Change AI quota cap | `src/lib/config/pricing-config.ts` (`costCaps.{free,paid}AiCallsPerDay`) |
| Add a new cron job | `src/app/api/cron/<name>/route.ts` (wrap with `withCronHealth`) + add schedule to `vercel.json` |
| Database table changes | `src/db/schema.ts` → `npx drizzle-kit generate` → apply via Supabase MCP or dashboard |
| Database queries at runtime | `src/lib/db/queries/<table>-rest.ts` (Supabase REST — never the Drizzle `db` object) |
| Snake_case row types for Supabase REST | `import { Row } from "@/db/database.types"` then `Row<"applications">` etc. (Fix #5 derives them from Drizzle so they cannot drift) |
| Onboarding flow edits | `src/app/lobby/onboarding/ConciergeFlow.tsx` + `src/app/lobby/lobby-client.tsx` |
| Lobby UI / sign-in | `src/app/lobby/lobby-client.tsx` |
| Settings UI | `src/app/(authenticated)/settings/settings-client.tsx` (1985 LOC, big file) |
| Owner-only feature gates | `import { isOwner } from "@/lib/auth/owner"` |
| Get current user (server) | `import { getUser } from "@/lib/supabase/server"` |
| Get current tier | `import { getUserTier } from "@/lib/stripe/entitlements"` |
| Re-seed owner test data | `bash scripts/seed-owner-data.ts` (after `vercel env pull --yes .env.local`) |
| Cron health table | `cron_runs` (owner-only RLS) |
| Synthetic canary (off-platform) | `.github/workflows/canary.yml` + `tests/canary/production.spec.ts` (heartbeat at `/api/cron/canary-heartbeat`; runbook: `docs/RUNBOOK.md`) |
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
- All AI agent routes go through `createAgentRouteHandler` (which calls `consumeAiQuota`).
- All GSAP imports go through `@/lib/gsap-init` (tree-shake contract).
- Aria attributes on all interactive elements; `prefers-reduced-motion` respected.
- No `console.log` in shipped code; use `log.info/warn/error` from `@/lib/logger`.
- No TODO/FIXME comments in shipped code.
- Business decisions are split across three cadence knobs: `src/lib/config/{legal,pricing,gate}-config.ts`. Each is gated by the right human + CI guard.
