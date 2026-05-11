/**
 * Contract tests for GET /api/cron/outreach-sender.
 * Auth covered by integration audit.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/cron", () => ({ verifyCronRequest: verifyMock }));

const sendOutreachEmailMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/email/outreach", () => ({ sendOutreachEmail: sendOutreachEmailMock }));

const logSecurityEventMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/audit/log", () => ({ logSecurityEvent: logSecurityEventMock }));

vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const fixture = {
  approved: [] as Array<Record<string, unknown>>,
  approvedError: null as { message: string } | null,
  users: [] as Array<{ id: string; email: string }>,
  contacts: [] as Array<{ id: string; email: string }>,
  updateError: null as { message: string } | null,
  updates: [] as Array<{ id: string; patch: Record<string, unknown> }>,
};

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "outreach_queue") {
        return {
          select: () => ({
            eq: () => ({
              is: () => ({
                lte: () => ({
                  order: () => ({
                    limit: async () => ({
                      data: fixture.approvedError ? null : fixture.approved,
                      error: fixture.approvedError,
                    }),
                  }),
                }),
              }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: (_c1: string, id: string) => ({
              eq: async () => {
                fixture.updates.push({ id, patch });
                return { data: null, error: fixture.updateError };
              },
            }),
          }),
        };
      }
      if (table === "user_profiles") {
        return { select: () => ({ in: async () => ({ data: fixture.users, error: null }) }) };
      }
      if (table === "contacts") {
        return { select: () => ({ in: async () => ({ data: fixture.contacts, error: null }) }) };
      }
      throw new Error(`Unexpected ${table}`);
    },
  }),
}));

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/outreach-sender", {
    method: "GET",
    headers: { authorization: "Bearer test" },
  });
}

describe("GET /api/cron/outreach-sender", () => {
  beforeEach(() => {
    verifyMock.mockReset();
    sendOutreachEmailMock.mockReset();
    logSecurityEventMock.mockReset();
    fixture.approved = [];
    fixture.approvedError = null;
    fixture.users = [];
    fixture.contacts = [];
    fixture.updateError = null;
    fixture.updates = [];
    verifyMock.mockReturnValue({ ok: true });
  });

  it("returns 401 when verifyCronRequest rejects", async () => {
    verifyMock.mockReturnValue({ ok: false, error: "no bearer" });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 500 when approved fetch errors", async () => {
    fixture.approvedError = { message: "db broken" };
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it("returns zero counts when queue is empty", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { processed: number; sent: number; failed: number };
    expect(body.processed).toBe(0);
    expect(body.sent).toBe(0);
    expect(body.failed).toBe(0);
  });

  it("sends approved row, flips to sent, and emits audit", async () => {
    fixture.approved = [
      {
        id: "o1",
        user_id: "u1",
        application_id: "app1",
        contact_id: "c1",
        subject: "Hi",
        body: "Body",
        type: "follow_up",
      },
    ];
    fixture.users = [{ id: "u1", email: "user@example.com" }];
    fixture.contacts = [{ id: "c1", email: "contact@example.com" }];
    sendOutreachEmailMock.mockResolvedValue({ messageId: "msg-123" });
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { sent: number; failed: number };
    expect(body.sent).toBe(1);
    expect(body.failed).toBe(0);
    expect(sendOutreachEmailMock).toHaveBeenCalledWith({
      to: "contact@example.com",
      subject: "Hi",
      body: "Body",
      replyTo: "user@example.com",
    });
    expect(fixture.updates[0]?.patch.status).toBe("sent");
    expect(fixture.updates[0]?.patch.resend_message_id).toBe("msg-123");
    expect(logSecurityEventMock).toHaveBeenCalledWith({
      userId: "u1",
      eventType: "agent_side_effect_email_sent",
      resourceType: "outreach_queue",
      resourceId: "o1",
      metadata: expect.objectContaining({
        messageId: "msg-123",
        outreachType: "follow_up",
        applicationId: "app1",
      }),
    });
  });

  it("skips rows missing subject/body without sending", async () => {
    fixture.approved = [
      { id: "o1", user_id: "u1", application_id: "app1", contact_id: "c1", subject: "", body: "", type: "follow_up" },
    ];
    fixture.users = [{ id: "u1", email: "user@example.com" }];
    fixture.contacts = [{ id: "c1", email: "contact@example.com" }];
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { failed: number; results: Array<{ status: string; error?: string }> };
    expect(body.failed).toBe(1);
    expect(sendOutreachEmailMock).not.toHaveBeenCalled();
    expect(body.results[0]?.status).toBe("skipped");
  });

  it("leaves row as approved when sendOutreachEmail throws", async () => {
    fixture.approved = [
      { id: "o1", user_id: "u1", application_id: "app1", contact_id: "c1", subject: "Hi", body: "Body", type: "follow_up" },
    ];
    fixture.users = [{ id: "u1", email: "user@example.com" }];
    fixture.contacts = [{ id: "c1", email: "contact@example.com" }];
    sendOutreachEmailMock.mockRejectedValue(new Error("Resend 500"));
    const { GET } = await import("./route");
    const res = await GET(makeRequest());
    const body = (await res.json()) as { sent: number; failed: number; results: Array<{ status: string; error?: string }> };
    expect(body.sent).toBe(0);
    expect(body.failed).toBe(1);
    expect(body.results[0]?.status).toBe("failed");
    expect(body.results[0]?.error).toBe("Resend 500");
    expect(fixture.updates).toHaveLength(0);
    expect(logSecurityEventMock).not.toHaveBeenCalled();
  });
});
