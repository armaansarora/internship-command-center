# R6 — The Briefing Room (Floor 3) — Design

**Phase.** R6 — The Briefing Room (Floor 3).
**Status.** Autopilot-approved. Partner constraints (April 23, 2026) are **binding** and override any shortcut.
**Author.** Claude (sess-a5908e → R6 session).

---

## 1. Intent restated

> "The whiteboard floor. CPO drills the user with mock interview questions. As the user answers (typed or spoken), the whiteboard fills with the STAR framework scaffold live. CPO interrupts to sharpen. At the end, the whiteboard snapshots into a Debrief Binder on the shelf, filed by company. Over time, the shelf fills." — NEXT-ROADMAP.md §R6

Three things make this floor itself, not polish:

1. **Live STAR fill.** The whiteboard is *reactive* — extracts Situation / Task / Action / Result from the user's typed text in real time, no server round-trip. If this doesn't ship, the floor didn't ship.
2. **CPO mid-answer interruptions.** "I need a verb. Your move." — triggered by the drill FSM watching the typed stream + the timer + the STAR state. If this doesn't ship, the floor didn't ship.
3. **Debrief Binder as physical artifact.** A shelf fills with leather-look binders, filed by company, aging over time. A JSON dump in a modal is the explicitly-called-out anti-pattern.

All three above are part of `acceptance.met`. They are not deferrable.

---

## 2. Partner non-negotiables (binding — see memory `feedback_r6_briefing_room_constraints.md`)

1. **Intent-level character ≠ polish.** Do not defer live whiteboard fill or CPO interruptions under any "we'll land it next phase" framing.
2. **Debrief Binder = physical artifact on a shelf, ages visually.** Not JSON, not a modal of key-value pairs.
3. **Voice recording = opt-in only, private Supabase Storage.** If opt-in can't be enforced end-to-end (UI toggle + server-side check on upload + private bucket), ship text-only and open a blocker.
4. **`tower verify` ✗ is binding.** 9/10 ≠ `acceptance.met`. All of `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run lint` (baseline respected) green before flipping the ledger.

---

## 3. Architectural approach

**Chosen: hybrid, text-primary, voice-optional drill.**

### Considered

- **(A) Chat-based mock with per-turn LLM.** Rejected — brief explicitly anti-patterns "chat UI with Q&A" and "feels scripted."
- **(B) Whiteboard + dedicated drill UI, client-side STAR extraction, server scoring only on complete.** **Selected.** Snappy, no latency per keystroke, server AI used only for question generation and post-answer scoring. Matches Rauno's live-UI anchor.
- **(C) Full voice-only.** Rejected as sole mode — voice is an opt-in *overlay* on (B), not the primary interaction.

### Why (B)

- Client-side STAR extractor (pure function over the typed string) → whiteboard columns populate on input with 120ms debounce. No network in the hot path.
- Server AI is used **twice** per drill: once to generate 3 tailored questions at drill start, once per answer to score STAR completeness + produce CPO narrative feedback.
- Interrupt logic is deterministic FSM reading {typed word stream, timer, STAR column state}. No LLM needed for "I need a verb."
- Voice is a parallel opt-in path: `MediaRecorder` → upload to private bucket → Whisper transcription → the transcript hits the same STAR extractor as typed text. Voice never bypasses the opt-in flag.

---

## 4. Components

```
floor-3/
├── BriefingRoomClient.tsx       (EXISTING — extend with drill mode switch)
├── BriefingRoomScene.tsx        (EXISTING — untouched, composes slots)
├── BriefingRoomTicker.tsx       (EXISTING — extend stats with drill count)
├── cpo-character/
│   ├── CPOCharacter.tsx         (EXISTING — add "interrupting" state)
│   ├── CPODialoguePanel.tsx     (EXISTING — the chat panel; NOT the drill)
│   └── CPOWhiteboard.tsx        (EXISTING — will be wrapped by new LiveSTARBoard)
├── crud/
│   ├── InterviewTimeline.tsx    (EXISTING)
│   └── PrepPacketViewer.tsx     (EXISTING)
├── drill/                       (NEW)
│   ├── DrillStage.tsx           — the drill UI: textarea, timer, mic toggle, interrupt bubbles
│   ├── DrillQuestionCard.tsx    — current question card, CPO pointer
│   ├── LiveSTARBoard.tsx        — the whiteboard in drill mode, 4 columns that fill reactively
│   ├── InterruptBubble.tsx      — CPO's mid-answer line, animates in + out
│   ├── DrillTimer.tsx           — visible 90s timer, amber at 90s, red over 120s
│   ├── DrillVoiceMic.tsx        — MediaRecorder wrapper, opt-in gated
│   └── drill-machine.ts         — xstate FSM: { idle → asking → answering → scoring → next | complete }
├── binder/                      (NEW)
│   ├── DebriefBinderShelf.tsx   — the shelf, binders filed by company, ages visually as shelf count grows
│   ├── BinderSpine.tsx          — one binder: leather-look spine, company name embossed, date
│   ├── BinderOpen.tsx           — flip-open view: Q/A transcript + STAR scores + CPO narrative + audio (if present)
│   └── shelf-aging.ts           — pure function mapping shelfSize → per-binder { dust, yellowing, leanDeg }
└── star/                        (NEW)
    ├── extract-star.ts          — pure extractor: (text) → { situation, task, action, result } hints
    ├── interrupt-rules.ts       — pure: (state) → InterruptTrigger | null
    └── extract-star.test.ts     — unit tests for the extractor
```

