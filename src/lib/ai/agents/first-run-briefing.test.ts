/**
 * R4.6 — first-run briefing override contract tests.
 *
 * The generateObject call itself isn't exercised here (that's the R4.11
 * Proof test). These assertions lock the gating logic: we must only
 * generate when (a) the concierge just completed, (b) the first-briefing
 * claim is unset, and (c) the atomic flip actually wins. Miss any of
 * these and the override must bow out quietly.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const getConciergeStateMock = vi.fn();
const claimFirstBriefingMock = vi.fn();
vi.mock("@/lib/db/queries/user-profiles-rest", () => ({
  getConciergeState: (...a: unknown[]) => getConciergeStateMock(...a),
  claimFirstBriefing: (...a: unknown[]) => claimFirstBriefingMock(...a),
}));

// Never reach the real Supabase client / AI model in these tests.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: () => ({
              order: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
      insert: async () => ({ data: null, error: null }),
    }),
  }),
}));

vi.mock("@/lib/ai/model", () => ({
  getAgentModel: () => null,
}));

vi.mock("ai", () => ({
  generateObject: vi.fn(async () => ({
    object: {
      version: "v2",
      generated_at: "2026-04-23T10:00:00.000Z",
      script: "Morning. Linear opened a product design intern role — strong match. War Room on Seven.",
      beats: [
        { tone: "steady", text: "Morning." },
        { tone: "warm", text: "Linear opened a product design intern role — strong match." },
        { tone: "steady", text: "War Room on Seven." },
      ],
      mood: "warm",
      weather_hint: "gold",
    },
  })),
}));

import { maybeGenerateFirstRunBriefing } from "./first-run-briefing";

const TEN_MINUTES_MS = 10 * 60 * 1000;

describe("R4.6 maybeGenerateFirstRunBriefing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when concierge state is unavailable", async () => {
    getConciergeStateMock.mockResolvedValueOnce(null);
    const out = await maybeGenerateFirstRunBriefing({
      userId: "u-1",
      displayName: "Test",
    });
    expect(out).toBeNull();
    expect(claimFirstBriefingMock).not.toHaveBeenCalled();
  });

  it("returns null when first_briefing_shown is already true", async () => {
    getConciergeStateMock.mockResolvedValueOnce({
      firstBriefingShown: true,
      conciergeCompletedAt: new Date().toISOString(),
      arrivalPlayedAt: null,
      lastFloorVisited: null,
      conciergeTargetProfile: null,
      floorsUnlocked: ["L"],
    });
    const out = await maybeGenerateFirstRunBriefing({
      userId: "u-1",
      displayName: "Test",
    });
    expect(out).toBeNull();
    expect(claimFirstBriefingMock).not.toHaveBeenCalled();
  });

  it("returns null when concierge_completed_at is null (never onboarded)", async () => {
    getConciergeStateMock.mockResolvedValueOnce({
      firstBriefingShown: false,
      conciergeCompletedAt: null,
      arrivalPlayedAt: null,
      lastFloorVisited: null,
      conciergeTargetProfile: null,
      floorsUnlocked: ["L"],
    });
    const out = await maybeGenerateFirstRunBriefing({
      userId: "u-1",
      displayName: "Test",
    });
    expect(out).toBeNull();
    expect(claimFirstBriefingMock).not.toHaveBeenCalled();
  });

  it("returns null outside the 10-minute first-run window", async () => {
    const longAgo = new Date(Date.now() - TEN_MINUTES_MS - 60_000).toISOString();
    getConciergeStateMock.mockResolvedValueOnce({
      firstBriefingShown: false,
      conciergeCompletedAt: longAgo,
      arrivalPlayedAt: new Date().toISOString(),
      lastFloorVisited: null,
      conciergeTargetProfile: null,
      floorsUnlocked: ["L"],
    });
    const out = await maybeGenerateFirstRunBriefing({
      userId: "u-1",
      displayName: "Test",
    });
    expect(out).toBeNull();
    expect(claimFirstBriefingMock).not.toHaveBeenCalled();
  });

  it("returns null when the atomic claim loses the race", async () => {
    getConciergeStateMock.mockResolvedValueOnce({
      firstBriefingShown: false,
      conciergeCompletedAt: new Date().toISOString(),
      arrivalPlayedAt: new Date().toISOString(),
      lastFloorVisited: null,
      conciergeTargetProfile: null,
      floorsUnlocked: ["L"],
    });
    claimFirstBriefingMock.mockResolvedValueOnce(false);
    const out = await maybeGenerateFirstRunBriefing({
      userId: "u-1",
      displayName: "Test",
    });
    expect(out).toBeNull();
  });

  it("generates and returns a briefing when the window is open and the claim is won", async () => {
    getConciergeStateMock.mockResolvedValueOnce({
      firstBriefingShown: false,
      conciergeCompletedAt: new Date().toISOString(),
      arrivalPlayedAt: new Date().toISOString(),
      lastFloorVisited: null,
      conciergeTargetProfile: null,
      floorsUnlocked: ["L"],
    });
    claimFirstBriefingMock.mockResolvedValueOnce(true);

    const out = await maybeGenerateFirstRunBriefing({
      userId: "u-1",
      displayName: "Armaan",
    });

    expect(out).not.toBeNull();
    expect(out!.beats.length).toBeGreaterThanOrEqual(3);
    expect(out!.mood).toBe("warm");
  });
});
