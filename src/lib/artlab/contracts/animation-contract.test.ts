// src/lib/artlab/contracts/animation-contract.test.ts
import { describe, expect, it } from "vitest";
import { ANIMATION_CONTRACT, validateAnimationSlotSpec } from "./animation-contract";

describe("animation contract", () => {
  it("declares frame count, fps, and reduced-motion fallback requirement", () => {
    expect(ANIMATION_CONTRACT.minFrames).toBe(12);
    expect(ANIMATION_CONTRACT.maxFrames).toBe(48);
    expect(ANIMATION_CONTRACT.fps).toBe(24);
    expect(ANIMATION_CONTRACT.requiresReducedMotionFallback).toBe(true);
  });

  it("validates a slot spec with frame count in bounds", () => {
    expect(() => validateAnimationSlotSpec({
      slotId: "lobby-ambient", purpose: "ambient", frameCount: 24,
    })).not.toThrow();
  });

  it("rejects frame counts outside bounds", () => {
    expect(() => validateAnimationSlotSpec({
      slotId: "x", purpose: "ambient", frameCount: 1,
    })).toThrow();
    expect(() => validateAnimationSlotSpec({
      slotId: "x", purpose: "ambient", frameCount: 100,
    })).toThrow();
  });
});
