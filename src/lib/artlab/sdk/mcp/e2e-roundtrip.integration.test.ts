import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let workspaceRoot: string;
let canonRoot: string;
let packsRoot: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "foundry-e2e-ws-"));
  canonRoot = mkdtempSync(join(tmpdir(), "foundry-e2e-canon-"));
  packsRoot = mkdtempSync(join(tmpdir(), "foundry-e2e-packs-"));
  mkdirSync(join(workspaceRoot, "slots"), { recursive: true });
  mkdirSync(join(workspaceRoot, "inbox", "foundry"), { recursive: true });
  mkdirSync(join(workspaceRoot, "runs"), { recursive: true });
  writeFileSync(join(workspaceRoot, "slots", "registry.json"), JSON.stringify({ slots: [] }));
  mkdirSync(join(canonRoot, "characters"), { recursive: true });
  writeFileSync(
    join(canonRoot, "characters", "rafe-calder.yaml"),
    "id: rafe-calder\ndisplayName: Rafe Calder\nsummary: CRO\n",
  );
});

function inheritedEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

describe("e2e MCP round-trip", () => {
  it("client lists canon → generates → polls status via the real MCP transport", async () => {
    const repoRoot = process.cwd();
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["tsx", join(repoRoot, "scripts", "foundry-mcp.ts")],
      env: {
        ...inheritedEnv(),
        FOUNDRY_WORKSPACE_ROOT: workspaceRoot,
        FOUNDRY_CANON_ROOT: canonRoot,
        FOUNDRY_PACKS_ROOT: packsRoot,
        FOUNDRY_SLOT_REGISTRY: join(workspaceRoot, "slots", "registry.json"),
      },
    });
    const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);

    const canonResult = await client.callTool({
      name: "foundry/canon_list",
      arguments: { kind: "character" },
    });
    expect(canonResult).toBeDefined();

    const generateResult = await client.callTool({
      name: "foundry/generate",
      arguments: {
        kind: "character",
        description: "A new Rafe idle sprite",
        priority: "normal",
      },
    });
    const generated = JSON.parse(
      (generateResult.content as Array<{ text: string }>)[0]!.text,
    ) as { runId: string; status: string; inboxPath: string };
    expect(generated.status).toBe("queued");
    expect(generated.runId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(existsSync(generated.inboxPath)).toBe(true);

    await client.close();
  }, 30_000);
});
