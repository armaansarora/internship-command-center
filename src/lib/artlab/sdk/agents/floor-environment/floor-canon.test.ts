import { describe, expect, it, vi, beforeEach } from "vitest";
import { loadArtLabFloorCanonEntry } from "./floor-canon";

vi.mock("@/lib/artlab/sdk/canon", () => ({
  loadArtLabFloorCanon: vi.fn(),
}));

import { loadArtLabFloorCanon } from "@/lib/artlab/sdk/canon";

describe("loadArtLabFloorCanonEntry", () => {
  beforeEach(() => {
    vi.mocked(loadArtLabFloorCanon).mockReset();
  });

  it("returns the canon entry normalised to the agent's shape", async () => {
    vi.mocked(loadArtLabFloorCanon).mockResolvedValue({
      slug: "war-room",
      displayName: "The War Room",
      mood: "tactical-luxury",
      palette: ["#1A1A2E", "#C9A84C", "#3F3F4E"],
      roomElements: ["wall-mounted-boards", "leather-chairs", "globe"],
      aspectRatio: "16:9",
      typography: "playfair-display",
    });
    const result = await loadArtLabFloorCanonEntry("war-room");
    expect(result.slug).toBe("war-room");
    expect(result.requiredElements).toEqual([
      "wall-mounted-boards",
      "leather-chairs",
      "globe",
    ]);
    expect(result.aspectRatio).toBe("16:9");
  });

  it("throws when canon module returns null", async () => {
    vi.mocked(loadArtLabFloorCanon).mockResolvedValue(null);
    await expect(loadArtLabFloorCanonEntry("ghost-floor")).rejects.toThrow(
      /no canon entry/i,
    );
  });

  it("throws when roomElements is empty", async () => {
    vi.mocked(loadArtLabFloorCanon).mockResolvedValue({
      slug: "war-room",
      displayName: "War Room",
      mood: "x",
      palette: ["#000"],
      roomElements: [],
      aspectRatio: "16:9",
      typography: "x",
    });
    await expect(loadArtLabFloorCanonEntry("war-room")).rejects.toThrow(
      /roomElements/,
    );
  });
});
