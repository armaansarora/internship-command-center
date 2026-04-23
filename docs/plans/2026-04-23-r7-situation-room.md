# R7 — The Situation Room Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for Wave 2 (6 independent subsystems). Use `superpowers:executing-plans` for serial waves. Autopilot is on — no user gates, run to completion.

**Goal:** Ship Floor 4 (Situation Room) — a COO-operated mission-control surface where stale-app follow-ups are auto-drafted, approvals go out with a REAL undo window (DB-guarded, not UI-faked), the pneumatic tube delivers proactive push with quiet-hours queueing + thunk, deadline countdowns tier by urgency, calendar conflicts surface, and a Canvas2D Situation Map shows outreach in flight with an honest list fallback.

**Architecture:**
- Real undo = decouple "approved" (DB row) from "sent" (Resend call) via a `send_after` timestamp; cron picks up rows only when `send_after <= now()`; undo's `WHERE send_after > now()` guarantees DB-level mutual exclusion with cron.
- Pneumatic tube = Supabase realtime subscription; quiet-hours enforced at notification insert by computing `deliver_after` in user's timezone.
- Situation Map = Canvas2D with 50-node/20-animated-arc budget + feature-detected list fallback.
- All confirmations live in-world; zero `alert()` / `toast()` enforced by `scripts/r7-acceptance-check.ts`.

**Tech Stack:** Next.js 16 App Router, Supabase REST (not Drizzle at runtime), Zod v4, Vercel AI SDK v6, vitest, existing SoundProvider + useReducedMotion hooks, `getAgentModel()` helper.

**Design doc:** `docs/plans/2026-04-23-r7-situation-room-design.md`

---

## Task Waves

```
Wave 1 (serial):    R7.1
Wave 2 (parallel):  R7.2, R7.4, R7.5, R7.6, R7.7, R7.8   ← subagent-driven
Wave 3 (serial):    R7.3   (depends on R7.2 routes + R7.4 hook)
Wave 4 (serial):    R7.9   (depends on all above)
Wave 5 (serial):    R7.10  (proof tests + acceptance)
```

---

## Task R7.1 — Migration 0017 (schema additions)

**Files:**
- Create: `src/db/migrations/0017_r7_situation_room.sql`
- Modify: `src/db/schema.ts` (add columns to `outreachQueue`, `notifications`, `userProfiles`, `applications`)

**Step 1: Write the SQL migration**

```sql
-- 0017_r7_situation_room.sql
-- R7 — The Situation Room: real-undo, quiet-hours, deadlines.

-- outreach_queue: send_after guard for REAL undo + cancellation audit.
ALTER TABLE outreach_queue
  ADD COLUMN send_after   timestamptz,
  ADD COLUMN cancelled_at timestamptz;

CREATE INDEX idx_outreach_cron_pickup
  ON outreach_queue (send_after)
  WHERE status = 'approved' AND sent_at IS NULL;

-- notifications: quiet-hours queueing + delivery stamp.
ALTER TABLE notifications
  ADD COLUMN deliver_after timestamptz,
  ADD COLUMN delivered_at  timestamptz;

CREATE INDEX idx_notif_user_deliver
  ON notifications (user_id, deliver_after)
  WHERE is_dismissed = false AND delivered_at IS NULL;

-- user_profiles: quiet-hours preference.
-- Shape: {"start":"HH:MM","end":"HH:MM"} or null (always deliver).
ALTER TABLE user_profiles
  ADD COLUMN quiet_hours jsonb;

-- applications: deadline tracking + per-app 3-beat dedupe.
ALTER TABLE applications
  ADD COLUMN deadline_at          timestamptz,
  ADD COLUMN deadline_alerts_sent jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX idx_apps_user_deadline
  ON applications (user_id, deadline_at)
  WHERE deadline_at IS NOT NULL;
```

**Step 2: Update `src/db/schema.ts`**

- In `outreachQueue` table block: add `sendAfter` and `cancelledAt` timestamptz columns.
- In `notifications` table block: add `deliverAfter` and `deliveredAt` timestamptz columns.
- In `userProfiles` table block: add `quietHours` jsonb column.
- In `applications` table block: add `deadlineAt` timestamptz + `deadlineAlertsSent` jsonb (notNull, default `{}`).

**Step 3: Run type check**

`npx tsc --noEmit` → expect 0 errors.

**Step 4: Commit**

