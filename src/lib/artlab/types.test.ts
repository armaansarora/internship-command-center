import { describe, expect, it } from "vitest";
import {
  ARTLAB_PHASES,
  ARTLAB_BLOCKERS,
  ArtLabRunStateSchema,
} from "./types";

describe("artlab shared types", () => {
  it("declares all 13 core phases (10 originals + 3 brainstorm-mode) in canonical order", () => {
    expect(ARTLAB_PHASES).toEqual([
      "routed",
      "briefing",
      "brief-review",
      "generating-concepts",
      "concept-review",
      "refining-concepts",
      "canary",
      "production",
      "strict-qa",
      "final-review",
      "promoting",
      "verifying",
      "closed",
    ]);
  });

  it("declares all 8 blockers", () => {
    expect(ARTLAB_BLOCKERS).toEqual([
      "needs-human",
      "budget-blocked",
      "provider-blocked",
      "repair-required",
      "style-failed",
      "upgrade-required",
      "cancelled",
      "concept-critique-fallback",
    ]);
  });

  it("validates a minimal run state", () => {
    const result = ArtLabRunStateSchema.parse({
      runId: "test-run-1",
      assetType: "character",
      phase: "routed",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "make Rafe Calder",
    });
    expect(result.phase).toBe("routed");
  });

  it("rejects unknown phase", () => {
    expect(() =>
      ArtLabRunStateSchema.parse({
        runId: "x",
        assetType: "character",
        phase: "rogue",
        createdAt: "2026-05-20T00:00:00.000Z",
        updatedAt: "2026-05-20T00:00:00.000Z",
        request: "x",
      }),
    ).toThrow();
  });
});
