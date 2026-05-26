import { describe, expect, it } from "vitest";
import { createMockArtLabImageProvider } from "./mock-provider";

describe("mock artlab image provider", () => {
  it("returns deterministic bytes for the same prompt + seed", async () => {
    const p = createMockArtLabImageProvider();
    const r1 = await p.generate({ prompt: "x", aspectRatio: "9:16", laneIndex: 1, seed: 42 });
    const r2 = await p.generate({ prompt: "x", aspectRatio: "9:16", laneIndex: 1, seed: 42 });
    expect(r1.bytes.equals(r2.bytes)).toBe(true);
    expect(r1.mode).toBe("mock");
  });

  it("returns different bytes for different lane indices", async () => {
    const p = createMockArtLabImageProvider();
    const r1 = await p.generate({ prompt: "x", aspectRatio: "9:16", laneIndex: 1, seed: 42 });
    const r2 = await p.generate({ prompt: "x", aspectRatio: "9:16", laneIndex: 2, seed: 42 });
    expect(r1.bytes.equals(r2.bytes)).toBe(false);
  });

  it("emits a valid PNG signature (89 50 4e 47) in the first 4 bytes", async () => {
    const p = createMockArtLabImageProvider();
    const r = await p.generate({ prompt: "x", aspectRatio: "9:16", laneIndex: 1 });
    expect(r.bytes[0]).toBe(0x89);
    expect(r.bytes[1]).toBe(0x50);
    expect(r.bytes[2]).toBe(0x4e);
    expect(r.bytes[3]).toBe(0x47);
  });

  it("respects the requested aspect ratio in dimensions", async () => {
    const p = createMockArtLabImageProvider();
    const r9 = await p.generate({ prompt: "x", aspectRatio: "9:16", laneIndex: 1 });
    expect(r9.widthPx).toBeLessThan(r9.heightPx);
    const r1 = await p.generate({ prompt: "x", aspectRatio: "1:1", laneIndex: 1 });
    expect(r1.widthPx).toBe(r1.heightPx);
  });

  it("simulates configurable failure when the prompt contains FAIL", async () => {
    const p = createMockArtLabImageProvider({ failOnPromptContains: "FAIL" });
    await expect(p.generate({ prompt: "x FAIL y", aspectRatio: "1:1", laneIndex: 1 })).rejects.toThrow();
  });
});
