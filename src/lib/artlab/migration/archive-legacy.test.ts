// src/lib/artlab/migration/archive-legacy.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { archiveLegacyArtlabWorkspace } from "./archive-legacy";

describe("archive legacy workspace", () => {
  let artlabRoot: string;
  beforeEach(() => {
    artlabRoot = mkdtempSync(join(tmpdir(), "artlab-arch-"));
    mkdirSync(join(artlabRoot, "studio", "characters"), { recursive: true });
    mkdirSync(join(artlabRoot, "runs"));
    mkdirSync(join(artlabRoot, "characters"));
    writeFileSync(join(artlabRoot, "studio", "characters", "data.json"), JSON.stringify({ test: 1 }));
  });

  it("renames each top-level legacy subdir into legacy/", async () => {
    const result = await archiveLegacyArtlabWorkspace({ artlabRoot });
    expect(existsSync(join(artlabRoot, "studio"))).toBe(false);
    expect(existsSync(join(artlabRoot, "runs"))).toBe(false);
    expect(existsSync(join(artlabRoot, "characters"))).toBe(false);
    expect(existsSync(join(artlabRoot, "legacy", "studio", "characters", "data.json"))).toBe(true);
    expect(result.movedTopLevelDirs).toContain("studio");
    expect(result.movedTopLevelDirs).toContain("runs");
    expect(result.movedTopLevelDirs).toContain("characters");
  });

  it("does not touch .artlab/engine (the new workspace)", async () => {
    mkdirSync(join(artlabRoot, "engine"));
    writeFileSync(join(artlabRoot, "engine", "marker.txt"), "do not move me");
    await archiveLegacyArtlabWorkspace({ artlabRoot });
    expect(existsSync(join(artlabRoot, "engine", "marker.txt"))).toBe(true);
    expect(existsSync(join(artlabRoot, "legacy", "engine"))).toBe(false);
  });

  it("is idempotent (re-running does nothing harmful)", async () => {
    await archiveLegacyArtlabWorkspace({ artlabRoot });
    const result = await archiveLegacyArtlabWorkspace({ artlabRoot });
    expect(result.movedTopLevelDirs).toEqual([]);
  });
});
