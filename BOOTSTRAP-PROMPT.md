# BOOTSTRAP PROMPT — The Tower

> **Auto-generated** by `scripts/generate-bootstrap.ts` on Friday, April 17, 2026 at 12:00 PM EDT
> Run `npm run bootstrap` to regenerate. Auto-runs on every commit (Husky pre-commit hook).
> **DO NOT manually edit** — changes will be overwritten.

---

## Quick Start

1. Clone: `armaansarora/internship-command-center` (branch: `cursor/3f614c35`)
2. Read this file top to bottom
3. **Read `CLAUDE.md` — contains mandatory agent behavior rules (session state, context management, handoff). NON-NEGOTIABLE.**
4. Read `PROJECT-CONTEXT.md` for full operational context
5. Load skills: `website-building/webapp`, `design-foundations`, `recursive-audit`, `research-assistant`
6. Read `docs/MASTER-PLAN.md` for the next phase's acceptance criteria
7. Begin work on the TODO items below

## Status

- **Current state:** Phase 0 IN PROGRESS
- **Branch:** `cursor/3f614c35` (commit `dc5c182`)
- **Production:** `internship-command-center-lake.vercel.app`
- **Total LOC:** 52,265 across 238 source files
- **Build:** Clean (zero TS errors)

### ⚠️ Stale Docs Detected
- **`docs/MASTER-PLAN.md`**: Last updated 2026-03-20 (29d ago)
- **`docs/VISION-SPEC.md`**: Last updated 2026-03-18 (31d ago)
- **`docs/TECH-BRIEF.md`**: Last updated 2026-03-18 (31d ago)

> Update these docs before starting work — stale specs cause wasted effort.


## Session State (where we left off)

- **Current task:** Final handoff preparation — Claude Code transition
- **Deliverable:** all-phases-complete
- **Status:** complete
- **Last file touched:** `HANDOFF.md`
- **Notes:** Session 22: Final Perplexity Computer session. Full audit completed (0 TS errors, clean build, 0 console.logs, 0 any types, 0 TODOs, 9 known orphans documented). Rewrote CLAUDE.md with comprehensive architecture, vision, gotchas, and orphan inventory. Rewrote PROJECT-CONTEXT.md with accurate state (all 7 phases complete, 226 files, 51,928 LOC). Updated MASTER-PLAN.md phase status and acceptance criteria. Updated BUG-TRACKER.md. Created comprehensive HANDOFF.md for Claude Code onboarding. All docs are accurate, descriptive, and ready for seamless Claude Code handoff.
- **State captured:** 2026-03-20T21:57:00.000Z

## Acceptance Criteria — Progress

**Progress: 0 verified / 1 likely / 2 unverified** (of 3)

🟡 Contracts CRUD works through the UI (contracts ported to src/lib/contracts/ — used internally by agent tools, no standalone UI CRUD page)
    └─ Contracts directory exists (no UI CRUD yet)
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
| Repo | `armaansarora/internship-command-center` on `cursor/3f614c35` (commit `dc5c182`) |
| Supabase | Project `jzrsrruugcajohvvmevg`, URL `https://jzrsrruugcajohvvmevg.supabase.co` |
| Vercel | Project `prj_C6B6ZEsG5khpsISEzvgaMQzo9r5g` |
| Production | `internship-command-center-lake.vercel.app` |
| Design tokens | Gold `#C9A84C`, Dark `#1A1A2E`, Glass blur 16px, Playfair Display/Satoshi/JetBrains Mono |

## Env Vars (names only — values in .env.local)

(no .env.local found)

## Source Tree (238 files, 52,265 LOC)

