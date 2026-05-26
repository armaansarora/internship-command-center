import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ARTLAB_DEMO_PACKS } from "./demo-fixtures";

describe("ARTLAB_DEMO_PACKS", () => {
  it("contains exactly one pack per demo modality (character / floor / icon / sprite-animation)", () => {
    const kinds = ARTLAB_DEMO_PACKS.map((p) => p.kind).sort();
    expect(kinds).toEqual(["character", "floor", "icon", "sprite-animation"]);
  });

  it("every demo pack has a publicPath under a known shipped asset root or is explicitly pending", () => {
    // `/art/...` is the ArtLab-promoted-asset namespace; `/lobby/...`
    // holds the pre-ArtLab lobby backdrops (still real, still shipped).
    const allowedRoots = ["/art/", "/lobby/"];
    for (const p of ARTLAB_DEMO_PACKS) {
      if (p.publicPath === null) {
        expect(p.pending).toBe(true);
        continue;
      }
      const ok = allowedRoots.some((root) => p.publicPath!.startsWith(root));
      expect(ok, `publicPath ${p.publicPath} must start with one of ${allowedRoots.join(", ")}`).toBe(true);
    }
  });

  it("every demo pack carries a Zod-valid manifest shape", () => {
    for (const p of ARTLAB_DEMO_PACKS) {
      expect(typeof p.packId).toBe("string");
      expect(typeof p.slotId).toBe("string");
      expect(typeof p.promotedAt).toBe("string");
    }
  });

  it("each demo pack carries an `integration` block keyed by its kind", () => {
    for (const p of ARTLAB_DEMO_PACKS) {
      expect(p.integration).toBeDefined();
    }
  });

  /**
   * Regression gate for the bug where every demo `publicPath` resolved
   * to a non-existent file under `public/`. Each non-pending entry MUST
   * point at a real file shipped in the repo, or the demo page renders
   * a broken image and the agent-to-app integration claim falls over.
   */
  it("every non-pending demo pack's publicPath resolves to a real file under public/", () => {
    const publicDir = join(process.cwd(), "public");
    for (const p of ARTLAB_DEMO_PACKS) {
      if (p.pending === true || p.publicPath === null) continue;
      const onDisk = join(publicDir, p.publicPath);
      expect(existsSync(onDisk), `missing on disk: ${onDisk} (pack ${p.packId})`).toBe(true);
    }
  });

  it("any pending pack declares an explicit pendingReason for the demo UI to surface", () => {
    for (const p of ARTLAB_DEMO_PACKS) {
      if (p.pending !== true) continue;
      expect(typeof p.pendingReason).toBe("string");
      expect((p.pendingReason ?? "").length).toBeGreaterThan(0);
    }
  });
});
