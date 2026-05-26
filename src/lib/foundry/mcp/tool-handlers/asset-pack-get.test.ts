import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleFoundryAssetPackGet } from "./asset-pack-get";

let packsRoot: string;

beforeEach(() => {
  packsRoot = mkdtempSync(join(tmpdir(), "foundry-pack-get-"));
  mkdirSync(join(packsRoot, "rafe-v3", "frames"), { recursive: true });
  writeFileSync(
    join(packsRoot, "rafe-v3", "manifest.json"),
    JSON.stringify({
      packId: "rafe-v3",
      kind: "character",
      slotId: "rafe.idle",
      promotedAt: "2026-05-25T12:00:00.000Z",
      files: [
        { path: "rafe.png", role: "primary" },
        { path: "frames/rafe-0.png", role: "frame" },
      ],
    }),
  );
  writeFileSync(join(packsRoot, "rafe-v3", "rafe.png"), Buffer.from("PNGDATA"));
  writeFileSync(join(packsRoot, "rafe-v3", "frames", "rafe-0.png"), Buffer.from("PNGDATA-FRAME"));
});

describe("handleFoundryAssetPackGet", () => {
  it("returns manifest + every file listed with byte size", async () => {
    const result = await handleFoundryAssetPackGet({ packId: "rafe-v3" }, { packsRoot });
    expect(result.packId).toBe("rafe-v3");
    expect(result.files).toHaveLength(2);
    expect(result.files.find((f) => f.role === "primary")?.bytes).toBeGreaterThan(0);
  });

  it("throws when packId is unknown", async () => {
    await expect(handleFoundryAssetPackGet({ packId: "ghost" }, { packsRoot })).rejects.toThrow(
      /asset pack not found/i,
    );
  });

  it("throws when a file referenced by the manifest is missing on disk", async () => {
    writeFileSync(
      join(packsRoot, "rafe-v3", "manifest.json"),
      JSON.stringify({
        packId: "rafe-v3",
        kind: "character",
        slotId: "rafe.idle",
        promotedAt: "2026-05-25T12:00:00.000Z",
        files: [{ path: "missing.png", role: "primary" }],
      }),
    );
    await expect(handleFoundryAssetPackGet({ packId: "rafe-v3" }, { packsRoot })).rejects.toThrow(
      /asset pack file missing/i,
    );
  });
});
