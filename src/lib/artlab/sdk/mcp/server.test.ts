import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFoundryMcpServer } from "./server";
import { FOUNDRY_MCP_TOOL_NAMES } from "./tools";

let workspaceRoot: string;
let canonRoot: string;
let packsRoot: string;
let slotRegistryPath: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "foundry-srv-"));
  canonRoot = mkdtempSync(join(tmpdir(), "foundry-srv-canon-"));
  packsRoot = mkdtempSync(join(tmpdir(), "foundry-srv-packs-"));
  mkdirSync(join(workspaceRoot, "slots"), { recursive: true });
  slotRegistryPath = join(workspaceRoot, "slots", "registry.json");
  writeFileSync(slotRegistryPath, JSON.stringify({ slots: [] }));
});

describe("createFoundryMcpServer", () => {
  it("returns a server with identity tower-art-foundry and version from package.json", () => {
    const built = createFoundryMcpServer({
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

  it("registers all 9 canonical foundry tools", () => {
    const built = createFoundryMcpServer({
      workspaceRoot,
      canonRoot,
      packsRoot,
      slotRegistryPath,
      providerProbes: {},
      version: "9.9.9-test",
    });
    expect(built.registeredTools.sort()).toEqual([...FOUNDRY_MCP_TOOL_NAMES].sort());
  });

  it("invokeForTest dispatches to the correct handler", async () => {
    const built = createFoundryMcpServer({
      workspaceRoot,
      canonRoot,
      packsRoot,
      slotRegistryPath,
      providerProbes: {},
      version: "9.9.9-test",
    });
    const result = await built.invokeForTest("foundry/canon_list", {});
    expect(Array.isArray((result as { entries: unknown[] }).entries)).toBe(true);
  });

  it("invokeForTest rejects unknown tool names", async () => {
    const built = createFoundryMcpServer({
      workspaceRoot,
      canonRoot,
      packsRoot,
      slotRegistryPath,
      providerProbes: {},
      version: "9.9.9-test",
    });
    await expect(built.invokeForTest("foundry/bogus", {})).rejects.toThrow(/unknown tool/i);
  });
});
