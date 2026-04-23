# R7 — The Situation Room (Floor 4) — Design

**Date:** 2026-04-23
**Phase:** R7
**Status:** design (self-approved under autopilot per CLAUDE.md §8)
**Author:** sess-r7-kickoff

---

## 1. Intent

Floor 4 is mission control for time-sensitive matters. Follow-ups, deadlines, application status decay. Every stale follow-up has a drafted response ready to approve with an undo window. Approval-all feels like a COO running the room, not reckless batch-fire. The Pneumatic Tube lives here — proactive push lands as a physical object first.

## 2. Non-negotiables (partner constraints)

1. **Undo must be REAL.** Within the 30s window, a clicked cancel physically prevents Resend from firing. A UI-only countdown that hides an already-sent email is the Proof-breaking failure mode.
2. **Zero `alert()` / `toast()` in R7 shipping code.** Confirmations live in-world.
3. **Pneumatic Tube respects quiet hours.** Tubes queued during quiet hours arrive at wake-up, never at 3am.
4. **Situation Map performs at 50+ nodes** or the list fallback ships.
5. **Intent-level flourishes (rings-on-click, tube thunk, earned flight paths) are NOT polish.** They ship.
6. **`tower verify ✗` is binding.** acceptance.met never flips while any gate fails.

## 3. The Four Load-Bearing Systems

| System | Outcome | Key constraint |
|---|---|---|
| Real Undo | Approve without terror | DB-level guarded send via `send_after` column |
| Pneumatic Tube delivery | Proactive push that feels physical | Quiet-hours queueing at insert time |
| Situation Map | Outreach in motion at a glance | Earned arcs, no faked data, honest list fallback |
| Overnight Drafts | Approve-ready drafts at sunrise | AI-drafted per stale app, capped 5/user/night |

## 4. Architecture — Real Undo (the hinge)

**Failure mode being avoided:** UI-timer-then-try-to-recall. Resend does not support recall. Once the HTTP request to Resend fires, the email is gone.

**Correct decoupling:** `approved` (user intent, DB row) separate from `sent` (Resend HTTP call). A database-level time guard sits between them.

**Schema change (migration 0017):**
```sql
ALTER TABLE outreach_queue
  ADD COLUMN send_after    timestamptz,
  ADD COLUMN cancelled_at  timestamptz;

-- New index supports cron predicate without table scan
CREATE INDEX idx_outreach_cron_pickup
  ON outreach_queue (send_after)
  WHERE status = 'approved' AND sent_at IS NULL;
```

**Flow:**
```
POST /api/outreach/approve { id }
  UPDATE outreach_queue
    SET status='approved',
        approved_at=now(),
        send_after=now() + interval '30 seconds'
    WHERE id=? AND user_id=? AND status='pending_approval'
  RETURNING send_after

POST /api/outreach/undo { id }
  UPDATE outreach_queue
    SET status='pending_approval',
        approved_at=NULL,
        cancelled_at=now()
    WHERE id=? AND user_id=?
      AND status='approved'
      AND send_after > now()
  -- 200 if affected 1 row; 409 if send_after <= now() (cron has it)

/api/cron/outreach-sender (existing — add predicate)
  SELECT ... FROM outreach_queue
  WHERE status='approved'
    AND sent_at IS NULL
    AND send_after <= now()        -- <<< added
  ORDER BY approved_at ASC
  LIMIT 30
```

**Race analysis:** at any instant, `send_after` is either > now or ≤ now. Undo's `WHERE send_after > now()` and cron's `WHERE send_after <= now()` are mutually exclusive. Whichever predicate holds wins atomically — there is no window in which both see the row as "still eligible." The DB enforces the invariant; the UI is a witness, not a gatekeeper.

**Undo window:** 30s. Rationale: matches Superhuman + Gmail's ceiling; gives a real beat without being annoying. User-configurable later; hardcoded for R7.

## 5. In-world Undo UI (zero toast/alert)

