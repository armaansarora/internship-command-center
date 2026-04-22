# BOOTSTRAP PROMPT — The Tower

> **Auto-generated** by `scripts/generate-bootstrap.ts` on Wednesday, April 22, 2026 at 4:39 PM EDT
> Run `npm run bootstrap` to regenerate. Auto-runs on every commit (Husky pre-commit hook).
> **DO NOT manually edit** — changes will be overwritten.

---

## Quick Start

1. Clone: `armaansarora/internship-command-center` (branch: `main`)
2. Read this file top to bottom
3. **Read `CLAUDE.md` — contains mandatory agent behavior rules (session state, context management, handoff). NON-NEGOTIABLE.**
4. Read `PROJECT-CONTEXT.md` for full operational context
5. Load skills: `website-building/webapp`, `design-foundations`, `recursive-audit`, `research-assistant`
6. Read `docs/MASTER-PLAN.md` for the next phase's acceptance criteria
7. Begin work on the TODO items below

## Status

- **Current state:** Phase 0 IN PROGRESS
- **Branch:** `main` (commit `180ae58`)
- **Production:** `internship-command-center-lake.vercel.app`
- **Total LOC:** 55,593 across 282 source files
- **Build:** Clean (zero TS errors)


## Changes Since Last Bootstrap

```
180ae58 [R0/0.6] feat: full user-data export — zip, signed URL, email delivery
```

## Acceptance Criteria — Progress

**Progress: 0 verified / 0 likely / 3 unverified** (of 3)

⬜ Contracts CRUD works through the UI (contracts ported to src/lib/contracts/ — used internally by agent tools, no standalone UI CRUD page)
    └─ No contracts
⬜ Lighthouse performance: >80 on all metrics (not yet tested in production)
    └─ Lighthouse audit not automated yet
⬜ Lighthouse performance: >90 on all metrics (not yet tested — production is live, needs audit)
    └─ Lighthouse audit not automated yet


## TODO — Next Phase

See docs/MASTER-PLAN.md for the next phase.

## User Instructions (CRITICAL — preserve verbatim)

- "Analytical, not emotional. Cut the fat, keep the meat."
- "Masters-degree-level code. Scalable multi-tenant SaaS."
- "Deep research always — never surface-level."
- "Auto-update PROJECT-CONTEXT.md after EVERY interaction."
- "System picks the best model per task."
- "Tell me exactly what I need to do manually that you can't do yourself."
- "Run multiple agents, use different sub-agents, use all the AI models available, optimize your workflow."
- Push protection ON — never commit secrets
- Fully typed TypeScript, no `any`
- Tailwind v3 (NOT v4) — JS config
- @supabase/ssr (NOT deprecated auth-helpers)
- Drizzle RLS uses third-argument array pattern, NOT `.withRLS()`

<connectors>
- stripe
- youtube_analytics_api__pipedream
- github_mcp_direct
- google_drive
- gcal
- google_sheets__pipedream
- resend__pipedream
- google_forms__pipedream
- google_cloud_vision_api__pipedream
- vercel
- supabase__pipedream
- cloud_convert__pipedream
- jira_mcp_merge
</connectors>

## Infrastructure

| Service | Detail |
|---|---|
| Repo | `armaansarora/internship-command-center` on `main` (commit `180ae58`) |
| Supabase | Project `jzrsrruugcajohvvmevg`, URL `https://jzrsrruugcajohvvmevg.supabase.co` |
| Vercel | Project `prj_C6B6ZEsG5khpsISEzvgaMQzo9r5g` |
| Production | `internship-command-center-lake.vercel.app` |
| Design tokens | Gold `#C9A84C`, Dark `#1A1A2E`, Glass blur 16px, Playfair Display/Satoshi/JetBrains Mono |

## Env Vars (names only — values in .env.local)

- AI_GATEWAY_API_KEY
- OWNER_USER_ID
- STRIPE_WEBHOOK_SECRET
- SUPABASE_SERVICE_ROLE_KEY