| Directory | LOC |
|---|---|
| `src/lib/db/queries` | 3693 |
| `src/components/world` | 2813 |
| `src/styles` | 2493 |
| `src/components/floor-3/crud` | 1790 |
| `src/lib` | 1469 |
| `src/components/floor-6/cio-character` | 1455 |
| `src/components/floor-3/cpo-character` | 1380 |
| `src/components/floor-5/cmo-character` | 1376 |
| `src/components/floor-4/coo-character` | 1339 |
| `src/components/floor-7/war-table` | 1278 |
| `src/components/floor-4` | 1175 |
| `src/components/floor-6/cno-character` | 1081 |
| `src/components/world/elevator` | 1056 |
| `src/components/floor-7/crud` | 1055 |
| `src/components/floor-7/cro-character` | 1033 |
| `src/components/floor-3` | 1015 |
| `src/app` | 981 |
| `src/lib/agents/cpo` | 975 |
| `src/app/lobby` | 955 |
| `src/components/floor-5/crud` | 949 |
| `src/lib/agents/cfo` | 925 |
| `src/components/floor-5` | 911 |
| `src/components/floor-6/crud` | 889 |
| `src/components/floor-6` | 886 |
| `src/components/floor-1` | 807 |
| `src/components/floor-7` | 792 |
| `src/lib/agents/cmo` | 766 |
| `src/components/floor-2/analytics` | 764 |
| `src/components/penthouse` | 758 |
| `src/components/floor-2/cfo-character` | 718 |
| `src/lib/agents/cio` | 711 |
| `src/lib/gmail` | 706 |
| `src/lib/contracts` | 696 |
| `src/components/floor-1/ceo-character` | 692 |
| `src/app/(authenticated)/penthouse` | 682 |
| `src/lib/agents/ceo` | 646 |
| `src/lib/sound` | 641 |
| `src/app/(authenticated)/settings` | 610 |
| `src/components/floor-2` | 560 |
| `src/lib/agents/cno` | 555 |
| `src/components/ui` | 488 |
| `src/lib/agents/cro` | 459 |
| `src/lib/agents/coo` | 456 |
| `src/db` | 440 |
| `src/components/floor-6/contact-grid` | 392 |
| `src/lib/auth` | 386 |
| `src/lib/stripe` | 329 |
| `src/lib/contracts/departments` | 328 |
| `src/components/pricing` | 306 |
| `src/lib/progression` | 304 |
| `src/hooks` | 298 |
| `src/app/api/stripe/webhook` | 293 |
| `src/lib/utils` | 284 |
| `src/app/(authenticated)/briefing-room` | 264 |
| `src/app/api/cron/briefing` | 255 |
| `src/lib/actions` | 207 |
| `src/lib/calendar` | 203 |
| `src/app/api/cron/sync` | 199 |
| `src/app/(authenticated)/writing-room` | 170 |
| `src/components/icons` | 152 |
| `src/lib/supabase` | 151 |
| `src/app/(authenticated)/rolodex-lounge` | 150 |
| `src/lib/validators` | 148 |
| `src/lib/agents` | 136 |
| `src/components/transitions` | 132 |
| `src/app/(authenticated)/war-room` | 116 |
| `src/app/api/gmail/callback` | 108 |
| `src/app/(authenticated)` | 104 |
| `src/app/api/weather` | 99 |
| `src/app/(authenticated)/situation-room` | 92 |
| `src/types` | 74 |
| `src/app/api/notifications` | 59 |
| `src/app/api/ceo` | 50 |
| `src/app/api/drive/export` | 50 |
| `src/app/api/stripe/checkout` | 46 |
| `src/app/api/cfo` | 44 |
| `src/app/api/progression` | 35 |
| `src/app/api/notifications/[id]/read` | 32 |
| `src/app/api/gmail/auth` | 31 |
| `src/lib/constants` | 31 |
| `src/app/api/auth/callback` | 27 |
| `src/app/api/cmo` | 23 |
| `src/app/api/cpo` | 23 |
| `src/app/api/stripe/portal` | 22 |
| `src/app/(authenticated)/c-suite` | 20 |
| `src/app/(authenticated)/observatory` | 20 |
| `src` | 20 |
| `src/app/api/cio` | 19 |
| `src/app/api/cno` | 19 |
| `src/app/api/coo` | 19 |
| `src/app/api/cro` | 19 |
| `src/app/api/gmail/sync` | 16 |
| `src/lib/db` | 16 |
| `src/app/api/calendar/sync` | 14 |
| `src/app/api/auth/signout` | 11 |

<details>
<summary>Full file list</summary>

