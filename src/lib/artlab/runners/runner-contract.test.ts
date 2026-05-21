import { describe, expect, it } from "vitest";
import { ArtLabRunnerResultSchema, ARTLAB_RUNNER_KINDS } from "./runner-contract";

describe("artlab runner contract", () => {
  it("declares the 7 runner kinds", () => {
    expect(ARTLAB_RUNNER_KINDS).toEqual([
      "concept",
      "canary",
      "production",
      "cutout",
      "strict-qa",
      "promotion",
      "verifying",
    ]);
  });

  it("validates a successful result", () => {
    const result = ArtLabRunnerResultSchema.parse({
      runnerKind: "concept",
      status: "ok",
      durationMs: 1234,
      artifacts: { conceptBoardPath: "/tmp/board.png" },
    });
    expect(result.status).toBe("ok");
  });

  it("validates a failed result with blocker hint", () => {
    const result = ArtLabRunnerResultSchema.parse({
      runnerKind: "canary",
      status: "failed",
      durationMs: 1,
      artifacts: {},
      blockerHint: "provider-blocked",
      failureCode: "provider-429",
    });
    expect(result.blockerHint).toBe("provider-blocked");
  });
});