## Source Tree (282 files, 55,593 LOC)

| Directory | LOC |
|---|---|
| `src/lib/db/queries` | 4154 |
| `src/components/world` | 3142 |
| `src/styles` | 2493 |
| `src/components/floor-3/crud` | 1811 |
| `src/lib` | 1790 |
| `src/components/floor-7/war-table` | 1307 |
| `src/lib/gmail` | 1253 |
| `src/components/floor-4` | 1187 |
| `src/app` | 1177 |
| `src/components/floor-6/cio-character` | 1119 |
| `src/components/floor-7/crud` | 1095 |
| `src/components/world/elevator` | 1056 |
| `src/components/floor-5/cmo-character` | 1053 |
| `src/app/lobby` | 1038 |
| `src/components/floor-3` | 1032 |
| `src/components/floor-3/cpo-character` | 1021 |
| `src/components/floor-4/coo-character` | 989 |
| `src/components/floor-6` | 986 |
| `src/components/floor-1` | 958 |
| `src/components/floor-6/crud` | 950 |
| `src/components/floor-5/crud` | 949 |
| `src/components/floor-5` | 893 |
| `src/lib/agents/cfo` | 850 |
| `src/lib/agents/cpo` | 842 |
| `src/components/floor-7` | 809 |
| `src/components/floor-6/cno-character` | 781 |
| `src/components/floor-2/analytics` | 764 |
| `src/components/penthouse` | 758 |
| `src/app/(authenticated)/settings` | 757 |
| `src/components/floor-7/cro-character` | 733 |
| `src/lib/agents/cmo` | 715 |
| `src/app/(authenticated)/penthouse` | 713 |
| `src/components/agents/dialogue` | 709 |
| `src/lib/ai/agents` | 681 |
| `src/lib/sound` | 641 |
| `src/lib/agents/cio` | 615 |
| `src/lib/ai` | 599 |
| `src/components/floor-2` | 576 |
| `src/lib/stripe` | 545 |
| `src/db` | 541 |
| `src/lib/agents/ceo` | 521 |
| `src/components/floor-2/cfo-character` | 517 |
| `src/components/floor-1/ceo-character` | 511 |
| `src/components/ui` | 488 |
| `src/lib/agents/cno` | 471 |
| `src/lib/ai/structured` | 440 |
| `src/hooks` | 429 |
| `src/lib/auth` | 411 |
| `src/components/floor-6/contact-grid` | 392 |
| `src/lib/actions` | 383 |
| `src/lib/agents/cro` | 360 |
| `src/lib/agents/coo` | 357 |
| `src/lib/progression` | 349 |
| `src/app/api/stripe/webhook` | 339 |
| `src/components/pricing` | 306 |
| `src/app/(authenticated)/briefing-room` | 296 |
| `src/app/(authenticated)` | 285 |
| `src/lib/utils` | 284 |
| `src/app/api/cron/briefing` | 271 |
| `src/lib/agents` | 269 |
| `src/lib/account` | 259 |
| `src/app/api/account/export` | 222 |
| `src/app/api/cron/__integration__` | 216 |
| `src/app/api/cron/sync` | 213 |
| `src/lib/supabase` | 209 |
| `src/lib/calendar` | 203 |
| `src/app/(authenticated)/writing-room` | 201 |
| `src/lib/audit` | 185 |
| `src/app/(authenticated)/war-room` | 158 |
| `src/app/api/cron/export-worker` | 157 |
| `src/components/icons` | 152 |
| `src/lib/validators` | 148 |
| `src/app/(authenticated)/rolodex-lounge` | 132 |
| `src/components/transitions` | 132 |
| `src/app/api/gmail/callback` | 108 |
| `src/app/api/weather` | 99 |
| `src/app/(authenticated)/situation-room` | 85 |
| `src/app/api/ceo` | 75 |
| `src/types` | 74 |
| `src/app/api/notifications` | 67 |
| `src/lib/email` | 54 |
| `src/app/api/drive/export` | 53 |
| `src/app/api/cfo` | 52 |
| `src/app/api/stripe/checkout` | 51 |
| `src/lib/crypto` | 50 |
| `src/app/api/progression` | 44 |
| `src/app/api/notifications/[id]/read` | 40 |
| `src` | 36 |
| `src/app/api/gmail/auth` | 34 |
| `src/app/(authenticated)/c-suite` | 33 |
| `src/app/(authenticated)/observatory` | 33 |
| `src/lib/constants` | 31 |
| `src/app/api/auth/callback` | 30 |
| `src/app/api/stripe/portal` | 27 |
| `src/app/api/auth/signout` | 25 |
| `src/app/api/gmail/sync` | 19 |
| `src/app/api/calendar/sync` | 17 |
| `src/app/api/cmo` | 16 |
| `src/app/api/cpo` | 16 |
| `src/lib/db` | 16 |
| `src/app/api/cio` | 15 |
| `src/app/api/cno` | 15 |
| `src/app/api/coo` | 15 |
| `src/app/api/cro` | 15 |