```
src/app/(authenticated)/briefing-room/page.tsx
src/app/(authenticated)/c-suite/page.tsx
src/app/(authenticated)/layout.tsx
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
src/app/api/cron/briefing/route.ts
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
src/app/globals.css
src/app/layout.tsx
src/app/lobby/lobby-client.tsx
src/app/lobby/page.tsx
src/app/page.tsx
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
src/components/world/NotificationSystem.tsx
src/components/world/NotificationToast.tsx
src/components/world/ProceduralSkyline.tsx
src/components/world/SoundProvider.tsx
src/components/world/WeatherEffects.tsx
src/components/world/elevator/ElevatorButton.tsx
src/components/world/elevator/ElevatorDoors.tsx
src/components/world/elevator/ElevatorPanel.tsx
src/db/schema.ts
src/hooks/useAgentChat.ts
src/hooks/useReducedMotion.ts
src/hooks/useWeather.ts
src/lib/actions/applications.ts
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
src/lib/agents/cro/character-machine.ts
src/lib/agents/cro/system-prompt.ts
src/lib/agents/cro/tools.ts
src/lib/auth/cron.test.ts
src/lib/auth/cron.ts
src/lib/auth/oauth-state.test.ts
src/lib/auth/oauth-state.ts
src/lib/auth/require-user.ts
src/lib/auth/safe-next-path.test.ts
src/lib/auth/safe-next-path.ts
src/lib/calendar/sync.ts
src/lib/constants/floors.ts
src/lib/contracts/agent-protocol.ts
src/lib/contracts/api.ts
src/lib/contracts/departments/cio.ts
src/lib/contracts/departments/coo.ts
src/lib/contracts/departments/cro.ts
src/lib/contracts/events.ts
src/lib/contracts/index.ts
src/lib/contracts/notifications.ts
src/lib/contracts/ui.ts
src/lib/day-night.ts
src/lib/db/postgrest-error.ts
src/lib/db/queries/agent-memory-rest.ts
src/lib/db/queries/applications-rest.ts
src/lib/db/queries/communications-rest.ts
src/lib/db/queries/companies-rest.ts
src/lib/db/queries/contacts-rest.ts
src/lib/db/queries/daily-snapshots-rest.ts
src/lib/db/queries/documents-rest.ts
src/lib/db/queries/embeddings-rest.ts
src/lib/db/queries/notifications-rest.ts
src/lib/db/queries/pipeline-stats-from-aggregates.ts
src/lib/db/queries/pipeline-stats.test.ts
src/lib/db/queries/prep-stats-rest.ts
src/lib/easter-eggs.ts
src/lib/env.test.ts
src/lib/env.ts
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
src/lib/stripe/webhook-duplicate.test.ts
src/lib/stripe/webhook-duplicate.ts
src/lib/supabase/admin.ts
src/lib/supabase/client.ts
src/lib/supabase/middleware.ts
src/lib/supabase/server.ts
src/lib/utils.ts
src/lib/utils/google-drive-export.ts
src/lib/utils/lex-order.ts
src/lib/validators/application.test.ts
src/lib/validators/application.ts
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
<summary>36 packages</summary>

```
@ai-sdk/anthropic: ^3.0.58
@ai-sdk/openai: ^3.0.41
@dnd-kit/accessibility: ^3.1.1
@dnd-kit/core: ^6.3.1
@dnd-kit/sortable: ^10.0.0
@sentry/nextjs: ^10.45.0
@supabase/ssr: ^0.9.0
@supabase/supabase-js: ^2.99.2
@tailwindcss/typography: ^0.5.19
@types/node: ^20
@types/react: ^19
@types/react-dom: ^19
@upstash/ratelimit: ^2.0.8
@upstash/redis: ^1.37.0
@xstate/react: ^6.1.0
ai: ^6.0.116
autoprefixer: ^10.4.27
clsx: ^2.1.1
drizzle-kit: ^0.31.10
drizzle-orm: ^0.45.2
eslint: ^9
eslint-config-next: ^16.2.4
gsap: ^3.14.2
happy-dom: ^20.8.4
husky: ^9.1.7
next: ^16.2.4
postcss: ^8.5.8
react: 19.2.4
react-dom: 19.2.4
stripe: ^20.4.1
tailwind-merge: ^3.5.0
tailwindcss: ^3.4.19
typescript: ^5
vitest: ^4.1.0
xstate: ^5.28.0
zod: ^4.3.6
```
</details>

### Stale Dependencies (major version behind)

- **@types/node**: 20.19.37 → 25.6.0 (major)
- **eslint**: 9.39.4 → 10.2.0 (major)
- **stripe**: 20.4.1 → 22.0.2 (major)
- **tailwindcss**: 3.4.19 → 4.2.2 (major)
- **typescript**: 5.9.3 → 6.0.3 (major)

## Context Budget

| File | Lines | ~Tokens |
|---|---|---|
| `BOOTSTRAP-PROMPT.md` | 555 | 5,825 |
| `PROJECT-CONTEXT.md` | 271 | 4,956 |
| `docs/MASTER-PLAN.md` | 361 | 7,045 |
| `CLAUDE.md` | 307 | 6,292 |
| **Total** | **1494** | **24,118** |

> ⚠️ Reading all recommended files consumes ~24,118 tokens. Prioritize: this file → CLAUDE.md (mandatory) → PROJECT-CONTEXT.md → MASTER-PLAN.md.


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
