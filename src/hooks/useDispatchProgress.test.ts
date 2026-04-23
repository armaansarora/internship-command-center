import { describe, it, expect } from "vitest";
import { tickDispatchProgress } from "./useDispatchProgress";
import type { DispatchProgressResponse } from "@/app/api/ceo/dispatches/route";

/**
 * The hook itself is an effect-driven React wrapper — we keep those
 * out of unit tests (no react-hooks-testing-library dep on purpose).
 *
 * All interesting polling logic lives inside the pure
 * `tickDispatchProgress` step. Assert that in isolation: given the
 * latest server response, do we keep polling, and does the state
 * shape match what the graph consumer expects?
 */

function resp(
  dispatches: DispatchProgressResponse["dispatches"],
): DispatchProgressResponse {
  return { dispatches };
}

describe("tickDispatchProgress", () => {
  it("empty dispatches → shouldContinue true (race window before first row is written)", () => {
    const { map, shouldContinue } = tickDispatchProgress(resp([]));
    expect(map).toEqual({});
    expect(shouldContinue).toBe(true);
  });

  it("all dispatches running → shouldContinue true", () => {
    const { map, shouldContinue } = tickDispatchProgress(
      resp([
        { agent: "cro", status: "running", startedAt: "t1", completedAt: null },
        { agent: "cio", status: "running", startedAt: "t2", completedAt: null },
      ]),
    );
    expect(shouldContinue).toBe(true);
    expect(Object.keys(map)).toHaveLength(2);
    expect(map.cro.status).toBe("running");
    expect(map.cio.status).toBe("running");
  });

  it("mix of running and completed → shouldContinue true (at least one active)", () => {
    const { shouldContinue } = tickDispatchProgress(
      resp([
        { agent: "cro", status: "completed", startedAt: "t1", completedAt: "t2" },
        { agent: "cio", status: "running", startedAt: "t1", completedAt: null },
      ]),
    );
    expect(shouldContinue).toBe(true);
  });

  it("queued-only also keeps polling (not yet started)", () => {
    const { shouldContinue } = tickDispatchProgress(
      resp([
        { agent: "cro", status: "queued", startedAt: null, completedAt: null },
      ]),
    );
    expect(shouldContinue).toBe(true);
  });

  it("all dispatches completed → shouldContinue false", () => {
    const { map, shouldContinue } = tickDispatchProgress(
      resp([
        { agent: "cro", status: "completed", startedAt: "t1", completedAt: "t2" },
        { agent: "cio", status: "completed", startedAt: "t1", completedAt: "t3" },
      ]),
    );
    expect(shouldContinue).toBe(false);
    expect(map.cro.completedAt).toBe("t2");
  });

  it("all dispatches failed → shouldContinue false", () => {
    const { shouldContinue } = tickDispatchProgress(
      resp([
        { agent: "cro", status: "failed", startedAt: "t1", completedAt: "t2" },
        { agent: "cio", status: "failed", startedAt: "t1", completedAt: "t3" },
      ]),
    );
    expect(shouldContinue).toBe(false);
  });

  it("mix of completed and failed (no active) → shouldContinue false", () => {
    const { shouldContinue } = tickDispatchProgress(
      resp([
        { agent: "cro", status: "completed", startedAt: "t1", completedAt: "t2" },
        { agent: "cio", status: "failed", startedAt: "t1", completedAt: "t3" },
      ]),
    );
    expect(shouldContinue).toBe(false);
  });

  it("lowercases agent keys so UPPERCASE and Mixed-case collapse to the same slot", () => {
    const { map } = tickDispatchProgress(
      resp([
        { agent: "CRO", status: "running", startedAt: "t1", completedAt: null },
        { agent: "Cio", status: "completed", startedAt: "t1", completedAt: "t2" },
      ]),
    );
    expect(map).toHaveProperty("cro");
    expect(map).toHaveProperty("cio");
    expect(map).not.toHaveProperty("CRO");
    expect(map).not.toHaveProperty("Cio");
  });

  it("preserves all four projected fields per agent", () => {
    const { map } = tickDispatchProgress(
      resp([
        {
          agent: "cpo",
          status: "completed",
          startedAt: "2026-04-23T04:14:22.000Z",
          completedAt: "2026-04-23T04:14:25.000Z",
        },
      ]),
    );
    expect(map.cpo).toEqual({
      status: "completed",
      startedAt: "2026-04-23T04:14:22.000Z",
      completedAt: "2026-04-23T04:14:25.000Z",
    });
  });
});
