import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TargetProfile } from "@/lib/agents/cro/target-profile";

const { fromSpy, updateSpy, eqSpy, selectSpy, singleSpy, logErrorSpy } =
vi.hoisted(() => ({
  fromSpy: vi.fn(),
  updateSpy: vi.fn(),
  eqSpy: vi.fn(),
  selectSpy: vi.fn(),
  singleSpy: vi.fn(),
  logErrorSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: fromSpy,
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: logErrorSpy,
  },
}));

const { saveConciergeProfile } = await import("./user-profiles-rest");

const profile: TargetProfile = {
  version: 1,
  roles: ["Software Engineer"],
  companies: [],
  geos: ["Remote"],
  level: ["intern"],
  musts: [],
  nices: [],
  notes: "Test profile",
};

describe("saveConciergeProfile", () => {
  beforeEach(() => {
    fromSpy.mockReset();
    updateSpy.mockReset();
    eqSpy.mockReset();
    selectSpy.mockReset();
    singleSpy.mockReset();
    logErrorSpy.mockReset();

    singleSpy.mockResolvedValue({ data: { id: "user-1" }, error: null });
    selectSpy.mockReturnValue({ single: singleSpy });
    eqSpy.mockReturnValue({ select: selectSpy });
    updateSpy.mockReturnValue({ eq: eqSpy });
    fromSpy.mockReturnValue({ update: updateSpy });
  });

  it("stamps concierge completion and lights the CEO floor", async () => {
    const result = await saveConciergeProfile("user-1", profile);

    expect(result.ok).toBe(true);
    expect(fromSpy).toHaveBeenCalledWith("user_profiles");
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        concierge_target_profile: profile,
        concierge_completed_at: expect.any(String),
        floors_unlocked: ["L", "1"],
      }),
    );
    expect(eqSpy).toHaveBeenCalledWith("id", "user-1");
    expect(selectSpy).toHaveBeenCalledWith("id");
    expect(singleSpy).toHaveBeenCalledOnce();
  });

  it("returns false when the profile update fails", async () => {
    singleSpy.mockResolvedValueOnce({ data: null, error: { message: "nope" } });

    const result = await saveConciergeProfile("user-1", profile);

    expect(result).toEqual({ ok: false, completedAt: null });
    expect(logErrorSpy).toHaveBeenCalledWith(
      "concierge.save_profile_failed",
      undefined,
      expect.objectContaining({ userId: "user-1", error: "nope" }),
    );
  });

  it("returns false when no profile row was updated", async () => {
    singleSpy.mockResolvedValueOnce({
      data: null,
      error: { message: "No rows found" },
    });

    const result = await saveConciergeProfile("missing-user", profile);

    expect(result).toEqual({ ok: false, completedAt: null });
    expect(logErrorSpy).toHaveBeenCalledWith(
      "concierge.save_profile_failed",
      undefined,
      expect.objectContaining({
        userId: "missing-user",
        error: "No rows found",
      }),
    );
  });
});
