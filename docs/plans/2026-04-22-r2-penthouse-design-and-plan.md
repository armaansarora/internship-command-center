# R2 — Penthouse: Design & Plan

**Phase:** R2 — Penthouse (PH)
**Mode:** Autopilot (self-approved per CLAUDE.md §8)
**Date:** 2026-04-22
**Previous phase:** R1 — War Room (12/12 shipped)

---

## 1. Brief summary (fidelity check)

**Intent.** The CEO is already at the window when the user arrives in the morning.
Gold-hour skyline. A briefing is unfolding on glass. Not a dashboard with a
greeting — the first minute of a scripted workday.

**Non-negotiables.** Climate in full; briefing pre-compute (never "give me a
moment"); skippable with `Esc`/`Space`; no voice auto-play.

**Anti-patterns banned.** Dashboard with greeting; Hero CTA; "Welcome back!"
banner; stat-cards in a KPI grid; "Phase 1 / Phase 2" badges.

**Proof.** User describes morning scene from memory after a week; different
overnight activity produces demonstrably different scripts; no-news day still
produces a Penthouse moment worth returning to.

---

## 2. Current state (keep / refactor / replace)

Per user: "Penthouse is a rebuild, not greenfield. Read the files, justify each."
Verdict below is recorded in the R2 ledger decisions at execution time.

| File | Status | LOC | Verdict | Rationale |
|------|--------|-----|---------|-----------|
| `src/app/(authenticated)/penthouse/page.tsx` | built | 66 | **KEEP** pattern, **refactor** payload | Suspense-over-FloorShell is correct; extend fetch to include briefing + weather + time-of-day |
| `src/app/(authenticated)/penthouse/penthouse-client.tsx` | built | 478 | **REPLACE** | Current body is every banned anti-pattern in the brief (greeting header, 4-KPI grid, Phase-badged disabled buttons). Keep only the `<EntranceSequence>` wrap + injected `<style>` keyframes (reused across scenes) |
| `src/app/(authenticated)/penthouse/penthouse-data.ts` | built | 167 | **REFACTOR** | Existing app/stats/pipeline fetch stays (used by RestPanel). Add: `fetchTodayBriefing()`, `computeOvernightDelta()`, `computePipelineWeather()` |
| `src/components/penthouse/ActivityFeed.tsx` | built | 194 | **KEEP** | Well-built; demoted into RestPanel |
| `src/components/penthouse/GlassPanel.tsx` | built | 100 | **KEEP** | Reusable primitive; used in RestPanel **and** in BriefingGlass |
| `src/components/penthouse/PipelineNodes.tsx` | built | 199 | **KEEP**, demote | Moves from primary canvas to RestPanel |
| `src/components/penthouse/QuickActionCard.tsx` | built | 135 | **REFACTOR** | Remove `disabled` + "Phase" badge (banned). Wire click → agent dispatch. Keep glass/noise styling |
| `src/components/penthouse/StatCard.tsx` | built | 125 | **KEEP**, demote | KPI stats move off primary canvas into RestPanel |
| `src/components/floor-1/ceo-character/CEOCharacter.tsx` | built | 211 | **KEEP** | Shared primitive; composed inside new CEOAtWindow. Existing `idle/alert/greeting/thinking/talking/returning` state machine covers what we need |
| `src/app/api/cron/briefing/route.ts` | built | 270 | **REFACTOR (major)** | Current generator is broadcast ("Pipeline: X active ops.") → new generator is conversational, Claude-backed, structured output. Keeps pagination + cron auth + idempotency |
| `src/components/world/ProceduralSkyline.tsx` | built | 205 | **REFACTOR (minor)** | Add optional `saturationDelta` prop; default 0 → no behavior change for other floors |

---

## 3. Option exploration (required by brief)

Per the brief's *Research demands*: explore ≥3 options across scene, quiet-night, pre-compute, outside-morning variants, voice.

### 3a. Morning Briefing scene approach

- **A — Scripted cutscene.** Auto-play, letter-by-letter, typewriter. Esc/Space skips. *Risk:* feels rigid on re-visit.
- **B — Conversational dialogue bubbles.** CEO chat-style. *Risk:* collapses into the dialogue-panel paradigm we already have on Floor 1 — nothing new.
- **C — Reveal-as-you-scroll.** Long-form briefing, unfolds with scroll. *Risk:* violates the "first minute of a scripted workday" feel.
- **D — Mix.** CEO turns from window (cold-open cinematic), first beat appears on glass, user advances with Space or skips with Esc. Idle auto-advance after 8s. **← recommended.**

**Decision:** **D.** Matches the Severance/Mad-Men anchor, honors the skippable non-negotiable, and keeps the passive user flowing without them touching the keyboard.

### 3b. Quiet-night handling

- **A — CEO absent, empty glass.** *Violates brief: "should still be present."*
- **B — "Nothing to report."** *Broadcast — violates Proof.*
- **C — CEO present; briefing is a thought / observation.** e.g., *"Pipeline's cold. That's not a weakness — that's a day to sharpen your shortlist."* **← recommended.**

**Decision:** **C.** The quiet day becomes an opportunity surface, not a void.

### 3c. Pre-compute vs real-time

- **A — Realtime Claude on every /penthouse load.** *Violates "don't block on Claude."*
- **B — Pure cron, daily.** *Can stale within hours.*
- **C — Cron + event-driven invalidation.** Re-generate when a high-impact event (new app, offer, rejection) happens since last generate. *More code.*

**Decision:** **B with a soft-invalidation header.** Store `generated_at`. On page load, if briefing is >18h old OR missing, synthesize a lightweight client-side fallback from stats. Full event-driven invalidation deferred (YAGNI for R2).

### 3d. Outside-morning variants

- **A — Same briefing, different greeting.** *Violates "different time, different scene."*
- **B — Distinct scenes per time-of-day.** CEO at desk / window / gone / quiet. **← recommended.**
- **C — Same content, reframed.** *Insufficient signal.*

**Decision:** **B.** Four scenes, each with its own posture, copy, and lighting cue. Data still comes from the same briefing + stats; framing differs.

| Window | Scene | CEO Posture | Dominant cue |
|--------|-------|-------------|--------------|
| 05:00–11:59 | Morning Briefing | `idle/turning` at window | Gold hour on glass, unfolding beats |
| 12:00–16:59 | Half-day Check-in | `ready` at desk | Delta since morning briefing ("3 since we spoke") |
| 17:00–20:59 | Wind-down | `thinking` leaning on desk | Day-in-review, muted lighting |
| 21:00–04:59 | Night Shift | CEO absent; single dim lamp | Minimal panel; "The CEO's gone home. Jot something down." |

### 3e. Voice layer (decide now)

- **A — Ship ElevenLabs now.** Adds opt-in UI, provider, TTS streaming. Out of scope.
- **B — Stub now, ship later.** Dead code risk.
- **C — Defer entirely; document decision.** **← recommended.**

**Decision:** **C — defer.** Voice is not in R2 scope. Documented in ledger decisions. Future phase can wire it through the structured `beats[]` shape we're building, so no lock-in.

---

## 4. Architecture

### 4a. New components

```
src/components/penthouse/
  scenes/
    SceneRouter.tsx                 # picks scene by useTimeOfDay
    morning/
      MorningBriefingScene.tsx      # orchestrates CEO + briefing + skip
      BriefingGlass.tsx             # frosted panel that unfolds beats
      BriefingBeat.tsx              # one beat line with typewriter reveal
      SkipHint.tsx                  # "Space to advance · Esc to skip"
      useBriefingControls.ts        # Esc/Space/idle auto-advance
    afternoon/AfternoonScene.tsx
    evening/EveningScene.tsx
    latenight/LateNightScene.tsx
  ceo-at-window/
    CEOAtWindow.tsx                 # composes CEOCharacter + window framing + turning animation
  rest/
    RestPanel.tsx                   # revealed stats/pipeline/activity/actions
  quick-actions/
    QuickActionsRow.tsx
    PneumaticTubeOverlay.tsx        # outgoing + returning envelope animation
    actionHandlers.ts               # action label → dispatch URL/handler map
  idle/
    IdleDetail.tsx                  # photo frame / pen / long-pause (seeded)
```

### 4b. New pure helpers (testable)

```
src/lib/penthouse/
  time-of-day.ts                    # (date, tz) → "morning" | "afternoon" | "evening" | "late-night"
  pipeline-weather.ts               # overnight delta → saturation delta (0–5%)
  briefing-storage.ts               # encode/decode structured briefing ↔ notifications.body
  briefing-fallback.ts              # synthesize a scratch briefing when none exists (client fallback)
src/lib/ai/agents/
  morning-briefing.ts               # Claude-backed structured generator
  morning-briefing.test.ts
src/lib/db/queries/
  morning-briefings-rest.ts         # fetchTodayBriefing(userId)
```

### 4c. Client hooks

```
src/hooks/
  useTimeOfDay.ts                   # reactive to user's local clock (minute tick)
  useMorningBriefing.ts             # decodes server briefing; falls back to synth if missing
  useIdleDetail.ts                  # deterministic daily pick by userId+date seed
  usePipelineWeather.ts             # reactive saturation delta (from SSR data)
```

### 4d. Data flow

```
cron 0 13 * * * UTC
  processUser()
    → getPipelineStatsRest + 24h apps + 24h emails + agent logs (existing)
    → generateMorningBriefing({ displayName, stats, recentApps, recentEmails, mood, tz })  [NEW]
      returns { script, beats[{ tone, text }], mood, weather_hint, version: 'v2' }
    → briefing-storage.encode() → notifications.body (prefixed "[briefing_v2]…json…")
    → daily_snapshots upsert (unchanged)
  idempotency unchanged (skip if today snapshot OR today briefing exists)

/penthouse SSR
  requireUser()
  fetchPenthouseData(userId):
    → stats/pipeline/activity (existing)
    → fetchTodayBriefing(userId) → briefing-storage.decode()   [NEW]
    → overnightDelta + pipelineWeather from the same stats     [NEW]
    → user.timezone + Date.now()  → timeOfDay                  [server + re-hydrate client]
  <PenthouseClient> receives: { user, stats, pipeline, activity, briefing | null, overnightDelta, weather, timeOfDay }

<PenthouseClient>
  <ProceduralSkyline saturationDelta={weather} />
  <SceneRouter timeOfDay={timeOfDay}>
    morning     → <MorningBriefingScene briefing={briefing} user={user} />
    afternoon   → <AfternoonScene overnightDelta={overnightDelta} user={user} />
    evening     → <EveningScene stats={stats} user={user} />
    late-night  → <LateNightScene user={user} />
  <RestPanel stats={stats} pipeline={pipeline} activity={activity} />  # hidden, revealed on skip/scroll
```

### 4e. Storage strategy (briefing)

**Decision:** reuse existing `notifications` table (brief said so). Encode structured payload as a JSON string in `body` with a version prefix:

```
[briefing_v2]{"script":"Morning, Armaan.","beats":[{"tone":"steady","text":"…"}],"mood":"cautious","weather_hint":"cool","version":"v2","generated_at":"2026-04-22T13:00:00Z"}
```

`briefing-storage.decode(body)`:
- If `body` starts with `[briefing_v2]` → JSON.parse the rest, return structured.
- Else (legacy / cron fallback / manual) → wrap as `{ beats: [{ tone: 'steady', text: body }], script: body, mood: 'neutral', weather_hint: 'cool', version: 'legacy' }` so the scene never breaks.

This avoids a new migration and preserves every other consumer of the notifications table (unchanged on read: they just see a longer JSON `body`). In R3+ we can migrate to a dedicated table if the structure grows.

### 4f. Briefing agent shape

```ts
interface BriefingBeat {
  tone: 'steady' | 'warm' | 'urgent' | 'reflective' | 'warning';
  text: string;              // ≤ 120 chars, one sentence per beat
  data_cue?: 'new_app' | 'offer' | 'rejection' | 'stale' | 'quiet';
}

interface MorningBriefing {
  version: 'v2';
  generated_at: string;
  script: string;            // fallback single-string joined beats
  beats: BriefingBeat[];     // 3–6 beats
  mood: 'cautious' | 'charged' | 'warm' | 'quiet' | 'sharp';
  weather_hint: 'cool' | 'gold' | 'silver' | 'dim';
}
```

Claude receives `displayName`, `stats`, overnight counts, `mood_last_time` (optional), asks for conversational one-liners in the CEO voice (see `docs/CHARACTER-PROMPTS.md`). Temperature 0.7 for voice. Structured output via Zod schema.

### 4g. Quick Actions dispatch

| Action | Owner | Mechanism |
|--------|-------|-----------|
| Add Application | (direct) | `router.push('/war-room?new=1')` |
| Research Company | CIO | POST `/api/cio` with `{ task: 'research', prompt: '…' }` → pneumatic tube overlay while awaiting → result card |
| Prep Interview | CPO | POST `/api/cpo` with `{ task: 'prep', prompt: '…' }` |
| Quick Outreach | CMO | POST `/api/cmo` with `{ task: 'outreach', prompt: '…' }` |

Pneumatic-tube: envelope slides up-and-right on click; a simulated incoming envelope slides back-left 600ms later (or when fetch resolves, whichever later); opens into a small result card overlaid on the Quick Actions panel. `prefers-reduced-motion` → no animation, just a toast.

For R2 we implement the full flow for **one** action (Add Application — pure nav, highest value, zero agent-cost) and wire placeholder dispatch + pneumatic-tube for the other three with a minimal "not yet wired" response so the animation and interaction contract is real and tested. Full agent-side execution of those 3 dispatches is R3 territory (they overlap with C-Suite orchestrator work). Ledger decision records this scope.

### 4h. Rest Panel reveal

- Triggered by: `Esc` (after any scene is done), pressing `Space` on the final beat, or scrolling below the scene viewport (50% threshold)
- Contains: PipelineNodes + PipelineBar, ActivityFeed, QuickActionsRow, 4 StatCards (muted + scaled 0.9)
- Slides up from the bottom, dimming the scene to 0.35 opacity; scene returns on `Esc` if user is in RestPanel

### 4i. Skyline weather tinting

`ProceduralSkyline` gets an optional `saturationDelta` prop in [-0.05, +0.05].
`pipeline-weather.ts`:
- Good overnight (new apps + responses, no rejections) → +0.02 to +0.05
- Mixed → 0
- Rejections / stale → -0.02 to -0.05
- Default → 0

Applies a multiplier to window-light saturation + sky hue saturation during render. Subtle — barely perceptible — matches brief ("5% saturation shifts").

### 4j. Idle detail

`IdleDetail` picks one of:
- `photo-frame` (default; rendered near CEO)
- `pen` (on desk, occasionally rolls)
- `long-pause` (CEO takes 30s before speaking — holds off BriefingGlass reveal)

Seed: `hash(userId + YYYY-MM-DD)`. Override: if user had a rejection in last 24h → `long-pause` always. If first ever briefing → `photo-frame` (grounding).

---

## 5. Error-handling & edge cases

| Scenario | Behavior |
|----------|----------|
| Briefing missing (pre-first-cron, new user) | `useMorningBriefing` synthesizes from stats using `briefing-fallback.ts` |
| Cron Claude failure | Falls back to the existing text-line generator, writes legacy body. `decode()` wraps it → scene still works |
| Supabase query failure in SSR | `fetchPenthouseData` returns safe defaults (existing pattern); SceneRouter shows a minimal fallback scene + skyline |
| Agent dispatch 500 (CIO/CPO/CMO) | Pneumatic tube returns with an error card; toast with retry option |
| `prefers-reduced-motion` | Typewriter → instant; pneumatic-tube → no transform; skyline weather still applies (static hue shift, no animation involved) |
| User times out (idle) | Auto-advances beats every 8s; reveals RestPanel 30s after final beat |

---

## 6. Testing strategy

### 6a. Pure unit tests (vitest)
- `time-of-day.test.ts` — boundaries at 04:59/05:00/11:59/12:00/16:59/17:00/20:59/21:00 in 3 TZs
- `pipeline-weather.test.ts` — 5 delta shapes → expected saturation range
- `briefing-storage.test.ts` — v2 round-trip; legacy body back-compat; malformed body fallback
- `briefing-fallback.test.ts` — synthesized briefing covers empty + rich cases
- `morning-briefing.test.ts` — Claude-backed; mocked provider; asserts valid structure, varies with input, handles quiet-night
- `morning-briefings-rest.test.ts` — today-only query, RLS scoping, returns null when absent

### 6b. Integration
- `/api/cron/briefing` test: hit endpoint with mocked Supabase + mocked agent → assert structured body persisted; idempotency preserved

### 6c. Acceptance proof (R2.11)
- **Golden-path proof**: seed User A with rich overnight activity (3 apps, 1 interview invite, 1 response); seed User B with zero activity. Generate briefing for both. Assert:
  - Scripts differ (content hash differs)
  - User A beats include specific data cues (`data_cue: 'new_app'`)
  - User B beats include `data_cue: 'quiet'` + mood `'quiet'`
  - Beat count varies

### 6d. Build-suite
- `npm test` green
- `npx tsc --noEmit` clean
- `npm run build` green
- `npm run lint` baseline respected (22 pre-existing + 0 new)

---

## 7. Task breakdown

| Task | Scope | Estimated LOC |
|------|-------|---------------|
| **R2.1** | `morning-briefing.ts` agent + Zod schema + test | ~250 |
| **R2.2** | `briefing-storage.ts` + `briefing-fallback.ts` + tests | ~150 |
| **R2.3** | Cron refactor + updated processUser + integration test | ~150 |
| **R2.4** | `time-of-day.ts` + `pipeline-weather.ts` + ProceduralSkyline prop + tests + hooks | ~250 |
| **R2.5** | CEOAtWindow + MorningBriefingScene + BriefingGlass + BriefingBeat + SkipHint + useBriefingControls | ~500 |
| **R2.6** | AfternoonScene + EveningScene + LateNightScene + SceneRouter | ~350 |
| **R2.7** | RestPanel (composes existing Pipeline/Activity/Stats) | ~200 |
| **R2.8** | QuickActionsRow + PneumaticTubeOverlay + actionHandlers + QuickActionCard refactor | ~350 |
| **R2.9** | IdleDetail + useIdleDetail | ~150 |
| **R2.10** | `penthouse-client.tsx` replacement + `penthouse-data.ts` extension + `page.tsx` refactor | ~250 |
| **R2.11** | Proof test (two-user divergence) | ~100 |
| **R2.12** | Acceptance verification + ledger flip | 0 (commands only) |

Total: ~2,700 LOC. Less than R1 (~7,800). Sane for one autopilot session.

### Dependency order
```
R2.1 → R2.2 → R2.3  (backend spine: agent + storage + cron)
R2.4                (infra: time/weather — independent)
R2.5 ← R2.1, R2.2   (scene needs briefing agent + decoded storage)
R2.6 ← R2.4         (scenes need timeOfDay)
R2.7                (rest panel — uses existing demoted components)
R2.8                (quick actions — independent)
R2.9                (idle detail — independent)
R2.10 ← R2.5, R2.6, R2.7, R2.4  (penthouse-client wires everything)
R2.11 ← R2.1                    (proof test on agent output)
R2.12 ← all
```

Parallelizable after R2.1 finishes: R2.2, R2.4, R2.7, R2.8, R2.9 can go in parallel.
Serialize: R2.3 after R2.2; R2.5 after R2.1+R2.2; R2.6 after R2.4; R2.10 after R2.5/R2.6/R2.7; R2.11 after R2.1; R2.12 last.

---

## 8. Non-negotiables verification matrix

| Non-negotiable | How this design satisfies |
|----------------|---------------------------|
| Climate in full | ProceduralSkyline + WeatherEffects remain; weather tint enhances |
| Briefing first-paint fast | Pre-computed in cron + stored in notifications; SSR reads directly; no Claude in request path |
| Skippable with `Esc` / `Space` | `useBriefingControls` binds both; Space advances, Esc reveals RestPanel |
| Never auto-play voice without opt-in | Voice deferred; no audio anywhere in R2 |
| Different overnight → different scripts | Claude agent takes overnight deltas as input; proof test verifies |
| Quiet-night still meaningful | Agent has `quiet` mood branch; fallback synthesizer covers offline case |
| Present outside morning | Four time-of-day scenes; late-night has CEO absent (handled explicitly) |
| Quick Actions are real dispatches | Remove disabled + Phase badge; 1 wired fully, 3 wired to agent endpoints with contract |

## 9. Anti-pattern avoidance matrix

| Banned | Where the current code had it | Where R2 removes it |
|--------|-------------------------------|---------------------|
| "Good morning, [Name]" banner | penthouse-client.tsx h1 | replaced by in-scene CEO beat 0 ("Morning.") |
| 4-card KPI grid | penthouse-client.tsx statCards | moved to RestPanel, muted |
| "Phase 1 / Phase 2" badge | QUICK_ACTIONS.phase | property removed entirely |
| Hero CTA | n/a | never introduced |
| "Welcome back!" banner | n/a | never introduced |
| Dashboard with a greeting | entire current layout | SceneRouter is the new primary; data is secondary |

---

## 10. Self-approval (autopilot)

Each design decision falls within the brief's Intent / Anchors / Proof + §5 Reference Library of `docs/NEXT-ROADMAP.md`:

- **Cinematic cold-open** (Option D scene) → *Severance, Mad Men* anchors
- **Time-of-day split** → brief *"Investigate what the Penthouse shows outside the morning hour"*
- **Pre-compute in cron** → brief *"pre-compute during cron sync and persist to notifications"*
- **Voice deferred** → brief *"Decide if it ships now, later, or never"* → later; documented
- **Skyline weather** → brief *"skyline reflects pipeline weather — subtly, 5% saturation shifts"*
- **CEO idle detail** → brief *"Sharpening target: The CEO's idle detail. A photo frame. A pen. A thirty-second pause"*
- **Quick Actions as dispatches** → brief *"Quick Actions turn from placeholder badges into real agent dispatches, arriving back as pneumatic-tube delivery"*

No escalation required (no missing secret, no business decision not in roadmap, no destructive action, no same-test-fails-3x, no >10% row migration, no user pause).

→ Proceeding to implementation via `executing-plans`. Independent tasks (R2.4, R2.7, R2.8, R2.9) may be dispatched in parallel via `subagent-driven-development` if session budget allows.

---