```bash
git add src/db/migrations/0017_r7_situation_room.sql src/db/schema.ts
git commit -m "[R7/7.1] feat(r7): migration 0017 — send_after, quiet_hours, deadlines"
```

**Step 5: Ledger**

```bash
npm run t done R7.1
```

**Note — migration apply:** runs on next Vercel deploy via `drizzle-kit push`. If deploy fails mid-phase, open a blocker; do not retry ad-hoc.

---

## Task R7.2 — Real-undo backend (routes + cron predicate + P1 proof test)

**Files:**
- Create: `src/app/api/outreach/approve/route.ts`
- Create: `src/app/api/outreach/approve/route.test.ts`
- Create: `src/app/api/outreach/undo/route.ts`
- Create: `src/app/api/outreach/undo/route.test.ts`
- Modify: `src/app/api/cron/outreach-sender/route.ts` (add `send_after <= now()` predicate)
- Modify: `src/lib/db/queries/outreach-mutations.ts` (extend `approveOutreachForUser` to stamp `send_after`)
- Modify: `src/lib/actions/outreach.ts` (route through new endpoints — action remains for legacy callers but delegates)

**Step 1: Write failing approve-route test**

```ts
// src/app/api/outreach/approve/route.test.ts
// Asserts: approve endpoint stamps send_after = now() + 30s + status='approved'
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("POST /api/outreach/approve", () => {
  it("stamps send_after 30s in the future", async () => {
    const fixedNow = new Date("2026-04-23T12:00:00Z");
    vi.setSystemTime(fixedNow);
    const { POST } = await import("./route");
    // mock supabase.from().update().eq().eq().select().single()
    // returning { send_after: "2026-04-23T12:00:30.000Z" }
    // assert response.json().sendAfter === fixedNow + 30s
  });

  it("returns 404 if row not in pending_approval", async () => { /* ... */ });
  it("requires authenticated user", async () => { /* ... */ });
});
```

**Step 2: Implement approve route**

`src/app/api/outreach/approve/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient, requireUser } from "@/lib/supabase/server";

const BodySchema = z.object({ id: z.string().uuid() });
const UNDO_WINDOW_SECONDS = 30;

export async function POST(req: Request): Promise<NextResponse> {
  const user = await requireUser();
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { id } = parsed.data;
  const sendAfter = new Date(Date.now() + UNDO_WINDOW_SECONDS * 1000);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outreach_queue")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      send_after: sendAfter.toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending_approval")
    .select("id, send_after")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, id: data.id, sendAfter: data.send_after });
}
```

**Step 3: Write failing undo-route test**

```ts
// src/app/api/outreach/undo/route.test.ts
describe("POST /api/outreach/undo", () => {
  it("reverts row when send_after > now()", async () => {
    // seed row with status='approved', send_after=now()+20s
    // POST /api/outreach/undo { id }
    // assert 200, status='pending_approval', cancelled_at set
  });

  it("returns 409 when send_after <= now() (cron has it)", async () => {
    // seed row with status='approved', send_after=now()-5s
    // POST /api/outreach/undo { id }
    // assert 409 with body { error: "too_late" }
  });
});
```

**Step 4: Implement undo route**

`src/app/api/outreach/undo/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient, requireUser } from "@/lib/supabase/server";

const BodySchema = z.object({ id: z.string().uuid() });

export async function POST(req: Request): Promise<NextResponse> {
  const user = await requireUser();
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { id } = parsed.data;
  const nowIso = new Date().toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outreach_queue")
    .update({
      status: "pending_approval",
      approved_at: null,
      cancelled_at: nowIso,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "approved")
    .gt("send_after", nowIso)          // DB-level window guard
    .select("id")
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "too_late" }, { status: 409 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
```

**Step 5: Update cron sender predicate**

In `src/app/api/cron/outreach-sender/route.ts`, modify the select to add `.lte("send_after", new Date().toISOString())` AND also handle legacy rows where `send_after IS NULL` (treat as immediately eligible — legacy rows that already existed before the migration). Actually, NO — for correctness and to avoid accidentally firing legacy undo-free rows, require `send_after` to be non-null for new cron pickup. For backwards-compat with rows approved before the migration, backfill `send_after = approved_at` in a one-shot SQL block inside the migration.

Add to `0017_r7_situation_room.sql`:
```sql
-- Backfill send_after for existing approved rows so cron still picks them up.
UPDATE outreach_queue
   SET send_after = approved_at
 WHERE status = 'approved' AND send_after IS NULL;
```

