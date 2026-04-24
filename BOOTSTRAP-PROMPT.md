# BOOTSTRAP PROMPT — The Tower

> **Auto-generated** by `scripts/generate-bootstrap.ts` on Thursday, April 23, 2026 at 9:43 PM EDT
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
- **Branch:** `main` (commit `3de1321`)
- **Production:** `internship-command-center-lake.vercel.app`
- **Total LOC:** 104,819 across 592 source files
- **Build:** Clean (zero TS errors)

### ⚠️ Stale Docs Detected
- **`docs/MASTER-PLAN.md`**: Last updated 2026-04-17 (7d ago)
- **`docs/VISION-SPEC.md`**: Last updated 2026-04-17 (7d ago)
- **`docs/TECH-BRIEF.md`**: Last updated 2026-04-17 (7d ago)

> Update these docs before starting work — stale specs cause wasted effort.


## Changes Since Last Bootstrap

```
3de1321 chore(handoff): session sess-a5908e — R0
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
| Repo | `armaansarora/internship-command-center` on `main` (commit `3de1321`) |
| Supabase | Project `jzrsrruugcajohvvmevg`, URL `https://jzrsrruugcajohvvmevg.supabase.co` |
| Vercel | Project `prj_C6B6ZEsG5khpsISEzvgaMQzo9r5g` |
| Production | `internship-command-center-lake.vercel.app` |
| Design tokens | Gold `#C9A84C`, Dark `#1A1A2E`, Glass blur 16px, Playfair Display/Satoshi/JetBrains Mono |

## Env Vars (names only — values in .env.local)

- AI_GATEWAY_API_KEY
- OWNER_USER_ID
- STRIPE_WEBHOOK_SECRET
- SUPABASE_SERVICE_ROLE_KEY

## Source Tree (592 files, 104,819 LOC)

