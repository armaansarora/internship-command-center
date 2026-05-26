// src/lib/artlab/sdk/agents/ui-texture/__tests__/mock-llm-provider.test.ts
import { describe, expect, it } from "vitest";
import { createArtLabIconMockLlmProvider } from "./mock-llm-provider";

describe("createArtLabIconMockLlmProvider", () => {
  it("emitSvg returns a deterministic, parseable SVG string", async () => {
    const p = createArtLabIconMockLlmProvider();
    const a = await p.emitSvg({ name: "x", ariaLabel: "x", strokeWidthPx: 1.5, viewBox: "0 0 24 24", seed: 1 });
    const b = await p.emitSvg({ name: "x", ariaLabel: "x", strokeWidthPx: 1.5, viewBox: "0 0 24 24", seed: 1 });
    expect(a.svg).toBe(b.svg);
    expect(a.svg).toContain("<svg");
    expect(a.svg).toContain("</svg>");
  });

  it("emitted SVG declares the requested strokeWidth", async () => {
    const p = createArtLabIconMockLlmProvider();
    const out = await p.emitSvg({
      name: "x",
      ariaLabel: "x",
      strokeWidthPx: 2.25,
      viewBox: "0 0 24 24",
      seed: 0,
    });
    expect(out.svg).toContain('stroke-width="2.25"');
  });

  it("emitted SVG declares the requested viewBox", async () => {
    const p = createArtLabIconMockLlmProvider();
    const out = await p.emitSvg({
      name: "x",
      ariaLabel: "x",
      strokeWidthPx: 1.5,
      viewBox: "0 0 32 32",
      seed: 0,
    });
    expect(out.svg).toContain('viewBox="0 0 32 32"');
  });

  it("emitted SVG declares the aria-label", async () => {
    const p = createArtLabIconMockLlmProvider();
    const out = await p.emitSvg({
      name: "x",
      ariaLabel: "Test icon",
      strokeWidthPx: 1.5,
      viewBox: "0 0 24 24",
      seed: 0,
    });
    expect(out.svg).toContain('aria-label="Test icon"');
  });
});
