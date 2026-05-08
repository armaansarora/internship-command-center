import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientSpy,
  getGoogleTokensSpy,
  upsertSpy,
  fetchSpy,
} = vi.hoisted(() => ({
  createClientSpy: vi.fn(),
  getGoogleTokensSpy: vi.fn(),
  upsertSpy: vi.fn(),
  fetchSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientSpy,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/gmail/oauth", () => ({
  getGoogleTokens: getGoogleTokensSpy,
}));

const { syncCalendarEvents } = await import("./sync");

describe("syncCalendarEvents", () => {
  beforeEach(() => {
    createClientSpy.mockReset();
    getGoogleTokensSpy.mockReset();
    upsertSpy.mockReset();
    fetchSpy.mockReset();

    globalThis.fetch = fetchSpy;
    createClientSpy.mockResolvedValue({
      from: (table: string) => {
        expect(table).toBe("calendar_events");
        return { upsert: upsertSpy };
      },
    });
    getGoogleTokensSpy.mockResolvedValue({
      access_token: "google-access",
      refresh_token: "google-refresh",
      expiry_date: Date.now() + 60_000,
    });
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        kind: "calendar#events",
        items: [
          {
            id: "event-1",
            summary: "Interview",
            description: "Technical interview",
            location: "Google Meet",
            start: { dateTime: "2026-05-08T15:00:00.000Z" },
            end: { dateTime: "2026-05-08T16:00:00.000Z" },
          },
        ],
      }),
    });
    upsertSpy.mockResolvedValue({ error: null });
  });

  it("upserts events against the per-user Google event uniqueness key", async () => {
    const result = await syncCalendarEvents("user-google");

    expect(result).toBe(1);
    expect(upsertSpy).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: "user-google",
          google_event_id: "event-1",
          title: "Interview",
        }),
      ],
      {
        onConflict: "user_id,google_event_id",
        ignoreDuplicates: false,
      },
    );
  });
});
