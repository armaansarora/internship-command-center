// src/lib/artlab/sdk/agents/ui-texture/__tests__/mock-llm-provider.ts
import type { ArtLabIconLlmProvider } from "../llm-provider";

export function createArtLabIconMockLlmProvider(): ArtLabIconLlmProvider {
  return {
    async emitSvg(input) {
      const seed = input.seed ?? 0;
      const cx = 6 + (seed % 12);
      const cy = 6 + ((seed * 3) % 12);
      const r = 4 + (seed % 4);
      const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${input.viewBox}"`,
        `     role="img" aria-label="${input.ariaLabel}"`,
        `     stroke="currentColor" fill="none"`,
        `     stroke-width="${input.strokeWidthPx}"`,
        `     stroke-linecap="round" stroke-linejoin="round">`,
        `  <circle cx="${cx}" cy="${cy}" r="${r}" />`,
        `</svg>`,
      ].join("\n");
      return { svg, mode: "mock", costCents: 0, durationMs: 1 };
    },
  };
}
