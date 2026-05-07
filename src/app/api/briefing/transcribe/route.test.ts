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
interface StorageMutationResultLike {
  data: null;
  error: { message: string } | null;
}
const remove = vi.hoisted(() =>
  vi.fn<(paths: string[]) => Promise<StorageMutationResultLike>>(async () => ({
    data: null,
    error: null,
  })),
);
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({ storage: { from: () => ({ download, remove }) } }),
}));

vi.mock("@/lib/logger", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/speech/transcribe", () => ({
  transcribeAudio: vi.fn(async () => "transcribed text"),
}));

interface QuotaResultLike {
  allowed: boolean;
  used: number;
  cap: number;
  reason?: "exceeded" | "rpc_error";
}
const consumeAiQuotaMock = vi.hoisted(() =>
  vi.fn<(userId: string, tier: string) => Promise<QuotaResultLike>>(
    async () => ({ allowed: true, used: 1, cap: 25 }),
  ),
);
vi.mock("@/lib/ai/quota", () => ({
  consumeAiQuota: consumeAiQuotaMock,
}));
vi.mock("@/lib/stripe/entitlements", () => ({
  getUserTier: vi.fn(async () => "free"),
}));

const OWNED_AUDIO_PATH =
  "user-1/00000000-0000-4000-8000-000000000000/q1.webm";
const OTHER_USER_AUDIO_PATH =
  "user-2/00000000-0000-4000-8000-000000000000/q1.webm";

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
    consumeAiQuotaMock.mockResolvedValue({ allowed: true, used: 1, cap: 25 });
    remove.mockResolvedValue({ data: null, error: null });
  });

  it("403 when voice disabled", async () => {
    const res = await callPost({ enabled: false, path: OWNED_AUDIO_PATH });
    expect(res.status).toBe(403);
  });

  it("410 when permanently disabled", async () => {
    const res = await callPost({
      enabled: false,
      permDisabled: true,
      path: OWNED_AUDIO_PATH,
    });
    expect(res.status).toBe(410);
  });

  it("403 when path does not belong to the user", async () => {
    const res = await callPost({ enabled: true, path: OTHER_USER_AUDIO_PATH });
    expect(res.status).toBe(403);
  });

  it("403 when path is not an issued audio-upload key", async () => {
    const res = await callPost({ enabled: true, path: "user-1/d/q1.webm" });
    expect(res.status).toBe(403);
  });

  it("200 on happy path", async () => {
    const res = await callPost({ enabled: true, path: OWNED_AUDIO_PATH });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.text).toBe("transcribed text");
    expect(remove).toHaveBeenCalledWith([OWNED_AUDIO_PATH]);
  });

  it("500 when cleanup fails after transcription", async () => {
    remove.mockResolvedValueOnce({
      data: null,
      error: { message: "storage cleanup failed" },
    });
    const res = await callPost({ enabled: true, path: OWNED_AUDIO_PATH });
    expect(res.status).toBe(500);
    const j = await res.json();
    expect(j.error).toBe("cleanup failed");
  });

  it("429 when AI quota is exhausted on the otherwise-happy path", async () => {
    consumeAiQuotaMock.mockResolvedValueOnce({
      allowed: false,
      used: 26,
      cap: 25,
      reason: "exceeded",
    });
    const res = await callPost({ enabled: true, path: OWNED_AUDIO_PATH });
    expect(res.status).toBe(429);
  });
});