**UndoBar** — bottom-centered, width ~520px, slides up from bottom:

```
┌───────────────────────────────────────────────────────┐
│  Outreach dispatched to alex@company.com             │
│                                                       │
│  ⏱ 28s       [Cancel]                                 │
└───────────────────────────────────────────────────────┘
```

- Serif body copy ("Outreach dispatched to…").
- Amber radial countdown ring (Civilization turn-timer aesthetic).
- `Cancel` button: amber stroke, JetBrains Mono uppercase.

**State transitions:**
- `in-flight` (default): countdown ring drains, button enabled.
- `cancelling` (user clicked Cancel, API pending): button → spinner.
- `cancelled` (success): bar copy flips to "Caught it. Still pending approval." for 2s, then fades.
- `too-late` (undo returned 409): bar shows "Already left the building." amber-pulsing for 3s, then fades.
- `sent-elapsed` (window reached 0 with no click): bar fades out silently. No confirmation needed — next time user views Floor 4, the row shows status=sent.

**Zero toast/alert enforced by acceptance-check grep:** `scripts/r7-acceptance-check.ts` fails if it finds any `window.alert(`, `alert(`, `toast(`, `sonner`, or `react-hot-toast` in `src/app/api/outreach/**`, `src/app/api/notifications/**`, or `src/components/floor-4/**`.

## 6. Pneumatic Tube as Delivery System

Tube is a notification *channel*, not a notification center. Replaces bell-icon-dropdown pattern globally.

**Schema change (migration 0017):**
```sql
ALTER TABLE notifications
  ADD COLUMN deliver_after  timestamptz,
  ADD COLUMN delivered_at   timestamptz;

ALTER TABLE user_profiles
  ADD COLUMN quiet_hours jsonb;
-- Shape: { "start": "HH:MM", "end": "HH:MM" } or null (always deliver)
```

**Quiet-hours enqueueing (server-side, at insert):**
`computeDeliverAfter(userTz, quietHours, now)` → timestamptz

- If `quietHours == null` → return now.
- Compute user's current time in user's tz.
- If inside `[start, end)` (handles wrap-around midnight correctly):
  - Return the next `end` boundary in user's tz as UTC.
- Else:
  - Return now.

**Client subscriber (`useTubeDeliveries` hook):**
- Subscribes to Supabase realtime channel for the `notifications` table filtered to the current user.
- On new row OR on interval tick (30s): check `deliver_after <= now()` AND `delivered_at IS NULL`.
- For each newly eligible row: atomically `UPDATE ... SET delivered_at=now() WHERE delivered_at IS NULL RETURNING id` (idempotent — only one client session wins per row).
- Winner animates the tube overlay + plays thunk.

**Thunk** — runtime-synthesized via Web Audio API (no asset file):
```ts
function synthThunk(ctx: AudioContext): void {
  const noise = ctx.createBufferSource();
  // 80ms white-noise buffer
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass"; filter.frequency.value = 600; filter.Q.value = 3;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start();
}
```
Gated by `SoundProvider.enabled` AND `!prefers-reduced-motion`.

## 7. Situation Map — Canvas2D with Honest Fallback

**Build when:** viewport ≥ 720px AND not reduced-motion AND Canvas2D feature-detect passes.
**Otherwise:** two-column list fallback (Outgoing / Incoming). Click-behavior identical.

**Canvas rendering model:**
- **Center:** user node, radius 60, gold `#C9A84C` stroke.
- **Outer:** company nodes on a ring around center, polar angle = hash(companyId) mod 360 (deterministic across renders). Radius varies by outreach count.
- **Active arc:** `status='approved' AND send_after > now()` OR tube-delivered-in-last-5s. Bezier curve from user → company, animated glowing head (1.2s ease-in-out, loops until status changes).
- **Completed arc:** status=sent, last 24h. Static thin line, opacity 0.15.
- **Future/drafted arc:** status=pending_approval. Dashed thin line, opacity 0.25.

