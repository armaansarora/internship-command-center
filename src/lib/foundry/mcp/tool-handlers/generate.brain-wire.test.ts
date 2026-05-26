import { describe, expect, it, beforeEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
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
    // No sidecar either when no enrichment wired.
    const sidecarPath = result.inboxPath!.replace(/\.json$/, ".brain-hint.json");
    expect(existsSync(sidecarPath)).toBe(false);
  });

  it("when ANTHROPIC_API_KEY is set + brainEnrich callback supplied, the sidecar carries `brainHint`", async () => {
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
    // Enrichment lands on the SIDECAR — main inbox file is write-once.
    const sidecarPath = result.inboxPath!.replace(/\.json$/, ".brain-hint.json");
    for (let i = 0; i < 50; i += 1) {
      if (existsSync(sidecarPath)) break;
      await new Promise((r) => setTimeout(r, 20));
    }
    const sidecar = JSON.parse(readFileSync(sidecarPath, "utf8")) as {
      brainHintStatus: string;
      brainHint?: Record<string, unknown>;
    };
    expect(sidecar.brainHintStatus).toBe("ready");
    expect(sidecar.brainHint?.agent).toBe("character-master");
    expect(sidecar.brainHint?.plan).toMatch(/Update Rafe jacket/);
  });
});
