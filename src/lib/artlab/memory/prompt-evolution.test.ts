import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendPromptEvolution, readPromptEvolution } from "./prompt-evolution";

describe("prompt-evolution ledger", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "artlab-evo-")); });

  it("appends a prompt-builder change", () => {
    appendPromptEvolution(dir, {
      promptComponent: "character-concept-base",
      version: "v1.4",
      changedAt: new Date().toISOString(),
      diff: "+ preserve natural human imperfections",
      triggeredBy: "rejection-pattern-jawline-too-perfect",
      outcomes: { subsequentRejections: 0, subsequentPromotions: 0 },
    });
    const list = readPromptEvolution(dir);
    expect(list).toHaveLength(1);
    expect(list[0]!.version).toBe("v1.4");
  });
});
