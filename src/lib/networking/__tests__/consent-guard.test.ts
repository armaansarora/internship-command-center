import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * R11.1 — consent-guard unit tests.
 *
 * Covers both the pure `isConsentedShape` truth table (carried over
 * from R8) and the version-aware `assertConsented` 403 surface that
 * R11 adds: `consent-required` (missing / revoked) vs
 * `consent-version-stale` (consented at an older copy version).
 *
 * The `CURRENT_CONSENT_VERSION` module is stubbed to `2` so the tests
 * don't drift if the real constant is bumped in a later R-phase.
 */

vi.mock("../consent-version", () => ({
  CURRENT_CONSENT_VERSION: 2,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const { isConsentedShape, assertConsented } = await import("../consent-guard");

type MaybeSingleResult = { data: unknown; error: null };

function makeClient(row: unknown) {
  const maybeSingle = vi
    .fn<() => Promise<MaybeSingleResult>>()
    .mockResolvedValue({ data: row, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from, select, eq, maybeSingle };
}

beforeEach(async () => {
  vi.clearAllMocks();
});

describe("R8 — isConsentedShape (truth table)", () => {
  it("never consented → false", () => {
    expect(
      isConsentedShape({
        networking_consent_at: null,
        networking_revoked_at: null,
        networking_consent_version: null,
      }),
    ).toBe(false);
  });

  it("consented, no revoke → true", () => {
    expect(
      isConsentedShape({
        networking_consent_at: "2026-04-01T00:00:00Z",
        networking_revoked_at: null,
        networking_consent_version: 2,
      }),
    ).toBe(true);
  });

  it("revoked after consent → false", () => {
    expect(
      isConsentedShape({
        networking_consent_at: "2026-04-01T00:00:00Z",
        networking_revoked_at: "2026-04-05T00:00:00Z",
        networking_consent_version: 2,
      }),
    ).toBe(false);
  });

  it("consented again after revoke → true", () => {
    expect(
      isConsentedShape({
        networking_consent_at: "2026-04-10T00:00:00Z",
        networking_revoked_at: "2026-04-05T00:00:00Z",
        networking_consent_version: 2,
      }),
    ).toBe(true);
  });
});

describe("R11.1 — assertConsented version gate", () => {
  it("returns 403 consent-required when profile row is missing", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeClient(null),
    );

    const res = await assertConsented("user-1");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = (await res!.json()) as { ok: boolean; reason: string };
    expect(body.reason).toBe("consent-required");
  });

  it("returns 403 consent-required when user has never consented", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeClient({
        networking_consent_at: null,
        networking_revoked_at: null,
        networking_consent_version: null,
      }),
    );

    const res = await assertConsented("user-1");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = (await res!.json()) as { ok: boolean; reason: string };
    expect(body.reason).toBe("consent-required");
  });

  it("returns 403 consent-required when user revoked after consenting", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeClient({
        networking_consent_at: "2026-04-01T00:00:00Z",
        networking_revoked_at: "2026-04-05T00:00:00Z",
        networking_consent_version: 2,
      }),
    );

    const res = await assertConsented("user-1");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = (await res!.json()) as { ok: boolean; reason: string };
    expect(body.reason).toBe("consent-required");
  });

  it("returns 403 consent-version-stale when version < CURRENT", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeClient({
        networking_consent_at: "2026-04-01T00:00:00Z",
        networking_revoked_at: null,
        networking_consent_version: 1,
      }),
    );

    const res = await assertConsented("user-1");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = (await res!.json()) as { ok: boolean; reason: string };
    expect(body.reason).toBe("consent-version-stale");
  });

  it("returns 403 consent-version-stale when version column is null (legacy row)", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeClient({
        networking_consent_at: "2026-04-01T00:00:00Z",
        networking_revoked_at: null,
        networking_consent_version: null,
      }),
    );

    const res = await assertConsented("user-1");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = (await res!.json()) as { ok: boolean; reason: string };
    expect(body.reason).toBe("consent-version-stale");
  });

  it("returns null (pass) when version matches CURRENT", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeClient({
        networking_consent_at: "2026-04-01T00:00:00Z",
        networking_revoked_at: null,
        networking_consent_version: 2,
      }),
    );

    const res = await assertConsented("user-1");
    expect(res).toBeNull();
  });

  it("returns null (pass) when version is above CURRENT (forward-compat)", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeClient({
        networking_consent_at: "2026-04-01T00:00:00Z",
        networking_revoked_at: null,
        networking_consent_version: 3,
      }),
    );

    const res = await assertConsented("user-1");
    expect(res).toBeNull();
  });
});
