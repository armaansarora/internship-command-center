// src/lib/artlab/sdk/agents/ui-texture/llm-provider.test.ts
import { describe, expect, it } from "vitest";
import {
  ArtLabIconLlmInputSchema,
  ArtLabIconLlmResultSchema,
} from "./llm-provider";

describe("artlab sdk icon LLM provider contract", () => {
  it("input schema enforces the four required fields", () => {
    expect(() =>
      ArtLabIconLlmInputSchema.parse({ name: "x", ariaLabel: "x" }),
    ).toThrow();
    const ok = ArtLabIconLlmInputSchema.parse({
      name: "x",
      ariaLabel: "x",
      strokeWidthPx: 1.5,
      viewBox: "0 0 24 24",
    });
    expect(ok.strokeWidthPx).toBe(1.5);
  });

  it("result schema enforces SVG string + mode + cost + duration", () => {
    const ok = ArtLabIconLlmResultSchema.parse({
      svg: "<svg/>",
      mode: "real",
      costCents: 3,
      durationMs: 120,
    });
    expect(ok.mode).toBe("real");
  });

  it("result schema rejects unknown mode", () => {
    expect(() =>
      ArtLabIconLlmResultSchema.parse({
        svg: "<svg/>",
        mode: "wat",
        costCents: 3,
        durationMs: 120,
      }),
    ).toThrow();
  });
});
