/**
 * POST /api/briefing/transcribe gate tests.
 *
 * Mirrors audio-upload plus the userId-path ownership check. Whisper is
 * stubbed via a mock on @/lib/speech/transcribe so the test never hits
 * OpenAI.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));

const mockPrefs = vi.hoisted(() => ({ readDrillPrefs: vi.fn() }));
vi.mock("@/lib/db/queries/drill-prefs-rest", () => mockPrefs);

const download = vi.hoisted(() =>
  vi.fn(async () => ({
    data: new Blob(["audio-bytes"], { type: "audio/webm" }),
    error: null,
  })),
);
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({ storage: { from: () => ({ download }) } }),
}));

vi.mock("@/lib/speech/transcribe", () => ({
  transcribeAudio: vi.fn(async () => "transcribed text"),
}));

async function callPost(opts: {
  enabled: boolean;
  permDisabled?: boolean;
  path: string;
}) {
  mockPrefs.readDrillPrefs.mockResolvedValueOnce({
    voiceRecordingEnabled: opts.enabled,
    voiceRecordingPermanentlyDisabled: Boolean(opts.permDisabled),
    drillPreferences: { interruptFirmness: "firm", timerSeconds: 90 },
  });
  const { POST } = await import("./route");
  const req = new NextRequest("http://localhost/api/briefing/transcribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path: opts.path }),
  });
  return POST(req);
}

describe("POST /api/briefing/transcribe — opt-in gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("403 when voice disabled", async () => {
    const res = await callPost({ enabled: false, path: "user-1/d/q1.webm" });
    expect(res.status).toBe(403);
  });

  it("410 when permanently disabled", async () => {
    const res = await callPost({
      enabled: false,
      permDisabled: true,
      path: "user-1/d/q1.webm",
    });
    expect(res.status).toBe(410);
  });

  it("403 when path does not start with userId/", async () => {
    const res = await callPost({ enabled: true, path: "user-2/d/q1.webm" });
    expect(res.status).toBe(403);
  });

  it("200 on happy path", async () => {
    const res = await callPost({ enabled: true, path: "user-1/d/q1.webm" });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.text).toBe("transcribed text");
  });
});
