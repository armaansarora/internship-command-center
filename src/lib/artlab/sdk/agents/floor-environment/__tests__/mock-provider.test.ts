import { describe, expect, it } from "vitest";
import { createFoundryFloorMockProvider } from "./mock-provider";

describe("createFoundryFloorMockProvider", () => {
  it("returns a provider object with generateImage", () => {
    const p = createFoundryFloorMockProvider();
    expect(typeof p.generateImage).toBe("function");
  });

  it("generateImage returns a valid PNG buffer", async () => {
    const p = createFoundryFloorMockProvider();
    const result = await p.generateImage({
      prompt: "anything",
      aspectRatio: "16:9",
      seed: 1,
    });
    expect(result.bytes.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });

  it("deterministic per seed — same seed produces same bytes", async () => {
    const p = createFoundryFloorMockProvider();
    const a = await p.generateImage({ prompt: "x", aspectRatio: "16:9", seed: 7 });
    const b = await p.generateImage({ prompt: "x", aspectRatio: "16:9", seed: 7 });
    expect(a.bytes.equals(b.bytes)).toBe(true);
  });

  it("different seed produces different bytes", async () => {
    const p = createFoundryFloorMockProvider();
    const a = await p.generateImage({ prompt: "x", aspectRatio: "16:9", seed: 1 });
    const b = await p.generateImage({ prompt: "x", aspectRatio: "16:9", seed: 2 });
    expect(a.bytes.equals(b.bytes)).toBe(false);
  });

  it("reports mode=mock and costCents=0", async () => {
    const p = createFoundryFloorMockProvider();
    const result = await p.generateImage({ prompt: "x", aspectRatio: "16:9", seed: 1 });
    expect(result.mode).toBe("mock");
    expect(result.costCents).toBe(0);
  });
});
