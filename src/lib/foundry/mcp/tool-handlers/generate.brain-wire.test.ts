import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleFoundryGenerate } from "./generate";

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "foundry-wire-"));
});

describe("generate handler — brain enrichment", () => {
  it("when ANTHROPIC_API_KEY is unset, the inbox payload has no `brainHint` (no enrichment)", async () => {
    const result = await handleFoundryGenerate(
      { kind: "character", description: "Rafe with a charcoal jacket update" },
      { workspaceRoot },
    );
    const payload = JSON.parse(readFileSync(result.inboxPath!, "utf8")) as Record<string, unknown>;
    expect(payload.brainHint).toBeUndefined();
  });

  it("when ANTHROPIC_API_KEY is set + brainEnrich callback supplied, the inbox payload carries `brainHint`", async () => {
    const result = await handleFoundryGenerate(
      { kind: "character", description: "Rafe with a charcoal jacket update" },
      {
        workspaceRoot,
        brainEnrich: async () => ({
          agent: "character-master",
          plan: "Update Rafe jacket — preserve silhouette, swap fabric.",
          promptDraft: "Rafe in charcoal wool, key light, brass accents...",
        }),
      },
    );
    const payload = JSON.parse(readFileSync(result.inboxPath!, "utf8")) as { brainHint?: Record<string, unknown> };
    expect(payload.brainHint?.agent).toBe("character-master");
    expect(payload.brainHint?.plan).toMatch(/Update Rafe jacket/);
  });
});
