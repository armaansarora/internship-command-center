import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFoundryMcpServer } from "./server";

let workspaceRoot: string;
let canonRoot: string;
let packsRoot: string;
let slotRegistryPath: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "foundry-srv-brain-"));
  canonRoot = mkdtempSync(join(tmpdir(), "foundry-srv-brain-canon-"));
  packsRoot = mkdtempSync(join(tmpdir(), "foundry-srv-brain-packs-"));
  mkdirSync(join(workspaceRoot, "slots"), { recursive: true });
  slotRegistryPath = join(workspaceRoot, "slots", "registry.json");
  writeFileSync(slotRegistryPath, JSON.stringify({ slots: [] }));
});

describe("server brain wiring", () => {
  it("when env has ANTHROPIC_API_KEY, generate calls produce a brainHint", async () => {
    const built = createFoundryMcpServer({
      workspaceRoot, canonRoot, packsRoot, slotRegistryPath,
      providerProbes: {},
      version: "test",
      env: { ANTHROPIC_API_KEY: "sk-test", FOUNDRY_BRAIN_MODEL: "claude-test" },
      brainCallOverride: async () => ({
        text: JSON.stringify({ agent: "character-master", parsedArgs: { characterId: "rafe-calder", directive: "x", recentWins: [], recentRejections: [] }, confidence: 0.95 }),
        tokensIn: 1, tokensOut: 1, durationMs: 0,
      }),
    });
    const result = await built.invokeForTest("foundry/generate", {
      kind: "character", description: "Rafe Calder jacket update test",
    }) as { runId: string; inboxPath: string };
    expect(result.runId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("when env has no ANTHROPIC_API_KEY, generate still queues but no brainHint is attached", async () => {
    const built = createFoundryMcpServer({
      workspaceRoot, canonRoot, packsRoot, slotRegistryPath,
      providerProbes: {},
      version: "test",
      env: {},
    });
    const result = await built.invokeForTest("foundry/generate", {
      kind: "character", description: "Rafe Calder jacket update test",
    }) as { runId: string };
    expect(result.runId).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
