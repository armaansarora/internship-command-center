// src/lib/artlab/speed/prompt-caching-assertion.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("LLM prompt caching enforcement (Phase 5 convention)", () => {
  it("every generateText call against a stable system prompt uses cacheControl", () => {
    const claudeBrain = readFileSync(join("src", "lib", "artlab", "orchestrator", "claude-brain.ts"), "utf8");
    // Each generateText call body must contain the cacheControl marker on the system message.
    const generateTextBlocks = claudeBrain.match(/generateText\s*\([\s\S]*?\}\s*\)\s*[;,]/g) ?? [];
    expect(generateTextBlocks.length).toBeGreaterThan(0);
    for (const block of generateTextBlocks) {
      expect(block).toMatch(/cacheControl/);
      expect(block).toMatch(/ephemeral/);
    }
  });
});