Cron query update:
```ts
const { data: approvedRows, error: fetchErr } = await admin
  .from("outreach_queue")
  .select("id, user_id, application_id, contact_id, subject, body, type")
  .eq("status", "approved")
  .is("sent_at", null)
  .lte("send_after", new Date().toISOString())   // <<< added
  .order("approved_at", { ascending: true })
  .limit(OUTREACH_BATCH_LIMIT);
```

**Step 6: Run tests**

```bash
npx vitest run src/app/api/outreach/ src/app/api/cron/outreach-sender/
```

Expect green.

**Step 7: Commit + ledger**

```bash
git add src/app/api/outreach src/app/api/cron/outreach-sender src/lib/db/queries/outreach-mutations.ts src/lib/actions/outreach.ts src/db/migrations/0017_r7_situation_room.sql
git commit -m "[R7/7.2] feat(r7): real-undo backend + send_after cron predicate"
npm run t done R7.2
```

---

## Task R7.3 — UndoBar component (Wave 3, depends on R7.2)

**Files:**
- Create: `src/components/floor-4/undo-bar/UndoBar.tsx`
- Create: `src/components/floor-4/undo-bar/useUndoBarController.ts`
- Create: `src/components/floor-4/undo-bar/UndoBar.test.tsx`
- Modify: `src/components/floor-4/SituationRoomClient.tsx` (mount UndoBar + controller)

**Controller shape:**
```ts
interface UndoBarState {
  phase: "idle" | "in_flight" | "cancelling" | "cancelled" | "too_late";
  outreachId: string | null;
  recipient: string | null;
  sendAfterEpoch: number | null;
}

interface UndoBarController {
  state: UndoBarState;
  dispatch: (outreachId: string, recipient: string, sendAfterEpoch: number) => void;
  cancel: () => Promise<void>;
}
```

**Step 1: Write controller unit test (pure logic, no DOM)**

```ts
// src/components/floor-4/undo-bar/useUndoBarController.test.ts
// Covers phase transitions: idle→in_flight→cancelling→cancelled
// And: in_flight→(timer elapses)→idle
// And: in_flight→cancelling→(fetch 409)→too_late
```

**Step 2: Implement controller** — React hook managing state + fetch calls to `/api/outreach/undo`. Uses `setTimeout` for auto-fade on terminal phases.

**Step 3: Write UndoBar render test**

```ts
// src/components/floor-4/undo-bar/UndoBar.test.tsx
// Convention: use renderToStaticMarkup + DOMParser + happy-dom (matching project)
// Covers:
// - phase="idle" renders nothing
// - phase="in_flight" renders "Outreach dispatched to {recipient}" + Cancel button
// - phase="cancelled" renders "Caught it. Still pending approval."
// - phase="too_late" renders "Already left the building."
// - No "alert" or "toast" substring in rendered markup
```

**Step 4: Implement UndoBar**

Bottom-centered, 520px wide, slides up on enter, fades out on exit. Amber countdown ring rendered via SVG with `stroke-dashoffset` driven by elapsed time. Pure-CSS prefers-reduced-motion fallback (no slide, opacity only).

**Step 5: Wire into SituationRoomClient**

When an approve-send action fires (via new `approveOutreachWithUndo(id, recipient)` server action that calls `/api/outreach/approve` and returns sendAfter), the client dispatches `controller.dispatch(id, recipient, sendAfter)`. The bar appears.

**Step 6: Run tests**

`npx vitest run src/components/floor-4/undo-bar/`

**Step 7: Commit + ledger**

```bash
git commit -m "[R7/7.3] feat(r7): in-world UndoBar — zero toast, zero alert"
npm run t done R7.3
```

---

## Task R7.4 — Tube delivery hook + quiet-hours + thunk synth (Wave 2, parallel)

**Files:**
- Create: `src/lib/notifications/quiet-hours.ts`
- Create: `src/lib/notifications/quiet-hours.test.ts`
- Create: `src/lib/audio/synth-thunk.ts`
- Create: `src/lib/audio/synth-thunk.test.ts`
- Create: `src/hooks/useTubeDeliveries.ts`
- Create: `src/hooks/useTubeDeliveries.test.ts`
- Create: `src/components/world/PneumaticTubeArrivalOverlay.tsx` (separate from penthouse/quick-actions version — this is the system-notification delivery target)
- Modify: `src/lib/db/queries/notifications-rest.ts` — extend `createNotification` to set `deliver_after` based on user's quiet hours
- Modify: `src/app/(authenticated)/layout.tsx` (or wherever world chrome lives) — mount the arrival overlay + hook