Library additions:

```
src/lib/
├── ai/structured/
│   ├── drill-questions.ts       (NEW) — generate 3 tailored drill Qs for interview
│   └── score-answer.ts          (NEW) — STAR scoring + narrative feedback
├── speech/                      (NEW)
│   └── transcribe.ts            — Whisper call via AI Gateway
├── agents/cpo/
│   ├── system-prompt.ts         (EXISTING — extend with drill-mode addendum)
│   └── tools.ts                 (EXISTING — add `startDrill`, `scoreAnswer`, `debriefInterview`)
└── db/queries/
    ├── debriefs-rest.ts         (NEW) — CRUD on documents.type='debrief' with structured content
    └── drill-prefs-rest.ts      (NEW) — read/write voice opt-in flag
```

API routes:

```
src/app/api/
├── briefing/
│   ├── start-drill/route.ts         (NEW) — POST, returns 3 questions
│   ├── score-answer/route.ts        (NEW) — POST, returns STAR scores + narrative
│   ├── complete-drill/route.ts      (NEW) — POST, persists debrief, returns binderId
│   ├── audio-upload/route.ts        (NEW) — POST (opt-in gated), returns signed path
│   ├── transcribe/route.ts          (NEW) — POST (opt-in gated), returns text
│   └── voice-preference/route.ts    (NEW) — PUT, sets opt-in flag (permanent-off is one-way)
└── cron/
    └── packet-regenerate/route.ts   (NEW) — hourly, regenerates stale packets
```

Schema changes (migration `0016_r6_briefing_room.sql`):

```sql
-- user_profiles: voice opt-in. Default OFF. `permanently_disabled` is a one-way
-- latch — once true, the UI and server both refuse to flip it back on.
ALTER TABLE user_profiles ADD COLUMN voice_recording_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN voice_recording_permanently_disabled BOOLEAN NOT NULL DEFAULT false;

-- user_profiles: per-user drill tuning (interruption aggressiveness).
ALTER TABLE user_profiles ADD COLUMN drill_preferences JSONB NOT NULL DEFAULT '{"interruptFirmness":"firm","timerSeconds":90}'::jsonb;

-- documents.type enum is already {cover_letter, resume_tailored, prep_packet, debrief}.
-- No type-enum change needed; R6 uses the existing `debrief` type.
-- The `content` column is TEXT today. We stringify the canonical DebriefContent
-- JSON into it — same pattern PrepPacket uses. Documented in types/debrief.ts.

-- interviews: mark the outcome of a drill (not of a real interview).
-- Drill debriefs and real-interview debriefs are both `documents.type='debrief'`,
-- distinguished by content.source field.

-- Storage bucket: interview-audio-private (Supabase dashboard / migration Part 2 — run manually).
-- INSERT / SELECT policy: path[1] = auth.uid().
-- Server uploads via admin client only (service role).
```

```sql
-- Migration Part 2 (run manually via psql, like R5.0014 Part 2):
-- insert into storage.buckets (id, name, public) values ('interview-audio-private', 'interview-audio-private', false);
-- create policy "users read own interview audio" on storage.objects for select using (bucket_id = 'interview-audio-private' and (storage.foldername(name))[1] = auth.uid()::text);
-- Writes are service-role only (no INSERT policy for authenticated role).
```

---

## 5. Data flow (drill)

