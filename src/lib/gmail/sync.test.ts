import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createClientSpy,
  getGoogleTokensSpy,
  parseGmailMessageSpy,
  classifyEmailSpy,
  matchEmailToApplicationSpy,
  upsertSpy,
  fetchSpy,
} = vi.hoisted(() => ({
  createClientSpy: vi.fn(),
  getGoogleTokensSpy: vi.fn(),
  parseGmailMessageSpy: vi.fn(),
  classifyEmailSpy: vi.fn(),
  matchEmailToApplicationSpy: vi.fn(),
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

vi.mock("@/lib/gmail/parser", () => ({
  parseGmailMessage: parseGmailMessageSpy,
  classifyEmail: classifyEmailSpy,
  matchEmailToApplication: matchEmailToApplicationSpy,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    warn: vi.fn(),
  },
}));

const { syncGmailForUser } = await import("./sync");

describe("syncGmailForUser", () => {
  beforeEach(() => {
    createClientSpy.mockReset();
    getGoogleTokensSpy.mockReset();
    parseGmailMessageSpy.mockReset();
    classifyEmailSpy.mockReset();
    matchEmailToApplicationSpy.mockReset();
    upsertSpy.mockReset();
    fetchSpy.mockReset();

    globalThis.fetch = fetchSpy;
    createClientSpy.mockResolvedValue({
      from: (table: string) => {
        expect(table).toBe("emails");
        return { upsert: upsertSpy };
      },
    });
    getGoogleTokensSpy.mockResolvedValue({
      access_token: "google-access",
      refresh_token: "google-refresh",
      expiry_date: Date.now() + 60_000,
    });
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: "gmail-1", threadId: "thread-1" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "gmail-1", threadId: "thread-1" }),
      });
    parseGmailMessageSpy.mockReturnValue({
      from: "recruiter@example.com",
      to: "fresh@example.com",
      subject: "Interview invitation",
      snippet: "Please pick a time",
      bodyText: "Please pick a time for your interview.",
      receivedAt: "2026-05-07T12:00:00.000Z",
    });
    classifyEmailSpy.mockReturnValue({
      classification: "interview_invite",
      urgency: "high",
      suggestedAction: "Schedule the interview",
    });
    matchEmailToApplicationSpy.mockResolvedValue("application-1");
    upsertSpy.mockResolvedValue({ error: null });
  });

  it("upserts emails against the per-user Gmail message uniqueness key", async () => {
    const result = await syncGmailForUser("user-google");

    expect(result).toEqual({ synced: 1, classified: 1, failed: 0 });
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-google",
        gmail_id: "gmail-1",
        application_id: "application-1",
      }),
      {
        onConflict: "user_id,gmail_id",
        ignoreDuplicates: false,
      },
    );
  });
});
