/**
 * Unit tests for `computeObservedCostPerActivation` (PR2 — Activation Funnel
 * Dashboard).
 *
 * Cost metric — single ladder row, `unit: "usd"`, lower is better:
 *   target = 0.05 USD per activation
 *   kill   = 0.15 USD per activation
 *
 * Health classification per spec:
 *   observed > kill   → "kill"
 *   observed > target → "below_target"
 *   else              → "above_target"
 */

import { describe, expect, it } from "vitest";

import {
  computeObservedCostPerActivation,
  type CostObserverInput,
} from "@/lib/analytics/cost-observer";

const COST_TARGET = 0.05 as const;
const COST_KILL = 0.15 as const;

function makeInput(
  overrides: Partial<CostObserverInput> = {},
): CostObserverInput {
  return { totalCostUsd: 0, totalActivations: 0, ...overrides };
}

// ---------------------------------------------------------------------------
// Zero / invalid denominators
// ---------------------------------------------------------------------------

describe("computeObservedCostPerActivation — zero / invalid denominators", () => {
  it("returns observed null + below_target when totalActivations is 0", () => {
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: 100, totalActivations: 0 }),
    );
    expect(result.observed).toBeNull();
    expect(result.health).toBe("below_target");
  });

  it("returns observed null when both inputs are 0", () => {
    const result = computeObservedCostPerActivation(makeInput());
    expect(result.observed).toBeNull();
    expect(result.health).toBe("below_target");
  });

  it("returns observed null when totalCostUsd is negative (defensive guard)", () => {
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: -10, totalActivations: 5 }),
    );
    expect(result.observed).toBeNull();
  });

  it("returns observed null when totalActivations is negative", () => {
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: 10, totalActivations: -1 }),
    );
    expect(result.observed).toBeNull();
  });

  it("returns observed null when an input is NaN", () => {
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: Number.NaN, totalActivations: 5 }),
    );
    expect(result.observed).toBeNull();
  });

  it("returns observed null when an input is Infinity", () => {
    const result = computeObservedCostPerActivation(
      makeInput({
        totalCostUsd: Number.POSITIVE_INFINITY,
        totalActivations: 5,
      }),
    );
    expect(result.observed).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Above target (healthy)
// ---------------------------------------------------------------------------

describe("computeObservedCostPerActivation — above_target health", () => {
  it("zero cost, positive activations → observed 0, above_target", () => {
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: 0, totalActivations: 100 }),
    );
    expect(result.observed).toBe(0);
    expect(result.health).toBe("above_target");
  });

  it("below target → above_target", () => {
    // $1 spread across 100 activations = $0.01 per activation
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: 1, totalActivations: 100 }),
    );
    expect(result.observed).toBe(0.01);
    expect(result.health).toBe("above_target");
  });

  it("exactly at target (0.05) is above_target (>= target wins, not >)", () => {
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: 5, totalActivations: 100 }),
    );
    expect(result.observed).toBeCloseTo(COST_TARGET, 10);
    expect(result.health).toBe("above_target");
  });
});

// ---------------------------------------------------------------------------
// Below target (warning zone)
// ---------------------------------------------------------------------------

describe("computeObservedCostPerActivation — below_target health", () => {
  it("just above target ($0.06) is below_target", () => {
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: 6, totalActivations: 100 }),
    );
    expect(result.observed).toBeCloseTo(0.06, 10);
    expect(result.health).toBe("below_target");
  });

  it("at exactly kill threshold (0.15) is below_target (> kill kills, not >=)", () => {
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: 15, totalActivations: 100 }),
    );
    expect(result.observed).toBeCloseTo(COST_KILL, 10);
    expect(result.health).toBe("below_target");
  });

  it("anywhere between target and kill is below_target", () => {
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: 10, totalActivations: 100 }),
    );
    expect(result.observed).toBeCloseTo(0.1, 10);
    expect(result.health).toBe("below_target");
  });
});

// ---------------------------------------------------------------------------
// Kill (above ceiling)
// ---------------------------------------------------------------------------

describe("computeObservedCostPerActivation — kill health", () => {
  it("just above kill ($0.16) is kill", () => {
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: 16, totalActivations: 100 }),
    );
    expect(result.observed).toBeCloseTo(0.16, 10);
    expect(result.health).toBe("kill");
  });

  it("catastrophic spend → kill", () => {
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: 1000, totalActivations: 10 }),
    );
    expect(result.observed).toBe(100);
    expect(result.health).toBe("kill");
  });

  it("a single activation with kill-threshold-busting spend → kill", () => {
    // 1 activation, $0.20 spent = $0.20 per activation, kill is $0.15
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: 0.2, totalActivations: 1 }),
    );
    expect(result.observed).toBeCloseTo(0.2, 10);
    expect(result.health).toBe("kill");
  });
});

// ---------------------------------------------------------------------------
// Realistic mixes
// ---------------------------------------------------------------------------

describe("computeObservedCostPerActivation — realistic mixes", () => {
  it("a healthy week: $4.20 across 100 activations is above_target", () => {
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: 4.2, totalActivations: 100 }),
    );
    expect(result.observed).toBeCloseTo(0.042, 10);
    expect(result.health).toBe("above_target");
  });

  it("a warning week: $8 across 100 activations is below_target", () => {
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: 8, totalActivations: 100 }),
    );
    expect(result.observed).toBeCloseTo(0.08, 10);
    expect(result.health).toBe("below_target");
  });

  it("a dying week: $20 across 100 activations is kill", () => {
    const result = computeObservedCostPerActivation(
      makeInput({ totalCostUsd: 20, totalActivations: 100 }),
    );
    expect(result.observed).toBeCloseTo(0.2, 10);
    expect(result.health).toBe("kill");
  });
});
