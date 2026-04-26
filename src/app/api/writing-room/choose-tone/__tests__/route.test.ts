/**
 * /api/writing-room/choose-tone route tests.
 *
 * Covers ownership + state-machine guards. choose-tone is the FIRST of
 * two mandatory clicks (the second being /approve). Status stays
 * pending_approval; only metadata + body mutate.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const getUserMock = vi.fn();

let queueFetchResult: () => Promise<{ data: unknown; error: unknown }>;
let documentFetchResult: () => Promise<{ data: unknown; error: unknown }>;
let updateError: unknown = null;

vi.mock("@/lib/supabase/server", () => ({
  getUser: () => getUserMock(),
  createClient: async () => ({
    from: (table: string) => {
      if (table === "outreach_queue") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => queueFetchResult(),
              }),
            }),
          }),
          update: (_patch: unknown) => ({
            eq: () => ({
              eq: async () => ({ error: updateError }),
            }),
          }),
        };
      }
      if (table === "documents") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => documentFetchResult(),
              }),
            }),
          }),
        };
      }
      return {};
    },
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST } from "../route";

async function postChoose(body: unknown): Promise<Response> {
  const req = new Request("http://localhost/api/writing-room/choose-tone", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("POST /api/writing-room/choose-tone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateError = null;
    getUserMock.mockResolvedValue({ id: "u-1" });
    queueFetchResult = async () => ({ data: null, error: null });
    documentFetchResult = async () => ({ data: null, error: null });
  });

  it("returns 401 when unauthenticated", async () => {
    getUserMock.mockResolvedValue(null);
    const res = await postChoose({
      outreachQueueId: "q-1",
      coverLetterId: "doc-1",
      tone: "formal",
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is invalid", async () => {
    const res = await postChoose({ outreachQueueId: "q-1" });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_body");
  });

  it("returns 400 when tone is unknown", async () => {
    const res = await postChoose({
      outreachQueueId: "q-1",
      coverLetterId: "doc-1",
      tone: "friendly", // not in the enum
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_tone");
  });

  it("returns 404 when queue row doesn't belong to user", async () => {
    queueFetchResult = async () => ({ data: null, error: null });
    const res = await postChoose({
      outreachQueueId: "q-1",
      coverLetterId: "doc-1",
      tone: "formal",
    });
    expect(res.status).toBe(404);
  });

  it("refuses when the queue row isn't a cover_letter_send type", async () => {
    queueFetchResult = async () => ({
      data: { id: "q-1", status: "pending_approval", metadata: {}, type: "cold_email" },
      error: null,
    });
    const res = await postChoose({
      outreachQueueId: "q-1",
      coverLetterId: "doc-1",
      tone: "formal",
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("wrong_type");
  });

  it("refuses when the queue row is no longer pending_approval", async () => {
    queueFetchResult = async () => ({
      data: {
        id: "q-1",
        status: "approved",
        metadata: {},
        type: "cover_letter_send",
      },
      error: null,
    });
    const res = await postChoose({
      outreachQueueId: "q-1",
      coverLetterId: "doc-1",
      tone: "formal",
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("wrong_status");
  });

  it("refuses when the document isn't under the expected tone group", async () => {
    queueFetchResult = async () => ({
      data: {
        id: "q-1",
        status: "pending_approval",
        metadata: { toneGroupId: "tg-expected" },
        type: "cover_letter_send",
      },
      error: null,
    });
    documentFetchResult = async () => ({
      data: {
        id: "doc-1",
        content: "Letter content.",
        parent_id: "tg-OTHER", // mismatch
        type: "cover_letter",
      },
      error: null,
    });
    const res = await postChoose({
      outreachQueueId: "q-1",
      coverLetterId: "doc-1",
      tone: "formal",
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("tone_group_mismatch");
  });

  it("happy path — updates body + metadata, leaves status pending_approval", async () => {
    queueFetchResult = async () => ({
      data: {
        id: "q-1",
        status: "pending_approval",
        metadata: { toneGroupId: "tg-1" },
        type: "cover_letter_send",
      },
      error: null,
    });
    documentFetchResult = async () => ({
      data: {
        id: "doc-1",
        content: "Dear Team,\n\nFormal letter content.",
        parent_id: "tg-1",
        type: "cover_letter",
      },
      error: null,
    });
    const res = await postChoose({
      outreachQueueId: "q-1",
      coverLetterId: "doc-1",
      tone: "formal",
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("pending_approval"); // still pending after choice
    expect(json.selectedCoverLetterId).toBe("doc-1");
    expect(json.selectedTone).toBe("formal");
  });
});
