/**
 * Unit tests for the server-engagement helper (Fix #3).
 *
 * Covers: kill-switch, bot/prefetch/RSC/Sec-Fetch-Dest filtering, query-
 * string isolation (caller passes pre-stripped pathname), metadata
 * allowlist sanitisation, insert payload shape, and error swallowing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));
const adminMock = { from: fromMock };
const getSupabaseAdminMock = vi.fn(() => adminMock);

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}));

import {
  classifyMiddlewareRequest,
  floorSegment,
  recordServerEngagementEvent,
  type ClassifyInput,
} from "./server-engagement";
import { log } from "@/lib/logger";

const baseClassify: ClassifyInput = {
  pathname: "/pricing",
  method: "GET",
  userAgent: "Mozilla/5.0",
  prefetch: null,
  rsc: null,
  secFetchDest: "document",
  isAuthenticated: false,
};

describe("classifyMiddlewareRequest", () => {
  it("classifies /pricing as marketing_view", () => {
    expect(classifyMiddlewareRequest({ ...baseClassify })).toEqual({
      eventType: "marketing_view",
      routeKind: "marketing",
      pathname: "/pricing",
      floor: null,
    });
  });

  it("returns null for non-GET requests", () => {
    expect(
      classifyMiddlewareRequest({
        ...baseClassify,
        pathname: "/api/stripe/webhook",
        method: "POST",
      }),
    ).toBeNull();
  });

  it("returns null when Next-Router-Prefetch is 1", () => {
    expect(
      classifyMiddlewareRequest({
        ...baseClassify,
        pathname: "/penthouse",
        isAuthenticated: true,
        prefetch: "1",
      }),
    ).toBeNull();
  });

  it("returns null when RSC header is 1", () => {
    expect(
      classifyMiddlewareRequest({
        ...baseClassify,
        pathname: "/penthouse",
        isAuthenticated: true,
        rsc: "1",
      }),
    ).toBeNull();
  });

  it("returns null when Sec-Fetch-Dest is image (sub-document)", () => {
    expect(
      classifyMiddlewareRequest({
        ...baseClassify,
        secFetchDest: "image",
      }),
    ).toBeNull();
  });

  it("allows null/empty Sec-Fetch-Dest (older browsers, server-side fetch)", () => {
    expect(
      classifyMiddlewareRequest({ ...baseClassify, secFetchDest: null }),
    ).not.toBeNull();
    expect(
      classifyMiddlewareRequest({ ...baseClassify, secFetchDest: "" }),
    ).not.toBeNull();
  });

  it("returns null for bot user-agents (substring match against the bot regex)", () => {
    for (const ua of [
      "Googlebot/2.1 (+http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; AhrefsBot/7.0)",
      "Twitterbot/1.0",
      "Discordbot",
      "Mozilla/5.0 (compatible; Pingdom-Probe-1.0; +http://www.pingdom.com/) MonitorBot",
    ]) {
      expect(
        classifyMiddlewareRequest({ ...baseClassify, userAgent: ua }),
      ).toBeNull();
    }
  });

  it("returns null for /api/* paths", () => {
    for (const p of ["/api", "/api/cron/sync", "/api/stripe/webhook"]) {
      expect(
        classifyMiddlewareRequest({ ...baseClassify, pathname: p }),
      ).toBeNull();
    }
  });

  it("returns null for /_next/* and /sentry-tunnel", () => {
    expect(
      classifyMiddlewareRequest({
        ...baseClassify,
        pathname: "/_next/static/x.js",
      }),
    ).toBeNull();
    expect(
      classifyMiddlewareRequest({
        ...baseClassify,
        pathname: "/sentry-tunnel",
      }),
    ).toBeNull();
  });

  it("classifies /penthouse as floor_view when authenticated", () => {
    expect(
      classifyMiddlewareRequest({
        ...baseClassify,
        pathname: "/penthouse",
        isAuthenticated: true,
      }),
    ).toEqual({
      eventType: "floor_view",
      routeKind: "floor",
      pathname: "/penthouse",
      floor: "penthouse",
    });
  });

  it("classifies /penthouse as auth_gate_blocked when not authenticated", () => {
    expect(
      classifyMiddlewareRequest({
        ...baseClassify,
        pathname: "/penthouse",
        isAuthenticated: false,
      }),
    ).toEqual({
      eventType: "auth_gate_blocked",
      routeKind: "gate",
      pathname: "/penthouse",
      floor: null,
    });
  });

  it("classifies /lobby as marketing_view when unauthenticated and floor_view when authenticated", () => {
    expect(
      classifyMiddlewareRequest({
        ...baseClassify,
        pathname: "/lobby",
        isAuthenticated: false,
      })?.eventType,
    ).toBe("marketing_view");
    expect(
      classifyMiddlewareRequest({
        ...baseClassify,
        pathname: "/lobby",
        isAuthenticated: true,
      })?.eventType,
    ).toBe("floor_view");
  });

  it("normalizes trailing slash for marketing paths (/pricing/ === /pricing)", () => {
    expect(
      classifyMiddlewareRequest({ ...baseClassify, pathname: "/pricing/" }),
    ).toEqual({
      eventType: "marketing_view",
      routeKind: "marketing",
      pathname: "/pricing",
      floor: null,
    });
  });

  it("classifies root / as marketing_view", () => {
    expect(
      classifyMiddlewareRequest({ ...baseClassify, pathname: "/" })?.eventType,
    ).toBe("marketing_view");
  });

  it("returns null for unknown non-marketing, non-floor paths", () => {
    expect(
      classifyMiddlewareRequest({
        ...baseClassify,
        pathname: "/some-random-thing",
      }),
    ).toBeNull();
  });

  it("uses first segment as floor (not last) for nested floor routes", () => {
    expect(
      classifyMiddlewareRequest({
        ...baseClassify,
        pathname: "/penthouse/sub",
        isAuthenticated: true,
      })?.floor,
    ).toBe("penthouse");
  });
});

describe("floorSegment", () => {
  it("returns the first segment for floor paths", () => {
    expect(floorSegment("/penthouse")).toBe("penthouse");
    expect(floorSegment("/war-room")).toBe("war-room");
    expect(floorSegment("/penthouse/inner")).toBe("penthouse");
  });

  it("returns null for root and empty paths", () => {
    expect(floorSegment("/")).toBeNull();
    expect(floorSegment("")).toBeNull();
  });
});

describe("recordServerEngagementEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TOWER_SERVER_ANALYTICS_ENABLED;
    getSupabaseAdminMock.mockReturnValue(adminMock);
    fromMock.mockReturnValue({ insert: insertMock });
  });

  afterEach(() => {
    delete process.env.TOWER_SERVER_ANALYTICS_ENABLED;
  });

  it("kill-switch OFF: no insert, no admin import attempted", async () => {
    await recordServerEngagementEvent({
      eventType: "marketing_view",
      pathname: "/pricing",
      userId: null,
    });
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("kill-switch ON: marketing_view inserts the correct shape", async () => {
    process.env.TOWER_SERVER_ANALYTICS_ENABLED = "1";
    insertMock.mockResolvedValueOnce({ error: null });

    await recordServerEngagementEvent({
      eventType: "marketing_view",
      pathname: "/pricing",
      userId: null,
    });

    expect(fromMock).toHaveBeenCalledWith("engagement_events");
    expect(insertMock).toHaveBeenCalledWith({
      event_type: "marketing_view",
      user_id: null,
      pathname: "/pricing",
      route_kind: "marketing",
      floor: null,
      metadata: {},
    });
  });

  it("truncates oversize pathnames to 256 chars on insert", async () => {
    process.env.TOWER_SERVER_ANALYTICS_ENABLED = "1";
    insertMock.mockResolvedValueOnce({ error: null });
    const longPath = "/" + "a".repeat(500);

    await recordServerEngagementEvent({
      eventType: "marketing_view",
      pathname: longPath,
      userId: null,
    });

    const call = insertMock.mock.calls[0][0] as { pathname: string };
    expect(call.pathname.length).toBe(256);
  });

  it("strips non-allowlisted metadata keys", async () => {
    process.env.TOWER_SERVER_ANALYTICS_ENABLED = "1";
    insertMock.mockResolvedValueOnce({ error: null });

    await recordServerEngagementEvent({
      eventType: "floor_view",
      pathname: "/penthouse",
      userId: "00000000-0000-0000-0000-000000000001",
      floor: "penthouse",
      metadata: {
        is_authenticated: true,
        tier: "founder",
        is_first_floor_visit: true,
        // The Record signature forbids non-primitive values, but we still
        // defend against runtime callers that bypass typing.
        email: "guest@example.com",
        password: "should never appear",
      },
    });

    const call = insertMock.mock.calls[0][0] as {
      metadata: Record<string, unknown>;
    };
    expect(call.metadata).toEqual({
      is_authenticated: true,
      tier: "founder",
      is_first_floor_visit: true,
    });
  });

  it("swallows insert errors silently and logs engagement.write_failed", async () => {
    process.env.TOWER_SERVER_ANALYTICS_ENABLED = "1";
    insertMock.mockResolvedValueOnce({
      error: { message: "RLS denied" },
    });

    await expect(
      recordServerEngagementEvent({
        eventType: "marketing_view",
        pathname: "/pricing",
        userId: null,
      }),
    ).resolves.toBeUndefined();

    expect(log.warn).toHaveBeenCalledWith(
      "engagement.write_failed",
      expect.objectContaining({ error: "RLS denied" }),
    );
  });

  it("swallows thrown errors silently and logs engagement.write_threw", async () => {
    process.env.TOWER_SERVER_ANALYTICS_ENABLED = "1";
    insertMock.mockImplementationOnce(() => {
      throw new Error("network down");
    });

    await expect(
      recordServerEngagementEvent({
        eventType: "marketing_view",
        pathname: "/pricing",
        userId: null,
      }),
    ).resolves.toBeUndefined();

    expect(log.warn).toHaveBeenCalledWith(
      "engagement.write_threw",
      expect.objectContaining({ error: "network down" }),
    );
  });

  // ------------------------------------------------------------------------
  // activation_step (PR1 — 5-minute activation gauntlet)
  // ------------------------------------------------------------------------

  it("activation_step writes with route_kind 'activation'", async () => {
    process.env.TOWER_SERVER_ANALYTICS_ENABLED = "1";
    insertMock.mockResolvedValueOnce({ error: null });

    await recordServerEngagementEvent({
      eventType: "activation_step",
      pathname: "/activate",
      userId: "00000000-0000-0000-0000-000000000001",
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "activation_step",
        route_kind: "activation",
        pathname: "/activate",
      }),
    );
  });

  it("activation_step preserves step_id, outcome, dwell_ms, source, and beat metadata", async () => {
    process.env.TOWER_SERVER_ANALYTICS_ENABLED = "1";
    insertMock.mockResolvedValueOnce({ error: null });

    await recordServerEngagementEvent({
      eventType: "activation_step",
      pathname: "/activate",
      userId: "00000000-0000-0000-0000-000000000001",
      floor: null,
      metadata: {
        step_id: "intake_complete",
        outcome: "success",
        dwell_ms: 4321,
        source: "gmail",
        beat: "google_connect",
      },
    });

    const call = insertMock.mock.calls[0][0] as {
      metadata: Record<string, unknown>;
    };
    expect(call.metadata).toEqual({
      step_id: "intake_complete",
      outcome: "success",
      dwell_ms: 4321,
      source: "gmail",
      beat: "google_connect",
    });
  });

  it("activation_step still strips non-allowlisted keys (no leakage via new event type)", async () => {
    process.env.TOWER_SERVER_ANALYTICS_ENABLED = "1";
    insertMock.mockResolvedValueOnce({ error: null });

    await recordServerEngagementEvent({
      eventType: "activation_step",
      pathname: "/activate",
      userId: "00000000-0000-0000-0000-000000000001",
      metadata: {
        beat: "intake",
        outcome: "success",
        // not in allowlist — must be dropped
        email: "user@example.com",
        secret: "should never appear",
      },
    });

    const call = insertMock.mock.calls[0][0] as {
      metadata: Record<string, unknown>;
    };
    expect(call.metadata).toEqual({
      beat: "intake",
      outcome: "success",
    });
  });

  it("regression: floor_view still writes with route_kind 'floor' after activation additions", async () => {
    process.env.TOWER_SERVER_ANALYTICS_ENABLED = "1";
    insertMock.mockResolvedValueOnce({ error: null });

    await recordServerEngagementEvent({
      eventType: "floor_view",
      pathname: "/penthouse",
      userId: "00000000-0000-0000-0000-000000000001",
      floor: "penthouse",
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "floor_view",
        route_kind: "floor",
        floor: "penthouse",
      }),
    );
  });

  it("regression: auth_gate_blocked still writes with route_kind 'gate' after activation additions", async () => {
    process.env.TOWER_SERVER_ANALYTICS_ENABLED = "1";
    insertMock.mockResolvedValueOnce({ error: null });

    await recordServerEngagementEvent({
      eventType: "auth_gate_blocked",
      pathname: "/penthouse",
      userId: null,
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "auth_gate_blocked",
        route_kind: "gate",
      }),
    );
  });
});
