import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleArtLabAssetPackList } from "./asset-pack-list";

let packsRoot: string;

beforeEach(() => {
  packsRoot = mkdtempSync(join(tmpdir(), "artlab-packs-"));
  mkdirSync(join(packsRoot, "rafe-character-v3"), { recursive: true });
  writeFileSync(
    join(packsRoot, "rafe-character-v3", "manifest.json"),
    JSON.stringify({
      packId: "rafe-character-v3",
      kind: "character",
      slotId: "rafe.idle",
      promotedAt: "2026-05-25T12:00:00.000Z",
      characterId: "rafe-calder",
    }),
  );
  mkdirSync(join(packsRoot, "war-room-bg-v1"), { recursive: true });
  writeFileSync(
    join(packsRoot, "war-room-bg-v1", "manifest.json"),
    JSON.stringify({
      packId: "war-room-bg-v1",
      kind: "floor",
      slotId: "war-room.background",
      promotedAt: "2026-05-26T08:00:00.000Z",
      space: "war-room",
    }),
  );
});

describe("handleArtLabAssetPackList", () => {
  it("returns every promoted pack when no filter is passed", async () => {
    const result = await handleArtLabAssetPackList({}, { packsRoot });
    expect(result.packs).toHaveLength(2);
  });

  it("filters by kind", async () => {
    const result = await handleArtLabAssetPackList({ kind: "floor" }, { packsRoot });
    expect(result.packs.map((p) => p.packId)).toEqual(["war-room-bg-v1"]);
  });

  it("filters by characterId (only character-kind packs may match)", async () => {
    const result = await handleArtLabAssetPackList(
      { characterId: "rafe-calder" },
      { packsRoot },
    );
    expect(result.packs).toHaveLength(1);
    expect(result.packs[0]?.packId).toBe("rafe-character-v3");
  });

  it("returns empty list for an unknown filter", async () => {
    const result = await handleArtLabAssetPackList({ space: "penthouse" }, { packsRoot });
    expect(result.packs).toEqual([]);
  });
});
