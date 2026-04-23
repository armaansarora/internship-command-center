/**
 * R6.7 — POST /api/briefing/complete-drill contract tests.
 *
 * Locks in:
 *  - 400 on malformed body (invalid DebriefContent)
 *  - 200 happy-path: inserts a documents row with type="debrief" and returns
 *    the new binderId.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { DebriefContent } from "@/types/debrief";

const requireUserMock = vi.hoisted(() => vi.fn(async () => ({ id: "user-1" })));
const sbMock = vi.hoisted(() => ({
  from: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  requireUser: requireUserMock,
  createClient: vi.fn(async () => sbMock),
}));

type InsertArgs = Record<string, unknown>;
type UpdateArgs = Record<string, unknown>;

interface DocsChain {
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
}

function mkChain(): DocsChain {
  const chain = {
    insert: vi.fn((_a: InsertArgs) => chain),
    update: vi.fn((_a: UpdateArgs) => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: { id: "doc-123" }, error: null })),
    eq: vi.fn(() => chain),
  } as DocsChain;
  return chain;
}

function validDebrief(): DebriefContent {
  return {
    source: "drill",
    interviewId: "22222222-2222-4222-8222-222222222222",
    company: "CBRE",
    round: "1",
    questions: [
      {
        id: "q1",
        text: "Tell me about a time...",
        category: "behavioral",
        answer: { text: "I did a thing.", durationMs: 90000, audioPath: null },
        stars: { s: 80, t: 70, a: 85, r: 60 },
        score: 76,
        narrative: "Solid Action. Tighten the Result.",
        interrupts: [],
      },
    ],
    totalScore: 76,
    cpoFeedback: "Good drill — sharpen your closes.",
    createdAt: new Date().toISOString(),
  };
}

async function callPost(body: unknown) {
  const { POST } = await import("./route");
  const req = new NextRequest("http://localhost/api/briefing/complete-drill", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("POST /api/briefing/complete-drill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("400 on bad body", async () => {
    sbMock.from.mockImplementation(() => mkChain());
    const res = await callPost({ interviewId: null });
    expect(res.status).toBe(400);
  });

  it("200 happy path inserts type=debrief and returns binderId", async () => {
    const docsChain = mkChain();
    const interviewsChain = mkChain();
    sbMock.from.mockImplementation((table: string) => {
      if (table === "documents") return docsChain;
      if (table === "interviews") return interviewsChain;
      return mkChain();
    });

    const res = await callPost({
      interviewId: "22222222-2222-4222-8222-222222222222",
      debrief: validDebrief(),
    });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.binderId).toBe("doc-123");

    // The insert payload on `documents` must carry type: "debrief".
    expect(docsChain.insert).toHaveBeenCalledOnce();
    const insertArg = docsChain.insert.mock.calls[0]?.[0] as InsertArgs;
    expect(insertArg.type).toBe("debrief");
    expect(insertArg.generated_by).toBe("cpo");

    // Interview row gets its debrief_id attached.
    expect(interviewsChain.update).toHaveBeenCalledOnce();
    const updateArg = interviewsChain.update.mock.calls[0]?.[0] as UpdateArgs;
    expect(updateArg.debrief_id).toBe("doc-123");
  });

  it("skips interview update when interviewId is null", async () => {
    const docsChain = mkChain();
    const interviewsChain = mkChain();
    sbMock.from.mockImplementation((table: string) => {
      if (table === "documents") return docsChain;
      if (table === "interviews") return interviewsChain;
      return mkChain();
    });

    const res = await callPost({
      interviewId: null,
      debrief: { ...validDebrief(), interviewId: null },
    });
    expect(res.status).toBe(200);
    expect(interviewsChain.update).not.toHaveBeenCalled();
  });
});