```
1. User clicks "Drill me" on an upcoming interview.
2. Client POST /api/briefing/start-drill { interviewId }
   → Server reads interview + company + prep packet (if any)
   → AI SDK generates 3 questions tailored to round + company
   → Returns { drillId, questions: [{ id, text, category, rubric }, ...] }
3. For each question:
   a. Client renders DrillQuestionCard; CPO enters "briefing" state.
   b. User answers in textarea (or voice if opt-in ON).
   c. On every input event (debounced 120ms):
      - extract-star.ts runs → { situation?, task?, action?, result? }
      - LiveSTARBoard paints columns.
      - interrupt-rules.ts checks → if trigger, show InterruptBubble.
   d. Timer runs; amber at 90s, red at 120s.
   e. User clicks "Done with this answer" (or drill machine auto-advances at 180s).
   f. Client POST /api/briefing/score-answer { drillId, questionId, text, starHints }
      → AI SDK returns { score: 0..100, stars: {s,t,a,r} each 0..100, narrative, nudge }
   g. CPO surfaces the nudge briefly, then the drill advances.
4. After all 3 questions:
   Client POST /api/briefing/complete-drill { drillId, answers[] }
   → Server persists:
     - documents row: type='debrief', content=DebriefContent JSON,
       title="Drill — {company} ({round})"
     - interviews row (if interviewId provided): debrief_id = newDoc.id
     - audit log event
     - notification: "Binder filed on the shelf"
   → Returns { binderId }
5. Client animates: whiteboard snapshot slides down → becomes a binder spine → lands
   on the shelf with a subtle "thunk". Shelf count increments.
```

### Voice path (opt-in only)

```
At drill start, if user_profiles.voice_recording_enabled === true:
  Show mic toggle in DrillStage header.
When user toggles mic on for a specific answer:
  navigator.mediaDevices.getUserMedia + MediaRecorder (opus/webm)
  On stop:
    Client POST /api/briefing/audio-upload
      → Server: verify user_profiles.voice_recording_enabled === true → else 403
      → Upload to private bucket via admin client, key: {userId}/{drillId}/{questionId}.webm
      → Returns { path }
    Client POST /api/briefing/transcribe { path }
      → Server: verify opt-in again → fetch from bucket via admin → Whisper via AI Gateway
      → Returns { text }
    Client pipes text into the same STAR extractor + scoring pipeline.

If user flips voice_recording_permanently_disabled = true:
  UI toggle is disabled forever.
  Server upload route returns 410 Gone with message.
  (Existing `/api/cron/purge-sweeper` pattern can later purge old audio; not in R6.)
```

---

## 6. Live STAR extractor (the core algorithm)

Pure function in `src/components/floor-3/star/extract-star.ts`:

```ts
export interface StarHints {
  situation: string[]; // up to 3 short phrases
  task: string[];
  action: string[];
  result: string[];
}

export function extractStar(text: string): StarHints {
  // 1. Tokenize sentences.
  // 2. For each sentence, classify into S/T/A/R by:
  //    - Situation signals: "When ...", "In my ...", "At [company]", past-tense setting verbs
  //    - Task signals: "I was asked to", "my job was", "the goal was"
  //    - Action signals: first-person verb ("I built", "I led", "I negotiated", "I decided")
  //      — verb dictionary of ~80 action verbs
  //    - Result signals: numbers ("25%", "$3M"), outcome keywords ("resulted in", "saved",
  //      "grew", "launched", "shipped")
  // 3. Deduplicate and truncate each column to 3 entries.
}
```

Deterministic, testable, sub-millisecond. Unit tests exercise 30+ canonical answer fragments and assert which column each goes into.

---

## 7. CPO interruption rules

Pure function in `src/components/floor-3/star/interrupt-rules.ts`:

```ts
export type InterruptTrigger =
  | { type: "no_action_verb"; prompt: "I need an Action — a verb. What did YOU do?" }
  | { type: "too_much_situation"; prompt: "That's the setup. What did YOU do?" }
  | { type: "no_result"; prompt: "And the Result? I need a number or an outcome." }
  | { type: "wrapping_up"; prompt: "Thirty seconds. Land it." }
  | { type: "over_time"; prompt: "Time. Wrap it." };

export function nextInterrupt(state: DrillState): InterruptTrigger | null { ... }
```

Triggers are gated by:
- `firmness`: gentle / firm / hardass (user-tunable via `drill_preferences`) — controls how soon triggers fire
- cooldown: one interrupt per 20s max, so CPO doesn't spam
- first-answer grace: no interrupt in first 15s of the very first question

