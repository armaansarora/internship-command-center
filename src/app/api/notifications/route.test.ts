import { describe, expect, it, beforeEach, vi } from "vitest";
import { encodeBriefing } from "@/lib/penthouse/briefing-storage";
import type { MorningBriefing } from "@/lib/ai/agents/morning-briefing";

const { requireUserSpy, rateLimitSpy, createClientSpy } = vi.hoisted(() => ({
  requireUserSpy: vi.fn(),
  rateLimitSpy: vi.fn(),
  createClientSpy: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/rate-limit-middleware", () => ({
  withRateLimit: rateLimitSpy,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientSpy,
}));

const { GET } = await import("./route");

function makeQuery(result: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (
      resolve: (value: unknown) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return query;
}

const briefing: MorningBriefing = {
  version: "v2",
  generated_at: "2026-05-08T13:00:00.000Z",
  script: "Pipeline moved. Interview needs prep. Inbox is quiet.",
  beats: [
    { tone: "steady", text: "Pipeline moved." },
    { tone: "urgent", text: "Interview needs prep." },
    { tone: "steady", text: "Inbox is quiet." },
  ],
  mood: "sharp",
  weather_hint: "gold",
};

describe("GET /api/notifications", () => {
  beforeEach(() => {
    requireUserSpy.mockReset();
    rateLimitSpy.mockReset();
    createClientSpy.mockReset();

    requireUserSpy.mockResolvedValue({
      ok: true,
      user: { id: "user-1" },
    });
    rateLimitSpy.mockResolvedValue({
      response: null,
      headers: { "X-RateLimit-Remaining": "9" },
    });
  });

  it("decodes structured briefing notifications before returning them to UI", async () => {
    const query = makeQuery({
      data: [
        {
          id: "notification-1",
          user_id: "user-1",
          type: "daily_briefing",
          priority: "medium",
          title: "Morning Briefing",
          body: encodeBriefing(briefing),
          source_agent: "ceo",
          source_entity_id: null,
          source_entity_type: null,
          channels: ["toast"],
          is_read: false,
          is_dismissed: false,
          actions: [],
          created_at: "2026-05-08T13:00:00.000Z",
          updated_at: "2026-05-08T13:00:00.000Z",
        },
      ],
      error: null,
    });
    createClientSpy.mockResolvedValue({
      from: vi.fn(() => query),
    });

    const res = await GET(new Request("http://localhost/api/notifications"));
    const json = (await res.json()) as {
      data: Array<{ body: string | null }>;
    };

    expect(json.data[0]?.body).toContain("Pipeline moved.");
    expect(json.data[0]?.body).not.toContain("[briefing_v2]");
    expect(json.data[0]?.body).not.toContain("\"version\":\"v2\"");
  });
});
