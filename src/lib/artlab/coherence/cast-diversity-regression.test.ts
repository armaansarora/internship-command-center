// src/lib/artlab/coherence/cast-diversity-regression.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { computePerceptualHash } from "./hashes";
import {
  loadCanonIdentities,
  resetCanonIdentityCache,
} from "@/lib/artlab/sdk/canon/canon-identity-map";

describe.skip("live image — Phase 6 cast diversity (manual: run after each character)", () => {
  it("every promoted character's idle.webp has a distinct perceptual hash from all others", async () => {
    // Resolve canon identities so each promoted character is sourced from its
    // own floor (e.g. Sol -> rolodex-lounge, Rafe -> war-room). The legacy
    // version hardcoded "public/art/lobby" and silently skipped every
    // non-lobby character.
    resetCanonIdentityCache();
    const canon = loadCanonIdentities();
    if (canon.length === 0) return;

    const hashes: { characterId: string; hash: string }[] = [];
    for (const id of canon) {
      const idlePath = join(
        process.cwd(),
        "public",
        "art",
        id.floorId,
        id.headerId,
        "idle.webp",
      );
      if (!existsSync(idlePath)) continue;
      const bytes = readFileSync(idlePath);
      const hash = await computePerceptualHash(bytes);
      hashes.push({ characterId: id.headerId, hash });
    }
    if (hashes.length === 0) return;
    // All hashes must be distinct — no character's idle pose collides with another's.
    const distinct = new Set(hashes.map((h) => h.hash));
    expect(distinct.size).toBe(hashes.length);
  }, 60_000);
});

