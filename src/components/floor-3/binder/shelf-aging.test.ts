import { describe, it, expect } from "vitest";
import { binderAging } from "./shelf-aging";

describe("binderAging", () => {
  it("zero effects when shelf size <= 5", () => {
    expect(binderAging(0, 3)).toEqual({ dust: 0, yellowing: 0, leanDeg: 0 });
    expect(binderAging(4, 5)).toEqual({ dust: 0, yellowing: 0, leanDeg: 0 });
  });

  it("dust kicks in above 5", () => {
    expect(binderAging(5, 6).dust).toBeGreaterThan(0);
  });

  it("yellowing kicks in above 10 only", () => {
    expect(binderAging(9, 10).yellowing).toBe(0);
    expect(binderAging(10, 11).yellowing).toBeGreaterThan(0);
  });

  it("lean activates above 15 and stays in [-2,2]", () => {
    expect(binderAging(10, 12).leanDeg).toBe(0);
    const a = binderAging(16, 20);
    expect(a.leanDeg).toBeGreaterThanOrEqual(-2);
    expect(a.leanDeg).toBeLessThanOrEqual(2);
  });

  it("is deterministic for same inputs", () => {
    expect(binderAging(16, 20)).toEqual(binderAging(16, 20));
  });

  it("dust is capped at 0.4", () => {
    expect(binderAging(100, 101).dust).toBeLessThanOrEqual(0.4);
  });

  it("yellowing is capped at 0.5", () => {
    expect(binderAging(100, 101).yellowing).toBeLessThanOrEqual(0.5);
  });
});
