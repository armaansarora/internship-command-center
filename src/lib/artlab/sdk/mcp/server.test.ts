import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createArtLabMcpServer } from "./server";
import { ARTLAB_MCP_TOOL_NAMES } from "./tools";

let workspaceRoot: string;
let canonRoot: string;
let packsRoot: string;
let slotRegistryPath: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-srv-"));
  canonRoot = mkdtempSync(join(tmpdir(), "artlab-srv-canon-"));
  packsRoot = mkdtempSync(join(tmpdir(), "artlab-srv-packs-"));
  mkdirSync(join(workspaceRoot, "slots"), { recursive: true });
  slotRegistryPath = join(workspaceRoot, "slots", "registry.json");
  writeFileSync(slotRegistryPath, JSON.stringify({ slots: [] }));
});

describe("createArtLabMcpServer", () => {
  it("returns a server with identity tower-art-foundry and version from package.json", () => {
    const built = createArtLabMcpServer({
      workspaceRoot,
      canonRoot,
      packsRoot,
      slotRegistryPath,
      providerProbes: {},
      version: "9.9.9-test",
    });
    expect(built.identity.name).toBe("tower-art-foundry");
    expect(built.identity.version).toBe("9.9.9-test");
  });

  it("registers all 9 canonical artlab tools", () => {
    const built = createArtLabMcpServer({
      workspaceRoot,
      canonRoot,
      packsRoot,
      slotRegistryPath,
      providerProbes: {},
      version: "9.9.9-test",
    });
    expect(built.registeredTools.sort()).toEqual([...ARTLAB_MCP_TOOL_NAMES].sort());
  });

  it("invokeForTest dispatches to the correct handler", async () => {
    const built = createArtLabMcpServer({
      workspaceRoot,
      canonRoot,
      packsRoot,
      slotRegistryPath,
      providerProbes: {},
      version: "9.9.9-test",
    });
    const result = await built.invokeForTest("artlab/canon_list", {});
    expect(Array.isArray((result as { entries: unknown[] }).entries)).toBe(true);
  });

  it("invokeForTest rejects unknown tool names", async () => {
    const built = createArtLabMcpServer({
      workspaceRoot,
      canonRoot,
      packsRoot,
      slotRegistryPath,
      providerProbes: {},
      version: "9.9.9-test",
    });
    await expect(built.invokeForTest("artlab/bogus", {})).rejects.toThrow(/unknown tool/i);
  });
});
