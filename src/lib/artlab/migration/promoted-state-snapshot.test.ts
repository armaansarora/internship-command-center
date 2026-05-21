// src/lib/artlab/migration/promoted-state-snapshot.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { snapshotPromotedState, comparePromotedStateSnapshots } from "./promoted-state-snapshot";

describe("promoted-state snapshot", () => {
  let publicArtRoot: string;
  let characterDir: string;
  beforeEach(() => {
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-mig-"));
    characterDir = join(publicArtRoot, "lobby", "otis");
    mkdirSync(characterDir, { recursive: true });
    writeFileSync(join(characterDir, "idle.webp"), Buffer.from([1, 2, 3, 4]));
    writeFileSync(join(characterDir, "talking.webp"), Buffer.from([5, 6, 7, 8]));
  });

  it("snapshot returns one entry per file with sha256 hash", async () => {
    const snap = await snapshotPromotedState({ rootDir: characterDir });
    expect(snap.entries).toHaveLength(2);
    expect(snap.entries[0]!.path).toBe("idle.webp");
    expect(snap.entries[0]!.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("compare returns empty diff for identical snapshots", async () => {
    const a = await snapshotPromotedState({ rootDir: characterDir });
    const b = await snapshotPromotedState({ rootDir: characterDir });
    const diff = comparePromotedStateSnapshots(a, b);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toEqual([]);
  });

  it("compare detects byte changes", async () => {
    const a = await snapshotPromotedState({ rootDir: characterDir });
    writeFileSync(join(characterDir, "idle.webp"), Buffer.from([9, 9, 9, 9]));
    const b = await snapshotPromotedState({ rootDir: characterDir });
    const diff = comparePromotedStateSnapshots(a, b);
    expect(diff.changed.map((c) => c.path)).toEqual(["idle.webp"]);
  });
});
