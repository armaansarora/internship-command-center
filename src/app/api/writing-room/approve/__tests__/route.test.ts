/**
 * R5.6 Proof — user approval gate.
 *
 * Asserts the non-negotiable: the /approve route REJECTS when no tone
 * was selected via /choose-tone first. Separating selection and approval
 * into two distinct state transitions is what stops a single-click
 * generate-and-send flow from existing.
 *
 * The cron outreach-sender pulls `status='approved'` rows only —
 * pending_approval rows are invisible to it. That's the downstream half
 * of the gate.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  getUser: () => getUserMock(),
  createClient: async () => ({
    from: (_table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => queueFetchResult(),
          }),
        }),
      }),
      update: (_patch: unknown) => ({
        eq: () => ({
          eq: () => ({
            eq: async () => ({ error: updateErr }),
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

let queueFetchResult: () => Promise<{ data: unknown; error: unknown }>;
let updateErr: unknown = null;

import { POST } from "../route";

async function postApprove(body: unknown): Promise<Response> {
  const req = new Request("http://localhost/api/writing-room/approve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("POST /api/writing-room/approve — the gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateErr = null;
    getUserMock.mockResolvedValue({ id: "u-1" });
    queueFetchResult = async () => ({ data: null, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    getUserMock.mockResolvedValue(null);
    const res = await postApprove({ outreachQueueId: "q-1" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is missing outreachQueueId", async () => {
    const res = await postApprove({});
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_body");
  });

  it("returns 404 when the queue row doesn't exist", async () => {
    queueFetchResult = async () => ({ data: null, error: null });
    const res = await postApprove({ outreachQueueId: "q-1" });
    expect(res.status).toBe(404);
  });

  it("GATE — returns 400 no_tone_chosen when selectedCoverLetterId is null", async () => {
    queueFetchResult = async () => ({
      data: {
        id: "q-1",
        status: "pending_approval",
        type: "cover_letter_send",
        body: null,
        metadata: { toneGroupId: "tg-1", selectedCoverLetterId: null },
      },
      error: null,
    });
    const res = await postApprove({ outreachQueueId: "q-1" });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("no_tone_chosen");
  });

  it("GATE — returns 400 empty_body when body is empty despite a tone choice (defence-in-depth)", async () => {
    queueFetchResult = async () => ({
      data: {
        id: "q-1",
        status: "pending_approval",
        type: "cover_letter_send",
        body: "",
        metadata: {
          toneGroupId: "tg-1",
          selectedCoverLetterId: "doc-1",
          selectedTone: "formal",
        },
      },
      error: null,
    });
    const res = await postApprove({ outreachQueueId: "q-1" });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("empty_body");
  });

  it("GATE — refuses approval on non-pending_approval rows", async () => {
    queueFetchResult = async () => ({
      data: {
        id: "q-1",
        status: "approved", // already approved
        type: "cover_letter_send",
        body: "Already approved content.",
        metadata: {
          toneGroupId: "tg-1",
          selectedCoverLetterId: "doc-1",
          selectedTone: "formal",
        },
      },
      error: null,
    });
    const res = await postApprove({ outreachQueueId: "q-1" });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("wrong_status");
  });

  it("GATE — refuses approval on non-cover-letter-send rows", async () => {
    queueFetchResult = async () => ({
      data: {
        id: "q-1",
        status: "pending_approval",
        type: "cold_email",
        body: "Content.",
        metadata: {},
      },
      error: null,
    });
    const res = await postApprove({ outreachQueueId: "q-1" });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("wrong_type");
  });

  it("happy path — approves when tone chosen AND body populated", async () => {
    queueFetchResult = async () => ({
      data: {
        id: "q-1",
        status: "pending_approval",
        type: "cover_letter_send",
        body: "Dear Hiring Team,\n\nMy formal application for this role...",
        metadata: {
          toneGroupId: "tg-1",
          selectedCoverLetterId: "doc-1",
          selectedTone: "formal",
        },
      },
      error: null,
    });
    const res = await postApprove({ outreachQueueId: "q-1" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("approved");
    expect(typeof json.approvedAt).toBe("string");
  });
});
