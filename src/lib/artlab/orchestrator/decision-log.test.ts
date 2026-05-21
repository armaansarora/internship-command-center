import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendLlmDecision, readLlmDecisions } from "./decision-log";

describe("LLM decision log", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "artlab-dec-")); });

  it("appends and reads decisions", () => {
    appendLlmDecision(dir, {
      decisionAt: new Date().toISOString(),
      kind: "route-ambiguous-brief",
      input: "make Sol",
      prompt: "...",
      output: { assetType: "character", characterId: "cno" },
      tokensIn: 100,
      tokensOut: 20,
      model: "claude-opus-4-7",
      confidence: 0.94,
    });
    expect(readLlmDecisions(dir)).toHaveLength(1);
  });
});
