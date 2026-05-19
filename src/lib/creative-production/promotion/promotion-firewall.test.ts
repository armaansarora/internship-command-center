import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateCreativePromotionFirewall,
  promoteCreativeAssetsTransactionally,
} from "./index";

function writeFile(path: string, content = "asset"): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

describe("creative promotion firewall", () => {
  it("blocks promotion until exact approval, strict QA, final board, and app preview are present", () => {
    const root = mkdtempSync(join(tmpdir(), "tower-promotion-firewall-"));
    const stagedAsset = join(root, "staged", "otis.webp");

    writeFile(stagedAsset);

    const blocked = evaluateCreativePromotionFirewall({
      runId: "otis-v1",
      currentPhase: "app-preview-ready",
      approvalPhrase: "looks good",
      publicArtWritesAllowed: false,
      strictQaPassed: true,
      finalBoardActionManifest: {
        exists: true,
        promotesOnAction: false,
        localImagePaths: [stagedAsset],
      },
      appPreviewActionManifest: {
        exists: true,
        promotesOnAction: false,
        localImagePaths: [stagedAsset],
      },
      stagedAssets: [{
        slotId: "otis-idle",
        sourcePath: stagedAsset,
        targetRelativePath: "lobby/otis/regular/idle.webp",
      }],
    });

    expect(blocked.allowed).toBe(false);
    expect(blocked.blockers).toContain("approval-phrase-missing");
    expect(blocked.blockers).toContain("public-art-writes-not-unlocked");
  });

  it("promotes only after the firewall passes and writes a receipt in a temp public-art area", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-promotion-pass-"));
    const stagedAsset = join(root, "staged", "otis.webp");
    const publicArtRoot = join(root, "public-art");
    const manifestPath = join(root, "manifest.json");
    const receiptPath = join(root, "promotion-receipt.json");

    writeFile(stagedAsset, "promoted-asset");
    writeFile(manifestPath, "[]");

    const result = await promoteCreativeAssetsTransactionally({
      runId: "otis-v1",
      currentPhase: "app-preview-ready",
      approvalPhrase: "approved for app",
      publicArtWritesAllowed: true,
      strictQaPassed: true,
      finalBoardActionManifest: {
        exists: true,
        promotesOnAction: false,
        localImagePaths: [stagedAsset],
      },
      appPreviewActionManifest: {
        exists: true,
        promotesOnAction: false,
        localImagePaths: [stagedAsset],
      },
      stagedAssets: [{
        slotId: "otis-idle",
        sourcePath: stagedAsset,
        targetRelativePath: "lobby/otis/regular/idle.webp",
      }],
      publicArtRoot,
      manifestPath,
      receiptPath,
    });

    const promotedPath = join(publicArtRoot, "lobby", "otis", "regular", "idle.webp");

    expect(result.status).toBe("promoted");
    expect(existsSync(promotedPath)).toBe(true);
    expect(readFileSync(promotedPath, "utf8")).toBe("promoted-asset");
    expect(JSON.parse(readFileSync(manifestPath, "utf8"))).toEqual([
      {
        slotId: "otis-idle",
        src: "/art/lobby/otis/regular/idle.webp",
        sourcePath: stagedAsset,
        runId: "otis-v1",
      },
    ]);
    expect(JSON.parse(readFileSync(receiptPath, "utf8"))).toMatchObject({
      schemaVersion: "tower-creative-promotion-receipt-v1",
      runId: "otis-v1",
      promotedAssets: [{ slotId: "otis-idle" }],
      approvalPhrase: "approved for app",
    });
  });
});
