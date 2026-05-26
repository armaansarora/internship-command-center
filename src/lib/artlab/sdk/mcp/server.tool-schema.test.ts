// src/lib/artlab/sdk/mcp/server.tool-schema.test.ts
//
// Regression — the MCP `ListTools` response previously advertised every
// tool with the placeholder `inputSchema: { type: "object",
// additionalProperties: true }`. MCP clients (Claude Code, Cursor,
// downstream agents) saw zero argument contracts: no enum hints, no
// required-field markers, no nested shapes. The fix: thread each tool's
// real Zod input schema through `z.toJSONSchema()` so the advertised
// shape matches the runtime validator.
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
  workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-srv-schema-"));
  canonRoot = mkdtempSync(join(tmpdir(), "artlab-srv-schema-canon-"));
  packsRoot = mkdtempSync(join(tmpdir(), "artlab-srv-schema-packs-"));
  mkdirSync(join(workspaceRoot, "slots"), { recursive: true });
  slotRegistryPath = join(workspaceRoot, "slots", "registry.json");
  writeFileSync(slotRegistryPath, JSON.stringify({ slots: [] }));
});

function build() {
  return createArtLabMcpServer({
    workspaceRoot,
    canonRoot,
    packsRoot,
    slotRegistryPath,
    providerProbes: {},
    version: "test",
  });
}

describe("ListTools advertises real Zod-derived JSON schemas", () => {
  it("listToolsForTest returns every registered tool with a non-placeholder inputSchema", () => {
    const built = build();
    const tools = built.listToolsForTest();
    expect(tools.map((t) => t.name).sort()).toEqual([...ARTLAB_MCP_TOOL_NAMES].sort());
    for (const t of tools) {
      // The placeholder was the literal `{ type: "object", additionalProperties: true }`.
      // The real Zod-derived schema must AT LEAST carry `additionalProperties: false`
      // (because every input schema uses `.strict()`) and a `properties` object
      // (since every input schema has at least one declared field — even the
      // empty `ArtLabDiagnosticsInputSchema` is `z.object({}).strict()`,
      // which `z.toJSONSchema` renders with `properties: {}`).
      expect(t.inputSchema.type).toBe("object");
      expect(t.inputSchema.additionalProperties).toBe(false);
      expect(t.inputSchema.properties).toBeDefined();
    }
  });

  it("artlab/generate advertises the kind enum (character|floor|ui-texture|icon|sprite-animation|lottie)", () => {
    const built = build();
    const tools = built.listToolsForTest();
    const generate = tools.find((t) => t.name === "artlab/generate");
    expect(generate).toBeDefined();
    const kindProp = generate!.inputSchema.properties?.kind as { enum?: string[] } | undefined;
    expect(kindProp?.enum).toBeDefined();
    expect(kindProp!.enum!.sort()).toEqual(
      ["character", "floor", "icon", "lottie", "sprite-animation", "ui-texture"],
    );
    // `description` is a required, min-length-8 string.
    expect(generate!.inputSchema.required).toContain("description");
  });

  it("artlab/canon_list advertises the optional kind enum", () => {
    const built = build();
    const tools = built.listToolsForTest();
    const list = tools.find((t) => t.name === "artlab/canon_list");
    expect(list).toBeDefined();
    const kindProp = list!.inputSchema.properties?.kind as { enum?: string[] } | undefined;
    expect(kindProp?.enum).toBeDefined();
    expect(kindProp!.enum!.sort()).toEqual(["character", "floor", "palette", "style-envelope"]);
    // `kind` is OPTIONAL so it must NOT appear in `required` (or `required` is absent).
    expect((list!.inputSchema.required ?? []).includes("kind")).toBe(false);
  });

  it("artlab/generate_status enforces runId as a required string with the v4 UUID regex", () => {
    const built = build();
    const tools = built.listToolsForTest();
    const status = tools.find((t) => t.name === "artlab/generate_status");
    expect(status).toBeDefined();
    expect(status!.inputSchema.required).toContain("runId");
    const runIdProp = status!.inputSchema.properties?.runId as { type?: string; pattern?: string } | undefined;
    expect(runIdProp?.type).toBe("string");
    // The exact regex source is asserted in tools.ts; advertising it confirms
    // it actually surfaces to MCP clients.
    expect(runIdProp?.pattern).toBeTruthy();
  });
});
