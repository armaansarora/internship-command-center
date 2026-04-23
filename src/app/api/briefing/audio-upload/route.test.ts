/**
 * R6.2 — POST /api/briefing/audio-upload gate + shape tests.
 *
 * Locks the opt-in enforcement contract:
 *   - 403 when voice_recording_enabled=false
 *   - 410 when voice_recording_permanently_disabled=true
 *   - 400 when blob missing
 *   - 400 when drillId/questionId invalid
 *   - 413 over size cap
 *   - 415 on unsupported mime
 *   - 200 on happy path with <userId>/<drillId>/<qId>.webm key
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1" })),
}));

const mockPrefs = vi.hoisted(() => ({ readDrillPrefs: vi.fn() }));
vi.mock("@/lib/db/queries/drill-prefs-rest", () => mockPrefs);

const upload = vi.hoisted(() => vi.fn(async () => ({ error: null })));
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({ storage: { from: () => ({ upload }) } }),
}));

async function callPost(opts: {
  enabled: boolean;
  permDisabled?: boolean;
  blob?: Blob;
  query?: string;
}) {
  mockPrefs.readDrillPrefs.mockResolvedValueOnce({
    voiceRecordingEnabled: opts.enabled,
    voiceRecordingPermanentlyDisabled: Boolean(opts.permDisabled),
    drillPreferences: { interruptFirmness: "firm", timerSeconds: 90 },
  });
  const fd = new FormData();
  if (opts.blob !== undefined) fd.append("audio", opts.blob);
  const q =
    opts.query ?? "?drillId=00000000-0000-0000-0000-000000000000&questionId=q1";
  const { POST } = await import("./route");
  const req = new NextRequest("http://localhost/api/briefing/audio-upload" + q, {
    method: "POST",
    body: fd,
  });
  return POST(req);
}

describe("POST /api/briefing/audio-upload — opt-in gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("403 when voice_recording_enabled is false", async () => {
    const res = await callPost({
      enabled: false,
      blob: new Blob(["x"], { type: "audio/webm" }),
    });
    expect(res.status).toBe(403);
    expect(upload).not.toHaveBeenCalled();
  });

  it("410 when voice_recording_permanently_disabled is true", async () => {
    const res = await callPost({
      enabled: false,
      permDisabled: true,
      blob: new Blob(["x"], { type: "audio/webm" }),
    });
    expect(res.status).toBe(410);
    expect(upload).not.toHaveBeenCalled();
  });

  it("400 when audio blob missing", async () => {
    const res = await callPost({ enabled: true });
    expect(res.status).toBe(400);
  });

  it("400 when query params invalid", async () => {
    const res = await callPost({
      enabled: true,
      blob: new Blob(["x"], { type: "audio/webm" }),
      query: "?drillId=bad",
    });
    expect(res.status).toBe(400);
  });

  it("413 when audio over 10MB", async () => {
    const big = new Blob([new Uint8Array(11 * 1024 * 1024)], {
      type: "audio/webm",
    });
    const res = await callPost({ enabled: true, blob: big });
    expect(res.status).toBe(413);
  });

  it("415 on unsupported mime", async () => {
    const res = await callPost({
      enabled: true,
      blob: new Blob(["x"], { type: "audio/ogg" }),
    });
    expect(res.status).toBe(415);
  });

  it("200 on happy path", async () => {
    const res = await callPost({
      enabled: true,
      blob: new Blob(["x"], { type: "audio/webm" }),
    });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.path).toMatch(/^user-1\/.*\/q1\.webm$/);
    expect(upload).toHaveBeenCalledOnce();
  });
});
