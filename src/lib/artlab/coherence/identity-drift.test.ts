import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { hammingDistanceHex, measureIdentityDrift } from "./identity-drift";

describe("identity-drift", () => {
  describe("hammingDistanceHex", () => {
    it("returns 0 for identical hashes", () => {
      expect(hammingDistanceHex("ffffffff", "ffffffff")).toBe(0);
    });
    it("counts differing bits", () => {
      expect(hammingDistanceHex("0", "f")).toBe(4);    // 0000 vs 1111
      expect(hammingDistanceHex("00", "ff")).toBe(8);
    });
    it("tolerates different-length inputs", () => {
      expect(hammingDistanceHex("ffff", "ff")).toBe(0); // compares the overlap
    });
  });

  describe("measureIdentityDrift", () => {
    let dir: string;
    async function makePng(color: { r: number; g: number; b: number }, name: string): Promise<string> {
      const path = join(dir, name);
      const buf = await sharp({ create: { width: 32, height: 32, channels: 4, background: { ...color, alpha: 1 } } }).png().toBuffer();
      writeFileSync(path, buf);
      return path;
    }

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), "artlab-drift-"));
    });
    afterEach(() => {
      try { rmSync(dir, { recursive: true }); } catch { /* ignore */ }
    });

    it("reports zero drift when sprites match the reference exactly", async () => {
      const ref = await makePng({ r: 100, g: 80, b: 60 }, "ref.png");
      const s1 = await makePng({ r: 100, g: 80, b: 60 }, "s1.png");
      const s2 = await makePng({ r: 100, g: 80, b: 60 }, "s2.png");
      const report = await measureIdentityDrift(ref, [
        { slotId: "s1", pngPath: s1 },
        { slotId: "s2", pngPath: s2 },
      ]);
      expect(report.driftCount).toBe(0);
      expect(report.totalCount).toBe(2);
      expect(report.highDriftWarning).toBe(false);
      expect(report.maxHamming).toBeLessThanOrEqual(report.thresholdBits);
    });

    it("returns empty report when no sprites supplied", async () => {
      const ref = await makePng({ r: 0, g: 0, b: 0 }, "ref.png");
      const report = await measureIdentityDrift(ref, []);
      expect(report.totalCount).toBe(0);
      expect(report.driftCount).toBe(0);
      expect(report.flaggedSlots).toHaveLength(0);
    });

    it("treats unreadable sprite as max drift", async () => {
      const ref = await makePng({ r: 100, g: 80, b: 60 }, "ref.png");
      const report = await measureIdentityDrift(ref, [
        { slotId: "missing", pngPath: join(dir, "does-not-exist.png") },
      ]);
      expect(report.driftCount).toBe(1);
      expect(report.maxHamming).toBe(64);
      expect(report.highDriftWarning).toBe(true);
      expect(report.flaggedSlots[0]!.slotId).toBe("missing");
    });
  });
});