**Perf budget:**
- Hard ceiling: 20 simultaneously-animated arcs. 21st arc → oldest animated freezes to completed.
- Node ceiling: 50 visible company nodes. Overflow clusters as "+N more".
- Redraw only on RAF when any active arc exists; idle otherwise (no CPU burn on quiet rooms).

**Interaction:** clicking a company node pings the rings-on-click from that node's position AND opens the floor-4 deep-link `/situation-room?focus=<companyId>`.

**Fallback list:** `<section>` with two columns, each `<ul>`. Same click-pings-rings interaction. Shipped as default for mobile/reduced-motion — not a punishment, a smaller truth.

## 8. Intent-level flourishes (NOT polish)

### 8a. Rings respond to interaction
Existing alert pulse rings in `SituationRoomScene.tsx` are lifted into a `RingPulseController` (imperative ref). Deadline cards, alert notifications, tube arrivals, and map nodes all dispatch `.pulse(x, y)` on click. Pulse is a radial circle from (x, y), 600ms expansion, amber stroke fading to 0. Pure CSS keyframes with CSS variables for origin. DOM element cleaned up on `animationend`.

### 8b. Tube *thunk*
Synthesized at runtime per §6. Fires on tube delivery animation start. Respects SoundProvider + reduced-motion.

### 8c. Flight paths are earned
Map arcs are drawn ONLY when an actual outreach row exists. No arc → no arc. Empty state shows "The Situation Room is quiet." in JetBrains Mono. Fails loudly in acceptance-check if `drawArc` is ever called with `activeOutreach.length === 0`.

## 9. Overnight drafts cron

**New endpoint:** `/api/cron/draft-follow-ups`, schedule `0 */2 * * *` (every 2h).

**Per-user per tick:**
1. Compute user's local time.
2. Only proceed if local time ∈ [02:00, 06:00).
3. Find stale apps: `status IN ('applied','screening','interview_scheduled','interviewing','under_review') AND last_activity_at < now() - interval '7 days'`.
4. Exclude apps with any existing `status='pending_approval' OR status='approved'` row in outreach_queue.
5. Cap at 5 per user per night (via SQL `LIMIT 5` after dedupe).
6. For each: call `generateFollowUpDraft({app, contact, userVoiceProfile})` (new function, uses `getAgentModel()` + Zod v4 structured output). Insert into outreach_queue as `status='pending_approval'`, `generated_by='coo_overnight'`, metadata includes `tone_group`.
7. Create ONE batched notification: `{ type:'overnight_drafts_ready', priority:'medium', channels:['pneumatic_tube'], title:'{n} drafts ready for approval', body:'COO left them on your desk.', actions:[{label:'Open Situation Room', url:'/situation-room'}] }`. Quiet-hours enqueue applies — if user's quiet hours are [02:00, 07:00], `deliver_after = 07:00`.

Idempotency: dedupe by (app_id, date) so the 2h re-run within [02:00, 06:00) doesn't spam.

## 10. Calendar conflict detection

Reuses existing `/api/cron/briefing` (daily).

**Algorithm:**
```ts
const windowEnd = now + 14d;
const events = [...interviews14d, ...calendarEvents14d].sort((a,b) => a.startAt - b.startAt);
for (let i = 0; i < events.length - 1; i++) {
  if (events[i].endAt > events[i+1].startAt) {
    // overlap — createConflictNotification(events[i], events[i+1])
  }
}
```

Notification: `type='calendar_conflict'`, `priority='critical'` (the only priority we fire automatically), `channels=['pneumatic_tube']`. Idempotency via dedupe on (event_id_a, event_id_b) stored in notification metadata.

Floor 4 surfaces conflicts as a red-amber section at the top of tableSlot when any exist. Clicking opens both interviews side-by-side.

## 11. Deadline tracking

