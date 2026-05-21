// src/lib/artlab/speed/regression-gate.test.ts
import { describe, expect, it } from "vitest";
import { assertNoSpeedRegression } from "./regression-gate";

describe("speed regression gate", () => {
  it("passes when prDurationMs ≤ baseline * 1.1", () => {
    const result = assertNoSpeedRegression({ baselineMs: 1000, prMs: 1050 });
    expect(result.passed).toBe(true);
  });

  it("passes when PR is FASTER than baseline", () => {
    const result = assertNoSpeedRegression({ baselineMs: 1000, prMs: 700 });
    expect(result.passed).toBe(true);
  });

  it("fails when prDurationMs > baseline * 1.1", () => {
    const result = assertNoSpeedRegression({ baselineMs: 1000, prMs: 1101 });
    expect(result.passed).toBe(false);
    expect(result.regressionPercent).toBeGreaterThan(10);
  });
});
