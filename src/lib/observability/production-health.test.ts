import { beforeEach, describe, expect, it, vi } from "vitest";

const { isOwnerSpy, getSupabaseAdminSpy, fromSpy } = vi.hoisted(() => ({
  isOwnerSpy: vi.fn(),
  getSupabaseAdminSpy: vi.fn(),
  fromSpy: vi.fn(),
}));

vi.mock("@/lib/auth/owner", () => ({
  isOwner: isOwnerSpy,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminSpy,
}));

const { readProductionHealthSummary } = await import("./production-health");

function queryResult(data: unknown, error: unknown = null) {
  return {
    select: () => ({
      eq: () => ({
        order: () => ({
          limit: async () => ({ data, error }),
        }),
      }),
      order: () => ({
        limit: async () => ({ data, error }),
      }),
    }),
  };
}

describe("readProductionHealthSummary", () => {
  beforeEach(() => {
    isOwnerSpy.mockReset();
    getSupabaseAdminSpy.mockReset();
    fromSpy.mockReset();
    getSupabaseAdminSpy.mockReturnValue({ from: fromSpy });
  });

  it("returns null for non-owner users without touching service-role data", async () => {
    isOwnerSpy.mockReturnValue(false);

    await expect(readProductionHealthSummary("user-regular")).resolves.toBeNull();
    expect(getSupabaseAdminSpy).not.toHaveBeenCalled();
  });

  it("summarizes cron and Stripe failures for the owner without raw payloads", async () => {
    isOwnerSpy.mockReturnValue(true);
    fromSpy.mockImplementation((table: string) => {
      if (table === "cron_runs") {
        return queryResult([
          {
            job_name: "sync",
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            success: true,
            error_message: null,
            duration_ms: 120,
          },
          {
            job_name: "briefing",
            started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(),
            success: false,
            error_message: "Provider 503",
            duration_ms: 3000,
          },
        ]);
      }
      if (table === "stripe_webhook_events") {
        return queryResult([
          {
            id: "evt_failed",
            type: "checkout.session.completed",
            received_at: new Date().toISOString(),
            status: "failed",
            error: "Failed to persist checkout tier",
            payload: { customer_email: "buyer@example.com" },
          },
        ]);
      }
      throw new Error(`unexpected table ${table}`);
    });

    const summary = await readProductionHealthSummary("owner-user");

    expect(summary?.status).toBe("attention");
    expect(summary?.cron.failingJobs).toEqual([
      expect.objectContaining({ jobName: "briefing", errorMessage: "Provider 503" }),
    ]);
    expect(summary?.stripe.failedRecent).toEqual([
      {
        eventId: "evt_failed",
        type: "checkout.session.completed",
        receivedAt: expect.any(String),
        status: "failed",
        error: "Failed to persist checkout tier",
      },
    ]);
    expect(JSON.stringify(summary)).not.toContain("buyer@example.com");
  });
});