| Directory | LOC |
|---|---|
| `src/lib/db/queries` | 6657 |
| `src/lib/ai/agents` | 4255 |
| `src/components/world` | 3512 |
| `src/components/floor-1` | 2660 |
| `src/styles` | 2638 |
| `src/components/floor-7/war-table` | 1988 |
| `src/components/floor-2/orrery` | 1915 |
| `src/components/floor-3/crud` | 1811 |
| `src/lib` | 1790 |
| `src/app/__tests__` | 1783 |
| `src/hooks` | 1647 |
| `src/components/floor-3/drill` | 1581 |
| `src/lib/ai/structured` | 1425 |
| `src/app/(authenticated)/settings` | 1302 |
| `src/app/lobby` | 1294 |
| `src/lib/gmail` | 1253 |
| `src/components/floor-4` | 1251 |
| `src/app` | 1177 |
| `src/lib/situation` | 1164 |
| `src/components/floor-3` | 1141 |
| `src/components/floor-6/cio-character` | 1122 |
| `src/components/floor-7/crud` | 1111 |
| `src/lib/agents/cro` | 1083 |
| `src/lib/agents/cmo` | 1072 |
| `src/components/world/elevator` | 1056 |
| `src/components/floor-5/cmo-character` | 1053 |
| `src/components/floor-3/cpo-character` | 1021 |
| `src/components/floor-6/crud` | 999 |
| `src/db` | 999 |
| `src/lib/jobs` | 991 |
| `src/components/floor-4/coo-character` | 989 |
| `src/components/floor-6` | 988 |
| `src/lib/orrery` | 979 |
| `src/components/floor-5/crud` | 949 |
| `src/lib/jobs/sources` | 931 |
| `src/components/floor-7` | 897 |
| `src/components/floor-5` | 893 |
| `src/components/floor-4/undo-bar` | 885 |
| `src/components/floor-2` | 878 |
| `src/lib/pdf` | 865 |
| `src/lib/agents/cfo` | 846 |
| `src/lib/agents/cpo` | 842 |
| `src/components/floor-7/cro-character` | 841 |
| `src/components/lobby/cinematic` | 832 |
| `src/lib/agents/cio` | 817 |
| `src/lib/penthouse` | 796 |
| `src/app/api/cron/draft-follow-ups` | 792 |
| `src/components/floor-6/cno-character` | 785 |
| `src/components/floor-2/analytics` | 764 |
| `src/components/penthouse` | 751 |
| `src/components/agents/dialogue` | 729 |
| `src/components/floor-3/binder` | 674 |
| `src/lib/sound` | 641 |
| `src/components/lobby/concierge` | 637 |
| `src/components/floor-4/situation-map` | 634 |
| `src/app/(authenticated)/penthouse` | 627 |
| `src/components/floor-7/rejection` | 620 |
| `src/app/api/reports/state-of-month` | 602 |
| `src/lib/ai` | 599 |
| `src/lib/agents/ceo` | 585 |
| `src/app/api/cron/packet-regenerate` | 581 |
| `src/app/api/cron/unprompted-ceo` | 573 |
| `src/lib/stripe` | 545 |
| `src/components/floor-2/cfo-character` | 544 |
| `src/components/floor-1/ceo-character` | 520 |
| `src/components/floor-6/rolodex` | 511 |
| `src/components/floor-5/ready-to-send` | 506 |
| `src/app/lobby/onboarding` | 500 |
| `src/components/ui` | 488 |
| `src/lib/agents/cno` | 471 |
| `src/lib/ai/structured/__tests__` | 450 |
| `src/components/floor-6/contact-grid` | 449 |
| `src/components/penthouse/scenes/morning` | 448 |
| `src/app/api/cron/purge-sweeper` | 439 |
| `src/lib/account` | 432 |
| `src/lib/notifications` | 428 |
| `src/components/floor-3/star` | 413 |
| `src/lib/agents/concierge` | 411 |
| `src/lib/auth` | 411 |
| `src/lib/supabase` | 402 |
| `src/components/penthouse/quick-actions` | 398 |
| `src/lib/actions` | 396 |
| `src/components/floor-5/resume-press` | 372 |
| `src/components/floor-5/live-compose` | 358 |
| `src/lib/agents/coo` | 357 |
| `src/app/api/profile/preferences` | 356 |
| `src/lib/progression` | 349 |
| `src/components/floor-4/final-countdown` | 341 |
| `src/app/api/stripe/webhook` | 339 |
| `src/app/api/cron/briefing` | 327 |
| `src/app/(authenticated)/briefing-room` | 320 |
| `src/app/api/account/delete/cancel` | 308 |
| `src/components/pricing` | 306 |
| `src/lib/networking` | 302 |
| `src/components/floor-6/dossier-wall` | 298 |
| `src/lib/audio` | 297 |
| `src/app/(authenticated)` | 285 |
| `src/components/lobby/directory` | 285 |
| `src/lib/utils` | 284 |
| `src/app/api/ceo/dispatches` | 275 |
| `src/app/api/account/delete` | 271 |
| `src/lib/agents` | 269 |
| `src/components/floor-6/side-switch` | 268 |
| `src/components/penthouse/rest` | 268 |
| `src/components/settings` | 260 |
| `src/components/floor-4/rings` | 256 |
| `src/app/api/rejection-reflections` | 232 |
| `src/app/api/resumes/upload/__tests__` | 227 |
| `src/components/floor-4/conflicts` | 226 |
| `src/app/api/concierge/extract` | 224 |
| `src/app/api/account/export` | 222 |
| `src/app/api/cron/__integration__` | 221 |
| `src/app/api/cron/sync` | 213 |
| `src/app/api/outreach/approve` | 212 |
| `src/lib/agents/cmo/__tests__` | 212 |
| `src/app/api/cron/outreach-sender` | 209 |
| `src/app/api/writing-room/choose-tone/__tests__` | 209 |
| `src/app/api/briefing/audio-upload` | 208 |
| `src/lib/email` | 206 |
| `src/app/api/resumes/upload` | 205 |
| `src/app/(authenticated)/writing-room` | 204 |
| `src/lib/calendar` | 203 |
| `src/app/(authenticated)/war-room` | 201 |
| `src/app/api/briefing/complete-drill` | 198 |
| `src/app/api/outreach/undo` | 197 |
| `src/app/api/cron/cfo-threshold` | 193 |
| `src/lib/audit` | 185 |
| `src/app/api/writing-room/approve/__tests__` | 181 |
| `src/app/api/briefing/start-drill` | 179 |
| `src/lib/lobby` | 172 |
| `src/app/api/documents/[id]/pdf/__tests__` | 168 |
| `src/lib/resumes` | 168 |
| `src/app/api/writing-room/choose-tone` | 165 |
| `src/app/api/cron/warm-intro-scan` | 160 |
| `src/app/api/cron/export-worker` | 157 |
| `src/components/penthouse/scenes/latenight` | 156 |
| `src/lib/validators` | 155 |
| `src/components/penthouse/idle` | 153 |
| `src/components/icons` | 152 |
| `src/app/(authenticated)/situation-room` | 142 |
| `src/app/api/cron/cio-reresearch` | 141 |
| `src/app/api/briefing/transcribe` | 139 |
| `src/lib/preferences` | 138 |
| `src/app/(authenticated)/rolodex-lounge` | 137 |
| `src/app/api/onboarding/bootstrap-discovery` | 137 |
| `src/lib/contacts` | 135 |
| `src/types` | 135 |
| `src/app/api/briefing/voice-preference` | 134 |
| `src/components/floor-5/wall-inscription` | 134 |
| `src/components/transitions` | 132 |
| `src/app/api/writing-room/approve` | 129 |
| `src/app/api/cron/warmth-decay` | 115 |
| `src/app/api/briefing/binder/[id]` | 114 |
| `src/app/api/documents/[id]/pdf` | 111 |
| `src/components/penthouse/scenes/evening` | 110 |
| `src/app/api/gmail/callback` | 108 |
| `src/app/(authenticated)/observatory` | 106 |
| `src/app/api/writing-room/compose-stream` | 105 |
| `src/components/penthouse/scenes/afternoon` | 105 |
| `src/app/api/writing-room/compose-stream/__tests__` | 104 |
| `src/app/api/concierge/chat` | 103 |
| `src/components/penthouse/ceo-at-window` | 101 |
| `src/app/api/weather` | 99 |
| `src/app/api/briefing/score-answer` | 98 |
| `src/app/api/ceo` | 81 |
| `src/app/api/cron/job-discovery` | 81 |
| `src/lib/resumes/__tests__` | 79 |
| `src/lib/onboarding` | 70 |
| `src/app/api/notifications` | 67 |
| `src/components/penthouse/scenes` | 62 |
| `src/app/api/resumes/signed-url/[id]` | 58 |
| `src/app/api/networking/revoke` | 55 |
| `src/app/api/drive/export` | 53 |
| `src/app/api/cfo` | 52 |
| `src/app/api/stripe/checkout` | 51 |
| `src/lib/crypto` | 50 |
| `src/app/api/networking/match-candidates` | 44 |
| `src/app/api/progression` | 44 |
| `src/app/api/networking/opt-in` | 43 |
| `src/app/api/notifications/[id]/read` | 40 |
| `src/db/__tests__` | 36 |
| `src/app/api/gmail/auth` | 34 |
| `src/app/(authenticated)/c-suite` | 33 |
| `src/app/api/cro` | 31 |
| `src/lib/constants` | 31 |
| `src/app/api/auth/callback` | 30 |
| `src/app/api/stripe/portal` | 27 |
| `src/app/api/auth/signout` | 25 |
| `src/lib/speech` | 25 |
| `src/app/api/gmail/sync` | 19 |
| `src/app/api/calendar/sync` | 17 |
| `src` | 17 |
| `src/app/api/cmo` | 16 |
| `src/app/api/cpo` | 16 |
| `src/lib/db` | 16 |
| `src/app/api/cio` | 15 |
| `src/app/api/cno` | 15 |
| `src/app/api/coo` | 15 |

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
src/app/__tests__/r5-writing-room.proof.test.ts
src/app/__tests__/r6-briefing-room.proof.test.ts
src/app/__tests__/r7-situation-room.proof.test.ts
src/app/__tests__/r7-undo-proof.test.ts
src/app/__tests__/r8-cio-reresearch.proof.test.ts
src/app/__tests__/r8-consent-copy.proof.test.ts
src/app/__tests__/r8-consent-guard.proof.test.ts
src/app/__tests__/r8-private-note-grep.proof.test.ts
src/app/__tests__/r8-red-team.proof.test.ts
src/app/__tests__/r8-warmth-decay.proof.test.ts
src/app/__tests__/r9-cfo-threshold.proof.test.ts
src/app/__tests__/r9-orrery-perf.proof.test.ts
src/app/api/account/delete/cancel/route.test.ts
src/app/api/account/delete/cancel/route.ts
src/app/api/account/delete/route.test.ts
src/app/api/account/delete/route.ts
src/app/api/account/export/route.test.ts
src/app/api/account/export/route.ts
src/app/api/auth/callback/route.ts
src/app/api/auth/signout/route.ts
src/app/api/briefing/audio-upload/route.test.ts
src/app/api/briefing/audio-upload/route.ts
src/app/api/briefing/binder/[id]/route.test.ts
src/app/api/briefing/binder/[id]/route.ts
src/app/api/briefing/complete-drill/route.test.ts
src/app/api/briefing/complete-drill/route.ts
src/app/api/briefing/score-answer/route.test.ts
src/app/api/briefing/score-answer/route.ts
src/app/api/briefing/start-drill/route.test.ts
src/app/api/briefing/start-drill/route.ts
src/app/api/briefing/transcribe/route.test.ts
src/app/api/briefing/transcribe/route.ts
src/app/api/briefing/voice-preference/route.test.ts
src/app/api/briefing/voice-preference/route.ts
src/app/api/calendar/sync/route.ts
src/app/api/ceo/dispatches/route.test.ts
src/app/api/ceo/dispatches/route.ts
src/app/api/ceo/route.ts
src/app/api/cfo/route.ts
src/app/api/cio/route.ts
src/app/api/cmo/route.ts
src/app/api/cno/route.ts
src/app/api/concierge/chat/route.ts
src/app/api/concierge/extract/route.test.ts
src/app/api/concierge/extract/route.ts
src/app/api/coo/route.ts
src/app/api/cpo/route.ts
src/app/api/cro/route.ts
src/app/api/cron/__integration__/cron-auth.test.ts
src/app/api/cron/briefing/route.ts
src/app/api/cron/cfo-threshold/route.ts
src/app/api/cron/cio-reresearch/route.ts
src/app/api/cron/draft-follow-ups/route.test.ts
src/app/api/cron/draft-follow-ups/route.ts
src/app/api/cron/export-worker/route.ts
src/app/api/cron/job-discovery/route.ts
src/app/api/cron/outreach-sender/route.ts
src/app/api/cron/packet-regenerate/route.test.ts
src/app/api/cron/packet-regenerate/route.ts
src/app/api/cron/purge-sweeper/route.test.ts
src/app/api/cron/purge-sweeper/route.ts
src/app/api/cron/sync/route.ts
src/app/api/cron/unprompted-ceo/route.test.ts
src/app/api/cron/unprompted-ceo/route.ts
src/app/api/cron/warm-intro-scan/route.ts
src/app/api/cron/warmth-decay/route.ts
src/app/api/documents/[id]/pdf/__tests__/route.test.ts
src/app/api/documents/[id]/pdf/route.ts
src/app/api/drive/export/route.ts
src/app/api/gmail/auth/route.ts
src/app/api/gmail/callback/route.ts
src/app/api/gmail/sync/route.ts
src/app/api/networking/match-candidates/route.ts
src/app/api/networking/opt-in/route.ts
src/app/api/networking/revoke/route.ts
src/app/api/notifications/[id]/read/route.ts
src/app/api/notifications/route.ts
src/app/api/onboarding/bootstrap-discovery/route.test.ts
src/app/api/onboarding/bootstrap-discovery/route.ts
src/app/api/outreach/approve/route.test.ts
src/app/api/outreach/approve/route.ts
src/app/api/outreach/undo/route.test.ts
src/app/api/outreach/undo/route.ts
src/app/api/profile/preferences/route.test.ts
src/app/api/profile/preferences/route.ts
src/app/api/progression/route.ts
src/app/api/rejection-reflections/route.test.ts
src/app/api/rejection-reflections/route.ts
src/app/api/reports/state-of-month/route.test.ts
src/app/api/reports/state-of-month/route.ts
src/app/api/resumes/signed-url/[id]/route.ts
src/app/api/resumes/upload/__tests__/route.test.ts
src/app/api/resumes/upload/route.ts
src/app/api/stripe/checkout/route.ts
src/app/api/stripe/portal/route.ts
src/app/api/stripe/webhook/route.ts
src/app/api/weather/route.ts
src/app/api/writing-room/approve/__tests__/route.test.ts
src/app/api/writing-room/approve/route.ts
src/app/api/writing-room/choose-tone/__tests__/route.test.ts
src/app/api/writing-room/choose-tone/route.ts
src/app/api/writing-room/compose-stream/__tests__/route.test.ts
src/app/api/writing-room/compose-stream/route.ts
src/app/error.tsx
src/app/globals.css
src/app/layout.tsx
src/app/loading.tsx
src/app/lobby/actions.ts
src/app/lobby/lobby-client.tsx
src/app/lobby/onboarding/ConciergeFlow.smoke.test.tsx
src/app/lobby/onboarding/ConciergeFlow.tsx
src/app/lobby/onboarding/actions.ts
src/app/lobby/onboarding/one-time-arrival.test.ts
src/app/lobby/page.tsx
src/app/lobby/r4.proof.test.ts
src/app/not-found.tsx
src/app/page.tsx
src/components/agents/dialogue/AgentChatInput.tsx
src/components/agents/dialogue/AgentDialoguePanel.tsx
src/components/agents/dialogue/AgentMessageBubble.tsx
src/components/agents/dialogue/AgentMessageList.tsx
src/components/agents/dialogue/AgentQuickActions.tsx
src/components/agents/dialogue/AgentToolCallIndicator.tsx
src/components/agents/dialogue/types.ts
src/components/floor-1/CSuiteClient.injectPrompt.test.tsx
src/components/floor-1/CSuiteClient.test.tsx
src/components/floor-1/CSuiteClient.tsx
src/components/floor-1/CSuiteScene.tsx
src/components/floor-1/CSuiteTicker.tsx
src/components/floor-1/DispatchGraph.test.tsx
src/components/floor-1/DispatchGraph.tsx
src/components/floor-1/InjectPrompt.test.tsx
src/components/floor-1/InjectPrompt.tsx
src/components/floor-1/RingTheBell.bellPhase.test.tsx
src/components/floor-1/RingTheBell.tsx
src/components/floor-1/ceo-character/CEOCharacter.tsx
src/components/floor-1/ceo-character/CEODialoguePanel.tsx
src/components/floor-1/ceo-character/CEOWhiteboard.tsx
src/components/floor-2/ObservatoryClient.test.tsx
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
src/components/floor-2/orrery/Orrery.test.tsx
src/components/floor-2/orrery/Orrery.tsx
src/components/floor-2/orrery/OrreryRender.test.tsx
src/components/floor-2/orrery/OrreryRender.tsx
src/components/floor-2/orrery/PatternModeToggle.test.tsx
src/components/floor-2/orrery/PatternModeToggle.tsx
src/components/floor-2/orrery/PlanetDetailPanel.tsx
src/components/floor-2/orrery/orrery.css
src/components/floor-3/BriefingRoomClient.tsx
src/components/floor-3/BriefingRoomScene.tsx
src/components/floor-3/BriefingRoomTicker.tsx
src/components/floor-3/binder/BinderOpen.tsx
src/components/floor-3/binder/BinderSpine.tsx
src/components/floor-3/binder/DebriefBinderShelf.test.tsx
src/components/floor-3/binder/DebriefBinderShelf.tsx
src/components/floor-3/binder/shelf-aging.test.ts
src/components/floor-3/binder/shelf-aging.ts
src/components/floor-3/cpo-character/CPOCharacter.tsx
src/components/floor-3/cpo-character/CPODialoguePanel.tsx
src/components/floor-3/cpo-character/CPOWhiteboard.tsx
src/components/floor-3/crud/InterviewTimeline.tsx
src/components/floor-3/crud/PrepPacketViewer.tsx
src/components/floor-3/drill/DrillQuestionCard.tsx
src/components/floor-3/drill/DrillStage.test.tsx
src/components/floor-3/drill/DrillStage.tsx
src/components/floor-3/drill/DrillTimer.test.tsx
src/components/floor-3/drill/DrillTimer.tsx
src/components/floor-3/drill/DrillVoiceMic.test.tsx
src/components/floor-3/drill/DrillVoiceMic.tsx
src/components/floor-3/drill/InterruptBubble.tsx
src/components/floor-3/drill/LiveSTARBoard.test.tsx
src/components/floor-3/drill/LiveSTARBoard.tsx
src/components/floor-3/drill/drill-machine.test.ts
src/components/floor-3/drill/drill-machine.ts
src/components/floor-3/star/extract-star.test.ts
src/components/floor-3/star/extract-star.ts
src/components/floor-3/star/interrupt-rules.test.ts
src/components/floor-3/star/interrupt-rules.ts
src/components/floor-4/SituationRoomClient.tsx
src/components/floor-4/SituationRoomScene.tsx
src/components/floor-4/SituationRoomTicker.tsx
src/components/floor-4/conflicts/ConflictsSection.test.tsx
src/components/floor-4/conflicts/ConflictsSection.tsx
src/components/floor-4/coo-character/COOCharacter.tsx
src/components/floor-4/coo-character/COODialoguePanel.tsx
src/components/floor-4/coo-character/COOWhiteboard.tsx
src/components/floor-4/final-countdown/FinalCountdownSection.test.tsx
src/components/floor-4/final-countdown/FinalCountdownSection.tsx
src/components/floor-4/rings/RingPulseController.test.tsx
src/components/floor-4/rings/RingPulseController.tsx
src/components/floor-4/rings/useRingPulse.ts
src/components/floor-4/situation-map/SituationMap.tsx
src/components/floor-4/situation-map/SituationMapCanvas.tsx
src/components/floor-4/situation-map/SituationMapList.test.tsx
src/components/floor-4/situation-map/SituationMapList.tsx
src/components/floor-4/undo-bar/UndoBar.test.tsx
src/components/floor-4/undo-bar/UndoBar.tsx
src/components/floor-4/undo-bar/UndoBarProvider.tsx
src/components/floor-4/undo-bar/approveOutreachWithUndo.test.ts
src/components/floor-4/undo-bar/approveOutreachWithUndo.ts
src/components/floor-4/undo-bar/useUndoBarController.test.ts
src/components/floor-4/undo-bar/useUndoBarController.ts
src/components/floor-5/WritingRoomClient.tsx
src/components/floor-5/WritingRoomScene.tsx
src/components/floor-5/WritingRoomTicker.tsx
src/components/floor-5/cmo-character/CMOCharacter.tsx
src/components/floor-5/cmo-character/CMODialoguePanel.tsx
src/components/floor-5/cmo-character/CMOWhiteboard.tsx
src/components/floor-5/crud/DocumentEditor.tsx
src/components/floor-5/crud/DocumentList.tsx
src/components/floor-5/live-compose/LiveComposePanel.test.tsx
src/components/floor-5/live-compose/LiveComposePanel.tsx
src/components/floor-5/live-compose/PenGlowCursor.tsx
src/components/floor-5/ready-to-send/ReadyToSendPanel.test.tsx
src/components/floor-5/ready-to-send/ReadyToSendPanel.tsx
src/components/floor-5/resume-press/ResumePress.test.tsx
src/components/floor-5/resume-press/ResumePress.tsx
src/components/floor-5/wall-inscription/WallInscription.test.tsx
src/components/floor-5/wall-inscription/WallInscription.tsx
src/components/floor-6/RolodexLoungeClient.tsx
src/components/floor-6/RolodexLoungeScene.tsx
src/components/floor-6/RolodexLoungeTicker.tsx
src/components/floor-6/cio-character/CIOCharacter.tsx
src/components/floor-6/cio-character/CIODialoguePanel.tsx
src/components/floor-6/cio-character/CIOWhiteboard.tsx
src/components/floor-6/cno-character/CNOCharacter.tsx
src/components/floor-6/cno-character/CNODialoguePanel.tsx
src/components/floor-6/cno-character/CNOWhiteboard.tsx
src/components/floor-6/contact-grid/ContactCard.test.tsx
src/components/floor-6/contact-grid/ContactCard.tsx
src/components/floor-6/contact-grid/ContactGrid.tsx
src/components/floor-6/crud/ContactModal.tsx
src/components/floor-6/crud/ContactSearch.tsx
src/components/floor-6/dossier-wall/DossierCard.tsx
src/components/floor-6/dossier-wall/DossierWall.test.tsx
src/components/floor-6/dossier-wall/DossierWall.tsx
src/components/floor-6/dossier-wall/dossier-age.ts
src/components/floor-6/rolodex/Rolodex.test.tsx
src/components/floor-6/rolodex/Rolodex.tsx
src/components/floor-6/rolodex/RolodexCard.tsx
src/components/floor-6/rolodex/useRolodexRotation.ts
src/components/floor-6/side-switch/SideSwitch.test.tsx
src/components/floor-6/side-switch/SideSwitch.tsx
src/components/floor-6/side-switch/useSideSwitch.test.ts
src/components/floor-6/side-switch/useSideSwitch.ts
src/components/floor-7/WarRoomClient.tsx
src/components/floor-7/WarRoomScene.tsx
src/components/floor-7/WarRoomTicker.tsx
src/components/floor-7/cro-character/CROCharacter.tsx
src/components/floor-7/cro-character/CRODialoguePanel.tsx
src/components/floor-7/cro-character/CROWhiteboard.tsx
src/components/floor-7/crud/ApplicationModal.tsx
src/components/floor-7/crud/ApplicationSearch.tsx
src/components/floor-7/rejection/RejectionReflectionStrip.test.tsx
src/components/floor-7/rejection/RejectionReflectionStrip.tsx
src/components/floor-7/war-table/ApplicationCard.test.tsx
src/components/floor-7/war-table/ApplicationCard.tsx
src/components/floor-7/war-table/ColumnHeader.tsx
src/components/floor-7/war-table/EmptyWarTable.tsx
src/components/floor-7/war-table/PipelineColumn.tsx
src/components/floor-7/war-table/StampBar.tsx
src/components/floor-7/war-table/WarTable.tsx
src/components/floor-7/war-table/pipeline-config.ts
src/components/icons/PenthouseIcons.tsx
src/components/lobby/cinematic/ArrivalStages.test.ts
src/components/lobby/cinematic/ArrivalStages.ts
src/components/lobby/cinematic/CinematicArrival.test.tsx
src/components/lobby/cinematic/CinematicArrival.tsx
src/components/lobby/concierge/OtisAvatar.tsx
src/components/lobby/concierge/OtisCharacter.test.tsx
src/components/lobby/concierge/OtisCharacter.tsx
src/components/lobby/concierge/OtisDialoguePanel.tsx
src/components/lobby/directory/BuildingDirectory.test.tsx
src/components/lobby/directory/BuildingDirectory.tsx
src/components/penthouse/ActivityFeed.tsx
src/components/penthouse/GlassPanel.tsx
src/components/penthouse/PipelineNodes.tsx
src/components/penthouse/QuickActionCard.tsx
src/components/penthouse/StatCard.tsx
src/components/penthouse/ceo-at-window/CEOAtWindow.tsx
src/components/penthouse/idle/IdleDetail.tsx
src/components/penthouse/quick-actions/PneumaticTubeOverlay.tsx
src/components/penthouse/quick-actions/QuickActionsRow.tsx
src/components/penthouse/quick-actions/actionHandlers.ts
src/components/penthouse/rest/RestPanel.tsx
src/components/penthouse/scenes/SceneRouter.tsx
src/components/penthouse/scenes/afternoon/AfternoonScene.tsx
src/components/penthouse/scenes/evening/EveningScene.tsx
src/components/penthouse/scenes/latenight/LateNightScene.tsx
src/components/penthouse/scenes/morning/BriefingBeat.tsx
src/components/penthouse/scenes/morning/BriefingGlass.tsx
src/components/penthouse/scenes/morning/MorningBriefingScene.tsx
src/components/penthouse/scenes/morning/SkipHint.tsx
src/components/penthouse/scenes/morning/useBriefingControls.ts
src/components/pricing/PricingCards.tsx
src/components/settings/NetworkingConsent.tsx
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
src/components/world/PneumaticTubeArrivalOverlay.tsx
src/components/world/ProceduralSkyline.tsx
src/components/world/SoundProvider.tsx
src/components/world/WeatherEffects.tsx
src/components/world/elevator/ElevatorButton.tsx
src/components/world/elevator/ElevatorDoors.tsx
src/components/world/elevator/ElevatorPanel.tsx
src/db/__tests__/schema-r8.test.ts
src/db/schema.r4.test.ts
src/db/schema.r5.test.ts
src/db/schema.r6.test.ts
src/db/schema.ts
src/hooks/useAgentChat.ts
src/hooks/useConciergeChat.ts
src/hooks/useDispatchProgress.test.ts
src/hooks/useDispatchProgress.ts
src/hooks/useIdleDetail.test.ts
src/hooks/useIdleDetail.ts
src/hooks/usePipelineWeather.ts
src/hooks/useProgressionMilestones.ts
src/hooks/useReducedMotion.ts
src/hooks/useTimeOfDay.ts
src/hooks/useTubeDeliveries.test.ts
src/hooks/useTubeDeliveries.ts
src/hooks/useWeather.ts
src/lib/account/delete.test.ts
src/lib/account/delete.ts
src/lib/account/export.test.ts
src/lib/account/export.ts
src/lib/actions/applications.ts
src/lib/actions/contacts.ts
src/lib/actions/documents.ts
src/lib/actions/interviews.ts
src/lib/actions/notifications.ts
src/lib/actions/outreach.ts
src/lib/agents/ceo/character-machine.ts
src/lib/agents/ceo/system-prompt.test.ts
src/lib/agents/ceo/system-prompt.ts
src/lib/agents/ceo/tools.ts
src/lib/agents/cfo/character-machine.ts
src/lib/agents/cfo/system-prompt.ts
src/lib/agents/cfo/tools.ts
src/lib/agents/cio/character-machine.ts
src/lib/agents/cio/system-prompt.ts
src/lib/agents/cio/tools.shared-knowledge.test.ts
src/lib/agents/cio/tools.ts
src/lib/agents/cmo/__tests__/tailor-from-base.test.ts
src/lib/agents/cmo/character-machine.ts
src/lib/agents/cmo/system-prompt.ts
src/lib/agents/cmo/tools.ts
src/lib/agents/cno/character-machine.ts
src/lib/agents/cno/system-prompt.ts
src/lib/agents/cno/tools.ts
src/lib/agents/concierge/extract.test.ts
src/lib/agents/concierge/extract.ts
src/lib/agents/concierge/system-prompt.test.ts
src/lib/agents/concierge/system-prompt.ts
src/lib/agents/coo/character-machine.ts
src/lib/agents/coo/system-prompt.ts
src/lib/agents/coo/tools.ts
src/lib/agents/cpo/character-machine.ts
src/lib/agents/cpo/system-prompt.ts
src/lib/agents/cpo/tools.ts
src/lib/agents/create-agent-route.ts
src/lib/agents/create-character-machine.ts
src/lib/agents/cro/character-machine.ts
src/lib/agents/cro/system-prompt.test.ts
src/lib/agents/cro/system-prompt.ts
src/lib/agents/cro/target-profile.test.ts
src/lib/agents/cro/target-profile.ts
src/lib/agents/cro/tools.ts
src/lib/ai/agents/ceo-orchestrator.dispatch-batch.proof.test.ts
src/lib/ai/agents/ceo-orchestrator.r3-proof.test.ts
src/lib/ai/agents/ceo-orchestrator.shared-knowledge.test.ts
src/lib/ai/agents/ceo-orchestrator.ts
src/lib/ai/agents/first-run-briefing.test.ts
src/lib/ai/agents/first-run-briefing.ts
src/lib/ai/agents/morning-briefing.proof.test.ts
src/lib/ai/agents/morning-briefing.test.ts
src/lib/ai/agents/morning-briefing.ts
src/lib/ai/agents/north-star.test.ts
src/lib/ai/agents/north-star.ts
src/lib/ai/agents/shared-route-handler.ts
src/lib/ai/agents/unprompted-triggers.test.ts
src/lib/ai/agents/unprompted-triggers.ts
src/lib/ai/cost.ts
src/lib/ai/memory-extractor.ts
src/lib/ai/model.ts
src/lib/ai/prompt-cache.ts
src/lib/ai/structured/__tests__/live-compose.proof.test.ts
src/lib/ai/structured/__tests__/three-tone-divergence.proof.test.ts
src/lib/ai/structured/cover-letter-stream.ts
src/lib/ai/structured/cover-letter.ts
src/lib/ai/structured/drill-questions.ts
src/lib/ai/structured/follow-up-draft.test.ts
src/lib/ai/structured/follow-up-draft.ts
src/lib/ai/structured/prep-packet.ts
src/lib/ai/structured/score-answer.ts
src/lib/ai/structured/tailored-resume.test.ts
src/lib/ai/structured/tailored-resume.ts
src/lib/ai/telemetry.ts
src/lib/audio/synth-paper-rustle.test.ts
src/lib/audio/synth-paper-rustle.ts
src/lib/audio/synth-thunk.test.ts
src/lib/audio/synth-thunk.ts
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
src/lib/contacts/warmth.test.ts
src/lib/contacts/warmth.ts
src/lib/crypto/keys.test.ts
src/lib/crypto/keys.ts
src/lib/day-night.ts
src/lib/db/postgrest-error.ts
src/lib/db/queries/agent-dispatches-rest.ts
src/lib/db/queries/agent-dispatches.test.ts
src/lib/db/queries/agent-memory-rest.ts
src/lib/db/queries/applications-rest.ts
src/lib/db/queries/base-resumes-rest.ts
src/lib/db/queries/communications-rest.ts
src/lib/db/queries/companies-rest.ts
src/lib/db/queries/contacts-mutations.ts
src/lib/db/queries/contacts-rest.ts
src/lib/db/queries/daily-snapshots-rest.ts
src/lib/db/queries/debriefs-rest.ts
src/lib/db/queries/documents-mutations.ts
src/lib/db/queries/documents-rest.ts
src/lib/db/queries/drill-prefs-rest.ts
src/lib/db/queries/embeddings-rest.ts
src/lib/db/queries/interviews-mutations.ts
src/lib/db/queries/job-discovery-rest.ts
src/lib/db/queries/notifications-mutations.ts
src/lib/db/queries/notifications-rest.ts
src/lib/db/queries/outreach-mutations.ts
src/lib/db/queries/pipeline-stats-from-aggregates.ts
src/lib/db/queries/pipeline-stats.test.ts
src/lib/db/queries/prep-stats-rest.ts
src/lib/db/queries/rejection-reflections-rest.test.ts
src/lib/db/queries/rejection-reflections-rest.ts
src/lib/db/queries/shared-knowledge-rest.ts
src/lib/db/queries/shared-knowledge.test.ts
src/lib/db/queries/user-profiles-rest.ts
src/lib/easter-eggs.ts
src/lib/email/outreach.test.ts
src/lib/email/outreach.ts
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
src/lib/jobs/company-tiers.test.ts
src/lib/jobs/company-tiers.ts
src/lib/jobs/discovery.test.ts
src/lib/jobs/discovery.ts
src/lib/jobs/scorer.test.ts
src/lib/jobs/scorer.ts
src/lib/jobs/sources/greenhouse.test.ts
src/lib/jobs/sources/greenhouse.ts
src/lib/jobs/sources/lever.test.ts
src/lib/jobs/sources/lever.ts
src/lib/jobs/sources/seed.test.ts
src/lib/jobs/sources/seed.ts
src/lib/jobs/types.ts
src/lib/lobby/derive-floors-unlocked.test.ts
src/lib/lobby/derive-floors-unlocked.ts
src/lib/logger.test.ts
src/lib/logger.ts
src/lib/networking/consent-guard.test.ts
src/lib/networking/consent-guard.ts
src/lib/networking/warm-intro-finder.test.ts
src/lib/networking/warm-intro-finder.ts
src/lib/notifications/quiet-hours.test.ts
src/lib/notifications/quiet-hours.ts
src/lib/onboarding/bootstrap.ts
src/lib/orrery/applications-to-planets.test.ts
src/lib/orrery/applications-to-planets.ts
src/lib/orrery/types.ts
src/lib/orrery/use-orrery-mode.test.ts
src/lib/orrery/use-orrery-mode.ts
src/lib/pdf/cover-letter-pdf.tsx
src/lib/pdf/resume-pdf.tsx
src/lib/pdf/state-of-month-pdf.test.ts
src/lib/pdf/state-of-month-pdf.tsx
src/lib/penthouse/briefing-fallback.test.ts
src/lib/penthouse/briefing-fallback.ts
src/lib/penthouse/briefing-storage.test.ts
src/lib/penthouse/briefing-storage.ts
src/lib/penthouse/pipeline-weather.test.ts
src/lib/penthouse/pipeline-weather.ts
src/lib/penthouse/time-of-day.test.ts
src/lib/penthouse/time-of-day.ts
src/lib/preferences/rejection-reflections-pref.test.ts
src/lib/preferences/rejection-reflections-pref.ts
src/lib/progression/engine.ts
src/lib/progression/milestones.ts
src/lib/rate-limit-middleware.test.ts
src/lib/rate-limit-middleware.ts
src/lib/rate-limit.ts
src/lib/resumes/__tests__/parse.test.ts
src/lib/resumes/parse.ts
src/lib/situation/conflicts-cron.test.ts
src/lib/situation/conflicts-cron.ts
src/lib/situation/deadline-beats.test.ts
src/lib/situation/deadline-beats.ts
src/lib/situation/deadline-cron.ts
src/lib/situation/detect-conflicts.test.ts
src/lib/situation/detect-conflicts.ts
src/lib/situation/outreach-arcs.test.ts
src/lib/situation/outreach-arcs.ts
src/lib/skyline-engine.ts
src/lib/sound/engine.ts
src/lib/speech/transcribe.ts
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
src/lib/supabase/middleware.fast-lane.test.ts
src/lib/supabase/middleware.ts
src/lib/supabase/server.ts
src/lib/utils/google-drive-export.ts
src/lib/utils/lex-order.ts
src/lib/validators/application.test.ts
src/lib/validators/application.ts
src/proxy.ts
src/styles/floor-1.css
src/styles/floor-2.css
src/styles/floor-3.css
src/styles/floor-4-rings.css
src/styles/floor-4.css
src/styles/floor-5.css
src/styles/floor-6.css
src/styles/floor-7.css
src/types/agents.ts
src/types/api.ts
src/types/debrief.ts
src/types/ui.ts
```
</details>

## Dependencies

<details>
<summary>46 packages</summary>

```
@ai-sdk/anthropic: ^3.0.58
@ai-sdk/openai: ^3.0.41
@dnd-kit/accessibility: ^3.1.1
@dnd-kit/core: ^6.3.1
@dnd-kit/sortable: ^10.0.0
@playwright/test: ^1.59.1
@react-pdf/renderer: ^4.5.1
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
pdfjs-dist: ^5.6.205
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
- **stripe**: 20.4.1 → 22.1.0 (major)
- **tailwindcss**: 3.4.19 → 4.2.4 (major)
- **typescript**: 5.9.3 → 6.0.3 (major)

## Context Budget

| File | Lines | ~Tokens |
|---|---|---|
| `BOOTSTRAP-PROMPT.md` | 1021 | 11,371 |
| `PROJECT-CONTEXT.md` | 282 | 5,275 |
| `docs/MASTER-PLAN.md` | 367 | 7,172 |
| `CLAUDE.md` | 507 | 11,350 |
| **Total** | **2177** | **35,168** |

> ⚠️ Reading all recommended files consumes ~35,168 tokens. Prioritize: this file → CLAUDE.md (mandatory) → PROJECT-CONTEXT.md → MASTER-PLAN.md.


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