<details>
<summary>Full file list</summary>

```
src/app/(authenticated)/briefing-room/page.tsx
src/app/(authenticated)/c-suite/page.tsx
src/app/(authenticated)/error.tsx
src/app/(authenticated)/layout.tsx
src/app/(authenticated)/not-found.tsx
src/app/(authenticated)/observatory/page.tsx
src/app/(authenticated)/penthouse/page.tsx
src/app/(authenticated)/penthouse/penthouse-client.tsx
src/app/(authenticated)/penthouse/penthouse-data.ts
src/app/(authenticated)/rolodex-lounge/page.tsx
src/app/(authenticated)/settings/page.tsx
src/app/(authenticated)/settings/settings-client.tsx
src/app/(authenticated)/situation-room/page.tsx
src/app/(authenticated)/war-room/page.tsx
src/app/(authenticated)/world-shell.tsx
src/app/(authenticated)/writing-room/page.tsx
src/app/api/account/export/route.test.ts
src/app/api/account/export/route.ts
src/app/api/auth/callback/route.ts
src/app/api/auth/signout/route.ts
src/app/api/calendar/sync/route.ts
src/app/api/ceo/route.ts
src/app/api/cfo/route.ts
src/app/api/cio/route.ts
src/app/api/cmo/route.ts
src/app/api/cno/route.ts
src/app/api/coo/route.ts
src/app/api/cpo/route.ts
src/app/api/cro/route.ts
src/app/api/cron/__integration__/cron-auth.test.ts
src/app/api/cron/briefing/route.ts
src/app/api/cron/export-worker/route.ts
src/app/api/cron/sync/route.ts
src/app/api/drive/export/route.ts
src/app/api/gmail/auth/route.ts
src/app/api/gmail/callback/route.ts
src/app/api/gmail/sync/route.ts
src/app/api/notifications/[id]/read/route.ts
src/app/api/notifications/route.ts
src/app/api/progression/route.ts
src/app/api/stripe/checkout/route.ts
src/app/api/stripe/portal/route.ts
src/app/api/stripe/webhook/route.ts
src/app/api/weather/route.ts
src/app/error.tsx
src/app/globals.css
src/app/layout.tsx
src/app/loading.tsx
src/app/lobby/actions.ts
src/app/lobby/lobby-client.tsx
src/app/lobby/page.tsx
src/app/not-found.tsx
src/app/page.tsx
src/components/agents/dialogue/AgentChatInput.tsx
src/components/agents/dialogue/AgentDialoguePanel.tsx
src/components/agents/dialogue/AgentMessageBubble.tsx
src/components/agents/dialogue/AgentMessageList.tsx
src/components/agents/dialogue/AgentQuickActions.tsx
src/components/agents/dialogue/AgentToolCallIndicator.tsx
src/components/agents/dialogue/types.ts
src/components/floor-1/CSuiteClient.tsx
src/components/floor-1/CSuiteScene.tsx
src/components/floor-1/CSuiteTicker.tsx
src/components/floor-1/RingTheBell.tsx
src/components/floor-1/ceo-character/CEOCharacter.tsx
src/components/floor-1/ceo-character/CEODialoguePanel.tsx
src/components/floor-1/ceo-character/CEOWhiteboard.tsx
src/components/floor-2/ObservatoryClient.tsx
src/components/floor-2/ObservatoryScene.tsx
src/components/floor-2/ObservatoryTicker.tsx
src/components/floor-2/analytics/ActivityHeatmap.tsx
src/components/floor-2/analytics/ConversionFunnel.tsx
src/components/floor-2/analytics/PipelineVelocity.tsx
src/components/floor-2/analytics/WeeklyTrend.tsx
src/components/floor-2/cfo-character/CFOCharacter.tsx
src/components/floor-2/cfo-character/CFODialoguePanel.tsx
src/components/floor-2/cfo-character/CFOWhiteboard.tsx
src/components/floor-3/BriefingRoomClient.tsx
src/components/floor-3/BriefingRoomScene.tsx
src/components/floor-3/BriefingRoomTicker.tsx
src/components/floor-3/cpo-character/CPOCharacter.tsx
src/components/floor-3/cpo-character/CPODialoguePanel.tsx
src/components/floor-3/cpo-character/CPOWhiteboard.tsx
src/components/floor-3/crud/InterviewTimeline.tsx
src/components/floor-3/crud/PrepPacketViewer.tsx
src/components/floor-4/SituationRoomClient.tsx
src/components/floor-4/SituationRoomScene.tsx
src/components/floor-4/SituationRoomTicker.tsx
src/components/floor-4/coo-character/COOCharacter.tsx
src/components/floor-4/coo-character/COODialoguePanel.tsx
src/components/floor-4/coo-character/COOWhiteboard.tsx
src/components/floor-5/WritingRoomClient.tsx
src/components/floor-5/WritingRoomScene.tsx
src/components/floor-5/WritingRoomTicker.tsx
src/components/floor-5/cmo-character/CMOCharacter.tsx
src/components/floor-5/cmo-character/CMODialoguePanel.tsx
src/components/floor-5/cmo-character/CMOWhiteboard.tsx
src/components/floor-5/crud/DocumentEditor.tsx
src/components/floor-5/crud/DocumentList.tsx
src/components/floor-6/RolodexLoungeClient.tsx
src/components/floor-6/RolodexLoungeScene.tsx
src/components/floor-6/RolodexLoungeTicker.tsx
src/components/floor-6/cio-character/CIOCharacter.tsx
src/components/floor-6/cio-character/CIODialoguePanel.tsx
src/components/floor-6/cio-character/CIOWhiteboard.tsx
src/components/floor-6/cno-character/CNOCharacter.tsx
src/components/floor-6/cno-character/CNODialoguePanel.tsx
src/components/floor-6/cno-character/CNOWhiteboard.tsx
src/components/floor-6/contact-grid/ContactCard.tsx
src/components/floor-6/contact-grid/ContactGrid.tsx
src/components/floor-6/crud/ContactModal.tsx
src/components/floor-6/crud/ContactSearch.tsx
src/components/floor-7/WarRoomClient.tsx
src/components/floor-7/WarRoomScene.tsx
src/components/floor-7/WarRoomTicker.tsx
src/components/floor-7/cro-character/CROCharacter.tsx
src/components/floor-7/cro-character/CRODialoguePanel.tsx
src/components/floor-7/cro-character/CROWhiteboard.tsx
src/components/floor-7/crud/ApplicationModal.tsx
src/components/floor-7/crud/ApplicationSearch.tsx
src/components/floor-7/war-table/ApplicationCard.tsx
src/components/floor-7/war-table/ColumnHeader.tsx
src/components/floor-7/war-table/PipelineColumn.tsx
src/components/floor-7/war-table/WarTable.tsx
src/components/floor-7/war-table/pipeline-config.ts
src/components/icons/PenthouseIcons.tsx
src/components/penthouse/ActivityFeed.tsx
src/components/penthouse/GlassPanel.tsx
src/components/penthouse/PipelineNodes.tsx
src/components/penthouse/QuickActionCard.tsx
src/components/penthouse/StatCard.tsx
src/components/pricing/PricingCards.tsx
src/components/transitions/EntranceSequence.tsx
src/components/ui/SoundToggle.tsx
src/components/ui/UserMenu.tsx
src/components/world/DayNightProvider.tsx
src/components/world/EasterEggs.tsx
src/components/world/Elevator.tsx
src/components/world/ErrorBoundary.tsx
src/components/world/FloorShell.tsx
src/components/world/FloorStub.tsx
src/components/world/LobbyBackground.tsx
src/components/world/MilestoneToast.tsx
src/components/world/MilestoneToastContainer.tsx
src/components/world/NotificationSystem.tsx
src/components/world/NotificationToast.tsx
src/components/world/PersistentWorld.tsx
src/components/world/ProceduralSkyline.tsx
src/components/world/SoundProvider.tsx
src/components/world/WeatherEffects.tsx
src/components/world/elevator/ElevatorButton.tsx
src/components/world/elevator/ElevatorDoors.tsx
src/components/world/elevator/ElevatorPanel.tsx
src/db/schema.ts
src/hooks/useAgentChat.ts
src/hooks/useProgressionMilestones.ts
src/hooks/useReducedMotion.ts
src/hooks/useWeather.ts
src/lib/account/export.test.ts
src/lib/account/export.ts
src/lib/actions/applications.ts
src/lib/actions/contacts.ts
src/lib/actions/documents.ts
src/lib/actions/interviews.ts
src/lib/actions/notifications.ts
src/lib/actions/outreach.ts
src/lib/agents/ceo/character-machine.ts
src/lib/agents/ceo/system-prompt.ts
src/lib/agents/ceo/tools.ts
src/lib/agents/cfo/character-machine.ts
src/lib/agents/cfo/system-prompt.ts
src/lib/agents/cfo/tools.ts
src/lib/agents/cio/character-machine.ts
src/lib/agents/cio/system-prompt.ts
src/lib/agents/cio/tools.ts
src/lib/agents/cmo/character-machine.ts
src/lib/agents/cmo/system-prompt.ts
src/lib/agents/cmo/tools.ts
src/lib/agents/cno/character-machine.ts
src/lib/agents/cno/system-prompt.ts
src/lib/agents/cno/tools.ts
src/lib/agents/coo/character-machine.ts
src/lib/agents/coo/system-prompt.ts
src/lib/agents/coo/tools.ts
src/lib/agents/cpo/character-machine.ts
src/lib/agents/cpo/system-prompt.ts
src/lib/agents/cpo/tools.ts
src/lib/agents/create-agent-route.ts
src/lib/agents/create-character-machine.ts
src/lib/agents/cro/character-machine.ts
src/lib/agents/cro/system-prompt.ts
src/lib/agents/cro/tools.ts
src/lib/ai/agents/ceo-orchestrator.ts
src/lib/ai/agents/shared-route-handler.ts
src/lib/ai/cost.ts
src/lib/ai/memory-extractor.ts
src/lib/ai/model.ts
src/lib/ai/prompt-cache.ts
src/lib/ai/structured/cover-letter.ts
src/lib/ai/structured/prep-packet.ts
src/lib/ai/telemetry.ts
src/lib/audit/log.test.ts
src/lib/audit/log.ts
src/lib/auth/cron.test.ts
src/lib/auth/cron.ts
src/lib/auth/oauth-state.test.ts
src/lib/auth/oauth-state.ts
src/lib/auth/owner.ts
src/lib/auth/require-user.ts
src/lib/auth/safe-next-path.test.ts
src/lib/auth/safe-next-path.ts
src/lib/calendar/sync.ts
src/lib/constants/floors.ts
src/lib/crypto/keys.test.ts
src/lib/crypto/keys.ts
src/lib/day-night.ts
src/lib/db/postgrest-error.ts
src/lib/db/queries/agent-memory-rest.ts
src/lib/db/queries/applications-rest.ts
src/lib/db/queries/communications-rest.ts
src/lib/db/queries/companies-rest.ts
src/lib/db/queries/contacts-mutations.ts
src/lib/db/queries/contacts-rest.ts
src/lib/db/queries/daily-snapshots-rest.ts
src/lib/db/queries/documents-mutations.ts
src/lib/db/queries/documents-rest.ts
src/lib/db/queries/embeddings-rest.ts
src/lib/db/queries/interviews-mutations.ts
src/lib/db/queries/notifications-mutations.ts
src/lib/db/queries/notifications-rest.ts
src/lib/db/queries/outreach-mutations.ts
src/lib/db/queries/pipeline-stats-from-aggregates.ts
src/lib/db/queries/pipeline-stats.test.ts
src/lib/db/queries/prep-stats-rest.ts
src/lib/easter-eggs.ts
src/lib/email/send-export.ts
src/lib/env.test.ts
src/lib/env.ts
src/lib/gmail/injection-filter.test.ts
src/lib/gmail/injection-filter.ts
src/lib/gmail/oauth.test.ts
src/lib/gmail/oauth.ts
src/lib/gmail/parser.ts
src/lib/gmail/sync.ts
src/lib/gsap-init.ts
src/lib/logger.test.ts
src/lib/logger.ts
src/lib/progression/engine.ts
src/lib/progression/milestones.ts
src/lib/rate-limit-middleware.test.ts
src/lib/rate-limit-middleware.ts
src/lib/rate-limit.ts
src/lib/skyline-engine.ts
src/lib/sound/engine.ts
src/lib/stripe/agent-access.ts
src/lib/stripe/config.ts
src/lib/stripe/entitlements.ts
src/lib/stripe/server.ts
src/lib/stripe/webhook-audit.test.ts
src/lib/stripe/webhook-audit.ts
src/lib/stripe/webhook-duplicate.test.ts
src/lib/stripe/webhook-duplicate.ts
src/lib/supabase/admin.ts
src/lib/supabase/client.ts
src/lib/supabase/middleware.ts
src/lib/supabase/server.ts
src/lib/utils/google-drive-export.ts
src/lib/utils/lex-order.ts
src/lib/validators/application.test.ts
src/lib/validators/application.ts
src/middleware.ts
src/proxy.ts
src/styles/floor-1.css
src/styles/floor-2.css
src/styles/floor-3.css
src/styles/floor-4.css
src/styles/floor-5.css
src/styles/floor-6.css
src/styles/floor-7.css
src/types/agents.ts
src/types/api.ts
src/types/ui.ts
```
</details>