Unit tests cover each trigger + the firmness gating.

---

## 8. Debrief Binder Shelf (the physical artifact)

**Not** a modal, **not** JSON. A visual shelf component.

```
/briefing-room (floor 3)
├── Top 35% — CPO character area + LiveSTARBoard (drill mode) OR CPOWhiteboard (overview)
├── Middle 50% — Interview timeline + PrepPacketViewer OR DrillStage
└── Right 20% or bottom 15% — DebriefBinderShelf
```

The shelf:
- Horizontal wooden plank (CSS gradient, warm tone to contrast the cool clinical blues)
- Binder spines stand upright, grouped by company (subtle vertical divider between groups)
- Each spine ~32px wide, ~180px tall, leather texture via layered radial-gradients + `backdrop-filter: saturate(1.2)`
- Company name vertically embossed (rotated text with inset text-shadow)
- Round label at bottom (R1, R2, Final)
- Date sticker in top-right

Aging function (pure, `shelf-aging.ts`):
```ts
export function binderAging(indexFromLeft: number, totalOnShelf: number) {
  return {
    dust: totalOnShelf > 5 ? clamp(indexFromLeft / totalOnShelf, 0, 0.4) : 0,
    yellowing: totalOnShelf > 10 ? clamp(indexFromLeft / totalOnShelf * 0.6, 0, 0.5) : 0,
    leanDeg: totalOnShelf > 15 ? ((indexFromLeft * 37) % 5) - 2 : 0, // stable pseudo-random
  };
}
```

Dust = overlay dot pattern opacity. Yellowing = sepia filter amount. Lean = transform rotate. All CSS, no images.

**Click a spine** → flip-open animation → `BinderOpen`:
- Left page: interview metadata + STAR score summary (the bar gauges, not JSON)
- Right page: scrollable transcript with each Q + user's A + CPO's narrative note inline
- Audio scrub bar (if audio path present and opt-in still on)
- "Close binder" or ESC → flip-back animation

No JSON viewer anywhere. The JSON is invisible implementation detail.

---

## 9. Voice opt-in gate — the safety contract

Three layers, all mandatory:

| Layer | Enforcement | Test |
|-------|-------------|------|
| UI | Toggle disabled if `voice_recording_permanently_disabled`. Toggle visible in Settings + in DrillStage. | Unit test: renders disabled when permanent flag set. |
| API | `audio-upload` and `transcribe` routes read `voice_recording_enabled` before any write / model call; return 403 otherwise. | Contract test: request with flag off → 403. |
| Storage | Private bucket, `public: false`; SELECT policy `path[1] = auth.uid()`; no INSERT policy for authenticated role (uploads go through admin client in server route). | Migration-part-2 SQL + smoke test against dev Supabase. |

**If any layer cannot be wired in R6, ship text-only and open a blocker.** The partner framing: "a half-gated voice path" is worse than no voice path.

---

## 10. Packet regeneration cron

`/api/cron/packet-regenerate` (hourly):

```
1. Auth: verifyCronRequest (existing pattern).
2. Query: interviews where
     status IN ('scheduled', 'rescheduled')
     AND scheduled_at BETWEEN now() AND now() + interval '72 hours'
     AND (prep_packet_id IS NULL
          OR documents.updated_at < now() - interval '7 days')
3. For each: invoke CPO `generatePrepPacket(interviewId)` tool.
4. Insert notification: "CPO: Fresh packet on your desk for {company}" —
   pneumatic tube category so it appears in the penthouse tube overlay.
5. Log to agent_logs.
```

Add to `vercel.json` crons list: `"schedule": "15 * * * *"` (offset from other hourly jobs).

---

## 11. Testing / Proof

**Proof invariants (the floor ships when all five pass, per partner):**

