/**
 * R10.8 — pin-color pure function tests.
 *
 * Maps an offer's base comp to a semantic colour channel keyed to the
 * market percentile bands:
 *   - `< p25`   → red  (below market)
 *   - `> p75`   → gold (above market)
 *   - otherwise → ink  (in-band)
 *
 * Boundary rule (non-negotiable): exactly p25 and exactly p75 return
 * "ink" — the `<` and `>` are strict. The R10.8 partner brief is explicit
 * that hitting the rail exactly is not "below" or "above" market.
 */
import { describe, it, expect } from "vitest";
import { colorForPercentile } from "../pin-color";

describe("colorForPercentile", () => {
  it("red below p25", () => {
    expect(colorForPercentile(80000, 100000, 140000)).toBe("red");
  });
  it("gold above p75", () => {
    expect(colorForPercentile(160000, 100000, 140000)).toBe("gold");
  });
  it("ink between p25 and p75", () => {
    expect(colorForPercentile(120000, 100000, 140000)).toBe("ink");
  });
  it("exactly p25 is ink (not red)", () => {
    expect(colorForPercentile(100000, 100000, 140000)).toBe("ink");
  });
  it("exactly p75 is ink (not gold)", () => {
    expect(colorForPercentile(140000, 100000, 140000)).toBe("ink");
  });
});