**Schema:**
```sql
ALTER TABLE applications
  ADD COLUMN deadline_at           timestamptz,
  ADD COLUMN deadline_alerts_sent  jsonb NOT NULL DEFAULT '{}'::jsonb;
-- deadline_alerts_sent shape: { "t_24h": "2026-04-22T...", "t_4h": "...", "t_0": "..." }
```

**Floor 4 "Final Countdown" section** — top of tableSlot when any apps have a deadline within 7 days.

Tier tinting:
- T < 24h → red `#E84040`
- T < 72h → deep amber `#DC7C28`
- T < 7d  → soft amber `#F0A050`

Card countdown updates every 60s via `useInterval`.

**Three-beat cron** reuses `/api/cron/briefing`:
- T-24h, T-4h, T-0 — each beat fires once per app (dedupe via `deadline_alerts_sent`).

## 12. YAGNI — deliberately out of scope

- Scheduled future sends (>30s). Different product.
- Multi-device undo sync (architecture supports later).
- In-undo-bar rich text preview. Preview happened on Floor 5.
- Standalone Conflicts page. Surface inline.
- Settings UI for quiet hours / undo window. Hardcoded defaults for R7.
- Replaying tube overlay on nav. Once delivered, done.

## 13. Testing strategy

| Proof | What it verifies | Mechanism |
|---|---|---|
| P1 | Undo inside window ⇒ Resend NOT called | Integration test: fake timers, mock Resend, approve → t+29s undo → t+35s advance → assert Resend.send call count = 0 |
| P2 | No alert/toast anywhere in R7 surface | acceptance-check.ts grep |
| P3 | Quiet-hours notification defers delivery | Unit test on `computeDeliverAfter` |
| P4 | Client subscriber respects deliver_after | Integration test |
| P5 | Situation Map renders empty state when no outreach | Render test |
| P6 | Rings-on-click handler wired | acceptance-check grep |
| P7 | Tube thunk helper exists and is called on delivery | acceptance-check grep |
| P8 | Overnight draft cron produces drafts + notification | Integration test |
| P9 | Calendar conflict idempotent | Integration test |
| P10 | Deadline alert beats fire once each | Integration test |

`scripts/r7-acceptance-check.ts` runs all grep-based proofs and is invoked by `npm run verify` via the tower CLI.

## 14. Task decomposition

| # | Task | Depends on | Wave |
|---|---|---|---|
| R7.1 | Migration 0017 | — | 1 |
| R7.2 | Real-undo backend (approve/undo routes, cron predicate, P1) | R7.1 | 2 |
| R7.3 | UndoBar component (P2) | R7.2 | 3 |
| R7.4 | Tube delivery hook + quiet-hours enqueue + thunk synth (P3, P4, P7) | R7.1 | 2 |
| R7.5 | Rings-on-click (P6) | — | 2 |
| R7.6 | Overnight-drafts cron (P8) | R7.1 | 2 |
| R7.7 | Calendar conflict section + cron (P9) | R7.1 | 2 |
| R7.8 | Deadline tracking + Final Countdown + 3-beat cron (P10) | R7.1 | 2 |
| R7.9 | Situation Map Canvas2D + list fallback (P5) | R7.2, R7.4 | 4 |
| R7.10 | Proof tests + `scripts/r7-acceptance-check.ts` + ledger flip | all | 5 |

Wave 2 tasks (R7.2, R7.4, R7.5, R7.6, R7.7, R7.8) are independent subsystems — `subagent-driven-development` dispatches them in parallel.

## 15. Acceptance

Set `acceptance.met = true` only after ALL of:
1. `npm test` — full suite green (target: +30 new tests from R7).
2. `npx tsc --noEmit` — zero errors.
3. `npm run build` — Next.js production build succeeds.
4. `npm run lint` — no new errors vs R6 baseline (warnings OK).
5. `scripts/r7-acceptance-check.ts` — all proof greps pass.

Any failure → `tower block R7.n "reason"`, do not flip acceptance.