**Step 1: Write `computeDeliverAfter` test**

```ts
// Covers:
// - quietHours=null → returns now
// - now inside [22:00, 07:00] in user tz → returns 07:00 tomorrow (as UTC)
// - now inside quiet hours but it's 03:00 → still returns today's 07:00, not tomorrow
// - now at 07:00 exactly (boundary) → returns now (open interval on end)
// - now at 21:59 → returns now
// - now at 22:00 exactly → returns tomorrow 07:00
// - non-wrapping quiet hours (e.g., [13:00, 14:00] lunch) work correctly
```

**Step 2: Implement `computeDeliverAfter`**

```ts
// src/lib/notifications/quiet-hours.ts
export interface QuietHours {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

/** Returns ISO string of next eligible delivery time. */
export function computeDeliverAfter(args: {
  now: Date;
  userTimezone: string;
  quietHours: QuietHours | null;
}): string {
  if (!args.quietHours) return args.now.toISOString();
  // ... implementation using Intl.DateTimeFormat to compute user-local HH:MM
  // then handle wrap-around ("22:00"→"07:00") vs non-wrap ("13:00"→"14:00")
}
```

**Step 3: Write `synth-thunk` test**

```ts
// Mock AudioContext. Assert:
// - synthThunk(ctx) creates noise source + bandpass filter (600Hz, Q=3) + gain node
// - gain envelope: 0.5 → 0.01 over 80ms via exponentialRampToValueAtTime
// - noise.start() called
```

**Step 4: Implement synth-thunk** per design doc §6 + §8b.

**Step 5: Write `useTubeDeliveries` test**

Mock Supabase realtime. Assert:
- Hook subscribes on mount, unsubscribes on unmount.
- On new row with `deliver_after <= now()`, hook calls the atomic `UPDATE delivered_at=now() WHERE delivered_at IS NULL` and on success fires the arrival callback.
- On new row with `deliver_after > now()`, hook does NOT fire the arrival (waits until the per-minute sweep).
- Hook deduplicates: two concurrent sessions, only one wins the atomic update.

**Step 6: Implement `useTubeDeliveries`**

```ts
// src/hooks/useTubeDeliveries.ts
// subscribes to supabase realtime for current user's notifications
// sweeps every 60s for any notification whose deliver_after has crossed now
// on eligible: atomic update, then callback(notification)
```

**Step 7: Modify `createNotification`**

Add a pre-insert step: if `channels.includes("pneumatic_tube")`, read user's `quiet_hours` + `timezone`, compute `deliver_after`, set it on insert. Otherwise `deliver_after = now()`.

**Step 8: Create PneumaticTubeArrivalOverlay**

New component that consumes `useTubeDeliveries` + plays `synthThunk()` via SoundProvider + renders the tube overlay (similar shape to `penthouse/quick-actions/PneumaticTubeOverlay` but data-driven by notifications). Mounted once at the world-chrome level so every floor gets deliveries.

**Step 9: Commit + ledger**

```bash
git commit -m "[R7/7.4] feat(r7): tube delivery hook + quiet-hours + thunk synth"
npm run t done R7.4
```

---

## Task R7.5 — Rings-on-click interaction (Wave 2, parallel)

**Files:**
- Create: `src/components/floor-4/rings/RingPulseController.tsx`
- Create: `src/components/floor-4/rings/useRingPulse.ts`
- Create: `src/components/floor-4/rings/RingPulseController.test.tsx`
- Modify: `src/components/floor-4/SituationRoomScene.tsx` (lift pulse rings into controller)
- Modify: `src/components/floor-4/SituationRoomClient.tsx` (provide RingPulseContext, wire card click → `.pulse(x, y)`)
- Create: `src/styles/floor-4-rings.css` (new keyframes + CSS variables)

**Step 1: Write controller test**

```ts
// RingPulseController.test.tsx
// - mounts; assert 3 ambient rings present
// - calling controllerRef.pulse(x, y) appends a DOM node with style transforms from origin (x, y)
// - calling pulse 5x rapidly: all 5 pulses present simultaneously
// - after 600ms (fake timers), each pulse DOM node removed
// - reduced-motion: no animation but data-origin attribute still set (for a11y observability)
```

