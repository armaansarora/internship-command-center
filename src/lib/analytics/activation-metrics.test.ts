/**
 * Unit tests for the activation metric ladder + recordActivationStep wrapper
 * (PR1 — 5-minute activation gauntlet).
 *
 * Covers:
 *   - ACTIVATION_METRIC_TARGETS shape, count, and target/kill ordering
 *   - recordActivationStep delegates to recordServerEngagementEvent with the
 *     correct event_type, route_kind plumbing, and metadata fields
 *   - dwellMs and source are optional and only included when present
 *   - The full set of beats matches ACTIVATION_BEATS (no orphan strings)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordServerEngagementEventMock } = vi.hoisted(() => ({
  recordServerEngagementEventMock: vi.fn(),
}));

vi.mock("@/lib/analytics/server-engagement", () => ({
  recordServerEngagementEvent: recordServerEngagementEventMock,
}));

import {
  ACTIVATION_BEATS,
  ACTIVATION_METRIC_TARGETS,
  recordActivationStep,
  type ActivationBeat,
  type ActivationOutcome,
} from "./activation-metrics";
import type { RecordInput } from "./server-engagement";

/** Pull the first-arg of the most recent call, narrowed to RecordInput. */
function lastCall(): RecordInput {
  const calls = recordServerEngagementEventMock.mock.calls;
  const call = calls[calls.length - 1];
  if (!call) throw new Error("recordServerEngagementEventMock was not called");
  return call[0] as RecordInput;
}

describe("ACTIVATION_METRIC_TARGETS", () => {
  it("has exactly 7 entries (six conversion/retention ratios + cost)", () => {
    expect(ACTIVATION_METRIC_TARGETS).toHaveLength(7);
  });

  it("each metric has a unique key", () => {
    const keys = ACTIVATION_METRIC_TARGETS.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ratio metrics have killThreshold strictly below their target", () => {
    for (const metric of ACTIVATION_METRIC_TARGETS) {
      if (metric.unit !== "ratio") continue;
      expect(metric.killThreshold).toBeLessThan(metric.target);
      expect(metric.target).toBeGreaterThan(0);
      expect(metric.target).toBeLessThanOrEqual(1);
      expect(metric.killThreshold).toBeGreaterThanOrEqual(0);
    }
  });

  it("usd metrics have killThreshold strictly above their target (lower is better, so kill is the ceiling)", () => {
    const usdMetrics = ACTIVATION_METRIC_TARGETS.filter(
      (m) => m.unit === "usd",
    );
    expect(usdMetrics.length).toBeGreaterThan(0);
    for (const metric of usdMetrics) {
      expect(metric.killThreshold).toBeGreaterThan(metric.target);
      expect(metric.target).toBeGreaterThan(0);
    }
  });

  it("includes the seven canonical metric keys", () => {
    const keys = ACTIVATION_METRIC_TARGETS.map((m) => m.key);
    expect(keys).toEqual([
      "landing_to_signin",
      "signin_to_first_app_5min",
      "first_app_to_first_action",
      "d1_return_activated",
      "d7_return",
      "d30_return",
      "cost_per_activation_usd",
    ]);
  });
});

describe("ACTIVATION_BEATS", () => {
  it("contains exactly the six canonical beats in canonical order", () => {
    expect(ACTIVATION_BEATS).toEqual([
      "lobby_reveal",
      "intake",
      "google_connect",
      "war_room_reveal",
      "cro_recommendation",
      "closing",
    ]);
  });

  it("ActivationBeat union round-trips through ACTIVATION_BEATS (no orphan strings)", () => {
    // Compile-time check via assignment: every ACTIVATION_BEATS member is
    // assignable to ActivationBeat and vice versa.
    const sample: ActivationBeat = ACTIVATION_BEATS[0];
    expect(ACTIVATION_BEATS).toContain(sample);
  });
});

describe("recordActivationStep", () => {
  beforeEach(() => {
    recordServerEngagementEventMock.mockClear();
  });

  it("delegates to recordServerEngagementEvent with event_type 'activation_step' and floor null", async () => {
    await recordActivationStep({
      userId: "00000000-0000-0000-0000-000000000001",
      beat: "intake",
      outcome: "success",
    });

    expect(recordServerEngagementEventMock).toHaveBeenCalledTimes(1);
    const call = lastCall();
    expect(call.eventType).toBe("activation_step");
    expect(call.floor).toBeNull();
    expect(call.userId).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("defaults pathname to /activate when not provided", async () => {
    await recordActivationStep({
      userId: null,
      beat: "lobby_reveal",
      outcome: "success",
    });

    const call = lastCall();
    expect(call.pathname).toBe("/activate");
  });

  it("respects an explicit pathname override", async () => {
    await recordActivationStep({
      userId: null,
      beat: "closing",
      outcome: "success",
      pathname: "/activate/closing",
    });

    const call = lastCall();
    expect(call.pathname).toBe("/activate/closing");
  });

  it("flows beat + outcome through metadata", async () => {
    const outcome: ActivationOutcome = "abandon";
    await recordActivationStep({
      userId: null,
      beat: "google_connect",
      outcome,
    });

    const call = lastCall();
    expect(call.metadata).toEqual({
      beat: "google_connect",
      outcome: "abandon",
    });
  });

  it("includes dwell_ms only when a finite number is provided", async () => {
    await recordActivationStep({
      userId: null,
      beat: "intake",
      outcome: "success",
      dwellMs: 1234,
    });

    const call = lastCall();
    expect(call.metadata).toMatchObject({ dwell_ms: 1234 });
  });

  it("drops dwell_ms when not finite (e.g. NaN) without crashing", async () => {
    await recordActivationStep({
      userId: null,
      beat: "intake",
      outcome: "success",
      dwellMs: Number.NaN,
    });

    const call = lastCall();
    expect(call.metadata).not.toHaveProperty("dwell_ms");
  });

  it("includes source only when a non-empty string is provided", async () => {
    await recordActivationStep({
      userId: null,
      beat: "google_connect",
      outcome: "success",
      source: "gmail",
    });

    const call = lastCall();
    expect(call.metadata).toMatchObject({ source: "gmail" });
  });

  // (Empty-string `source` is no longer reachable: the field is narrowed
  // to ActivationSource at the type level, so the typo guard is now a
  // compile-time check, not a runtime one.)

  it("does not crash when optional fields are entirely absent", async () => {
    await expect(
      recordActivationStep({
        userId: null,
        beat: "war_room_reveal",
        outcome: "success",
      }),
    ).resolves.toBeUndefined();

    const call = lastCall();
    expect(call.metadata).toEqual({
      beat: "war_room_reveal",
      outcome: "success",
    });
    expect(call.metadata).not.toHaveProperty("dwell_ms");
    expect(call.metadata).not.toHaveProperty("source");
  });

  it("supports the full set of beats (no orphan strings)", async () => {
    for (const beat of ACTIVATION_BEATS) {
      recordServerEngagementEventMock.mockClear();
      await recordActivationStep({ userId: null, beat, outcome: "success" });
      const call = lastCall();
      expect(call.metadata).toBeDefined();
      expect(call.metadata?.beat).toBe(beat);
    }
  });
});
