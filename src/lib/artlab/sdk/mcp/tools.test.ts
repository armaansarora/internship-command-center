import { describe, expect, it } from "vitest";
import {
  ARTLAB_MCP_TOOL_NAMES,
  ARTLAB_GENERATE_DESCRIPTION_MAX_CHARS,
  ARTLAB_GENERATE_REFERENCE_IMAGE_HOST_ALLOWLIST,
  ArtLabGenerateInputSchema,
  ArtLabGenerateOutputSchema,
  ArtLabCanonListInputSchema,
  ArtLabSlotAuditInputSchema,
  ArtLabAssetPackGetInputSchema,
} from "./tools";

describe("ARTLAB_MCP_TOOL_NAMES registry", () => {
  it("declares all 9 tools in canonical order", () => {
    expect(ARTLAB_MCP_TOOL_NAMES).toEqual([
      "artlab/canon_list",
      "artlab/canon_get",
      "artlab/asset_pack_list",
      "artlab/asset_pack_get",
      "artlab/asset_pack_integration",
      "artlab/slot_audit",
      "artlab/generate",
      "artlab/generate_status",
      "artlab/diagnostics",
    ]);
  });

  it("each tool name is namespaced with the artlab/ prefix", () => {
    for (const name of ARTLAB_MCP_TOOL_NAMES) {
      expect(name.startsWith("artlab/")).toBe(true);
    }
  });

  it("ArtLabGenerateInputSchema rejects unknown kinds", () => {
    expect(() =>
      ArtLabGenerateInputSchema.parse({ kind: "smoke-signal", description: "x" }),
    ).toThrow();
  });

  it("ArtLabGenerateInputSchema accepts the 6 canonical kinds", () => {
    const ok = (kind: string) =>
      ArtLabGenerateInputSchema.parse({ kind, description: "a war room background" });
    expect(ok("character").kind).toBe("character");
    expect(ok("floor").kind).toBe("floor");
    expect(ok("ui-texture").kind).toBe("ui-texture");
    expect(ok("icon").kind).toBe("icon");
    expect(ok("sprite-animation").kind).toBe("sprite-animation");
    expect(ok("lottie").kind).toBe("lottie");
  });

  it("ArtLabGenerateOutputSchema requires runId UUID and status enum", () => {
    expect(() =>
      ArtLabGenerateOutputSchema.parse({ runId: "not-a-uuid", status: "queued" }),
    ).toThrow();
    const ok = ArtLabGenerateOutputSchema.parse({
      runId: "11111111-1111-4111-8111-111111111111",
      status: "queued",
    });
    expect(ok.status).toBe("queued");
  });

  it("ArtLabCanonListInputSchema accepts optional kind filter", () => {
    expect(ArtLabCanonListInputSchema.parse({}).kind).toBeUndefined();
    expect(ArtLabCanonListInputSchema.parse({ kind: "character" }).kind).toBe("character");
  });

  it("ArtLabSlotAuditInputSchema accepts optional space filter", () => {
    expect(ArtLabSlotAuditInputSchema.parse({}).space).toBeUndefined();
  });

  it("ArtLabAssetPackGetInputSchema requires a packId", () => {
    expect(() => ArtLabAssetPackGetInputSchema.parse({})).toThrow();
    expect(ArtLabAssetPackGetInputSchema.parse({ packId: "rafe-character-v3" }).packId)
      .toBe("rafe-character-v3");
  });
});