**Step 2: Implement controller**

```ts
// RingPulseController exposes an imperative ref via forwardRef + useImperativeHandle
export interface RingPulseHandle {
  pulse(x: number, y: number): void;
}
// Context provider + hook `useRingPulse()` returns the imperative handle or null
```

**Step 3: Wire into scene + client**

Replace the existing ambient ring <div> block in `SituationRoomScene.tsx` with `<RingPulseController reducedMotion={reduced} />`. In `SituationRoomClient.tsx`, wrap content in `<RingPulseProvider>` and pass click handlers from deadline cards / tube arrivals / map nodes to the controller.

**Step 4: CSS**

```css
/* floor-4-rings.css */
@keyframes alert-shockwave {
  0%   { transform: translate(var(--sx), var(--sy)) scale(0);   opacity: 0.6; }
  100% { transform: translate(var(--sx), var(--sy)) scale(12); opacity: 0;   }
}
.alert-shockwave {
  position: absolute;
  width: 50px; height: 50px;
  border-radius: 50%;
  border: 1px solid rgba(220, 120, 40, 0.6);
  pointer-events: none;
  animation: alert-shockwave 600ms cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
}
@media (prefers-reduced-motion: reduce) {
  .alert-shockwave { animation: none; opacity: 0; }
}
```

**Step 5: Commit + ledger**

```bash
git commit -m "[R7/7.5] feat(r7): rings respond to alert clicks (shockwave from origin)"
npm run t done R7.5
```

---

## Task R7.6 — Overnight drafts cron (Wave 2, parallel)

**Files:**
- Create: `src/app/api/cron/draft-follow-ups/route.ts`
- Create: `src/app/api/cron/draft-follow-ups/route.test.ts`
- Create: `src/lib/ai/structured/follow-up-draft.ts`
- Modify: `vercel.json` (add cron)

**Step 1: Write AI helper test**

```ts
// src/lib/ai/structured/follow-up-draft.test.ts
// Mocks getAgentModel + generateObject. Assert the returned draft matches zod schema:
// { subject: string (1-120 chars), body: string (50-2000 chars), tone: "formal"|"warm"|"direct" }
// Input includes application details + contact warmth; test with multiple fixture combos.
```

**Step 2: Implement follow-up-draft helper**

```ts
// src/lib/ai/structured/follow-up-draft.ts
import { z } from "zod/v4";
import { generateObject } from "ai";
import { getAgentModel } from "@/lib/ai/model";

const FollowUpSchema = z.object({
  subject: z.string().min(1).max(120),
  body: z.string().min(50).max(2000),
  tone: z.enum(["formal", "warm", "direct"]),
});

export async function generateFollowUpDraft(input: {
  company: string;
  role: string;
  daysSinceActivity: number;
  contactName?: string;
  contactWarmth?: number;
}): Promise<z.infer<typeof FollowUpSchema>> {
  const { object } = await generateObject({
    model: getAgentModel(),
    schema: FollowUpSchema,
    prompt: `You are COO Dylan Shorts drafting a follow-up. Application: ${input.role} at ${input.company}. ${input.daysSinceActivity} days since last activity. Tone: match contact warmth (${input.contactWarmth ?? 50}/100). Short. Human. No "just following up" cliché.`,
  });
  return object;
}
```

**Step 3: Write cron test**

```ts
// Asserts: for user in [02:00, 06:00) local with 3 stale apps and zero existing drafts,
// cron creates 3 outreach_queue rows (pending_approval, generated_by='coo_overnight')
// + ONE notification (type='overnight_drafts_ready', priority='medium',
// channels includes 'pneumatic_tube').
// Separate assertion: second invocation at 03:30 same night creates nothing
// (existing drafts dedupe).
// Separate assertion: for user at 12:00 local, cron creates nothing.
```

**Step 4: Implement cron**

```ts
// src/app/api/cron/draft-follow-ups/route.ts
export const maxDuration = 300;
// per-user loop: compute local time via Intl.DateTimeFormat
// if [02:00, 06:00): find stale apps, dedupe against existing drafts, cap 5,
// for each call generateFollowUpDraft, insert into outreach_queue,
// then createNotification({ channels:['pneumatic_tube'], ... })
// (quiet-hours computation in createNotification handles timing)
```

**Step 5: Add cron to vercel.json**

```json
{ "path": "/api/cron/draft-follow-ups", "schedule": "0 */2 * * *" }
```

**Step 6: Commit + ledger**