## Dependencies

<details>
<summary>44 packages</summary>

```
@ai-sdk/anthropic: ^3.0.58
@ai-sdk/openai: ^3.0.41
@dnd-kit/accessibility: ^3.1.1
@dnd-kit/core: ^6.3.1
@dnd-kit/sortable: ^10.0.0
@playwright/test: ^1.59.1
@sentry/nextjs: ^10.45.0
@supabase/ssr: ^0.9.0
@supabase/supabase-js: ^2.99.2
@tailwindcss/typography: ^0.5.19
@types/fs-extra: ^11.0.4
@types/node: ^20
@types/react: ^19
@types/react-dom: ^19
@upstash/ratelimit: ^2.0.8
@upstash/redis: ^1.37.0
@xstate/react: ^6.1.0
ai: ^6.0.116
autoprefixer: ^10.4.27
clsx: ^2.1.1
commander: ^14.0.3
drizzle-kit: ^0.31.10
drizzle-orm: ^0.45.2
eslint: ^9
eslint-config-next: ^16.2.4
execa: ^8.0.1
fs-extra: ^11.3.4
gsap: ^3.14.2
happy-dom: ^20.8.4
husky: ^9.1.7
jszip: ^3.10.1
next: ^16.2.4
postcss: ^8.5.8
react: 19.2.4
react-dom: 19.2.4
resend: ^6.12.2
stripe: ^20.4.1
tailwind-merge: ^3.5.0
tailwindcss: ^3.4.19
typescript: ^5
vitest: ^4.1.0
xstate: ^5.28.0
yaml: ^2.8.3
zod: ^4.3.6
```
</details>

