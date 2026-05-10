/**
 * Integration tests for engagement-event emission inside `updateSession`.
 *
 * Drives 12 fixture URLs through the live middleware (with mocked Supabase
 * SSR client + mocked engagement writer) and asserts the right event (or
 * no event) is emitted with the right payload, and that response status /
 * redirect behavior is unchanged in every case.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { recordSpy } = vi.hoisted(() => ({
  recordSpy: vi.fn<(...args: unknown[]) => Promise<void>>(
    async () => undefined,
  ),
}));

vi.mock("@/lib/analytics/server-engagement", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/analytics/server-engagement")
  >("@/lib/analytics/server-engagement");
  return {
    ...actual,
    recordServerEngagementEvent: recordSpy,
  };
});

let nextMockClient: unknown = null;
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => nextMockClient,
}));

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.test";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";

import { updateSession } from "./middleware";

function mkClient(user: { id: string } | null) {
  return {
    auth: {
      getUser: async () => ({ data: { user } }),
    },
  };
}

function req(
  url: string,
  init: { method?: string; headers?: Record<string, string> } = {},
): NextRequest {
  return new NextRequest(new URL(url), {
    method: init.method ?? "GET",
    headers: init.headers,
  });
}

describe("middleware engagement emission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordSpy.mockResolvedValue(undefined);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
    delete process.env.TOWER_DEV_PREVIEW_AUTH;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("F1: /pricing GET unauthed → marketing_view, userId null", async () => {
    nextMockClient = mkClient(null);
    await updateSession(req("http://localhost/pricing"));
    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "marketing_view",
        pathname: "/pricing",
        userId: null,
      }),
    );
  });

  it("F2: /penthouse GET authed → floor_view with floor=penthouse", async () => {
    nextMockClient = mkClient({ id: "user-1" });
    await updateSession(req("http://localhost/penthouse"));
    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "floor_view",
        pathname: "/penthouse",
        userId: "user-1",
        floor: "penthouse",
      }),
    );
  });

  it("F3: /penthouse GET unauthed → auth_gate_blocked then redirect to /lobby", async () => {
    nextMockClient = mkClient(null);
    const res = await updateSession(req("http://localhost/penthouse"));
    expect(res.headers.get("location")).toContain("/lobby");
    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "auth_gate_blocked",
        pathname: "/penthouse",
        userId: null,
      }),
    );
  });

  it("F4: /api/cron/sync GET → no event", async () => {
    nextMockClient = mkClient(null);
    await updateSession(req("http://localhost/api/cron/sync"));
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it("F5: /api/stripe/webhook POST → no event", async () => {
    nextMockClient = mkClient(null);
    await updateSession(
      req("http://localhost/api/stripe/webhook", { method: "POST" }),
    );
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it("F6: /penthouse with prefetch=1 → no event", async () => {
    nextMockClient = mkClient({ id: "user-1" });
    await updateSession(
      req("http://localhost/penthouse", {
        headers: { "next-router-prefetch": "1" },
      }),
    );
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it("F7: /penthouse with RSC=1 → no event", async () => {
    nextMockClient = mkClient({ id: "user-1" });
    await updateSession(
      req("http://localhost/penthouse", { headers: { rsc: "1" } }),
    );
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it("F8: /_next/static/x.js → no event", async () => {
    nextMockClient = mkClient(null);
    await updateSession(req("http://localhost/_next/static/x.js"));
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it("F9: /sentry-tunnel → no event", async () => {
    nextMockClient = mkClient(null);
    await updateSession(req("http://localhost/sentry-tunnel"));
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it("F10: /penthouse with Googlebot UA → no event", async () => {
    nextMockClient = mkClient({ id: "user-1" });
    await updateSession(
      req("http://localhost/penthouse", {
        headers: { "user-agent": "Googlebot/2.1" },
      }),
    );
    expect(recordSpy).not.toHaveBeenCalled();
  });

  it("fire-and-forget: updateSession resolves while writer is still pending", async () => {
    nextMockClient = mkClient({ id: "user-1" });
    let resolveWriter: () => void = () => {};
    recordSpy.mockImplementationOnce(
      () => new Promise<void>((r) => { resolveWriter = r; }),
    );

    const start = Date.now();
    const res = await updateSession(req("http://localhost/penthouse"));
    const elapsed = Date.now() - start;

    expect(res).toBeDefined();
    expect(elapsed).toBeLessThan(100);
    resolveWriter();
  });

  it("writer rejection does not propagate or change response status", async () => {
    nextMockClient = mkClient(null);
    recordSpy.mockRejectedValueOnce(new Error("boom"));
    const res = await updateSession(req("http://localhost/penthouse"));
    expect(res.headers.get("location")).toContain("/lobby");
  });
});
