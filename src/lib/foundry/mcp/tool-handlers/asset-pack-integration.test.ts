import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleFoundryAssetPackIntegration } from "./asset-pack-integration";

let packsRoot: string;

beforeEach(() => {
  packsRoot = mkdtempSync(join(tmpdir(), "foundry-integration-"));
});

function writePack(packId: string, manifest: Record<string, unknown>): void {
  mkdirSync(join(packsRoot, packId), { recursive: true });
  writeFileSync(join(packsRoot, packId, "manifest.json"), JSON.stringify(manifest));
}

describe("handleFoundryAssetPackIntegration", () => {
  it("emits a Next App Router snippet for a character pack by default", async () => {
    writePack("rafe-v3", {
      packId: "rafe-v3",
      kind: "character",
      slotId: "rafe.idle",
      promotedAt: "2026-05-25T12:00:00.000Z",
      publicPath: "/art/characters/rafe.png",
      integration: { width: 512, height: 768, alt: "Rafe Calder" },
    });
    const result = await handleFoundryAssetPackIntegration(
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
    const result = await handleFoundryAssetPackIntegration(
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
    const result = await handleFoundryAssetPackIntegration(
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
      handleFoundryAssetPackIntegration(
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
        handleFoundryAssetPackIntegration(
          { packId: evil, targetFramework: "next-app-router" },
          { packsRoot },
        ),
      ).rejects.toThrow(/(packId|outside packsRoot|empty|256|may not|encoded|must match|invalid)/i);
    });
  });
});
