import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createDefaultCreativeStudioState,
  loadCreativeStudioState,
  saveCreativeStudioState,
} from "./index";

describe("creative studio state", () => {
  it("initializes durable studio state with Otis and Mara continuity", () => {
    const state = createDefaultCreativeStudioState();

    expect(state.schemaVersion).toBe("tower-creative-studio-state-v1");
    expect(state.engineVersion).toBe("creative-production-engine-v1");
    expect(state.done).toContain("Otis Vale character pilot promoted");
    expect(state.recommendedNext.assetType).toBe("character");
    expect(state.recommendedNext.name).toBe("Mara Voss");
    expect(state.remaining.some((item) => item.includes("environments"))).toBe(true);
    expect(state.remaining.some((item) => item.includes("animations"))).toBe(true);
  });

  it("saves state as readable JSON", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-studio-state-"));
    const statePath = join(root, "state.json");
    const state = createDefaultCreativeStudioState("2026-05-14T00:00:00.000Z");

    await saveCreativeStudioState(statePath, state);

    const saved = JSON.parse(readFileSync(statePath, "utf8")) as typeof state;
    expect(saved.schemaVersion).toBe(state.schemaVersion);
    expect(saved.updatedAt).toBe("2026-05-14T00:00:00.000Z");
    expect(saved.recommendedNext.name).toBe("Mara Voss");
  });

  it("falls back to default state when no saved state exists", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-studio-missing-"));
    const state = await loadCreativeStudioState(join(root, "missing.json"));

    expect(state.schemaVersion).toBe("tower-creative-studio-state-v1");
    expect(state.done).toContain("Otis Vale character pilot promoted");
  });
});
