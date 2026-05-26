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
      { runDir: dir },
    );
    const manifest = result.manifest as { variants: Array<{ timeState: string }> };
    expect(manifest.variants.map((v) => v.timeState)).toEqual([
      "dawn",
      "midday",
      "night",
    ]);
  });

  it("writes a single composite PNG per variant to disk (honest spec)", async () => {
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
      { runDir: dir },
    );
    expect(existsSync(join(dir, "pack", "dawn", `composite.png`))).toBe(true);
  });

  it("manifest declares compositeKind=single-composite", async () => {
    const provider = createFoundryFloorMockProvider();
    const result = await runFoundryFloorEnvironment(
      {
        runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
        floorSlug: "war-room",
        requestedBy: "agent",
        timeStates: ["dawn"],
        seed: 5,
      },
      provider,
      { runDir: dir },
    );
    const manifest = result.manifest as {
      compositeKind: string;
      variants: Array<{ kind: string; layers: Array<{ name: string }> }>;
    };
    expect(manifest.compositeKind).toBe("single-composite");
    for (const v of manifest.variants) {
      expect(v.kind).toBe("single-composite");
      expect(v.layers).toHaveLength(1);
      expect(v.layers[0]?.name).toBe("composite");
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
      { runDir: dir },
    );
    const manifest = result.manifest as { integrationSnippet: string };
    expect(manifest.integrationSnippet).toContain(
      '<FloorBackground floor="war-room" />',
    );
  });

  // Critical 2: the "reportedElements => qa fails" path is gone because
  // the room-elements gate is gone. The honest report carries a
  // roomElementsCheck.status=todo-post-launch entry that consumers can
  // read directly. We assert that path here instead of expecting a throw.
  it("manifest qa.roomElementsCheck declares the post-launch TODO with canon list", async () => {
    const provider = createFoundryFloorMockProvider();
    const result = await runFoundryFloorEnvironment(
      {
        runId: "9d3a3c52-1c5d-4f5b-a3a9-7b1e4c2f9d11",
        floorSlug: "war-room",
        requestedBy: "agent",
        timeStates: ["dawn"],
        seed: 4,
      },
      provider,
      { runDir: dir },
    );
    const manifest = result.manifest as {
      qa: {
        roomElementsCheck: {
          status: string;
          declaredRequired: ReadonlyArray<string>;
        };
        failedGates: ReadonlyArray<string>;
      };
    };
    expect(manifest.qa.roomElementsCheck.status).toBe("todo-post-launch");
    expect(manifest.qa.roomElementsCheck.declaredRequired).toEqual([
      "wall-mounted-boards",
    ]);
    expect(manifest.qa.failedGates).not.toContain("room-elements");
  });
});
