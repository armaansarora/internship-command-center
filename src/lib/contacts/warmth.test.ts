import { describe, it, expect } from "vitest";
import { computeWarmth, computeWarmthTier, WARMTH_PALETTE } from "./warmth";

describe("R8 P2 — computeWarmth", () => {
  const now = new Date("2026-04-23T12:00:00Z");

  it("returns 100 for contact touched within the same day", () => {
    expect(computeWarmth(new Date("2026-04-23T00:00:01Z"), now)).toBe(100);
  });

  it("linear decay: 100 - days*2", () => {
    for (const days of [1, 5, 10, 25, 40, 49]) {
      const last = new Date(now.getTime() - days * 86_400_000);
      expect(computeWarmth(last, now)).toBe(Math.max(0, 100 - days * 2));
    }
  });

  it("floors at 0 past 50 days", () => {
    const last = new Date(now.getTime() - 120 * 86_400_000);
    expect(computeWarmth(last, now)).toBe(0);
  });

  it("returns 0 when lastContactAt is null", () => {
    expect(computeWarmth(null, now)).toBe(0);
  });

  it("is bounded: future timestamps clamp to 100 not >100", () => {
    expect(computeWarmth(new Date(now.getTime() + 86_400_000), now)).toBe(100);
  });
});

describe("computeWarmthTier (cool-blue palette, no red)", () => {
  it("hot tier for 0-2 days since contact (warmth 94-100)", () => {
    expect(computeWarmthTier(100)).toBe("hot");
    expect(computeWarmthTier(96)).toBe("hot");
    expect(computeWarmthTier(94)).toBe("hot");
  });
  it("warm tier for 3-5 days (warmth 88-93)", () => {
    expect(computeWarmthTier(92)).toBe("warm");
    expect(computeWarmthTier(88)).toBe("warm");
  });
  it("neutral tier for 7-13 days (warmth 74-87)", () => {
    expect(computeWarmthTier(86)).toBe("neutral");
    expect(computeWarmthTier(74)).toBe("neutral");
  });
  it("cooling tier for 14-29 days (warmth 42-73)", () => {
    expect(computeWarmthTier(72)).toBe("cooling");
    expect(computeWarmthTier(42)).toBe("cooling");
  });
  it("cold tier for 30+ days (warmth <42)", () => {
    expect(computeWarmthTier(40)).toBe("cold");
    expect(computeWarmthTier(0)).toBe("cold");
  });
});

describe("WARMTH_PALETTE has zero red hex codes", () => {
  const FORBIDDEN_PATTERNS: RegExp[] = [
    /#ef4{2,}/i,
    /#f44336/i,
    /#dc[0-9a-f]{4}/i,
    /#b91c1c/i,
  ];

  it("no tier contains a red hex code in bg, edge, or text", () => {
    for (const tier of Object.keys(WARMTH_PALETTE) as (keyof typeof WARMTH_PALETTE)[]) {
      const e = WARMTH_PALETTE[tier];
      for (const val of [e.bg, e.edge, e.text]) {
        for (const forbid of FORBIDDEN_PATTERNS) {
          expect(val).not.toMatch(forbid);
        }
      }
    }
  });

  it("cold tier is in the cool-blue family (hue > 180°)", () => {
    const cold = WARMTH_PALETTE.cold;
    expect(cold.bg.toLowerCase()).toBe("#9ba9b8");
    expect(cold.edge.toLowerCase()).toBe("#6e7e8f");
  });
});
