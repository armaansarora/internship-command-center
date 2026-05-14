import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LOBBY_BACKGROUND_ASSET_IDS, getVisualAsset } from "@/lib/visual-assets";

describe("LobbyBackground assets", () => {
  it("preserves the four canonical lobby backgrounds", () => {
    expect(LOBBY_BACKGROUND_ASSET_IDS).toEqual([
      "lobby-background-1",
      "lobby-background-2",
      "lobby-background-3",
      "lobby-background-4",
    ]);

    const lobbyBackgroundSource = readFileSync(
      join(process.cwd(), "src/components/world/LobbyBackground.tsx"),
      "utf8",
    );

    for (const id of LOBBY_BACKGROUND_ASSET_IDS) {
      const asset = getVisualAsset(id);
      expect(asset).toBeDefined();
      expect(asset?.src).toMatch(/^\/lobby\/bg-[1-4]\.jpg$/);
      expect(existsSync(join(process.cwd(), "public", asset!.src.replace(/^\//, "")))).toBe(true);
      expect(lobbyBackgroundSource).toContain("LOBBY_BACKGROUND_ASSET_IDS");
    }
  });
});
