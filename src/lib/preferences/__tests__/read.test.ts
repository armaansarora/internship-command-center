import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserPreferenceValue } from "../read";

/**
 * R10.5 — Tests for the generic preferences reader.
 *
 * Contract:
 *   - Happy path: returns the typed value under the requested key.
 *   - Row is missing → null.
 *   - Supabase returns an error → null (no throw).
 *   - `preferences` is null / undefined / non-object / array → null.
 *   - Requested key is absent → null.
 *   - Ignores unrelated keys in the jsonb blob.
 *   - Never throws even if the client itself misbehaves (defensive).
 */

function makeClient(params: {
  data?: { preferences: unknown } | null;
  error?: { message: string } | null;
  throws?: boolean;
}): SupabaseClient {
  const maybeSingle = vi.fn(() => {
    if (params.throws) throw new Error("boom");
    return Promise.resolve({
      data: params.data ?? null,
      error: params.error ?? null,
    });
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { from } as unknown as SupabaseClient;
}

describe("getUserPreferenceValue", () => {
  it("returns the typed value under the requested key", async () => {
    const client = makeClient({
      data: { preferences: { parlorDoorSeen: { seen: true } } },
    });
    const out = await getUserPreferenceValue<{ seen: boolean }>(
      client,
      "user-1",
      "parlorDoorSeen",
    );
    expect(out).toEqual({ seen: true });
  });

  it("ignores unrelated keys in the jsonb blob", async () => {
    const client = makeClient({
      data: {
        preferences: {
          drillPreferences: { interruptFirmness: "firm" },
          parlorDoorSeen: { seen: false },
          ceoVoice: { enabled: true },
        },
      },
    });
    const out = await getUserPreferenceValue<{ seen: boolean }>(
      client,
      "user-1",
      "parlorDoorSeen",
    );
    expect(out).toEqual({ seen: false });
  });

  it("returns null when the row is missing", async () => {
    const client = makeClient({ data: null });
    const out = await getUserPreferenceValue(client, "user-1", "parlorDoorSeen");
    expect(out).toBeNull();
  });

  it("returns null when Supabase returns an error (no throw)", async () => {
    const client = makeClient({ error: { message: "boom" }, data: null });
    const out = await getUserPreferenceValue(client, "user-1", "parlorDoorSeen");
    expect(out).toBeNull();
  });

  it("returns null when preferences is null", async () => {
    const client = makeClient({ data: { preferences: null } });
    const out = await getUserPreferenceValue(client, "user-1", "parlorDoorSeen");
    expect(out).toBeNull();
  });

  it("returns null when preferences is a primitive", async () => {
    const client = makeClient({ data: { preferences: "nope" } });
    const out = await getUserPreferenceValue(client, "user-1", "parlorDoorSeen");
    expect(out).toBeNull();
  });

  it("returns null when preferences is an array", async () => {
    const client = makeClient({ data: { preferences: [{ seen: true }] } });
    const out = await getUserPreferenceValue(client, "user-1", "parlorDoorSeen");
    expect(out).toBeNull();
  });

  it("returns null when the requested key is missing from the jsonb", async () => {
    const client = makeClient({
      data: { preferences: { ceoVoice: { enabled: true } } },
    });
    const out = await getUserPreferenceValue(
      client,
      "user-1",
      "parlorDoorSeen",
    );
    expect(out).toBeNull();
  });

  it("returns null when the client throws synchronously", async () => {
    const client = makeClient({ throws: true });
    const out = await getUserPreferenceValue(
      client,
      "user-1",
      "parlorDoorSeen",
    );
    expect(out).toBeNull();
  });
});
