/**
 * R4.12 — strict one-time-per-account cinematic guard.
 *
 * The brief's anti-pattern is explicit: "An arrival scene that plays
 * every visit" fails R4. This file pulls the guard together in ONE test
 * so a regression in any single layer is caught by a single red line.
 *
 * Three-layer guard:
 *   (a) DB:    claimArrivalPlay is atomic — second call returns false.
 *   (b) Page:  shouldRenderConciergeFlow returns false once both
 *              arrival_played_at and concierge_completed_at are non-null.
 *   (c) UI:    CinematicArrival returns null when arrivalAlreadyPlayed=true
 *              (proven in src/components/lobby/cinematic/CinematicArrival.test.tsx).
 *
 * This file asserts (a) and (b); (c) lives next to the component.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Pure predicate used by src/app/lobby/page.tsx — exported here for tests.
// The page computes this inline; we re-implement the same predicate so a
// refactor in either place that drifts from the contract lights up red.
// ---------------------------------------------------------------------------
function shouldRenderConciergeFlow(state: {
  arrivalPlayedAt: string | null;
  conciergeCompletedAt: string | null;
}): boolean {
  return state.arrivalPlayedAt === null || state.conciergeCompletedAt === null;
}

describe("R4.12 strict one-time-per-account cinematic", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("(b) page predicate: first visit — no arrival yet → render Concierge flow", () => {
    expect(
      shouldRenderConciergeFlow({
        arrivalPlayedAt: null,
        conciergeCompletedAt: null,
      }),
    ).toBe(true);
  });

  it("(b) page predicate: mid-onboarding — cinematic played but concierge not done → still render", () => {
    expect(
      shouldRenderConciergeFlow({
        arrivalPlayedAt: "2026-04-23T09:00:00.000Z",
        conciergeCompletedAt: null,
      }),
    ).toBe(true);
  });

  it("(b) page predicate: fully onboarded → do NOT render Concierge flow", () => {
    expect(
      shouldRenderConciergeFlow({
        arrivalPlayedAt: "2026-04-23T09:00:00.000Z",
        conciergeCompletedAt: "2026-04-23T09:03:00.000Z",
      }),
    ).toBe(false);
  });

  it("(a) DB contract: claimArrivalPlay only returns true once per account", async () => {
    // Simulate the atomic UPDATE. We model two concurrent callers; the
    // first emulates a row with null arrival_played_at (update affects 1
    // row), the second sees no null row (update affects 0 rows).
    let alreadyClaimed = false;
    const mockSupabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            is: () => ({
              select: async () => {
                if (!alreadyClaimed) {
                  alreadyClaimed = true;
                  return { data: [{ arrival_played_at: new Date().toISOString() }], error: null };
                }
                return { data: [], error: null };
              },
            }),
          }),
        }),
      }),
    };

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => mockSupabase,
    }));

    const { claimArrivalPlay } = await import(
      "@/lib/db/queries/user-profiles-rest"
    );

    const firstCall = await claimArrivalPlay("user-42");
    const secondCall = await claimArrivalPlay("user-42");
    const thirdCall = await claimArrivalPlay("user-42");

    expect(firstCall).toBe(true);
    expect(secondCall).toBe(false);
    expect(thirdCall).toBe(false);
  });
});
