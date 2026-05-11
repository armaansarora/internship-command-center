import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Unit tests for owner-digest.ts.
 *
 * Contract:
 *   - sendOwnerDigest returns `{ skipped: true }` when RESEND_API_KEY
 *     is unset and never invokes Resend.
 *   - Returns `{ skipped: true }` when the incident list is empty.
 *   - On success, returns `{ skipped: false, messageId: <id> }` and
 *     calls Resend with the formatted subject + body.
 *   - On Resend rejection, returns `{ skipped: false, error: msg }`
 *     without throwing.
 *   - buildSubject + buildBody round-trip incident details into the
 *     expected human-readable format.
 */

const resendSendMock = vi.hoisted(() => vi.fn());

vi.mock("resend", () => {
  class MockResend {
    emails: { send: typeof resendSendMock };
    constructor() {
      this.emails = { send: resendSendMock };
    }
  }
  return { Resend: MockResend };
});

const envMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/env", () => ({
  env: envMock,
}));

const { sendOwnerDigest, buildSubject, buildBody } = await import("./owner-digest");

beforeEach(() => {
  resendSendMock.mockReset();
  envMock.mockReset();
  envMock.mockReturnValue({ RESEND_API_KEY: "re_test_123" });
});

describe("buildSubject", () => {
  it("pluralises 'incident'/'incidents' correctly", () => {
    expect(buildSubject("detected", 1)).toBe(
      "[Tower watchdog] 1 incident detected",
    );
    expect(buildSubject("detected", 3)).toBe(
      "[Tower watchdog] 3 incidents detected",
    );
  });

  it("uses 'recovered' wording on resolution", () => {
    expect(buildSubject("recovered", 2)).toBe(
      "[Tower watchdog] 2 incidents recovered",
    );
  });

  it("flags reminders with the 6h hint", () => {
    expect(buildSubject("reminder", 1)).toBe(
      "[Tower watchdog] 1 incident still open — reminder",
    );
  });
});

describe("buildBody", () => {
  it("renders one bullet per incident with opened_at and last-seen value", () => {
    const body = buildBody("detected", [
      {
        jobName: "stripe-webhooks",
        openedAt: "2026-05-11T12:00:00.000Z",
        lastSeenValue: "3 failed in 24h",
      },
      {
        jobName: "ai-cost-hourly",
        openedAt: "2026-05-11T12:10:00.000Z",
        lastSeenValue: null,
      },
    ]);
    expect(body).toContain("stripe-webhooks (opened 2026-05-11T12:00:00.000Z) — last seen: 3 failed in 24h");
    expect(body).toContain("ai-cost-hourly (opened 2026-05-11T12:10:00.000Z)");
    expect(body).not.toContain("ai-cost-hourly (opened 2026-05-11T12:10:00.000Z) — last seen:");
    expect(body).toContain("— The Tower Watchdog");
  });

  it("uses recovered-wording header on recovered digests", () => {
    const body = buildBody("recovered", [
      {
        jobName: "cron:warmth-decay",
        openedAt: "2026-05-11T08:00:00.000Z",
        lastSeenValue: null,
      },
    ]);
    expect(body).toContain("recovered");
  });
});

describe("sendOwnerDigest", () => {
  const baseParams = {
    to: "owner@example.com",
    from: "concierge@interntower.com",
    kind: "detected" as const,
    incidents: [
      {
        jobName: "stripe-webhooks",
        openedAt: "2026-05-11T12:00:00.000Z",
        lastSeenValue: "3 failed in 24h",
      },
    ],
  };

  it("skips and never calls Resend when RESEND_API_KEY is unset", async () => {
    envMock.mockReturnValue({ RESEND_API_KEY: undefined });

    const out = await sendOwnerDigest(baseParams);

    expect(out).toEqual({ skipped: true, messageId: null, error: null });
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("skips when there are no incidents", async () => {
    const out = await sendOwnerDigest({ ...baseParams, incidents: [] });
    expect(out.skipped).toBe(true);
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("sends and returns the Resend message id on success", async () => {
    resendSendMock.mockResolvedValue({
      data: { id: "msg-1" },
      error: null,
    });

    const out = await sendOwnerDigest(baseParams);

    expect(resendSendMock).toHaveBeenCalledTimes(1);
    const [payload] = resendSendMock.mock.calls[0] as [Record<string, unknown>];
    expect(payload.from).toBe("concierge@interntower.com");
    expect(payload.to).toBe("owner@example.com");
    expect(payload.subject).toBe(
      "[Tower watchdog] 1 incident detected",
    );
    expect((payload.text as string)).toContain("stripe-webhooks");
    expect(out).toEqual({ skipped: false, messageId: "msg-1", error: null });
  });

  it("returns the error string on Resend rejection without throwing", async () => {
    resendSendMock.mockResolvedValue({
      data: null,
      error: { message: "delivery blocked" },
    });

    const out = await sendOwnerDigest(baseParams);

    expect(out.skipped).toBe(false);
    expect(out.messageId).toBeNull();
    expect(out.error).toBe("delivery blocked");
  });

  it("captures thrown errors from the SDK without crashing the caller", async () => {
    resendSendMock.mockRejectedValue(new Error("network down"));

    const out = await sendOwnerDigest(baseParams);

    expect(out.skipped).toBe(false);
    expect(out.error).toBe("network down");
  });
});
