# BOOTSTRAP PROMPT — The Tower

> **Auto-generated** by `scripts/generate-bootstrap.ts` on Friday, April 17, 2026 at 12:42 PM EDT
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
- **Branch:** `main` (commit `2a916d4`)
- **Production:** `internship-command-center-lake.vercel.app`
- **Total LOC:** 51,498 across 229 source files
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

## Changes Since Last Bootstrap

```
2a916d4 fix: Stripe webhook retries, JSON API auth, and weather cache
dc5c182 docs: add post-hardening manual-steps guide
1e5b30f harden: kill Drizzle runtime, collapse C-suite duplication, lock down auth/webhooks/crons
2fdef50 fix: harden auth, cron, and entitlement flows
3350008 Merge branch 'docs-handoff' into main
a25bd68 feat: Supabase pipeline stats, CRO hardening, lint fixes, CI tests
c505d46 fix: drizzle config auto-loads .env.local via @next/env
88fada7 chore: add Phase 1 setup scripts (env + migration SQL)
4efb3cc feat(phase-1): The War Room — full floor implementation
12958b1 session 16: pre-phase-1 optimization — removed 5 unused deps (-31MB), deleted 29MB orphaned assets, decomposed 3 monoliths into 12 focused modules, extracted shared constants, added CSS tokens, optimized next.config, compressed lobby images 77%
36e8f56 fix: session-end push handles missing credentials gracefully — deferred instead of FAIL
624c495 session-end: session 15: auto-organize-docs — full doc automation on every commit (archive stale, regenerate components, update doc map, append session logs)
7d95863 session 15: auto-organize-docs — full doc automation on every commit (archive stale, regenerate components, update doc map, append session logs)
34dbbb0 session 14: doc restructuring — 4-tier architecture, archived 7 stale docs, freshness warnings in bootstrap, rewrote CLAUDE.md/MASTER-PLAN.md/PROJECT-CONTEXT.md
6dd5c70 session-end: session 13: Elevator + lobby background hotfix round — cross-route transitions, 4K Ken Burns backgrounds, elevator button wiring
5dd569b session-end: 8 files changed, 299 insertions(+), 197 deletions(-)
e89f24e fix: elevator button wiring + 4K lobby backgrounds with Ken Burns
371bd44 Hotfix: Elevator cross-route transition + AI lobby backgrounds
2a0f64b fix: rip out next-themes, fix elevator on lobby, fix floor nav greying, remove SVG cursors
9fcb51e fix: exclude cursors/ from auth middleware
b9c37e1 fix(sprint-3.5): BUG-015,016,017,018,019 — user-reported critical fixes
e8bea9f session-end: 2 files changed, 40 insertions(+), 22 deletions(-)
7d39269 Sprint 3: Visual identity & polish — BUG-010, BUG-013, BUG-014
bdb6548 docs: update BUG-TRACKER with Sprint 2 commit hash
742ea47 fix(sprint-2): BUG-001,002,005,011,012 — navigation, sign out, settings, user menu
44a2a6c docs: remove stale CustomCursor references (audit pass 2)
23521c4 chore: delete dead CustomCursor.tsx (audit pass 1)
7cad1e9 docs: update BUG-TRACKER with commit hashes for Sprint 1 fixes
6a2336d fix(sprint-1): BUG-003,004,006,007,008,009 — performance, scroll, cursor, parallax
de3978e session-end: 3 files changed, 33 insertions(+), 25 deletions(-)
2802795 session-end: 2 files changed, 116 insertions(+), 56 deletions(-)
1ce45d0 docs: upgrade BUG-TRACKER.md to living changelog system
22b7485 docs: add BUG-TRACKER.md — 14 issues from 5-min user walkthrough
3a695b1 docs: add CHAIN-OF-COMMAND.md — AI hierarchy spec (1,550+ lines)
23d974f docs: Phase 1 War Room Blueprint — 1,445-line implementation guide + audit
10bb5a4 session-end: session 11: Phase 0 quality uplift complete — lobby particles, penthouse animated counters, skyline water reflections, animated floor stubs, elevator mobile bar, CSS utilities
dd71ec4 session-end: session 11: Phase 0 quality uplift — lobby particles, penthouse counters, skyline water reflections, animated floor stubs, elevator mobile bar
263dc0b feat: Phase 0 quality uplift — animated lobby particles, richer penthouse dashboard, enhanced skyline with water reflections, animated floor stubs, elevator mobile bar + tooltips, CSS utilities
7cb4985 session-end: session 10: Phase 0 complete visual overhaul — audit clean, PROJECT-CONTEXT updated
1c48685 docs: update PROJECT-CONTEXT.md for session 10 — Phase 0 visual overhaul complete
b61d6d0 feat: Phase 0 complete visual overhaul — lobby, penthouse, skyline, elevator, floor stubs
166f919 session-end: tooling session — 16-step autonomous pipeline complete
b7b89c2 audit: expand false-positive list for unused dep detection
190da57 session-end: ultimate 16-step pipeline (verify, detect, generate, commit, validate, handoff)
57efff1 audit: clean up session-end (remove unused imports/vars, update bootstrap session docs)
69523a5 session-end: autonomous pipeline with auto-detect + handoff gen
8c510ee session-end: update session state with immersive UI completion
0f8835d session-end: 1 file changed, 11 insertions(+), 5 deletions(-)
2fd4a3b bootstrap: regenerate with latest commit hash
3e15030 wave3: star constellations, building light sweep, sign-in card 3D tilt
2ee6d5e wave2: lightning flashes, cloud wisps, typewriter tagline, a11y improvements
a9a9524 audit: stagger directory rows, fix lobby layout, enhance penthouse vignette
c73611e overhaul: particles, tilt panels, animated counters, mouse spotlight, scan line, parallax UI, radar pulse, hover glow
7cabc1a skyline: shooting stars + breathing city bloom
a9b7fba fix: reduce mullion visibility, tighten lobby spacing
94773f2 lobby: interactive directory hover effects with gold glow
af0206b skyline: fix center gap with even slot-based distribution
3be2c20 skyline: denser building distribution, center clustering, more supertalls
fdc949d v2: enhanced procedural skyline, remove dead photo-based system, water reflections, varied buildings
4f2414c lobby: compact single-viewport layout, all content above fold
a8e10e3 fix: lobby scrolling, card contrast, fixed skyline background
662a694 Phase 0: immersive UI overhaul — procedural skyline, rebuilt lobby & penthouse
48922b1 session-end: session 9: automation hardening + user flagged immersive UI for overhaul
88ae2fa session-end: fix: bootstrap now mandates CLAUDE.md reading — agents can't skip mandatory rules
b2d68d0 session-end: infra: context window management — 40/60/70% thresholds with mandatory handoff
3ba2932 session-end: infra: automation hardening — agent auto-manages session state, human runs zero commands
101a8f1 infra: bootstrap system overhaul — 10 improvements to session handoff
89ef7fc bootstrap: regenerate with latest commit hash
2cc2a34 infra: auto-generated bootstrap, updated CLAUDE.md, removed dead files
9a5153d audit: fix RAF cascade in useMouseParallax, clean up double dynamic import
f424ffd feat: wire real Supabase data into Penthouse dashboard
e1d4548 feat: elevator dark wash, glass penthouse panels, cinematic entrance
0711b3d feat: immersive photorealistic NYC skyline (replaces SVG)
9f9eb23 Merge branch 'docs-handoff'
be84d82 docs: immersive UI research + implementation plan + bootstrap prompt
ecb5af7 Merge pull request #1 from armaansarora/docs-handoff
6b56140 audit: add post-push.sql trigger, rewrite BOOTSTRAP-PROMPT for Phase 1, update MANUAL-GUIDE
ce72f38 docs: final PROJECT-CONTEXT update + MANUAL-GUIDE for Armaan
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
| Repo | `armaansarora/internship-command-center` on `main` (commit `2a916d4`) |
| Supabase | Project `jzrsrruugcajohvvmevg`, URL `https://jzrsrruugcajohvvmevg.supabase.co` |
| Vercel | Project `prj_C6B6ZEsG5khpsISEzvgaMQzo9r5g` |
| Production | `internship-command-center-lake.vercel.app` |
| Design tokens | Gold `#C9A84C`, Dark `#1A1A2E`, Glass blur 16px, Playfair Display/Satoshi/JetBrains Mono |