```bash
git commit -m "[R7/7.6] feat(r7): overnight follow-up drafts cron (capped 5/night)"
npm run t done R7.6
```

---

## Task R7.7 — Calendar conflict detection + Conflicts section (Wave 2, parallel)

**Files:**
- Create: `src/lib/situation/detect-conflicts.ts`
- Create: `src/lib/situation/detect-conflicts.test.ts`
- Create: `src/components/floor-4/conflicts/ConflictsSection.tsx`
- Create: `src/components/floor-4/conflicts/ConflictsSection.test.tsx`
- Modify: `src/app/api/cron/briefing/route.ts` (invoke `detectConflictsForUser`)
- Modify: `src/components/floor-4/SituationRoomClient.tsx` (mount ConflictsSection at top of tableSlot)
- Modify: `src/lib/db/queries/communications-rest.ts` (extend `getDailyBriefingData` to include conflicts)

**Step 1: Write algorithm test**

```ts
// detect-conflicts.test.ts
// - no events: returns []
// - single event: returns []
// - two non-overlapping events: returns []
// - two overlapping interviews: returns [{a, b}]
// - interview + calendar_event overlap: returns [{a, b}]
// - three overlapping (A⊆B, B⊆C): returns distinct pairs [{A,B},{B,C},{A,C}] or merged? Decide: pair-level (cleanest UI).
// - idempotency fixture: existing notification with same (a,b) → skip
```

**Step 2: Implement detector**

Pure function taking `interviews + calendar_events`, sorted by startAt, emits overlap pairs.

**Step 3: Wire into briefing cron**

After existing briefing work, call `detectConflictsForUser(userId)` which:
1. Reads interviews (next 14d) + calendar_events (next 14d) via admin client.
2. Calls `detectConflicts(events)`.
3. For each new pair, checks if a `calendar_conflict` notification already exists with the same event-id-pair in metadata; if not, creates one.

**Step 4: Build ConflictsSection component**

Red-amber card block at top of tableSlot. Each conflict shows both events side-by-side with times + titles. Click → deep-link to external calendar OR highlights both in the tableSlot. Keep simple — no drag-to-reschedule in R7.

**Step 5: Commit + ledger**

```bash
git commit -m "[R7/7.7] feat(r7): calendar conflict detection + Conflicts section"
npm run t done R7.7
```

---

## Task R7.8 — Deadline tracking + Final Countdown + 3-beat cron (Wave 2, parallel)

**Files:**
- Create: `src/components/floor-4/final-countdown/FinalCountdownSection.tsx`
- Create: `src/components/floor-4/final-countdown/DeadlineCountdown.tsx`
- Create: `src/components/floor-4/final-countdown/FinalCountdownSection.test.tsx`
- Create: `src/lib/situation/deadline-beats.ts`
- Create: `src/lib/situation/deadline-beats.test.ts`
- Modify: `src/app/api/cron/briefing/route.ts` (invoke `fireDeadlineBeatsForUser`)
- Modify: `src/components/floor-7/crud/ApplicationModal.tsx` (add `deadline_at` date-time input)
- Modify: `src/components/floor-4/SituationRoomClient.tsx` (mount FinalCountdownSection)
- Modify: `src/lib/db/queries/applications-rest.ts` (include `deadline_at` + `deadline_alerts_sent` in selects)

**Step 1: Write beats test**

```ts
// deadline-beats.test.ts
// - app with deadline_at = now+3h and deadline_alerts_sent={}: fires t_4h beat, updates alerts_sent={t_4h:"..."}
// - app with deadline_at = now+3h and deadline_alerts_sent={t_4h:"..."}: fires nothing
// - app with deadline_at = now-30m and deadline_alerts_sent={t_4h:"..",t_24h:".."}: fires t_0
// - app with deadline_at = now+10d: fires nothing (outside 7d window)
```

**Step 2: Implement `fireDeadlineBeatsForUser`**

For each app with `deadline_at` in [now, now+7d], compute which of {t_24h, t_4h, t_0} are now eligible (deadline_at - now <= beat window AND alert not already sent), fire a notification per eligible beat, update `deadline_alerts_sent` via Postgres `jsonb_set`.

**Step 3: Write FinalCountdownSection render test**

```ts
// - renders "FINAL COUNTDOWN" header when any app has deadline in 7d
// - renders nothing when no deadlines
// - T<24h card has red styling, T<72h amber, T<7d soft amber
// - countdown string "Nh Mm" format
```

