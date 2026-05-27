// src/lib/artlab/sdk/mcp/server.brain-memory.test.ts
//
// Integration regression — `loadArtLabMemoryScope` wired through `server.ts`.
//
// Previously, `loadArtLabMemoryScope` was exported and unit-tested but never
// called from production code (`route-request.ts`, `factory.ts`, `server.ts`,
// or `scripts/artlab-sdk-mcp.ts`). The "kind-scoped memory" requirement was
// half-built — character feedback could leak into floor brains, and floor
// feedback into character brains, the moment a real LLM call ran.
//
// This test pins the wiring contract: server config carries `memoryDir`,
// passes it into `routeArtLabRequest`, which calls `loadArtLabMemoryScope`,
// filters to the resolved agent kind, and merges the hydrated arrays into
// `parsedArgs` before parsing. The brain receives ONLY its kind's feedback.
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createArtLabMcpServer } from "./server";

let workspaceRoot: string;
let canonRoot: string;
let packsRoot: string;
let memoryDir: string;
let slotRegistryPath: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-srv-brainmem-"));
  canonRoot = mkdtempSync(join(tmpdir(), "artlab-srv-brainmem-canon-"));
  packsRoot = mkdtempSync(join(tmpdir(), "artlab-srv-brainmem-packs-"));
  memoryDir = mkdtempSync(join(tmpdir(), "artlab-srv-brainmem-mem-"));
  mkdirSync(join(workspaceRoot, "slots"), { recursive: true });
  slotRegistryPath = join(workspaceRoot, "slots", "registry.json");
  writeFileSync(slotRegistryPath, JSON.stringify({ slots: [] }));

  // Two ledger entries with different `source` tags so we can prove the
  // filter actually fires.
  writeFileSync(
    join(memoryDir, "style-wins.jsonl"),
    [
      JSON.stringify({
        characterId: "rafe-calder",
        promotedAt: "2026-05-25T12:00:00.000Z",
        winningTechniques: ["character-win-marker"],
        promptHash: "h1",
        totalCostCents: 100,
        source: "character",
      }),
      JSON.stringify({
        characterId: "war-room",
        promotedAt: "2026-05-26T12:00:00.000Z",
        winningTechniques: ["floor-win-marker"],
        promptHash: "h2",
        totalCostCents: 200,
        source: "floor",
      }),
    ].join("\n") + "\n",
  );
});

describe("server → routeArtLabRequest → loadArtLabMemoryScope wiring", () => {
  it("hydrates character-master brain with character-scoped wins only", async () => {
    const built = createArtLabMcpServer({
      workspaceRoot,
      canonRoot,
      packsRoot,
      slotRegistryPath,
      memoryDir,
      providerProbes: {},
      version: "test",
      env: {}, // no API key → per-agent brain runs in dryRun (echo) mode;
                // brainCallOverride below mocks the meta-orchestrator call.
      brainCallOverride: async () => ({
        text: JSON.stringify({
          agent: "character-master",
          parsedArgs: { characterId: "rafe-calder", directive: "swap to wool" },
          confidence: 0.95,
        }),
        tokensIn: 1, tokensOut: 1, durationMs: 0,
      }),
    });
    const result = (await built.invokeForTest("artlab/generate", {
      kind: "character",
      description: "Rafe Calder jacket swap to wool",
    })) as { runId: string; inboxPath: string };
    expect(existsSync(result.inboxPath)).toBe(true);
    // The brain enrichment lands on a sidecar (race-safe write-once contract);
    // see `sidecarPathFor` in generate.ts.
    const sidecarPath = result.inboxPath.replace(/\.json$/, ".brain-hint.json");
    let sidecar: Record<string, unknown> | null = null;
    for (let i = 0; i < 50; i++) {
      if (existsSync(sidecarPath)) {
        sidecar = JSON.parse(readFileSync(sidecarPath, "utf8")) as Record<string, unknown>;
        if (sidecar.brainHintStatus === "ready" || sidecar.brainHintStatus === "failed") break;
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    expect(sidecar).not.toBeNull();
    expect(sidecar!.brainHintStatus).toBe("ready");
    const hint = sidecar!.brainHint as { output?: { echoedInput?: { recentWins?: Array<{ techniques: string }> } } };
    const techniques = (hint.output?.echoedInput?.recentWins ?? []).map((w) => w.techniques);
    // The brain MUST see ONLY the character-scoped marker.
    expect(techniques).toContain("character-win-marker");
    expect(techniques).not.toContain("floor-win-marker");
  });

  it("when memoryDir is omitted, enrichment still succeeds with empty feedback", async () => {
    const built = createArtLabMcpServer({
      workspaceRoot,
      canonRoot,
      packsRoot,
      slotRegistryPath,
      // memoryDir intentionally omitted
      providerProbes: {},
      version: "test",
      env: {}, // dryRun + brainCallOverride
      brainCallOverride: async () => ({
        text: JSON.stringify({
          agent: "character-master",
          parsedArgs: { characterId: "rafe-calder", directive: "smoke test" },
          confidence: 0.95,
        }),
        tokensIn: 1, tokensOut: 1, durationMs: 0,
      }),
    });
    const result = (await built.invokeForTest("artlab/generate", {
      kind: "character",
      description: "Rafe Calder smoke test",
    })) as { runId: string; inboxPath: string };
    const sidecarPath = result.inboxPath.replace(/\.json$/, ".brain-hint.json");
    let sidecar: Record<string, unknown> | null = null;
    for (let i = 0; i < 50; i++) {
      if (existsSync(sidecarPath)) {
        sidecar = JSON.parse(readFileSync(sidecarPath, "utf8")) as Record<string, unknown>;
        if (sidecar.brainHintStatus === "ready" || sidecar.brainHintStatus === "failed") break;
      }
      await new Promise((r) => setTimeout(r, 20));
    }
    expect(sidecar).not.toBeNull();
    // The critical property: brainHintStatus must NOT be "failed" — the
    // pre-fix behaviour was 100% failure rate when memoryDir was absent
    // because the brain's strict schema rejected the missing arrays.
    expect(sidecar!.brainHintStatus).toBe("ready");
  });
});