## Env Vars (names only — values in .env.local)

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_DB_URL
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- ANTHROPIC_API_KEY
- OAUTH_STATE_SECRET
- ENCRYPTION_KEY
- GMAIL_REDIRECT_URI

## Source Tree (229 files, 51,498 LOC)

| Directory | LOC |
|---|---|
| `src/lib/db/queries` | 3826 |
| `src/components/world` | 2824 |
| `src/styles` | 2493 |
| `src/components/floor-3/crud` | 1790 |
| `src/lib` | 1469 |
| `src/components/floor-6/cio-character` | 1455 |
| `src/components/floor-3/cpo-character` | 1380 |
| `src/components/floor-5/cmo-character` | 1376 |
| `src/components/floor-4/coo-character` | 1339 |
| `src/components/floor-7/war-table` | 1276 |
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
| `src/lib/gmail` | 712 |
| `src/lib/agents/cio` | 711 |
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
| `src/db` | 444 |
| `src/components/floor-6/contact-grid` | 392 |
| `src/lib/auth` | 386 |
| `src/lib/progression` | 349 |
| `src/lib/stripe` | 329 |
| `src/components/pricing` | 306 |
| `src/hooks` | 298 |
| `src/app/api/stripe/webhook` | 293 |
| `src/lib/utils` | 284 |
| `src/app/api/cron/briefing` | 269 |
| `src/app/(authenticated)/briefing-room` | 267 |
| `src/app/api/cron/sync` | 213 |
| `src/lib/actions` | 207 |
| `src/lib/calendar` | 203 |
| `src/app/(authenticated)/writing-room` | 171 |
| `src/app/(authenticated)/rolodex-lounge` | 152 |
| `src/components/icons` | 152 |
| `src/lib/supabase` | 151 |
| `src/lib/validators` | 148 |
| `src/lib/agents` | 136 |
| `src/components/transitions` | 132 |
| `src/app/(authenticated)/war-room` | 116 |
| `src/app/api/gmail/callback` | 108 |
| `src/app/(authenticated)` | 106 |
| `src/app/api/weather` | 99 |
| `src/app/(authenticated)/situation-room` | 94 |
| `src/types` | 74 |
| `src/app/api/notifications` | 59 |
| `src/app/api/drive/export` | 53 |
| `src/app/api/stripe/checkout` | 51 |
| `src/app/api/ceo` | 50 |
| `src/app/api/cfo` | 44 |
| `src/app/api/progression` | 35 |
| `src/app/api/gmail/auth` | 34 |
| `src/app/api/notifications/[id]/read` | 32 |
| `src/lib/constants` | 31 |
| `src/app/api/auth/callback` | 27 |
| `src/app/api/stripe/portal` | 27 |
| `src/app/api/cmo` | 23 |
| `src/app/api/cpo` | 23 |
| `src/app/(authenticated)/c-suite` | 20 |
| `src/app/(authenticated)/observatory` | 20 |
| `src` | 20 |
| `src/app/api/cio` | 19 |
| `src/app/api/cno` | 19 |
| `src/app/api/coo` | 19 |
| `src/app/api/cro` | 19 |
| `src/app/api/gmail/sync` | 19 |
| `src/app/api/calendar/sync` | 17 |
| `src/lib/db` | 16 |
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
| `BOOTSTRAP-PROMPT.md` | 553 | 5,822 |
| `PROJECT-CONTEXT.md` | 271 | 4,959 |
| `docs/MASTER-PLAN.md` | 361 | 7,068 |
| `CLAUDE.md` | 307 | 6,292 |
| **Total** | **1492** | **24,141** |

> ⚠️ Reading all recommended files consumes ~24,141 tokens. Prioritize: this file → CLAUDE.md (mandatory) → PROJECT-CONTEXT.md → MASTER-PLAN.md.


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
