import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFoundryAssetPack, type CreateFoundryAssetPackInput } from "./pack";
import { sha256OfBytes } from "./hashing";

function baseInput(packDir: string): Omit<CreateFoundryAssetPackInput, "payloadFiles" | "primaryFileRelPath"> {
  return {
    packDir,
    kind: "character-sprite",
    agent: "character-master",
    canonRefs: {
      characterId: "sol-navarro",
      paletteRef: "tower-default",
      typographyRef: null,
      motionLanguageRef: null,
    },
    dimensions: {
      sourceWidthPx: 2400,
      sourceHeightPx: 4096,
      displayWidthPx: 160,
      displayHeightPx: 280,
      aspectRatio: "9:16",
    },
    colorTokensUsed: ["primaryDark"],
    intendedSlot: {
      slotId: "lobby/otis/regular/idle",
      appPath: "public/art/lobby/otis/regular/idle.webp",
      component: "OtisCharacter",
      requiresGsap: false,
    },
    gsapCues: [],
    accessibility: { altText: "x", role: "img", prefersReducedMotionStrategy: "static-fallback" },
    integrationSnippetTemplate: "character-sprite-img",
    generation: {
      agentName: "character-master",
      provider: "gemini-2.5-flash-image",
      modelId: "gemini-2.5-flash-image",
      seed: 1,
      costCents: 4,
      durationMs: 100,
      generatedAt: "2026-05-25T00:00:00.000Z",
    },
  };
}

