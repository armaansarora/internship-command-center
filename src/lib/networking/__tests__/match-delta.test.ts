/**
 * enqueueMatchRescan debounce contract.
 *
 * Fire-and-forget per-user rebuild, debounced 5 minutes via
 * `user_profiles.match_index_last_rescan_at`.  All errors swallowed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockRebuild = vi.fn().mockResolvedValue({ written: 1 });

vi.mock("@/lib/networking/rebuild-match-index", () => ({
  rebuildMatchIndexForUser: mockRebuild,
}));

const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn().mockReturnThis();
const mockUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (_: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }),
      update: (payload: unknown) => {
        mockUpdate(payload);
        return { eq: mockUpdateEq };
      },
    }),
  }),
}));

describe("enqueueMatchRescan", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00Z"));
    mockRebuild.mockClear();
    mockMaybeSingle.mockReset();
    mockUpdate.mockReset();
    mockUpdateEq.mockReset();
    mockUpdateEq.mockResolvedValue({ data: null, error: null });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("triggers rebuild when last_rescan_at is null", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { match_index_last_rescan_at: null },
    });
    const { enqueueMatchRescan } = await import("../match-delta");
    await enqueueMatchRescan("u-1");
    expect(mockRebuild).toHaveBeenCalledWith("u-1");
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("triggers rebuild when last_rescan_at is older than DEBOUNCE_MS", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        match_index_last_rescan_at: new Date(
          "2026-04-24T11:50:00Z"
        ).toISOString(),
      },
    });
    const { enqueueMatchRescan } = await import("../match-delta");
    await enqueueMatchRescan("u-1");
    expect(mockRebuild).toHaveBeenCalledTimes(1);
  });

  it("skips rebuild when last_rescan_at is within DEBOUNCE_MS", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        match_index_last_rescan_at: new Date(
          "2026-04-24T11:57:00Z"
        ).toISOString(),
      },
    });
    const { enqueueMatchRescan } = await import("../match-delta");
    await enqueueMatchRescan("u-1");
    expect(mockRebuild).not.toHaveBeenCalled();
  });

  it("re-triggers after DEBOUNCE_MS has passed", async () => {
    // First call at 12:00 with last=null → rebuilds.
    mockMaybeSingle.mockResolvedValueOnce({
      data: { match_index_last_rescan_at: null },
    });
    const { enqueueMatchRescan } = await import("../match-delta");
    await enqueueMatchRescan("u-1");
    expect(mockRebuild).toHaveBeenCalledTimes(1);

    // Second call at 12:01, last=12:00 → still within window, skips.
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        match_index_last_rescan_at: new Date(
          "2026-04-24T12:00:00Z"
        ).toISOString(),
      },
    });
    vi.setSystemTime(new Date("2026-04-24T12:01:00Z"));
    await enqueueMatchRescan("u-1");
    expect(mockRebuild).toHaveBeenCalledTimes(1);

    // Third call at 12:06, last=12:00 → 6min > 5min, rebuilds again.
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        match_index_last_rescan_at: new Date(
          "2026-04-24T12:00:00Z"
        ).toISOString(),
      },
    });
    vi.setSystemTime(new Date("2026-04-24T12:06:00Z"));
    await enqueueMatchRescan("u-1");
    expect(mockRebuild).toHaveBeenCalledTimes(2);
  });

  it("swallows errors — never throws out of enqueueMatchRescan", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { match_index_last_rescan_at: null },
    });
    mockRebuild.mockRejectedValueOnce(new Error("boom"));
    const { enqueueMatchRescan } = await import("../match-delta");
    await expect(enqueueMatchRescan("u-1")).resolves.toBeUndefined();
  });

  it("swallows supabase errors too", async () => {
    mockMaybeSingle.mockRejectedValueOnce(new Error("db down"));
    const { enqueueMatchRescan } = await import("../match-delta");
    await expect(enqueueMatchRescan("u-1")).resolves.toBeUndefined();
    expect(mockRebuild).not.toHaveBeenCalled();
  });
});
