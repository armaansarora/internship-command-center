import { describe, expect, it } from "vitest";
import { evaluateArtLabLottieValidity } from "./lottie-validity";

describe("evaluateArtLabLottieValidity", () => {
  it("passes on a minimal but valid Lottie JSON", () => {
    const lottie = JSON.stringify({
      v: "5.7.0",
      fr: 30,
      ip: 0,
      op: 30,
      w: 100,
      h: 100,
      layers: [
        { ind: 1, ty: 4, nm: "x", ip: 0, op: 30, st: 0, ks: {}, sr: 1, bm: 0 },
      ],
    });
    const result = evaluateArtLabLottieValidity(lottie, {
      expectedDurationMs: 1000,
    });
    expect(result.passed).toBe(true);
  });

  it("fails on malformed JSON", () => {
    const result = evaluateArtLabLottieValidity("{ not json", {
      expectedDurationMs: 1000,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("parse");
  });

  it("fails when required fields missing", () => {
    const lottie = JSON.stringify({ v: "5.7.0", layers: [] });
    const result = evaluateArtLabLottieValidity(lottie, {
      expectedDurationMs: 1000,
    });
    expect(result.passed).toBe(false);
  });

  it("fails when no layers", () => {
    const lottie = JSON.stringify({
      v: "5.7.0",
      fr: 30,
      ip: 0,
      op: 30,
      w: 100,
      h: 100,
      layers: [],
    });
    const result = evaluateArtLabLottieValidity(lottie, {
      expectedDurationMs: 1000,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("layers");
  });

  it("fails when duration mismatches expected", () => {
    const lottie = JSON.stringify({
      v: "5.7.0",
      fr: 30,
      ip: 0,
      op: 30, // 1000ms
      w: 100,
      h: 100,
      layers: [
        { ind: 1, ty: 4, nm: "x", ip: 0, op: 30, st: 0, ks: {}, sr: 1, bm: 0 },
      ],
    });
    const result = evaluateArtLabLottieValidity(lottie, {
      expectedDurationMs: 5000,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("duration");
  });

  it("fails when a layer reference exceeds the layer count", () => {
    const lottie = JSON.stringify({
      v: "5.7.0",
      fr: 30,
      ip: 0,
      op: 30,
      w: 100,
      h: 100,
      layers: [
        {
          ind: 1,
          ty: 4,
          nm: "x",
          ip: 0,
          op: 30,
          st: 0,
          ks: {},
          sr: 1,
          bm: 0,
          parent: 99,
        },
      ],
    });
    const result = evaluateArtLabLottieValidity(lottie, {
      expectedDurationMs: 1000,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("layer");
  });
});
