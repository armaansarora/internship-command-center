import { describe, expect, it, vi, beforeEach } from "vitest";
import { loadFoundryFloorCanonEntry } from "./floor-canon";

vi.mock("@/lib/foundry/canon", () => ({
  loadFoundryFloorCanon: vi.fn(),
}));

import { loadFoundryFloorCanon } from "@/lib/foundry/canon";

describe("loadFoundryFloorCanonEntry", () => {
  beforeEach(() => {
    vi.mocked(loadFoundryFloorCanon).mockReset();
  });

  it("returns the canon entry normalised to the agent's shape", async () => {
    vi.mocked(loadFoundryFloorCanon).mockResolvedValue({
      slug: "war-room",
      displayName: "The War Room",
      mood: "tactical-luxury",
      palette: ["#1A1A2E", "#C9A84C", "#3F3F4E"],
      roomElements: ["wall-mounted-boards", "leather-chairs", "globe"],
      aspectRatio: "16:9",
      typography: "playfair-display",
    });
    const result = await loadFoundryFloorCanonEntry("war-room");
    expect(result.slug).toBe("war-room");
    expect(result.requiredElements).toEqual([
      "wall-mounted-boards",
      "leather-chairs",
      "globe",
    ]);
    expect(result.aspectRatio).toBe("16:9");
  });

  it("throws when canon module returns null", async () => {
    vi.mocked(loadFoundryFloorCanon).mockResolvedValue(null);
    await expect(loadFoundryFloorCanonEntry("ghost-floor")).rejects.toThrow(
      /no canon entry/i,
    );
  });

  it("throws when roomElements is empty", async () => {
    vi.mocked(loadFoundryFloorCanon).mockResolvedValue({
      slug: "war-room",
      displayName: "War Room",
      mood: "x",
      palette: ["#000"],
      roomElements: [],
      aspectRatio: "16:9",
      typography: "x",
    });
    await expect(loadFoundryFloorCanonEntry("war-room")).rejects.toThrow(
      /roomElements/,
    );
  });
});
