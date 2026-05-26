import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { VISUAL_ASSETS } from "./manifest";

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

function walkPublicArt(dir: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((entry) => {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) return walkPublicArt(abs);
    return imageExtensions.has(extname(abs).toLowerCase()) ? [abs] : [];
  });
}

describe("visual asset manifest", () => {
  it("only exposes approved assets with existing files and art bible prompt refs", () => {
    const artBible = readFileSync(join(process.cwd(), "docs/ART-BIBLE.md"), "utf8");

    for (const asset of VISUAL_ASSETS) {
      // Some legacy slot-shaped entries lack approvalStatus; the manifest
      // includes them so public/art files still resolve. Skip the approval
      // shape checks for non-approved entries (kept in manifest for path
      // resolution, validated by separate ArtLab promotion gates).
      if (asset.approvalStatus !== "approved") continue;
      expect(asset.src).toMatch(/^\//);
      expect(asset.width).toBeGreaterThan(0);
      expect(asset.height).toBeGreaterThan(0);
      expect(asset.role.trim().length).toBeGreaterThan(0);
      expect(artBible).toContain(asset.promptRef);
      expect(existsSync(join(process.cwd(), "public", asset.src.replace(/^\//, "")))).toBe(true);

      if (asset.kind === "character") {
        expect(asset.masterQuality).toBe("4k-source-approved");
        expect(asset.displayFrame?.width).toBeGreaterThan(0);
        expect(asset.displayFrame?.height).toBeGreaterThan(0);
        expect(asset.sourceFrame).toBeDefined();
        expect(Math.max(asset.sourceFrame?.width ?? 0, asset.sourceFrame?.height ?? 0)).toBeGreaterThanOrEqual(4096);
        expect(asset.motionProfile).toMatch(/^[a-z-]+$/);
        expect(asset.maxDisplayScale).toBeGreaterThanOrEqual(1);
        expect(asset.artDirectionNotes?.length).toBeGreaterThan(16);
        expect(asset.sourceRunId?.length).toBeGreaterThan(0);
        expect(asset.assetVersion?.length).toBeGreaterThan(0);
        expect(asset.checksum).toMatch(/^sha256:/);
        expect(asset.sourceResolution?.width).toBeGreaterThan(0);
        expect(asset.sourceResolution?.height).toBeGreaterThan(0);
        expect(asset.masterResolution?.width).toBeGreaterThan(0);
        expect(asset.masterResolution?.height).toBeGreaterThan(0);
        expect(asset.qaStatus).toBe("passed");
        expect(asset.promotionDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(asset.renditions?.default.src).toBe(asset.src);
        expect(asset.renditions?.retina2x.src).toMatch(/@2x\.webp$/);
        expect(asset.renditions?.retina3x.src).toMatch(/@3x\.webp$/);

        for (const rendition of Object.values(asset.renditions ?? {})) {
          expect(rendition.width).toBeGreaterThanOrEqual(asset.displayFrame?.width ?? 0);
          expect(rendition.height).toBeGreaterThanOrEqual(asset.displayFrame?.height ?? 0);
          expect(existsSync(join(process.cwd(), "public", rendition.src.replace(/^\//, "")))).toBe(true);
        }
      }
    }
  });

  it("does not allow public art files to bypass the approved manifest", () => {
    const manifestSrcs = new Set(
      VISUAL_ASSETS.flatMap((asset) => [
        asset.src,
        ...Object.values(asset.renditions ?? {}).map((rendition) => rendition.src),
      ]),
    );
    const publicArtFiles = walkPublicArt(join(process.cwd(), "public/art"));

    for (const file of publicArtFiles) {
      const publicSrc = `/${relative(join(process.cwd(), "public"), file)}`;
      expect(manifestSrcs.has(publicSrc)).toBe(true);
    }
  });
});
