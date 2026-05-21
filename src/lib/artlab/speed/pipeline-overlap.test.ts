// src/lib/artlab/speed/pipeline-overlap.test.ts
import { describe, expect, it, vi } from "vitest";
import { runWithCanaryPrepOverlap } from "./pipeline-overlap";

describe("pipeline overlap — canary prep during concept QA", () => {
  it("canary-prep starts as soon as concept-runner returns ok, not after QA", async () => {
    const events: string[] = [];
    const runConceptQa = vi.fn().mockImplementation(async () => {
      events.push("qa-start");
      await new Promise((r) => setTimeout(r, 100));
      events.push("qa-end");
      return { ok: true };
    });
    const prepCanary = vi.fn().mockImplementation(async () => {
      events.push("prep-start");
      await new Promise((r) => setTimeout(r, 100));
      events.push("prep-end");
    });
    const result = await runWithCanaryPrepOverlap({
      conceptOk: true,
      runConceptQa,
      prepCanary,
    });
    expect(result.qaResult).toEqual({ ok: true });
    // prep-start should appear before qa-end (overlap proven)
    const prepStartIdx = events.indexOf("prep-start");
    const qaEndIdx = events.indexOf("qa-end");
    expect(prepStartIdx).toBeLessThan(qaEndIdx);
    expect(prepStartIdx).toBeGreaterThanOrEqual(0);
  });

  it("does NOT prep canary when concept failed (quality preserved)", async () => {
    const runConceptQa = vi.fn().mockResolvedValue({ ok: true });
    const prepCanary = vi.fn().mockResolvedValue(undefined);
    await runWithCanaryPrepOverlap({
      conceptOk: false,
      runConceptQa,
      prepCanary,
    });
    expect(prepCanary).not.toHaveBeenCalled();
  });
});