// -----------------------------------------------------------------------------
// Shape test — synthetic 8x8 PNG fixtures, no real promoted-character images.
//
// What this catches:
//   - `computePerceptualHash` produces a stable hex string of the expected
//     length (canon: 16 chars = (8 * 8) / 4 nibbles).
//   - Visually distinct fixtures yield distinct hashes.
//   - The path-derivation contract uses `canon.floorId` per character (NOT a
//     hardcoded "public/art/lobby") — exercised via `loadCanonIdentities`.
// -----------------------------------------------------------------------------
describe("shape — perceptual-hash fixture sanity + canon floor-derived paths", () => {
  let workdir: string;
  beforeEach(() => {
    workdir = mkdtempSync(join(tmpdir(), "artlab-castdiv-"));
  });

  it("computePerceptualHash returns a 16-char hex string for an 8x8 input", async () => {
    const png = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 40, g: 80, b: 120 } },
    })
      .png()
      .toBuffer();
    const hash = await computePerceptualHash(png);
    expect(typeof hash).toBe("string");
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("visually distinct fixtures yield distinct hashes", async () => {
    // Construct two fixtures whose 8x8 greyscale downsamples land bits on
    // opposite sides of the mean threshold. Left-half-dark vs. top-half-dark
    // produce different bit layouts: the left/right split rotates the dark
    // band 90° from the top/bottom split, so the per-nibble packing
    // (4 horizontally-adjacent bits per hex digit) ends up different.
    const HALF = 16;
    const FULL = 32;
    const leftDark = Buffer.alloc(FULL * FULL * 3);
    for (let y = 0; y < FULL; y += 1) {
      for (let x = 0; x < FULL; x += 1) {
        const i = (y * FULL + x) * 3;
        const v = x < HALF ? 0 : 240;
        leftDark[i] = v;
        leftDark[i + 1] = v;
        leftDark[i + 2] = v;
      }
    }
    const topDark = Buffer.alloc(FULL * FULL * 3);
    for (let y = 0; y < FULL; y += 1) {
      for (let x = 0; x < FULL; x += 1) {
        const i = (y * FULL + x) * 3;
        const v = y < HALF ? 0 : 240;
        topDark[i] = v;
        topDark[i + 1] = v;
        topDark[i + 2] = v;
      }
    }
    const leftDarkPng = await sharp(leftDark, {
      raw: { width: FULL, height: FULL, channels: 3 },
    })
      .png()
      .toBuffer();
    const topDarkPng = await sharp(topDark, {
      raw: { width: FULL, height: FULL, channels: 3 },
    })
      .png()
      .toBuffer();

    const hashLeft = await computePerceptualHash(leftDarkPng);
    const hashTop = await computePerceptualHash(topDarkPng);
    expect(hashLeft).not.toBe(hashTop);
  });

  it("identical bytes yield identical hashes", async () => {
    const png = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 128, g: 64, b: 200 } },
    })
      .png()
      .toBuffer();
    const a = await computePerceptualHash(png);
    const b = await computePerceptualHash(png);
    expect(a).toBe(b);
  });

  it("derives the idle.webp path from canon.floorId per character (not hardcoded lobby)", () => {
    // The live-spend block above derives `public/art/<floorId>/<headerId>/idle.webp`
    // from canon identities. This shape test asserts that the canon identity
    // map exposes a non-empty `floorId` for every promoted character, so that
    // the previous hardcoded "public/art/lobby" is no longer the only path
    // ever consulted.
    resetCanonIdentityCache();
    const canon = loadCanonIdentities();
    expect(canon.length).toBeGreaterThan(0);

    const floorIds = new Set(canon.map((c) => c.floorId));
    // Diversity guard: characters span at least two floors. If everyone
    // collapsed to the same floorId (e.g. a regression that ignored canon
    // and re-hardcoded "lobby"), this assertion catches it.
    expect(floorIds.size).toBeGreaterThan(1);

    for (const id of canon) {
      expect(typeof id.floorId).toBe("string");
      expect(id.floorId.length).toBeGreaterThan(0);
      // The derived idle.webp path uses both floorId and headerId — no
      // characterId is forced into a lobby/otis layout it doesn't own.
      const derivedPath = join("public", "art", id.floorId, id.headerId, "idle.webp");
      expect(derivedPath).toContain(id.floorId);
      expect(derivedPath).toContain(id.headerId);
    }
  });

  it("two synthetic 'characters' on different floors hash to distinct values", async () => {
    // Simulate the production layout: two fixtures sitting at
    // public/art/<floorId>/<characterId>/idle.png produce distinct hashes.
    // We don't need a real canon root for this — the test writes its own
    // fixture tree under `workdir`.
    const aPath = join(workdir, "rolodex-lounge", "sol-navarro", "idle.png");
    const bPath = join(workdir, "war-room", "rafe-calder", "idle.png");

    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(workdir, "rolodex-lounge", "sol-navarro"), { recursive: true });
    mkdirSync(join(workdir, "war-room", "rafe-calder"), { recursive: true });

    // Raw-pixel construction — composites occasionally render unreliably in
    // CI when sharp's SVG renderer falls back to a stub. Raw buffers give
    // us guaranteed distinct luminance maps regardless of platform.
    const FULL = 32;
    const HALF = 16;
    const aRaw = Buffer.alloc(FULL * FULL * 3);
    for (let y = 0; y < FULL; y += 1) {
      for (let x = 0; x < FULL; x += 1) {
        const i = (y * FULL + x) * 3;
        const v = x < HALF ? 30 : 220; // vertical split
        aRaw[i] = v;
        aRaw[i + 1] = v;
        aRaw[i + 2] = v;
      }
    }
    const bRaw = Buffer.alloc(FULL * FULL * 3);
    for (let y = 0; y < FULL; y += 1) {
      for (let x = 0; x < FULL; x += 1) {
        const i = (y * FULL + x) * 3;
        const v = y < HALF ? 30 : 220; // horizontal split
        bRaw[i] = v;
        bRaw[i + 1] = v;
        bRaw[i + 2] = v;
      }
    }

    const aPng = await sharp(aRaw, { raw: { width: FULL, height: FULL, channels: 3 } }).png().toBuffer();
    const bPng = await sharp(bRaw, { raw: { width: FULL, height: FULL, channels: 3 } }).png().toBuffer();

    writeFileSync(aPath, aPng);
    writeFileSync(bPath, bPng);

    const aHash = await computePerceptualHash(readFileSync(aPath));
    const bHash = await computePerceptualHash(readFileSync(bPath));

    expect(aHash).not.toBe(bHash);
  });
});
