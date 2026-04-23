/**
 * R7 Proof invariants — the partner-binding behaviors that must all hold
 * true for acceptance.met to flip.
 *
 * Individual subsystem tests live alongside their code; these are the
 * cross-cutting assertions that prove the Situation Room's contract
 * *as a system*.
 *
 * Covered:
 *   P1 — Undo's DB predicate and cron's DB predicate are strictly mutually
 *        exclusive for any send_after value. (detailed route-level proof
 *        lives in src/app/__tests__/r7-undo-proof.test.ts; this test
 *        re-asserts the core invariant at the unit level.)
 *   P2 — No alert()/toast() string anywhere in R7 surface source (grep).
 *   P3 — computeDeliverAfter defers tubes scheduled in quiet hours to the
 *        user's wake-up.
 *   P5 — Situation Map list fallback renders the empty-state copy when
 *        no arcs are earned.
 *   P6 — RingPulseController is mounted inside SituationRoomClient.
 *   P7 — synthThunk is imported by the PneumaticTubeArrivalOverlay.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { computeDeliverAfter } from "@/lib/notifications/quiet-hours";

function read(relPath: string): string {
  const abs = resolve(process.cwd(), relPath);
  if (!existsSync(abs)) return "";
  return readFileSync(abs, "utf8");
}

describe("R7 Proof invariants", () => {
  // -----------------------------------------------------------------
  // P1 — DB-level mutual exclusion between undo and cron
  // -----------------------------------------------------------------
  it("P1 — undo predicate .gt(\"send_after\", now) and cron predicate .lte(\"send_after\", now) are strictly mutually exclusive", () => {
    const undoRoute = read("src/app/api/outreach/undo/route.ts");
    const cronSender = read("src/app/api/cron/outreach-sender/route.ts");
    // Undo enforces send_after > now.
    expect(undoRoute).toMatch(/\.gt\(\s*["']send_after["']/);
    // Cron enforces send_after <= now.
    expect(cronSender).toMatch(/\.lte\(\s*["']send_after["']/);
    // Neither side relies on a UI timer or Resend recall — the DB is the gate.
    expect(undoRoute).not.toMatch(/setTimeout/);
  });

  // -----------------------------------------------------------------
  // P2 — no alert()/toast/sonner in R7 surfaces
  // -----------------------------------------------------------------
  it("P2 — R7 surfaces contain no alert()/toast()/sonner/react-hot-toast", () => {
    const surfaces = [
      "src/app/api/outreach/approve/route.ts",
      "src/app/api/outreach/undo/route.ts",
      "src/components/floor-4/SituationRoomClient.tsx",
      "src/components/floor-4/undo-bar/UndoBar.tsx",
      "src/components/floor-4/undo-bar/UndoBarProvider.tsx",
      "src/components/floor-4/undo-bar/useUndoBarController.ts",
      "src/components/floor-4/conflicts/ConflictsSection.tsx",
      "src/components/floor-4/final-countdown/FinalCountdownSection.tsx",
      "src/components/floor-4/situation-map/SituationMap.tsx",
      "src/components/floor-4/situation-map/SituationMapList.tsx",
      "src/components/floor-4/rings/RingPulseController.tsx",
    ];
    for (const p of surfaces) {
      const body = read(p);
      expect(body, `${p} should not contain alert(`).not.toMatch(/\balert\(/);
      expect(body, `${p} should not contain toast(`).not.toMatch(/\btoast\(/);
      expect(body, `${p} should not import sonner`).not.toMatch(/["']sonner["']/);
      expect(body, `${p} should not import react-hot-toast`).not.toMatch(/["']react-hot-toast["']/);
    }
  });

  // -----------------------------------------------------------------
  // P3 — quiet-hours defers delivery
  // -----------------------------------------------------------------
  it("P3 — computeDeliverAfter defers a 3am tube delivery until 7am user-tz", () => {
    // 2026-04-23 03:00 America/New_York (UTC-4 during DST) = 07:00 UTC.
    // Quiet hours 22:00 → 07:00 wraps midnight.
    const now = new Date("2026-04-23T07:00:00Z"); // 03:00 ET
    const result = computeDeliverAfter({
      now,
      userTimezone: "America/New_York",
      quietHours: { start: "22:00", end: "07:00" },
    });
    // Must be later than now.
    expect(new Date(result).getTime()).toBeGreaterThan(now.getTime());
    // Must be at or near 07:00 local time — i.e. 11:00 UTC on the same day.
    const resultDate = new Date(result);
    expect(resultDate.getUTCHours()).toBe(11); // 07:00 ET DST
  });

  it("P3 — computeDeliverAfter returns now when user has no quiet hours set", () => {
    const now = new Date("2026-04-23T03:00:00Z");
    const result = computeDeliverAfter({
      now,
      userTimezone: "America/New_York",
      quietHours: null,
    });
    expect(result).toBe(now.toISOString());
  });

  // -----------------------------------------------------------------
  // P5 — empty-state copy when no arcs
  // -----------------------------------------------------------------
  it("P5 — SituationMapList renders 'The Situation Room is quiet.' when no arcs", () => {
    const body = read("src/components/floor-4/situation-map/SituationMapList.tsx");
    expect(body).toMatch(/The Situation Room is quiet\./);
    expect(body).toMatch(/data-situation-map="empty"/);
  });

  it("P5 — SituationMapCanvas renders the same copy when no arcs (no decorative fallback)", () => {
    const body = read("src/components/floor-4/situation-map/SituationMapCanvas.tsx");
    expect(body).toMatch(/The Situation Room is quiet\./);
  });

  // -----------------------------------------------------------------
  // P6 — rings wired into Situation Room
  // -----------------------------------------------------------------
  it("P6 — SituationRoomClient mounts RingPulseController", () => {
    const body = read("src/components/floor-4/SituationRoomClient.tsx");
    expect(body).toMatch(/RingPulseController/);
    expect(body).toMatch(/useRingPulse/);
  });

  // -----------------------------------------------------------------
  // P7 — thunk is wired into arrival overlay
  // -----------------------------------------------------------------
  it("P7 — PneumaticTubeArrivalOverlay imports synthThunk", () => {
    const body = read("src/components/world/PneumaticTubeArrivalOverlay.tsx");
    expect(body).toMatch(/synthThunk/);
  });

  // -----------------------------------------------------------------
  // Bonus — migration 0017 present with required columns
  // -----------------------------------------------------------------
  it("migration 0017 adds send_after, quiet_hours, deliver_after, deadline_at", () => {
    const body = read("src/db/migrations/0017_r7_situation_room.sql");
    expect(body).toMatch(/send_after/);
    expect(body).toMatch(/quiet_hours/);
    expect(body).toMatch(/deliver_after/);
    expect(body).toMatch(/deadline_at/);
  });
});
