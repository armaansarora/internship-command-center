import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let workspaceRoot: string;
let canonRoot: string;
let packsRoot: string;
let slotRegistryPath: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "foundry-acc-ws-"));
  canonRoot = mkdtempSync(join(tmpdir(), "foundry-acc-canon-"));
  packsRoot = mkdtempSync(join(tmpdir(), "foundry-acc-packs-"));
  slotRegistryPath = join(workspaceRoot, "slots", "registry.json");
  mkdirSync(join(workspaceRoot, "slots"), { recursive: true });
  mkdirSync(join(workspaceRoot, "inbox", "foundry"), { recursive: true });
  mkdirSync(join(workspaceRoot, "runs"), { recursive: true });
  writeFileSync(slotRegistryPath, JSON.stringify({ slots: [] }));
  mkdirSync(join(canonRoot, "characters"), { recursive: true });
  writeFileSync(
    join(canonRoot, "characters", "sol-navarro.yaml"),
    "id: sol-navarro\ndisplayName: Sol Navarro\nsummary: receptionist on the Lobby\n",
  );
});

/** Simulates the ArtLab daemon promoting a queued generation. */
function fakeDaemonPromote(workspaceRoot: string, packsRoot: string, runId: string): void {
  const packId = `sol-navarro-idle-${runId.slice(0, 6)}`;
  const packDir = join(packsRoot, packId);
  mkdirSync(packDir, { recursive: true });
  writeFileSync(
    join(packDir, "manifest.json"),
    JSON.stringify({
      packId, kind: "sprite-animation", slotId: "sol.idle",
      promotedAt: new Date().toISOString(), publicPath: `/art/sprites/${packId}.png`,
      integration: { fps: 24 },
      files: [{ path: `${packId}.png`, role: "primary" }],
    }),
  );
  writeFileSync(join(packDir, `${packId}.png`), Buffer.from("FAKE_PNG"));
  const runDir = join(workspaceRoot, "runs", runId);
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, "run-state.json"),
    JSON.stringify({
      runId, phase: "closed", blocker: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      progress: { phaseElapsedMs: 1000, estimatedRemainingMs: 0, expectedSlotCount: 1, renderedSlotCount: 1 },
      promotedPackId: packId,
    }),
  );
}

function inheritedEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

describe("agent loop acceptance gate", () => {
  it("agent generates → polls → fetches integration snippet via the real MCP stdio transport", async () => {
    const repoRoot = process.cwd();
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["tsx", join(repoRoot, "scripts", "foundry-mcp.ts")],
      env: {
        ...inheritedEnv(),
        FOUNDRY_WORKSPACE_ROOT: workspaceRoot,
        FOUNDRY_CANON_ROOT: canonRoot,
        FOUNDRY_PACKS_ROOT: packsRoot,
        FOUNDRY_SLOT_REGISTRY: slotRegistryPath,
      },
    });
    const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);

    // Step 1: agent asks for a new Sol Navarro idle animation.
    const gen = await client.callTool({
      name: "foundry/generate",
      arguments: { kind: "sprite-animation", description: "Sol Navarro idle breathe loop 1.2s ease-in-out" },
    });
    const generated = JSON.parse((gen.content as Array<{ text: string }>)[0]!.text) as { runId: string; inboxPath: string };
    expect(existsSync(generated.inboxPath)).toBe(true);

    // Step 2: simulate the daemon promoting the run.
    fakeDaemonPromote(workspaceRoot, packsRoot, generated.runId);

    // Step 3: agent polls — sees status=promoted.
    const status = await client.callTool({
      name: "foundry/generate_status",
      arguments: { runId: generated.runId },
    });
    const statusPayload = JSON.parse((status.content as Array<{ text: string }>)[0]!.text) as { status: string; promotedPackId: string };
    expect(statusPayload.status).toBe("promoted");
    expect(statusPayload.promotedPackId).toBeTruthy();

    // Step 4: agent fetches the integration snippet.
    const integration = await client.callTool({
      name: "foundry/asset_pack_integration",
      arguments: { packId: statusPayload.promotedPackId, targetFramework: "next-app-router" },
    });
    const snippet = JSON.parse((integration.content as Array<{ text: string }>)[0]!.text) as { snippet: string; importStatement: string };
    expect(snippet.snippet).toContain("SpriteSheetPlayer");

    await client.close();
  }, 60_000);
});