1. **`tests/r6-briefing-room.proof.test.ts` — 5 invariants:**

   a. **Live STAR fill is genuine.** Feed the extractor a canonical answer, assert the 4 columns are populated with the expected phrases. (Not "the fn was called" — the fn's *output*.)

   b. **Interrupt rules fire on correct triggers.** Feed FSM state matching each of the 5 triggers, assert the right prompt comes back + cooldown gate works.

   c. **Voice opt-in cannot be bypassed.** Contract test against `/api/briefing/audio-upload` and `/api/briefing/transcribe` — with flag off → 403, with `permanently_disabled` → 410, with flag on → 200 (mocked storage).

   d. **Debrief Binder is a physical shelf artifact, not a JSON dump.** Render test asserting `DebriefBinderShelf` renders `<article role="listitem">` binder spines (with embossed company name in the accessible label) + `BinderOpen` renders Q/A transcript cards, not a `<pre>` / `<code>` JSON block.

   e. **`acceptance.met` gate.** Unit test asserting that if any of the 5 tasks marked "Intent-level" in the plan's metadata table is incomplete, a shell script `scripts/r6-acceptance-check.ts` exits non-zero. (Wires into `tower verify`.)

2. **Per-task tests (TDD):**
   - `extract-star.test.ts` — 30+ cases
   - `interrupt-rules.test.ts` — 5 triggers × 3 firmness levels
   - `drill-machine.test.ts` — full drill state transitions
   - `shelf-aging.test.ts` — index/total → aging fields
   - `audio-upload.route.test.ts` — opt-in 403/410/200 matrix
   - `packet-regenerate.route.test.ts` — cron auth + stale detection

3. **Integration smoke (manual, inside `npm run build` verification):** complete one drill end-to-end with the dev server, confirm whiteboard fills + interrupt fires + binder lands on shelf.

---

## 12. Task breakdown (preview)

The plan (in `2026-04-23-r6-briefing-room.md`) expands this into TDD tasks. All 10 are non-deferrable — none are "polish to land next phase."

| # | Task | Intent-level? |
|---|------|---------------|
| R6.1 | Schema + migration 0016 (voice opt-in, drill prefs, debrief content types) | Support |
| R6.2 | Private Supabase Storage bucket + opt-in-gated audio-upload + transcribe routes | Support (Intent if voice ships) |
| R6.3 | `extract-star.ts` + unit tests | **Intent** |
| R6.4 | `interrupt-rules.ts` + `drill-machine.ts` + unit tests | **Intent** |
| R6.5 | `LiveSTARBoard` component (reactive, whiteboard) | **Intent** |
| R6.6 | `DrillStage` UI: textarea + timer + mic toggle + interrupt bubbles | **Intent** |
| R6.7 | AI SDK routes: start-drill, score-answer, complete-drill | Support |
| R6.8 | `DebriefBinderShelf` + `BinderSpine` + `BinderOpen` + aging | **Intent** |
| R6.9 | Cron `/api/cron/packet-regenerate` + tube notification | Support |
| R6.10 | Proof test: 5 invariants green + `scripts/r6-acceptance-check.ts` | Gate |

Voice ships if R6.2 passes the opt-in-bypass proof test. If it doesn't (and after exhausting retries), R6.2 falls back to "text-only drill" and R6 opens a blocker for voice work.

---

## 13. Known risks

- **Whisper latency.** 20-second answer → ~2-3s transcription via AI Gateway. Acceptable during the scoring pause; unacceptable for live fill. Therefore: voice is transcribed *after* the user marks the answer done (not streaming). The live STAR fill for voice answers is post-transcription, shown as a single fill-up animation rather than per-keystroke. Documented in the voice path so it doesn't surprise users.
- **iOS Safari MediaRecorder.** As of 2026, Safari 17.4+ supports `audio/mp4` via MediaRecorder but not `audio/webm`. Client probes `MediaRecorder.isTypeSupported` and picks the first supported of `['audio/webm;codecs=opus', 'audio/mp4']`. Server accepts both in the audio-upload route.
- **Client-side STAR extractor is a hint, not ground truth.** The AI scorer on `/score-answer` produces the authoritative STAR gauges. The whiteboard shows live hints to give the sensation of reactivity; the final binder shows AI-scored bars. This is intentional and documented in the binder's legend ("hints live, scored by CPO on completion").

---

## 14. Verify gate (binding)

Before `npm run t done R6.10` flips `acceptance.met: true`:

```bash
npm test                   # all suites green
npx tsc --noEmit           # zero errors
npm run build              # Next.js production build green
npm run lint               # no NEW errors vs R5 baseline
```

Plus `scripts/r6-acceptance-check.ts` (introduced in R6.10) exits 0 only if every Intent-level task's commit is present in the ledger AND the 5 proof invariants all passed in the most recent test run.

If any fail → `tower block R6.X "<reason>"`, do **not** flip the ledger.

---

## 15. Next step

`writing-plans` — produce `docs/plans/2026-04-23-r6-briefing-room.md` with bite-sized TDD tasks, then `executing-plans` / `subagent-driven-development` for parallel subtasks.
