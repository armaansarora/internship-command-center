import { describe, expect, it } from "vitest";
import {
  FOUNDRY_MCP_TOOL_NAMES,
  FoundryGenerateInputSchema,
  FoundryGenerateOutputSchema,
  FoundryCanonListInputSchema,
  FoundrySlotAuditInputSchema,
  FoundryAssetPackGetInputSchema,
} from "./tools";

describe("FOUNDRY_MCP_TOOL_NAMES registry", () => {
  it("declares all 9 tools in canonical order", () => {
    expect(FOUNDRY_MCP_TOOL_NAMES).toEqual([
      "foundry/canon_list",
      "foundry/canon_get",
      "foundry/asset_pack_list",
      "foundry/asset_pack_get",
      "foundry/asset_pack_integration",
      "foundry/slot_audit",
      "foundry/generate",
      "foundry/generate_status",
      "foundry/diagnostics",
    ]);
  });

  it("each tool name is namespaced with the foundry/ prefix", () => {
    for (const name of FOUNDRY_MCP_TOOL_NAMES) {
      expect(name.startsWith("foundry/")).toBe(true);
    }
  });

  it("FoundryGenerateInputSchema rejects unknown kinds", () => {
    expect(() =>
      FoundryGenerateInputSchema.parse({ kind: "smoke-signal", description: "x" }),
    ).toThrow();
  });

  it("FoundryGenerateInputSchema accepts the 6 canonical kinds", () => {
    const ok = (kind: string) =>
      FoundryGenerateInputSchema.parse({ kind, description: "a war room background" });
    expect(ok("character").kind).toBe("character");
    expect(ok("floor").kind).toBe("floor");
    expect(ok("ui-texture").kind).toBe("ui-texture");
    expect(ok("icon").kind).toBe("icon");
    expect(ok("sprite-animation").kind).toBe("sprite-animation");
    expect(ok("lottie").kind).toBe("lottie");
  });

  it("FoundryGenerateOutputSchema requires runId UUID and status enum", () => {
    expect(() =>
      FoundryGenerateOutputSchema.parse({ runId: "not-a-uuid", status: "queued" }),
    ).toThrow();
    const ok = FoundryGenerateOutputSchema.parse({
      runId: "11111111-1111-4111-8111-111111111111",
      status: "queued",
    });
    expect(ok.status).toBe("queued");
  });

  it("FoundryCanonListInputSchema accepts optional kind filter", () => {
    expect(FoundryCanonListInputSchema.parse({}).kind).toBeUndefined();
    expect(FoundryCanonListInputSchema.parse({ kind: "character" }).kind).toBe("character");
  });

  it("FoundrySlotAuditInputSchema accepts optional space filter", () => {
    expect(FoundrySlotAuditInputSchema.parse({}).space).toBeUndefined();
  });

  it("FoundryAssetPackGetInputSchema requires a packId", () => {
    expect(() => FoundryAssetPackGetInputSchema.parse({})).toThrow();
    expect(FoundryAssetPackGetInputSchema.parse({ packId: "rafe-character-v3" }).packId)
      .toBe("rafe-character-v3");
  });
});