**Step 4: Implement UI**

Countdown chip uses `useInterval` to update every 60s. Click-card opens application (reuse existing modal). Integrate with RingPulseContext — clicking a countdown card pulses the rings from click origin.

**Step 5: Modify ApplicationModal**

Add a `<input type="datetime-local">` field for deadline. Persist through existing mutation path (may need a new column-aware update in applications-rest).

**Step 6: Commit + ledger**

```bash
git commit -m "[R7/7.8] feat(r7): deadline tracking + Final Countdown + 3-beat cron"
npm run t done R7.8
```

---

## Task R7.9 — Situation Map (Canvas2D + list fallback) (Wave 4, serial after Wave 2)

**Files:**
- Create: `src/components/floor-4/situation-map/SituationMap.tsx` (dispatcher)
- Create: `src/components/floor-4/situation-map/SituationMapCanvas.tsx`
- Create: `src/components/floor-4/situation-map/SituationMapList.tsx`
- Create: `src/components/floor-4/situation-map/arc-renderer.ts`
- Create: `src/components/floor-4/situation-map/arc-renderer.test.ts`
- Create: `src/components/floor-4/situation-map/SituationMap.test.tsx`
- Create: `src/lib/situation/outreach-arcs.ts` (data shaping)
- Create: `src/lib/situation/outreach-arcs.test.ts`
- Modify: `src/components/floor-4/SituationRoomClient.tsx` (mount map above deadline cards)
- Modify: `src/app/(authenticated)/situation-room/page.tsx` (fetch outreach data for map)

**Step 1: Write arcs data-shaping test**

```ts
// outreach-arcs.test.ts
// Input: outreach_queue rows + applications + companies
// Output: { user: Node, companies: Node[], arcs: Arc[] }
// - 'approved AND send_after > now()' → Arc { kind: "active" }
// - 'sent AND sent_at within 24h' → Arc { kind: "completed" }
// - 'pending_approval' → Arc { kind: "draft" }
// - 'sent' older than 24h → excluded
// - node positions deterministic from hash(companyId)
// - >50 companies: least-warm surplus becomes { kind: "cluster", count: N }
```

**Step 2: Implement arcs shaper**

```ts
// src/lib/situation/outreach-arcs.ts
export function shapeOutreachArcs(input: ShapeInput): ShapeOutput { /* ... */ }
```

**Step 3: Write arc-renderer test (canvas math, no DOM)**

```ts
// arc-renderer.test.ts
// - drawArc writes bezier path from user node → company node
// - respects dashed style for 'draft' kind
// - animated head progresses along path as elapsed ms increases
// - drawArc with 0 arcs in data → canvas has only center node drawn
```

**Step 4: Implement arc-renderer**

Pure function(s) taking a canvas context + data + elapsed time → draws frame. Separated from React so it's unit-testable.

**Step 5: Write SituationMap dispatcher test**

```ts
// SituationMap.test.tsx
// - prefers-reduced-motion=true: renders SituationMapList, not Canvas
// - viewport < 720: renders SituationMapList
// - no Canvas feature: renders SituationMapList
// - otherwise: renders SituationMapCanvas
// - empty data: Canvas shows "The Situation Room is quiet." text overlay
```

**Step 6: Implement dispatcher + list + canvas components**

- Dispatcher: `useMediaQuery` + feature-detect → choose child.
- List: two-column outgoing/incoming with click-pings-rings interaction.
- Canvas: `useEffect` sets up RAF loop; loop only runs when `arcs.some(a => a.kind === "active")`. Otherwise draws once and idles.

**Step 7: Wire into SituationRoomClient**

Place above Conflicts, Final Countdown, and existing deadline cards. Map gets its own section: "Outreach in Flight".

**Step 8: Perf note**

Do NOT write a CI-blocking FPS test (too flaky across runners). Instead, manually smoke-test in dev with 50 seeded nodes; document the result in the commit body. `scripts/r7-acceptance-check.ts` asserts the FALLBACK PATH is wired (grep for `prefers-reduced-motion` and the list component import).

**Step 9: Commit + ledger**

```bash
git commit -m "[R7/7.9] feat(r7): situation map (Canvas2D + list fallback, earned arcs)"
npm run t done R7.9
```

---

## Task R7.10 — Proof tests + acceptance-check + ledger flip (Wave 5, serial)

