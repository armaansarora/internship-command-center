/**
 * R6.2 — PUT /api/briefing/voice-preference contract tests.
 *
 * Locks:
 *   - empty body = no-op read-through
 *   - 410 when the one-way latch rejects an enable attempt
 *   - permanentlyDisable:true calls the permanent helper
 *   - 400 on invalid body shape
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1", email: "u@t.c" })),
}));

const mockPrefs = vi.hoisted(() => ({
  readDrillPrefs: vi.fn(),
  setVoiceEnabled: vi.fn(),
  permanentlyDisableVoice: vi.fn(),
}));
vi.mock("@/lib/db/queries/drill-prefs-rest", () => mockPrefs);

async function callPut(body: unknown) {
  const { PUT } = await import("./route");
  const req = new NextRequest("http://localhost/api/briefing/voice-preference", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PUT(req);
}

describe("PUT /api/briefing/voice-preference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrefs.readDrillPrefs.mockResolvedValue({
      voiceRecordingEnabled: false,
      voiceRecordingPermanentlyDisabled: false,
      drillPreferences: { interruptFirmness: "firm", timerSeconds: 90 },
    });
    mockPrefs.setVoiceEnabled.mockResolvedValue({ ok: true });
    mockPrefs.permanentlyDisableVoice.mockResolvedValue(undefined);
  });

  it("returns prefs on empty body (no-op)", async () => {
    const res = await callPut({});
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.voiceRecordingEnabled).toBe(false);
  });

  it("returns 410 when setVoiceEnabled says permanently_disabled", async () => {
    mockPrefs.setVoiceEnabled.mockResolvedValueOnce({
      ok: false,
      reason: "permanently_disabled",
    });
    const res = await callPut({ enabled: true });
    expect(res.status).toBe(410);
  });

  it("permanentlyDisable invokes the permanent helper", async () => {
    const res = await callPut({ permanentlyDisable: true });
    expect(res.status).toBe(200);
    expect(mockPrefs.permanentlyDisableVoice).toHaveBeenCalledOnce();
  });

  it("400 on invalid body shape", async () => {
    const res = await callPut({ enabled: "yes" });
    expect(res.status).toBe(400);
  });
});