### Stale Dependencies (major version behind)

- **@types/node**: 20.19.37 → 25.6.0 (major)
- **eslint**: 9.39.4 → 10.2.1 (major)
- **execa**: 8.0.1 → 9.6.1 (major)
- **stripe**: 20.4.1 → 22.0.2 (major)
- **tailwindcss**: 3.4.19 → 4.2.4 (major)
- **typescript**: 5.9.3 → 6.0.3 (major)

## Context Budget

| File | Lines | ~Tokens |
|---|---|---|
| `BOOTSTRAP-PROMPT.md` | 608 | 6,122 |
| `PROJECT-CONTEXT.md` | 281 | 5,254 |
| `docs/MASTER-PLAN.md` | 367 | 7,172 |
| `CLAUDE.md` | 416 | 8,401 |
| **Total** | **1672** | **26,949** |

> ⚠️ Reading all recommended files consumes ~26,949 tokens. Prioritize: this file → CLAUDE.md (mandatory) → PROJECT-CONTEXT.md → MASTER-PLAN.md.


## Technical Notes (Gotchas)



## Key Docs

| File | Purpose |
|---|---|
| `PROJECT-CONTEXT.md` | Full operational context — credentials, stack, audit summary, session log |
| `CLAUDE.md` | Conventions, commands, agent behavior rules, doc architecture |
| `docs/MASTER-PLAN.md` | 7 phases with deliverables, acceptance criteria, testing |
| `docs/VISION-SPEC.md` | Spatial UI spec (locked) — building, floors, characters, design tokens |
| `docs/TECH-BRIEF.md` | Research findings, AI SDK v6 patterns, Drizzle gotchas |
| `docs/CHARACTER-PROMPTS.md` | System prompts for all 8 C-suite agents |
| `docs/SCHEMA-DRAFT.md` | 16-table Postgres schema with RLS |
| `docs/WAR-ROOM-BLUEPRINT.md` | Phase 1 implementation guide (architecture, CRO agent, DnD, design) |
| `docs/CHAIN-OF-COMMAND.md` | AI agent hierarchy (CEO → CRO → 5 subagents, tools, RACI) |
| `docs/BUG-TRACKER.md` | Bug reports, fix log, sprint priorities |
| `docs/archive/` | Completed plans + research (reference only, don't read by default) |

## Skills to Load

- `website-building/webapp` — fullstack web app patterns
- `design-foundations` — color, typography, visual hierarchy
- `recursive-audit` — 5-question self-audit loop (run after every task)
- `research-assistant` — web research patterns

## Workflow Rules

1. **Start:** Clone repo → read this file → read PROJECT-CONTEXT.md → load skills → read MASTER-PLAN.md for current phase
2. **During:** Commit after each major milestone. Run `npx tsc --noEmit` before committing.
3. **End:** Run `npm run session:end` (autonomous 10-step pipeline: type check → auto-detect state → bootstrap regen → stage → commit → push → verify sync → generate handoff prompt)
4. **Always:** No `any` types. No console.logs. No TODO comments in shipped code. Aria attributes on interactive elements. prefers-reduced-motion respected.

## Session State Management

`npm run session:end` handles this automatically — it auto-detects session state from git history and writes `SESSION-STATE.json`. No manual state management needed. The handoff prompt is printed to stdout and saved to `HANDOFF.md`.
