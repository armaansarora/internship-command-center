import { describe, it, expect } from "vitest";
import { cfoQuipForPosition, positionFor, type BandPosition } from "../cfo-quip";

/**
 * CFO-quip pure-helper tests.
 *
 * The CFO delivers a comp-aware one-time quip when the user first enters
 * the Parlor after their first offer arrives. These helpers are the
 * decision core:
 *
 *   - `positionFor` — maps the offer's base + the company/role/location
 *     comp bands to one of five positions.
 *   - `cfoQuipForPosition` — maps the position (plus the numeric context
 *     needed for interpolation) to the single-sentence CFO line.
 *
 * Pure, side-effect-free, React-free. The overlay component (and the
 * Parlor route that gates on the `parlorCfoQuipShown` pref) are tested
 * elsewhere; this file proves the copy/position table alone.
 */

describe("cfoQuipForPosition", () => {
  it.each<[BandPosition, RegExp]>([
    ["below_p25", /underpricing|walk in with confidence/i],
    ["p25_to_p50", /market, not celebratory/i],
    ["p50_to_p75", /solid offer/i],
    ["above_p75", /generous|non-comp/i],
    ["thin_data", /no benchmark data/i],
  ])("returns the right copy for %s", (pos, pattern) => {
    expect(cfoQuipForPosition(pos, { base: 100000, p25: 120000 })).toMatch(pattern);
  });

  it("interpolates the underpricing percent for below_p25", () => {
    const text = cfoQuipForPosition("below_p25", { base: 80000, p25: 100000 });
    expect(text).toMatch(/\b20%/);
  });
});

describe("positionFor", () => {
  it("returns thin_data when any band is 0/undefined", () => {
    expect(positionFor(100000, 0, 120000, 140000)).toBe("thin_data");
    expect(positionFor(100000, 100000, 0, 140000)).toBe("thin_data");
  });
  it("returns below_p25 when base < p25", () => {
    expect(positionFor(80000, 100000, 120000, 140000)).toBe("below_p25");
  });
  it("returns p25_to_p50 when p25 ≤ base < p50", () => {
    expect(positionFor(100000, 100000, 120000, 140000)).toBe("p25_to_p50");
  });
  it("returns p50_to_p75 when p50 ≤ base < p75", () => {
    expect(positionFor(130000, 100000, 120000, 140000)).toBe("p50_to_p75");
  });
  it("returns above_p75 when base ≥ p75", () => {
    expect(positionFor(160000, 100000, 120000, 140000)).toBe("above_p75");
  });
});
