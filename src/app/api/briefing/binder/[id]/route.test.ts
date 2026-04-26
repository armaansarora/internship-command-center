/**
 * GET /api/briefing/binder/[id] contract tests.
 *
 * Locks in:
 *  - 404 when readBinder returns null (missing / wrong-owner / wrong-type).
 *  - 200 with the full DebriefContent JSON on the happy path.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { DebriefContent } from "@/types/debrief";

const requireUserMock = vi.hoisted(() => vi.fn(async () => ({ id: "user-1" })));
const readBinderMock = vi.hoisted(() =>
  vi.fn(async (_uid: string, _id: string): Promise<DebriefContent | null> => null),
);

vi.mock("@/lib/supabase/server", () => ({
  requireUser: requireUserMock,
}));
vi.mock("@/lib/db/queries/debriefs-rest", () => ({
  readBinder: readBinderMock,
}));

function validDebrief(): DebriefContent {
  return {
    source: "drill",
    interviewId: null,
    company: "CBRE",
    round: "1",
    questions: [
      {
        id: "q1",
        text: "Tell me about a time...",
        category: "behavioral",
        answer: { text: "I did the thing.", durationMs: 60000, audioPath: null },
        stars: { s: 80, t: 70, a: 85, r: 60 },
        score: 76,
        narrative: "Solid Action. Tighten Result.",
        interrupts: [],
      },
    ],
    totalScore: 76,
    cpoFeedback: "Good drill.",
    createdAt: new Date().toISOString(),
  };
}

async function callGet(id: string): Promise<Response> {
  const { GET } = await import("./route");
  const req = new NextRequest(`http://localhost/api/briefing/binder/${id}`);
  return GET(req, { params: Promise.resolve({ id }) });
}

describe("GET /api/briefing/binder/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "user-1" });
  });

  it("returns 404 when binder is not found", async () => {
    readBinderMock.mockResolvedValueOnce(null);
    const res = await callGet("00000000-0000-4000-8000-000000000000");
    expect(res.status).toBe(404);
    const j = await res.json();
    expect(j.error).toBe("not found");
  });

  it("returns 200 with the DebriefContent body on happy path", async () => {
    const debrief = validDebrief();
    readBinderMock.mockResolvedValueOnce(debrief);
    const res = await callGet("11111111-1111-4111-8111-111111111111");
    expect(res.status).toBe(200);
    const j = (await res.json()) as DebriefContent;
    expect(j.company).toBe("CBRE");
    expect(j.round).toBe("1");
    expect(j.questions.length).toBe(1);
    expect(j.totalScore).toBe(76);
  });

  it("calls readBinder scoped to the authenticated user.id", async () => {
    readBinderMock.mockResolvedValueOnce(validDebrief());
    await callGet("22222222-2222-4222-8222-222222222222");
    expect(readBinderMock).toHaveBeenCalledWith(
      "user-1",
      "22222222-2222-4222-8222-222222222222",
    );
  });
});