describe("createFoundryAssetPack", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "foundry-pack-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("writes a manifest.json + payload files atomically", async () => {
    const bytes = Buffer.from("fake-png-bytes");
    const expectedHash = sha256OfBytes(bytes);
    const pack = await createFoundryAssetPack({
      packDir: tmpDir,
      kind: "character-sprite",
      agent: "character-master",
      canonRefs: { characterId: "sol-navarro", paletteRef: "tower-default", typographyRef: null, motionLanguageRef: null },
      dimensions: { sourceWidthPx: 2400, sourceHeightPx: 4096, displayWidthPx: 160, displayHeightPx: 280, aspectRatio: "9:16" },
      colorTokensUsed: ["primaryDark"],
      intendedSlot: { slotId: "lobby/otis/regular/idle", appPath: "public/art/lobby/otis/regular/idle.webp", component: "OtisCharacter", requiresGsap: false },
      gsapCues: [],
      accessibility: { altText: "x", role: "img", prefersReducedMotionStrategy: "static-fallback" },
      integrationSnippetTemplate: "character-sprite-img",
      payloadFiles: [{ relPath: "idle.webp", bytes }],
      primaryFileRelPath: "idle.webp",
      generation: { agentName: "character-master", provider: "gemini-2.5-flash-image", modelId: "gemini-2.5-flash-image", seed: 1, costCents: 4, durationMs: 100, generatedAt: "2026-05-25T00:00:00.000Z" },
    });

    expect(existsSync(join(tmpDir, "manifest.json"))).toBe(true);
    expect(existsSync(join(tmpDir, "payload", "idle.webp"))).toBe(true);
    const manifest = JSON.parse(readFileSync(join(tmpDir, "manifest.json"), "utf8"));
    expect(manifest.payload.files[0].sha256).toBe(expectedHash);
    expect(pack.manifest.packId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects when payloadFiles is empty", async () => {
    await expect(
      createFoundryAssetPack({
        packDir: tmpDir,
        kind: "character-sprite",
        agent: "character-master",
        canonRefs: { characterId: "x", paletteRef: null, typographyRef: null, motionLanguageRef: null },
        dimensions: { sourceWidthPx: 1, sourceHeightPx: 1, displayWidthPx: 1, displayHeightPx: 1, aspectRatio: "1:1" },
        colorTokensUsed: [],
        intendedSlot: { slotId: "x", appPath: "public/x.webp", component: null, requiresGsap: false },
        gsapCues: [],
        accessibility: { altText: "x", role: "img", prefersReducedMotionStrategy: "static-fallback" },
        integrationSnippetTemplate: "x",
        payloadFiles: [],
        primaryFileRelPath: "x.webp",
        generation: { agentName: "character-master", provider: "x", modelId: "x", seed: 0, costCents: 0, durationMs: 0, generatedAt: "2026-05-25T00:00:00.000Z" },
      }),
    ).rejects.toThrow();
  });

  describe("payload relPath path-traversal hardening", () => {
    // Reviewer Critical 2 — pack.ts previously rejected only literal `..`
    // (`f.relPath.includes("..")`). Vector-bypass via absolute paths,
    // backslash, NUL, percent-encoding all reached the filesystem with the
    // attacker-controlled path. Mirror the manifest.schema attack vectors so
    // the writer enforces the same allow-list as the schema reader.
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["literal traversal", "../escape.webp"],
      ["dot-segment escape", "sub/./../../escape.webp"],
      ["url-encoded ..", "idle.webp%2f..%2fetc"],
      ["url-encoded dots inside segment", "foo/%2e%2e/bar.webp"],
      ["double slash", "sub//evil.webp"],
      ["backslash separator", "sub\\evil.webp"],
      ["NUL byte injection", "evil.webp\0.png"],
      ["leading slash absolute", "/etc/passwd"],
      ["tilde home expansion", "~/secret.webp"],
      ["windows drive prefix", "C:/Windows/evil.webp"],
      ["empty relPath", ""],
    ];

    for (const [label, relPath] of cases) {
      it(`rejects payload relPath: ${label}`, async () => {
        await expect(
          createFoundryAssetPack({
            ...baseInput(tmpDir),
            payloadFiles: [{ relPath, bytes: Buffer.from("x") }],
            primaryFileRelPath: relPath,
          }),
        ).rejects.toThrow(/relPath/);
      });
    }

    it("ensures no payload file is written outside payloadDir for any rejected relPath", async () => {
      // Defence-in-depth: the writer must refuse BEFORE touching the filesystem,
      // not after. Pre-create an "escape" marker so we can prove nothing was
      // written outside the pack directory.
      const escapeProbe = join(tmpDir, "..", "ESCAPE_PROBE_SHOULD_NOT_EXIST");
      await expect(
        createFoundryAssetPack({
          ...baseInput(tmpDir),
          payloadFiles: [{ relPath: "../ESCAPE_PROBE_SHOULD_NOT_EXIST", bytes: Buffer.from("pwned") }],
          primaryFileRelPath: "../ESCAPE_PROBE_SHOULD_NOT_EXIST",
        }),
      ).rejects.toThrow();
      expect(existsSync(escapeProbe)).toBe(false);
    });
  });

  describe("nested payload relPath", () => {
    it("creates the parent directory for nested files using dirname (no fragile path math)", async () => {
      // Reviewer Critical 2 — the prior implementation used
      // `join(abs, "..").replace(/\/\.$/, "")` to derive the parent dir,
      // which mis-handles edge cases. Switching to `path.dirname` keeps
      // nested-relPath writes correct.
      const bytes = Buffer.from("nested-bytes");
      const input = baseInput(tmpDir);
      const result = await createFoundryAssetPack({
        ...input,
        payloadFiles: [{ relPath: "frames/idle/01.webp", bytes }],
        primaryFileRelPath: "frames/idle/01.webp",
      });
      expect(existsSync(join(tmpDir, "payload", "frames", "idle", "01.webp"))).toBe(true);
      expect(result.manifest.payload.files[0].relPath).toBe("frames/idle/01.webp");
    });
  });

  describe("payloadDir containment", () => {
    it("never writes a payload file outside payloadDir", async () => {
      // Belt-and-braces — even if a future relPath check regresses, the
      // post-join `startsWith(payloadDir + sep)` assertion must catch it.
      // Use a string that would only escape via the join, to surface the
      // post-join guard rather than the upfront validator.
      mkdirSync(join(tmpDir, "sibling"), { recursive: true });
      await expect(
        createFoundryAssetPack({
          ...baseInput(tmpDir),
          payloadFiles: [{ relPath: "../sibling/escape.webp", bytes: Buffer.from("x") }],
          primaryFileRelPath: "../sibling/escape.webp",
        }),
      ).rejects.toThrow();
      expect(existsSync(join(tmpDir, "sibling", "escape.webp"))).toBe(false);
    });
  });
});
