/**
 * Unit tests for `computeFunnelMetrics` (PR2 — Activation Funnel Dashboard).
 *
 * Pure-logic coverage: zero-denominator handling, all-success, all-abandon,
 * partial-success, and explicit healthy / below-target / kill thresholds for
 * each of the five derivable metrics on the ladder. The sixth row
 * (cost_per_activation_usd) is exercised via cost-observer; here we only
 * assert that funnel-rollup emits a null observed + below_target placeholder
 * so the dashboard always renders seven rows. The D30 row mirrors D1 / D7
 * but is only populated when the caller supplies `activatedUsersD30` — when
 * the field is undefined, the row surfaces a null observed + below_target
 * placeholder, just like the cost row.
 */

import { describe, expect, it } from "vitest";

import {
  computeFunnelMetrics,
  type FunnelMetricsInput,
} from "@/lib/analytics/funnel-rollup";
import {
  ACTIVATION_BEATS,
  type ActivationBeat,
} from "@/lib/analytics/activation-metrics";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

interface MutableBeatCounts {
  success: number;
  abandon: number;
  skipped: number;
  error: number;
}

const ZERO_COUNTS: MutableBeatCounts = {
  success: 0,
  abandon: 0,
  skipped: 0,
  error: 0,
};

function buildBeats(
  overrides: Partial<Record<ActivationBeat, Partial<MutableBeatCounts>>> = {},
): FunnelMetricsInput["beats"] {
  const out = {} as Record<ActivationBeat, MutableBeatCounts>;
  for (const beat of ACTIVATION_BEATS) {
    out[beat] = { ...ZERO_COUNTS, ...(overrides[beat] ?? {}) };
  }
  return out;
}

function buildInput(
  overrides: Partial<FunnelMetricsInput> = {},
): FunnelMetricsInput {
  return {
    beats: buildBeats(),
    uniqueLanding: 0,
    uniqueSignin: 0,
    activatedUsersD1: 0,
    activatedUsersD7: 0,
    totalActivations: 0,
    ...overrides,
  };
}

function readingFor(
  result: ReturnType<typeof computeFunnelMetrics>,
  key: string,
) {
  const row = result.find((r) => r.key === key);
  if (!row) throw new Error(`No reading for key: ${key}`);
  return row;
}

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

describe("computeFunnelMetrics — shape", () => {
  it("emits one row per ladder entry, in ladder order", () => {
    const result = computeFunnelMetrics(buildInput());
    expect(result.map((r) => r.key)).toEqual([
      "landing_to_signin",
      "signin_to_first_app_5min",
      "first_app_to_first_action",
      "d1_return_activated",
      "d7_return",
      "d30_return",
      "cost_per_activation_usd",
    ]);
  });

  it("carries target / killThreshold / unit / description through from the ladder", () => {
    const result = computeFunnelMetrics(buildInput());
    const row = readingFor(result, "landing_to_signin");
    expect(row.target).toBe(0.22);
    expect(row.killThreshold).toBe(0.12);
    expect(row.unit).toBe("ratio");
    expect(row.description).toBe("Landing → Google sign-in");
  });

  it("leaves the cost row to cost-observer (observed null, health below_target placeholder)", () => {
    const result = computeFunnelMetrics(
      buildInput({
        uniqueLanding: 100,
        uniqueSignin: 50,
        activatedUsersD1: 10,
        activatedUsersD7: 5,
        totalActivations: 20,
      }),
    );
    const cost = readingFor(result, "cost_per_activation_usd");
    expect(cost.observed).toBeNull();
    expect(cost.health).toBe("below_target");
    expect(cost.unit).toBe("usd");
  });
});

// ---------------------------------------------------------------------------
// Zero-denominator handling
// ---------------------------------------------------------------------------