**Files:**
- Create: `src/app/__tests__/r7-situation-room.proof.test.ts`
- Create: `scripts/r7-acceptance-check.ts`
- Modify: `scripts/tower/index.ts` or wherever `tower verify` composes sub-checkers (hook r7 script in)
- Modify: `.ledger/R7-*.yml` — flip `acceptance.met = true` AFTER all 4 gates green

**Step 1: Write the consolidated proof invariants**

```ts
// src/app/__tests__/r7-situation-room.proof.test.ts
describe("R7 Proof invariants", () => {
  it("P1 — Undo inside window prevents Resend from firing", async () => { /* fake timers + mock Resend */ });
  it("P2 — No alert()/toast() in R7 surface", () => { /* static grep inside test */ });
  it("P3 — Quiet-hours notification defers delivery", () => { /* computeDeliverAfter table-driven */ });
  it("P4 — Tube subscriber skips rows where deliver_after > now()", () => { /* hook unit test */ });
  it("P5 — Situation Map renders empty-state when no active outreach", () => { /* render test */ });
  it("P6 — Rings-on-click handler is wired from cards + map + arrivals", () => { /* grep */ });
  it("P7 — Tube thunk helper shipped + called on delivery", () => { /* grep */ });
  it("P8 — Overnight drafts cron dedupes per-app", () => { /* integration */ });
  it("P9 — Calendar conflict cron idempotent", () => { /* integration */ });
  it("P10 — Deadline beat alerts fire once each", () => { /* integration */ });
});
```

**Step 2: Write acceptance-check script**

```ts
// scripts/r7-acceptance-check.ts
// Mirrors scripts/r6-acceptance-check.ts. Fails on ANY of:
// - R7.2 route files missing: src/app/api/outreach/approve/route.ts, .../undo/route.ts
// - cron outreach-sender missing .lte("send_after"...) predicate
// - src/app/api/outreach OR src/components/floor-4 contains "alert(" or "toast(" (excluding test files + inline CSS property "alert-*")
// - R7.4 helper missing: synthThunk export in src/lib/audio/synth-thunk.ts
// - R7.4 helper missing: computeDeliverAfter export
// - R7.5 RingPulseController missing
// - R7.9 SituationMapList.tsx exists (fallback path wired)
// - vercel.json includes /api/cron/draft-follow-ups
// - Migration 0017 file exists
// Prints ✓ per check; exits 1 on any ✗.
```

**Step 3: Run full 4-gate verify**

```bash
npm test                                # vitest — must be fully green
npx tsc --noEmit                       # zero errors
npm run build                          # Next.js prod build must succeed
npm run lint                           # no new errors vs R6 baseline (15e/15w)
npx tsx scripts/r7-acceptance-check.ts # all checks ✓
```

**Step 4: Flip ledger only on full green**

If all four gates + acceptance-check pass:
```bash
# edit .ledger/R7-*.yml to set acceptance.met=true, verified_by_commit=HEAD
npm run t done R7.10
```

If any gate fails → `npm run t block R7.10 "<reason>"`, do NOT flip acceptance.

**Step 5: Commit**

```bash
git commit -m "[R7/7.10] test(r7): 10 proof invariants + acceptance-check gate"
```

---

## Rollback notes

- **Migration 0017 is additive only** — rollback = DROP COLUMN / DROP INDEX. No data loss.
- **send_after backfill** — running the backfill twice is idempotent (predicate `WHERE send_after IS NULL`).
- **If Wave 2 subagents leave uncommitted changes**, run `git status` before final acceptance; any dirty state = hold acceptance.
- **If P1 proof flakes in CI**, it means the `send_after` race is genuinely broken, not a flake — do NOT retry. Root-cause the race.
- **If P5 (Canvas2D perf) flakes**, ship the list as default (flip feature flag) rather than spending cycles on a brittle FPS test.

---

## Execution — subagent-driven for Wave 2

Under autopilot, I use `superpowers:subagent-driven-development` for Wave 2's six independent tasks (R7.2, R7.4, R7.5, R7.6, R7.7, R7.8). Each subagent gets:
- The task's section of this plan verbatim
- A pointer to the design doc for context
- The four partner constraints (undo REAL, no alert/toast, quiet hours, earned arcs)
- Instruction to commit with `[R7/7.n]` tag, then `npm run t done R7.n`

I review each subagent's commit before dispatching the next batch. Waves 1, 3, 4, 5 run serially in this session via `superpowers:executing-plans`.
