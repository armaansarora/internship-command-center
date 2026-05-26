import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE = readFileSync(join(__dirname, "llm-brain.ts"), "utf8");

describe("llm-brain.ts deprecation", () => {
  it("carries an @deprecated JSDoc on ArtLabLlmBrain", () => {
    expect(SOURCE).toMatch(/@deprecated[\s\S]*ArtLabLlmBrain/);
  });

  it("@deprecated comment references Phase 7 brain factory", () => {
    expect(SOURCE).toMatch(/createFoundryBrainFor|@\/lib\/foundry\/brain/);
  });

  it("ArtLabLlmBrain is still exported (back-compat)", async () => {
    const mod = await import("./llm-brain");
    expect("decideWithMockBrain" in mod).toBe(true);
  });
});
