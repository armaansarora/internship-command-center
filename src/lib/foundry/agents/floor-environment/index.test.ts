import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFoundryFloorEnvironment } from "./index";
import { createFoundryFloorMockProvider } from "./__tests__/mock-provider";

vi.mock("@/lib/foundry/canon", () => ({
  loadFoundryFloorCanon: vi.fn().mockResolvedValue({
    slug: "war-room",
    displayName: "The War Room",
    mood: "tactical-luxury",
    palette: ["#1A1A2E", "#C9A84C"],
    roomElements: ["wall-mounted-boards"],
    aspectRatio: "16:9",
    typography: "playfair-display",
  }),
}));

vi.mock("@/lib/foundry/asset-pack", () => ({
  buildFoundryAssetPack: vi.fn(async (manifest: Record<string, unknown>) => ({
    packId: "pack-1",
    manifest,
  })),
}));

describe("runFoundryFloorEnvironment", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "foundry-floor-agent-"));
  });

  it("produces one Asset Pack covering every requested time-state", async () => {
    const provider = createFoundryFloorMockProvider();
    const result = await runFoundryFloorEnvironment(
      {
        runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
        floorSlug: "war-room",
        requestedBy: "agent",
        timeStates: ["dawn", "midday", "night"],
        seed: 1,
      },
      provider,
      { runDir: dir, reportedElements: ["wall-mounted-boards"] },
    );
    const manifest = result.manifest as { variants: Array<{ timeState: string }> };
    expect(manifest.variants.map((v) => v.timeState)).toEqual([
      "dawn",
      "midday",
      "night",
    ]);
  });

  it("writes 3 layer PNGs per variant to disk", async () => {
    const provider = createFoundryFloorMockProvider();
    await runFoundryFloorEnvironment(
      {
        runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
        floorSlug: "war-room",
        requestedBy: "agent",
        timeStates: ["dawn"],
        seed: 2,
      },
      provider,
      { runDir: dir, reportedElements: ["wall-mounted-boards"] },
    );
    for (const layer of ["background", "midground", "ambient"]) {
      expect(existsSync(join(dir, "pack", "dawn", `${layer}.png`))).toBe(true);
    }
  });

  it("includes integration snippet text in the manifest", async () => {
    const provider = createFoundryFloorMockProvider();
    const result = await runFoundryFloorEnvironment(
      {
        runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
        floorSlug: "war-room",
        requestedBy: "agent",
        timeStates: ["dawn"],
        seed: 3,
      },
      provider,
      { runDir: dir, reportedElements: ["wall-mounted-boards"] },
    );
    const manifest = result.manifest as { integrationSnippet: string };
    expect(manifest.integrationSnippet).toContain(
      '<FloorBackground floor="war-room" />',
    );
  });

  it("throws when QA fails (room-elements missing)", async () => {
    const provider = createFoundryFloorMockProvider();
    await expect(
      runFoundryFloorEnvironment(
        {
          runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
          floorSlug: "war-room",
          requestedBy: "agent",
          timeStates: ["dawn"],
          seed: 4,
        },
        provider,
        { runDir: dir, reportedElements: [] },
      ),
    ).rejects.toThrow(/qa/i);
  });
});
