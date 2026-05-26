import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleArtLabAssetPackIntegration } from "./asset-pack-integration";

let packsRoot: string;

beforeEach(() => {
  packsRoot = mkdtempSync(join(tmpdir(), "artlab-integration-"));
});

function writePack(packId: string, manifest: Record<string, unknown>): void {
  mkdirSync(join(packsRoot, packId), { recursive: true });
  writeFileSync(join(packsRoot, packId, "manifest.json"), JSON.stringify(manifest));
}

describe("handleArtLabAssetPackIntegration", () => {
  it("emits a Next App Router snippet for a character pack by default", async () => {
    writePack("rafe-v3", {
      packId: "rafe-v3",
      kind: "character",
      slotId: "rafe.idle",
      promotedAt: "2026-05-25T12:00:00.000Z",
      publicPath: "/art/characters/rafe.png",
      integration: { width: 512, height: 768, alt: "Rafe Calder" },
    });
    const result = await handleArtLabAssetPackIntegration(
      { packId: "rafe-v3", targetFramework: "next-app-router" },
      { packsRoot },
    );
    expect(result.importStatement).toContain('import Image from "next/image"');
    expect(result.snippet).toContain("/art/characters/rafe.png");
    expect(result.snippet).toContain("alt=\"Rafe Calder\"");
  });

  it("emits a Lottie player snippet for kind=lottie", async () => {
    writePack("rafe-idle-lottie", {
      packId: "rafe-idle-lottie",
      kind: "lottie",
      slotId: "rafe.idle.lottie",
      promotedAt: "2026-05-25T12:00:00.000Z",
      publicPath: "/art/lottie/rafe-idle.json",
      integration: { width: 240, height: 240, loop: true, autoplay: true },
    });
    const result = await handleArtLabAssetPackIntegration(
      { packId: "rafe-idle-lottie", targetFramework: "next-app-router" },
      { packsRoot },
    );
    expect(result.snippet).toContain("DotLottieReact");
    expect(result.snippet).toContain("/art/lottie/rafe-idle.json");
  });

  it("falls back to a raw snippet when targetFramework is raw", async () => {
    writePack("ui-button-tex", {
      packId: "ui-button-tex",
      kind: "ui-texture",
      slotId: "tower.button.bg",
      promotedAt: "2026-05-25T12:00:00.000Z",
      publicPath: "/art/textures/btn.webp",
      integration: { cssVar: "--btn-bg" },
    });
    const result = await handleArtLabAssetPackIntegration(
      { packId: "ui-button-tex", targetFramework: "raw" },
      { packsRoot },
    );
    expect(result.snippet).toContain("--btn-bg");
    expect(result.snippet).toContain("/art/textures/btn.webp");
  });

  it("throws when the pack has no `integration` block", async () => {
    writePack("incomplete", {
      packId: "incomplete",
      kind: "character",
      slotId: "x",
      promotedAt: "2026-05-25T12:00:00.000Z",
      publicPath: "/art/x.png",
    });
    await expect(
      handleArtLabAssetPackIntegration(
        { packId: "incomplete", targetFramework: "next-app-router" },
        { packsRoot },
      ),
    ).rejects.toThrow(/integration metadata missing/i);
  });

  describe("path-traversal attack vectors (security)", () => {
    it.each([
      ["plain traversal", "../../../etc/passwd"],
      ["URL-encoded traversal", "..%2f..%2fpasswd"],
      ["uppercase encoded traversal", "..%2F..%2Fpasswd"],
      ["encoded dot-dot", "%2e%2e/passwd"],
      ["mid-string traversal", "pack/../escape"],
      ["absolute path", "/absolute"],
      ["home expansion", "~/home"],
      ["empty string", ""],
      ["very long string (>256)", "a".repeat(257)],
      ["backslash traversal", "..\\..\\Windows"],
      ["hidden dotfile", ".ssh"],
      ["bare dot", "."],
    ])("rejects %s with a validation/safety error", async (_label, evil) => {
      await expect(
        handleArtLabAssetPackIntegration(
          { packId: evil, targetFramework: "next-app-router" },
          { packsRoot },
        ),
      ).rejects.toThrow(/(packId|outside packsRoot|empty|256|may not|encoded|must match|invalid)/i);
    });

    // Defense-in-depth on the manifest-controlled `publicPath`. The packId
    // can be safe yet a poisoned manifest could publish a snippet whose
    // src/href escapes the asset-pack URL space. The integration handler
    // now runs publicPath through `assertPathSafeAgainstTraversal` before
    // emitting it into a snippet.
    it.each([
      ["plain traversal", "../../../etc/passwd"],
      ["URL-encoded traversal", "..%2f..%2fpasswd"],
      ["uppercase encoded traversal", "..%2F..%2Fetc%2Fpasswd"],
      ["encoded dot-dot", "%2e%2e/passwd"],
      ["mid-string traversal", "/art/../../private/secret.png"],
      ["backslash traversal", "..\\..\\Windows"],
      ["NUL byte", "evil\0.png"],
      ["leading tilde", "~/home"],
      ["empty string", ""],
    ])("rejects manifest publicPath: %s", async (_label, evilPublicPath) => {
      mkdirSync(join(packsRoot, "rafe-v3"), { recursive: true });
      writeFileSync(
        join(packsRoot, "rafe-v3", "manifest.json"),
        JSON.stringify({
          packId: "rafe-v3",
          kind: "character",
          slotId: "rafe.idle",
          promotedAt: "2026-05-25T12:00:00.000Z",
          publicPath: evilPublicPath,
          integration: { width: 100, height: 100, alt: "x" },
        }),
      );
      await expect(
        handleArtLabAssetPackIntegration(
          { packId: "rafe-v3", targetFramework: "next-app-router" },
          { packsRoot },
        ),
      ).rejects.toThrow(/(publicPath|not safe|may not|encoded|empty|NUL|traversal)/i);
    });
  });

  // Round-4 follow-up to Codex's MEDIUM finding: a poisoned manifest's
  // `integration.*` fields (alt, cssVar, fps, etc.) flowed into generated
  // TSX/CSS via bare template strings, mirroring the bug round-3 fixed in
  // the sister file `src/lib/artlab/sdk/asset-pack/integration-snippet.ts`.
  // Now all string slots go through `JSON.stringify` and identifier fields
  // through strict character-class validators. These regressions prove the
  // bypass is closed at this surface too.
  describe("integration-field injection vectors (security)", () => {
    it("escapes a malicious integration.alt as a JSON string literal (no JSX attribute injection)", async () => {
      const malicious = 'x" onerror="alert(1)';
      writePack("char-alt-attack", {
        packId: "char-alt-attack",
        kind: "character",
        slotId: "x",
        promotedAt: "2026-05-25T12:00:00.000Z",
        publicPath: "/art/x.png",
        integration: { width: 100, height: 100, alt: malicious },
      });
      const result = await handleArtLabAssetPackIntegration(
        { packId: "char-alt-attack", targetFramework: "next-app-router" },
        { packsRoot },
      );
      // The exact JSON-stringified payload must appear verbatim — the inner
      // `"` becomes `\"`, so the malicious content stays bound to a single
      // string literal and cannot break out into a sibling JSX attribute.
      expect(result.snippet).toContain(`alt=${JSON.stringify(malicious)}`);
      // The raw, attribute-breaking form must not appear.
      expect(result.snippet).not.toContain(`alt="${malicious}"`);
    });

    it("escapes a malicious integration.alt on floor packs as well", async () => {
      const malicious = 'floor" onclick="bad()';
      writePack("floor-alt-attack", {
        packId: "floor-alt-attack",
        kind: "floor",
        slotId: "war-room.bg",
        promotedAt: "2026-05-25T12:00:00.000Z",
        publicPath: "/art/floors/war-room.webp",
        integration: { alt: malicious },
      });
      const result = await handleArtLabAssetPackIntegration(
        { packId: "floor-alt-attack", targetFramework: "next-app-router" },
        { packsRoot },
      );
      expect(result.snippet).toContain(`alt=${JSON.stringify(malicious)}`);
      expect(result.snippet).not.toContain(`alt="${malicious}"`);
    });

    it("escapes a malicious publicPath inside the Image src attribute (defense-in-depth even after URL-safety check)", async () => {
      // assertUrlPathSafeAgainstTraversal rejects backslash/quote/NUL/etc.,
      // so this path never reaches the snippet. The defense-in-depth here
      // is the JSON.stringify on src= which would survive even if a future
      // URL-safety rule loosened.
      writePack("benign-src", {
        packId: "benign-src",
        kind: "character",
        slotId: "x",
        promotedAt: "2026-05-25T12:00:00.000Z",
        publicPath: "/art/characters/safe.png",
        integration: { width: 100, height: 100, alt: "ok" },
      });
      const result = await handleArtLabAssetPackIntegration(
        { packId: "benign-src", targetFramework: "next-app-router" },
        { packsRoot },
      );
      // src must be a JSON-quoted literal, not a bare `src="..."` (which
      // is byte-identical for benign input but the format guarantees the
      // hostile-input case stays escaped).
      expect(result.snippet).toContain(`src=${JSON.stringify("/art/characters/safe.png")}`);
    });

    it("rejects an invalid CSS custom-property name in integration.cssVar", async () => {
      // A poisoned cssVar like `--foo; } body { background: red` would
      // break out of the `:root { ... }` block and inject arbitrary CSS.
      // The CSS_VAR_RE validator refuses anything outside `--[ident]`.
      writePack("ui-css-attack", {
        packId: "ui-css-attack",
        kind: "ui-texture",
        slotId: "tower.button.bg",
        promotedAt: "2026-05-25T12:00:00.000Z",
        publicPath: "/art/textures/btn.webp",
        integration: { cssVar: "--foo; } body { background: red; --x" },
      });
      await expect(
        handleArtLabAssetPackIntegration(
          { packId: "ui-css-attack", targetFramework: "raw" },
          { packsRoot },
        ),
      ).rejects.toThrow(/invalid CSS custom property name/i);
    });

    it("rejects a cssVar missing the leading -- (must be a custom property)", async () => {
      writePack("ui-css-bare", {
        packId: "ui-css-bare",
        kind: "ui-texture",
        slotId: "tower.button.bg",
        promotedAt: "2026-05-25T12:00:00.000Z",
        publicPath: "/art/textures/btn.webp",
        integration: { cssVar: "color" },
      });
      await expect(
        handleArtLabAssetPackIntegration(
          { packId: "ui-css-bare", targetFramework: "raw" },
          { packsRoot },
        ),
      ).rejects.toThrow(/invalid CSS custom property name/i);
    });

    it("escapes the publicPath inside CSS url() function via JSON.stringify", async () => {
      writePack("ui-css-safe", {
        packId: "ui-css-safe",
        kind: "ui-texture",
        slotId: "tower.button.bg",
        promotedAt: "2026-05-25T12:00:00.000Z",
        publicPath: "/art/textures/btn.webp",
        integration: { cssVar: "--btn-bg" },
      });
      const result = await handleArtLabAssetPackIntegration(
        { packId: "ui-css-safe", targetFramework: "raw" },
        { packsRoot },
      );
      // CSS url() argument is JSON-quoted so any future loosening of the
      // URL-safety check still can't break out of the function call.
      expect(result.snippet).toContain(`url(${JSON.stringify("/art/textures/btn.webp")})`);
      expect(result.snippet).toContain(`--btn-bg`);
    });
  });
});
