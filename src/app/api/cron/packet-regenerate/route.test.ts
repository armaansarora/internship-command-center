import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { _resetEnvCacheForTests } from "@/lib/env";

/**
 * Contract tests for GET /api/cron/packet-regenerate.
 *
 * Covers:
 *   - 401 when verifyCronRequest rejects.
 *   - 200 + zero candidates when nothing is upcoming.
 *   - Full happy path for an interview with no prep_packet_id — document
 *     insert, interview update, pneumatic-tube notification shape.
 *   - Null return from the structured generator surfaces an error and
 *     does NOT count toward regenerated.
 */

const verifyMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/cron", () => ({ verifyCronRequest: verifyMock }));

const adminMock = vi.hoisted(() => {
  const from = vi.fn();
  return { from };
});
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => adminMock,
}));

const genMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/structured/prep-packet", () => ({
  generateStructuredPrepPacket: genMock,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function makeRequest(authed = true): NextRequest {
  return new NextRequest("http://localhost/api/cron/packet-regenerate", {
    method: "GET",
    headers: authed ? { authorization: "Bearer test-secret" } : {},
  });
}

async function callGet(authed = true): Promise<Response> {
  const { GET } = await import("./route");
  return GET(makeRequest(authed));
}

describe("GET /api/cron/packet-regenerate", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-pub-key";
    _resetEnvCacheForTests();
  });

  afterAll(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
    }
    _resetEnvCacheForTests();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    verifyMock.mockReturnValue({ ok: true });
    genMock.mockReset();
    adminMock.from.mockReset();
  });

  it("returns 401 when cron auth fails", async () => {
    verifyMock.mockReturnValue({ ok: false, error: "unauthorized" });
    const res = await callGet(false);
    expect(res.status).toBe(401);
  });

  it("returns 0 candidates when no upcoming interviews", async () => {
    adminMock.from.mockImplementation((table: string) => {
      if (table === "interviews") {
        return {
          select: () => ({
            in: () => ({
              gte: () => ({
                lte: () => ({
                  order: () => ({
                    limit: async () => ({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "applications") {
        return {
          select: () => ({
            in: async () => ({ data: [], error: null }),
          }),
        };
      }
      return {};
    });

    const res = await callGet();
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      scanned: number;
      candidates: number;
      regenerated: number;
    };
    expect(j.candidates).toBe(0);
    expect(j.regenerated).toBe(0);
    expect(genMock).not.toHaveBeenCalled();
  });

  it("regenerates packet for interview with no prep_packet_id and inserts notification", async () => {
    const interviewRow = {
      id: "int-1",
      user_id: "user-1",
      application_id: "app-1",
      prep_packet_id: null,
      round: "1",
      format: "general",
      scheduled_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    };
    const insertedDoc = { id: "doc-new" };
    let notifInserted: Record<string, unknown> | null = null;

    adminMock.from.mockImplementation((table: string) => {
      if (table === "interviews") {
        return {
          select: () => ({
            in: () => ({
              gte: () => ({
                lte: () => ({
                  order: () => ({
                    limit: async () => ({
                      data: [interviewRow],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      if (table === "applications") {
        return {
          select: () => ({
            in: async () => ({
              data: [{ id: "app-1", company_name: "CBRE", role: "Analyst" }],
              error: null,
            }),
          }),
        };
      }
      if (table === "documents") {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: insertedDoc, error: null }),
            }),
          }),
        };
      }
      if (table === "notifications") {
        return {
          insert: async (payload: Record<string, unknown>) => {
            notifInserted = payload;
            return { error: null };
          },
        };
      }
      return {};
    });

    genMock.mockResolvedValue({
      markdown: "# Prep Packet — CBRE",
      packet: {
        company_summary: "",
        role_summary: "",
        behavioral_questions: [],
        technical_questions: [],
        questions_to_ask: [],
        red_flags: [],
      },
    });

    const res = await callGet();
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      regenerated: number;
      notified: number;
      candidates: number;
      errors: string[];
    };
    expect(j.regenerated).toBe(1);
    expect(j.notified).toBe(1);
    expect(j.candidates).toBe(1);
    expect(genMock).toHaveBeenCalledOnce();
    expect(notifInserted).not.toBeNull();

    const payload = notifInserted as unknown as {
      channels: string[];
      type: string;
      source_agent: string;
      source_entity_id: string;
      source_entity_type: string;
      user_id: string;
      actions: Array<{ label: string; href: string }>;
    };
    expect(payload.channels).toContain("pneumatic_tube");
    expect(payload.type).toBe("prep_packet_refreshed");
    expect(payload.source_agent).toBe("cpo");
    expect(payload.source_entity_id).toBe("int-1");
    expect(payload.source_entity_type).toBe("interview");
    expect(payload.user_id).toBe("user-1");
    expect(payload.actions[0].href).toBe("/briefing-room");
  });

  it("skips interview when structured generator returns null", async () => {
    adminMock.from.mockImplementation((table: string) => {
      if (table === "interviews") {
        return {
          select: () => ({
            in: () => ({
              gte: () => ({
                lte: () => ({
                  order: () => ({
                    limit: async () => ({
                      data: [
                        {
                          id: "int-2",
                          user_id: "user-2",
                          application_id: "app-2",
                          prep_packet_id: null,
                          round: "1",
                          format: "general",
                          scheduled_at: new Date(
                            Date.now() + 24 * 3600 * 1000,
                          ).toISOString(),
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "applications") {
        return {
          select: () => ({
            in: async () => ({
              data: [{ id: "app-2", company_name: "X", role: "Y" }],
              error: null,
            }),
          }),
        };
      }
      return {};
    });

    genMock.mockResolvedValue(null);

    const res = await callGet();
    expect(res.status).toBe(200);
    const j = (await res.json()) as {
      regenerated: number;
      errors: string[];
    };
    expect(j.regenerated).toBe(0);
    expect(j.errors.length).toBeGreaterThan(0);
    expect(j.errors[0]).toContain("int-2");
  });
});