describe("computeFunnelMetrics — zero-denominator", () => {
  it("returns observed null + below_target for every ratio metric when all inputs are zero", () => {
    const result = computeFunnelMetrics(buildInput());
    for (const row of result) {
      if (row.unit !== "ratio") continue;
      expect(row.observed).toBeNull();
      expect(row.health).toBe("below_target");
    }
  });

  it("landing_to_signin returns null observed when uniqueLanding is 0 even with sign-ins (defensive)", () => {
    const result = computeFunnelMetrics(
      buildInput({ uniqueLanding: 0, uniqueSignin: 7 }),
    );
    const row = readingFor(result, "landing_to_signin");
    expect(row.observed).toBeNull();
  });

  it("signin_to_first_app returns null observed when uniqueSignin is 0", () => {
    const result = computeFunnelMetrics(
      buildInput({
        beats: buildBeats({
          war_room_reveal: { success: 5 },
          google_connect: { success: 5 },
        }),
        uniqueSignin: 0,
      }),
    );
    const row = readingFor(result, "signin_to_first_app_5min");
    expect(row.observed).toBeNull();
  });

  it("first_app_to_first_action returns null when no first-app fired (denominator 0)", () => {
    const result = computeFunnelMetrics(
      buildInput({
        beats: buildBeats({ cro_recommendation: { success: 4 } }),
      }),
    );
    const row = readingFor(result, "first_app_to_first_action");
    expect(row.observed).toBeNull();
  });

  it("d1 / d7 return null when totalActivations is 0", () => {
    const result = computeFunnelMetrics(
      buildInput({ activatedUsersD1: 3, activatedUsersD7: 2 }),
    );
    expect(readingFor(result, "d1_return_activated").observed).toBeNull();
    expect(readingFor(result, "d7_return").observed).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// All-success / all-abandon
// ---------------------------------------------------------------------------

describe("computeFunnelMetrics — extremes", () => {
  it("all-success funnel yields ratios of 1 and above_target health", () => {
    const result = computeFunnelMetrics(
      buildInput({
        beats: buildBeats({
          // 100 sign-ins, 100 first-apps via war room (manual), no gmail
          war_room_reveal: { success: 100 },
          cro_recommendation: { success: 100 },
        }),
        uniqueLanding: 100,
        uniqueSignin: 100,
        activatedUsersD1: 100,
        activatedUsersD7: 100,
        totalActivations: 100,
      }),
    );

    expect(readingFor(result, "landing_to_signin").observed).toBe(1);
    expect(readingFor(result, "landing_to_signin").health).toBe("above_target");

    expect(readingFor(result, "signin_to_first_app_5min").observed).toBe(1);
    expect(readingFor(result, "signin_to_first_app_5min").health).toBe(
      "above_target",
    );

    expect(readingFor(result, "first_app_to_first_action").observed).toBe(1);
    expect(readingFor(result, "first_app_to_first_action").health).toBe(
      "above_target",
    );

    expect(readingFor(result, "d1_return_activated").observed).toBe(1);
    expect(readingFor(result, "d7_return").observed).toBe(1);
  });

  it("all-abandon funnel yields 0-numerator ratios classified as kill (observed < kill threshold)", () => {
    const result = computeFunnelMetrics(
      buildInput({
        beats: buildBeats({
          // Lots of abandons, zero successes at the conversion-driving beats
          lobby_reveal: { abandon: 100 },
          intake: { abandon: 100 },
          google_connect: { abandon: 100 },
          war_room_reveal: { abandon: 100 },
          cro_recommendation: { abandon: 100 },
        }),
        uniqueLanding: 100,
        uniqueSignin: 100,
        activatedUsersD1: 0,
        activatedUsersD7: 0,
        totalActivations: 100,
      }),
    );

    // landing_to_signin = 100 / 100 = 1.0 — above target
    expect(readingFor(result, "landing_to_signin").health).toBe("above_target");
    // signin_to_first_app = 0 / 100 = 0 — below kill (0.35) -> kill
    expect(readingFor(result, "signin_to_first_app_5min").observed).toBe(0);
    expect(readingFor(result, "signin_to_first_app_5min").health).toBe("kill");
    // first_app_to_first_action: denominator 0 -> null observed
    expect(readingFor(result, "first_app_to_first_action").observed).toBeNull();
    // d1 / d7 with 0 numerator and positive denominator -> 0 -> kill
    expect(readingFor(result, "d1_return_activated").observed).toBe(0);
    expect(readingFor(result, "d1_return_activated").health).toBe("kill");
    expect(readingFor(result, "d7_return").observed).toBe(0);
    expect(readingFor(result, "d7_return").health).toBe("kill");
  });
});

// ---------------------------------------------------------------------------
// Numerator policy (signin -> first_app union)
// ---------------------------------------------------------------------------

describe("computeFunnelMetrics — first-app numerator policy", () => {
  it("counts war_room_reveal.success + google_connect.success as the first-app union", () => {
    const result = computeFunnelMetrics(
      buildInput({
        beats: buildBeats({
          war_room_reveal: { success: 30 },
          google_connect: { success: 30 },
        }),
        uniqueSignin: 100,
      }),
    );
    // (30 + 30) / 100 = 0.6 exactly -> at target -> above_target
    expect(readingFor(result, "signin_to_first_app_5min").observed).toBe(0.6);
    expect(readingFor(result, "signin_to_first_app_5min").health).toBe(
      "above_target",
    );
  });

  it("uses the same union as the denominator for first_app_to_first_action", () => {
    const result = computeFunnelMetrics(
      buildInput({
        beats: buildBeats({
          war_room_reveal: { success: 10 },
          google_connect: { success: 10 },
          cro_recommendation: { success: 9 },
        }),
      }),
    );
    // 9 / (10 + 10) = 0.45 -> exactly at target
    expect(readingFor(result, "first_app_to_first_action").observed).toBe(0.45);
    expect(readingFor(result, "first_app_to_first_action").health).toBe(
      "above_target",
    );
  });

  it("ignores abandon / skipped / error outcomes when computing the union", () => {
    const result = computeFunnelMetrics(
      buildInput({
        beats: buildBeats({
          war_room_reveal: { success: 5, abandon: 50, error: 20 },
          google_connect: { success: 5, abandon: 30, skipped: 40 },
        }),
        uniqueSignin: 100,
      }),
    );
    // (5 + 5) / 100 = 0.10 — kill (< 0.35 threshold)
    expect(readingFor(result, "signin_to_first_app_5min").observed).toBeCloseTo(
      0.1,
      10,
    );
    expect(readingFor(result, "signin_to_first_app_5min").health).toBe("kill");
  });
});

// ---------------------------------------------------------------------------
// Threshold boundaries — landing_to_signin (target 0.22, kill 0.12)
// ---------------------------------------------------------------------------

describe("computeFunnelMetrics — landing_to_signin thresholds", () => {
  it("at exactly target (0.22) is above_target (>= target wins)", () => {
    const result = computeFunnelMetrics(
      buildInput({ uniqueLanding: 100, uniqueSignin: 22 }),
    );
    expect(readingFor(result, "landing_to_signin").observed).toBeCloseTo(
      0.22,
      10,
    );
    expect(readingFor(result, "landing_to_signin").health).toBe("above_target");
  });

  it("just below target (0.219) is below_target", () => {
    const result = computeFunnelMetrics(
      buildInput({ uniqueLanding: 1000, uniqueSignin: 219 }),
    );
    expect(readingFor(result, "landing_to_signin").health).toBe(
      "below_target",
    );
  });

  it("at exactly kill (0.12) is below_target (>= kill wins; < kill kills)", () => {
    const result = computeFunnelMetrics(
      buildInput({ uniqueLanding: 100, uniqueSignin: 12 }),
    );
    expect(readingFor(result, "landing_to_signin").observed).toBeCloseTo(
      0.12,
      10,
    );
    expect(readingFor(result, "landing_to_signin").health).toBe(
      "below_target",
    );
  });

  it("just below kill (0.119) is kill", () => {
    const result = computeFunnelMetrics(
      buildInput({ uniqueLanding: 1000, uniqueSignin: 119 }),
    );
    expect(readingFor(result, "landing_to_signin").health).toBe("kill");
  });
});

// ---------------------------------------------------------------------------
// Threshold boundaries — d1_return_activated (target 0.4, kill 0.25)
// ---------------------------------------------------------------------------

describe("computeFunnelMetrics — d1_return_activated thresholds", () => {
  it("above target → above_target", () => {
    const result = computeFunnelMetrics(
      buildInput({ activatedUsersD1: 50, totalActivations: 100 }),
    );
    expect(readingFor(result, "d1_return_activated").health).toBe(
      "above_target",
    );
  });

  it("between kill and target → below_target", () => {
    const result = computeFunnelMetrics(
      buildInput({ activatedUsersD1: 30, totalActivations: 100 }),
    );
    expect(readingFor(result, "d1_return_activated").health).toBe(
      "below_target",
    );
  });

  it("below kill → kill", () => {
    const result = computeFunnelMetrics(
      buildInput({ activatedUsersD1: 10, totalActivations: 100 }),
    );
    expect(readingFor(result, "d1_return_activated").health).toBe("kill");
  });
});

// ---------------------------------------------------------------------------
// Threshold boundaries — d7_return (target 0.25, kill 0.12)
// ---------------------------------------------------------------------------

describe("computeFunnelMetrics — d7_return thresholds", () => {
  it("above target → above_target", () => {
    const result = computeFunnelMetrics(
      buildInput({ activatedUsersD7: 30, totalActivations: 100 }),
    );
    expect(readingFor(result, "d7_return").health).toBe("above_target");
  });

  it("between kill and target → below_target", () => {
    const result = computeFunnelMetrics(
      buildInput({ activatedUsersD7: 20, totalActivations: 100 }),
    );
    expect(readingFor(result, "d7_return").health).toBe("below_target");
  });

  it("below kill → kill", () => {
    const result = computeFunnelMetrics(
      buildInput({ activatedUsersD7: 5, totalActivations: 100 }),
    );
    expect(readingFor(result, "d7_return").health).toBe("kill");
  });
});

// ---------------------------------------------------------------------------
// D30 retention — null when missing, derived when supplied
// ---------------------------------------------------------------------------

describe("computeFunnelMetrics — d30_return", () => {
  it("emits null observed + below_target when activatedUsersD30 is undefined", () => {
    const result = computeFunnelMetrics(
      buildInput({ totalActivations: 100 }),
    );
    const row = readingFor(result, "d30_return");
    expect(row.observed).toBeNull();
    expect(row.health).toBe("below_target");
  });

  it("derives the ratio when activatedUsersD30 is supplied", () => {
    const result = computeFunnelMetrics(
      buildInput({ activatedUsersD30: 22, totalActivations: 100 }),
    );
    const row = readingFor(result, "d30_return");
    expect(row.observed).toBe(0.22);
    expect(row.health).toBe("above_target"); // target = 0.18
  });

  it("classifies below_target between kill (0.08) and target (0.18)", () => {
    const result = computeFunnelMetrics(
      buildInput({ activatedUsersD30: 12, totalActivations: 100 }),
    );
    expect(readingFor(result, "d30_return").health).toBe("below_target");
  });

  it("classifies kill when below the floor (0.08)", () => {
    const result = computeFunnelMetrics(
      buildInput({ activatedUsersD30: 5, totalActivations: 100 }),
    );
    expect(readingFor(result, "d30_return").health).toBe("kill");
  });

  it("returns null observed when totalActivations is 0 even with a D30 reading", () => {
    const result = computeFunnelMetrics(
      buildInput({ activatedUsersD30: 10, totalActivations: 0 }),
    );
    expect(readingFor(result, "d30_return").observed).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Partial-success realistic mixes
// ---------------------------------------------------------------------------

describe("computeFunnelMetrics — partial-success realistic mix", () => {
  it("classifies every metric correctly for a healthy-but-imperfect funnel", () => {
    const result = computeFunnelMetrics(
      buildInput({
        beats: buildBeats({
          war_room_reveal: { success: 40, abandon: 10 },
          google_connect: { success: 30, abandon: 20 },
          cro_recommendation: { success: 50, abandon: 20 },
        }),
        uniqueLanding: 500,
        uniqueSignin: 100,
        activatedUsersD1: 30,
        activatedUsersD7: 18,
        totalActivations: 60,
      }),
    );

    // landing_to_signin = 100/500 = 0.20 — between kill (0.12) and target (0.22)
    expect(readingFor(result, "landing_to_signin").observed).toBeCloseTo(
      0.2,
      10,
    );
    expect(readingFor(result, "landing_to_signin").health).toBe(
      "below_target",
    );

    // signin_to_first_app = (40+30)/100 = 0.70 — above target (0.6)
    expect(readingFor(result, "signin_to_first_app_5min").observed).toBeCloseTo(
      0.7,
      10,
    );
    expect(readingFor(result, "signin_to_first_app_5min").health).toBe(
      "above_target",
    );

    // first_app_to_first_action = 50/(40+30) = 5/7 ~= 0.714 — above target (0.45)
    expect(
      readingFor(result, "first_app_to_first_action").observed,
    ).toBeCloseTo(50 / 70, 10);
    expect(readingFor(result, "first_app_to_first_action").health).toBe(
      "above_target",
    );

    // d1 = 30/60 = 0.5 — above target (0.4)
    expect(readingFor(result, "d1_return_activated").observed).toBe(0.5);
    expect(readingFor(result, "d1_return_activated").health).toBe(
      "above_target",
    );

    // d7 = 18/60 = 0.3 — above target (0.25)
    expect(readingFor(result, "d7_return").observed).toBe(0.3);
    expect(readingFor(result, "d7_return").health).toBe("above_target");
  });

  it("flags multiple kills simultaneously in a collapsed funnel", () => {
    const result = computeFunnelMetrics(
      buildInput({
        beats: buildBeats({
          war_room_reveal: { success: 5 },
          google_connect: { success: 5 },
          cro_recommendation: { success: 1 },
        }),
        uniqueLanding: 1000,
        uniqueSignin: 100,
        activatedUsersD1: 5,
        activatedUsersD7: 2,
        totalActivations: 100,
      }),
    );

    // 100/1000 = 0.10 → below kill (0.12)
    expect(readingFor(result, "landing_to_signin").health).toBe("kill");
    // (5+5)/100 = 0.10 → below kill (0.35)
    expect(readingFor(result, "signin_to_first_app_5min").health).toBe("kill");
    // 1/10 = 0.10 → below kill (0.25)
    expect(readingFor(result, "first_app_to_first_action").health).toBe(
      "kill",
    );
    // 5/100 = 0.05 → below kill (0.25)
    expect(readingFor(result, "d1_return_activated").health).toBe("kill");
    // 2/100 = 0.02 → below kill (0.12)
    expect(readingFor(result, "d7_return").health).toBe("kill");
  });
});
