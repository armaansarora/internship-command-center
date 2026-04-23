import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const sendSpy = vi.fn();

vi.mock("resend", () => {
  class MockResend {
    emails: { send: typeof sendSpy };
    constructor() {
      this.emails = { send: sendSpy };
    }
  }
  return { Resend: MockResend };
});

describe("sendOutreachEmail", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "key";
    process.env.RESEND_API_KEY = "re_test";
    Object.assign(process.env, { NODE_ENV: "development" });
    sendSpy.mockReset();
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k];
    }
    Object.assign(process.env, origEnv);
  });

  it("returns a messageId on success", async () => {
    sendSpy.mockResolvedValueOnce({
      data: { id: "mock-success-id" },
      error: null,
    });
    const { sendOutreachEmail } = await import("./outreach");
    const result = await sendOutreachEmail({
      to: "recipient@example.com",
      subject: "Hello",
      body: "Body",
    });
    expect(result.messageId).toBe("mock-success-id");
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("throws on Resend error", async () => {
    sendSpy.mockResolvedValueOnce({
      data: null,
      error: { message: "simulated resend failure" },
    });
    const { sendOutreachEmail } = await import("./outreach");
    await expect(
      sendOutreachEmail({
        to: "r@example.com",
        subject: "BOOM",
        body: "Body",
      })
    ).rejects.toThrow(/simulated resend failure/);
  });

  it("passes replyTo and subject through to Resend.emails.send", async () => {
    sendSpy.mockResolvedValueOnce({
      data: { id: "mock-reply" },
      error: null,
    });
    const { sendOutreachEmail } = await import("./outreach");
    await sendOutreachEmail({
      to: "r@example.com",
      subject: "Hi",
      body: "Body",
      replyTo: "user@example.com",
    });
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "r@example.com",
        subject: "Hi",
        text: "Body",
        replyTo: "user@example.com",
      })
    );
  });

  it("falls back to no replyTo when not provided", async () => {
    sendSpy.mockResolvedValueOnce({
      data: { id: "mock-no-reply" },
      error: null,
    });
    const { sendOutreachEmail } = await import("./outreach");
    await sendOutreachEmail({
      to: "r@example.com",
      subject: "Hi2",
      body: "Body2",
    });
    const payload = sendSpy.mock.calls[0]?.[0] as { replyTo?: string };
    expect(payload.replyTo).toBeUndefined();
  });
});