describe("ArtLabGenerateInputSchema — abuse-prevention limits", () => {
  const baseValid = { kind: "character" as const, description: "a war room background" };

  it("exports a documented description length cap (~4000 chars)", () => {
    // The cap is published so other layers (CLI, web UI, batch jobs) honour
    // the same ceiling without redefining it.
    expect(ARTLAB_GENERATE_DESCRIPTION_MAX_CHARS).toBe(4000);
  });

  it("accepts a description right at the documented length cap", () => {
    const at = "a".repeat(ARTLAB_GENERATE_DESCRIPTION_MAX_CHARS);
    const parsed = ArtLabGenerateInputSchema.parse({ ...baseValid, description: at });
    expect(parsed.description.length).toBe(ARTLAB_GENERATE_DESCRIPTION_MAX_CHARS);
  });

  it("rejects an overlong description (one char above the cap)", () => {
    // No cap previously meant a single MCP call could be megabytes of prompt
    // text — easy DoS surface. The cap rejects abuse without truncating
    // honest prompts (rich character briefs sit well under 4000 chars).
    const tooLong = "a".repeat(ARTLAB_GENERATE_DESCRIPTION_MAX_CHARS + 1);
    expect(() => ArtLabGenerateInputSchema.parse({ ...baseValid, description: tooLong })).toThrow(
      /description/i,
    );
  });

  it("exposes a documented HTTPS host allow-list for referenceImageUrl", () => {
    // Surfacing the allow-list as a constant lets ops adjust it without
    // grepping the schema and lets tests assert membership.
    expect(Array.isArray(ARTLAB_GENERATE_REFERENCE_IMAGE_HOST_ALLOWLIST)).toBe(true);
    expect(ARTLAB_GENERATE_REFERENCE_IMAGE_HOST_ALLOWLIST.length).toBeGreaterThan(0);
  });

  it("accepts an HTTPS referenceImageUrl on an allow-listed host", () => {
    const host = ARTLAB_GENERATE_REFERENCE_IMAGE_HOST_ALLOWLIST[0];
    const url = `https://${host}/path/to/asset.png`;
    expect(
      ArtLabGenerateInputSchema.parse({ ...baseValid, referenceImageUrl: url }).referenceImageUrl,
    ).toBe(url);
  });

  it("rejects a non-HTTPS referenceImageUrl (http://, file://, javascript:)", () => {
    // Plaintext http and non-fetchable schemes are obvious SSRF/exfil vectors.
    expect(() =>
      ArtLabGenerateInputSchema.parse({ ...baseValid, referenceImageUrl: "http://example.com/x.png" }),
    ).toThrow();
    expect(() =>
      ArtLabGenerateInputSchema.parse({ ...baseValid, referenceImageUrl: "file:///etc/passwd" }),
    ).toThrow();
    expect(() =>
      ArtLabGenerateInputSchema.parse({
        ...baseValid,
        referenceImageUrl: "javascript:alert(1)",
      }),
    ).toThrow();
  });

  it.each([
    ["169.254.169.254 metadata IP (AWS IMDS SSRF)", "https://169.254.169.254/latest/meta-data/"],
    ["loopback IP", "https://127.0.0.1/admin"],
    ["loopback hostname", "https://localhost/admin"],
    ["RFC1918 private 10.x", "https://10.0.0.1/internal"],
    ["RFC1918 private 192.168", "https://192.168.0.1/router"],
    ["link-local 169.254", "https://169.254.0.1/wpad.dat"],
    ["non-allow-listed host", "https://attacker.example/x.png"],
  ])(
    "rejects SSRF target: %s",
    (_label, url) => {
      expect(() =>
        ArtLabGenerateInputSchema.parse({ ...baseValid, referenceImageUrl: url }),
      ).toThrow();
    },
  );

  it.each([
    ["plain traversal", "../../../etc/passwd"],
    ["URL-encoded traversal", "..%2f..%2fpasswd"],
    ["absolute path", "/etc/passwd"],
    ["home expansion", "~/.ssh/id_rsa"],
    ["backslash traversal", "..\\..\\Windows"],
    ["forward slash inside id", "pack/manifest.json"],
    ["hidden dotfile", ".ssh"],
    ["NUL byte", "pack .png"],
    ["very long id (>256)", "a".repeat(257)],
  ])("rejects malicious anchorPackId: %s", (_label, evil) => {
    // anchorPackId previously used a plain `z.string().min(1)` which let
    // every path-traversal vector through. It now flows through PackIdSchema
    // (same strict validator the asset_pack tools use).
    expect(() =>
      ArtLabGenerateInputSchema.parse({ ...baseValid, anchorPackId: evil }),
    ).toThrow();
  });

  it("accepts a normal anchorPackId via the PackIdSchema validator", () => {
    const parsed = ArtLabGenerateInputSchema.parse({
      ...baseValid,
      anchorPackId: "rafe-character-v3",
    });
    expect(parsed.anchorPackId).toBe("rafe-character-v3");
  });

  // ─────────────────────────────────────────────────────────────────────────
  // characterId — Unit 5 of the 2026-05-27 system-fixes plan.
  //
  // The MCP `generate` tool now accepts an optional canon `header.id`
  // (e.g. "sol-navarro") or legacy roleSlug (e.g. "cno"). Absent, the
  // daemon routes the description through the intake router. Present,
  // the daemon resolves it through the same router so legacy slugs
  // always lift to canon header.ids before reaching run-state.
  // ─────────────────────────────────────────────────────────────────────────
  describe("characterId — canon identity passthrough", () => {
    it("accepts canon header.id", () => {
      const parsed = ArtLabGenerateInputSchema.parse({ ...baseValid, characterId: "sol-navarro" });
      expect(parsed.characterId).toBe("sol-navarro");
    });

    it("accepts legacy roleSlug", () => {
      const parsed = ArtLabGenerateInputSchema.parse({ ...baseValid, characterId: "cno" });
      expect(parsed.characterId).toBe("cno");
    });

    it("treats characterId as optional (callers may rely on description-based routing)", () => {
      const parsed = ArtLabGenerateInputSchema.parse(baseValid);
      expect(parsed.characterId).toBeUndefined();
    });

    it("rejects non-kebab-case characterId", () => {
      expect(() =>
        ArtLabGenerateInputSchema.parse({ ...baseValid, characterId: "Sol Navarro" }),
      ).toThrow();
      expect(() =>
        ArtLabGenerateInputSchema.parse({ ...baseValid, characterId: "Mara_Voss" }),
      ).toThrow();
      // Single chars and empty strings violate the min-length rule.
      expect(() =>
        ArtLabGenerateInputSchema.parse({ ...baseValid, characterId: "a" }),
      ).toThrow();
    });

    it("rejects characterId longer than 64 chars (abuse cap)", () => {
      const tooLong = "a".repeat(65);
      expect(() =>
        ArtLabGenerateInputSchema.parse({ ...baseValid, characterId: tooLong }),
      ).toThrow();
    });
  });
});
