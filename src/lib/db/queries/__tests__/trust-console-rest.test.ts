/**
 * Unit tests for the Trust Console REST reader.
 *
 * Contract:
 *   - `getUserAuditTimeline` queries `audit_logs` filtered by `user_id`,
 *     ordered by `created_at DESC`, with a default limit of 100. Optional
 *     `sinceIso` adds a `>=` lower bound.
 *   - `getUserConsentState` reads three networking-consent columns from
 *     `user_profiles` and derives `never_opted_in` / `opted_in` / `revoked`.
 *
 * The query helpers accept a Supabase client as a parameter, so the tests
 * pass a minimal in-memory client object (no module-level mocks needed).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const { warnSpy } = vi.hoisted(() => ({ warnSpy: vi.fn() }));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: warnSpy,
    error: vi.fn(),
  },
}));

const {
  getUserAuditTimeline,
  getUserConsentState,
  getRevokePreview,
  REVOKE_PREVIEW_EMPTY,
} = await import("../trust-console-rest");

// ---------------------------------------------------------------------------
// Helpers — build a chained PostgREST mock that records every step the
// reader takes. This intentionally mirrors the supabase-js builder shape so
// the assertions read like the production call site.
// ---------------------------------------------------------------------------

interface AuditQueryRecord {
  table: string;
  selectArg: string;
  eqArgs: Array<[string, unknown]>;
  orderArg: { column: string; ascending: boolean } | null;
  limitArg: number | null;
  gteArgs: Array<[string, unknown]>;
}

function buildAuditClient(rows: unknown[], error: { message: string } | null = null) {
  const record: AuditQueryRecord = {
    table: "",
    selectArg: "",
    eqArgs: [],
    orderArg: null,
    limitArg: null,
    gteArgs: [],
  };

  const thenable = {
    then(
      onFulfilled: (v: { data: unknown[] | null; error: { message: string } | null }) => unknown,
    ) {
      return Promise.resolve({ data: error ? null : rows, error }).then(onFulfilled);
    },
  };

  const builder = {
    eq(col: string, val: unknown) {
      record.eqArgs.push([col, val]);
      return builder;
    },
    order(col: string, opts: { ascending: boolean }) {
      record.orderArg = { column: col, ascending: opts.ascending };
      return builder;
    },
    limit(n: number) {
      record.limitArg = n;
      return builder;
    },
    gte(col: string, val: unknown) {
      record.gteArgs.push([col, val]);
      return builder;
    },
    then: thenable.then,
  };

  const client = {
    from(table: string) {
      record.table = table;
      return {
        select(arg: string) {
          record.selectArg = arg;
          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;

  return { client, record };
}

function buildConsentClient(
  data: Record<string, unknown> | null,
  error: { message: string } | null = null,
) {
  const eqSpy = vi.fn();
  const selectSpy = vi.fn();
  const maybeSingleSpy = vi.fn().mockResolvedValue({ data, error });
  eqSpy.mockReturnValue({ maybeSingle: maybeSingleSpy });
  selectSpy.mockReturnValue({ eq: eqSpy });

  const client = {
    from: vi.fn().mockReturnValue({ select: selectSpy }),
  } as unknown as SupabaseClient;

  return { client, eqSpy, selectSpy };
}

// ---------------------------------------------------------------------------
// getUserAuditTimeline
// ---------------------------------------------------------------------------

describe("getUserAuditTimeline", () => {
  beforeEach(() => {
    warnSpy.mockReset();
  });

  it("reads audit_logs scoped to the user, ordered desc, default limit 100", async () => {
    const rows = [
      {
        id: "a",
        user_id: "u-1",
        event_type: "networking_revoked",
        resource_type: null,
        resource_id: null,
        metadata: {},
        ip_address: null,
        user_agent: null,
        created_at: "2026-05-10T00:00:00Z",
      },
    ];
    const { client, record } = buildAuditClient(rows);
    const out = await getUserAuditTimeline(client, "u-1");
    expect(out).toEqual(rows);
    expect(record.table).toBe("audit_logs");
    expect(record.selectArg).toContain("event_type");
    expect(record.eqArgs).toEqual([["user_id", "u-1"]]);
    expect(record.orderArg).toEqual({ column: "created_at", ascending: false });
    expect(record.limitArg).toBe(100);
    expect(record.gteArgs).toEqual([]);
  });

  it("honors a custom limit", async () => {
    const { client, record } = buildAuditClient([]);
    await getUserAuditTimeline(client, "u-1", { limit: 25 });
    expect(record.limitArg).toBe(25);
  });

  it("applies sinceIso as a >= filter on created_at when provided", async () => {
    const { client, record } = buildAuditClient([]);
    await getUserAuditTimeline(client, "u-1", { sinceIso: "2026-05-01T00:00:00Z" });
    expect(record.gteArgs).toEqual([["created_at", "2026-05-01T00:00:00Z"]]);
  });

  it("returns an empty array and logs a warning on error", async () => {
    const { client } = buildAuditClient([], { message: "boom" });
    const out = await getUserAuditTimeline(client, "u-1");
    expect(out).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      "trust_console.audit_timeline_read_failed",
      expect.objectContaining({ userId: "u-1", error: "boom" }),
    );
  });
});

// ---------------------------------------------------------------------------
// getUserConsentState — state-machine bindings
// ---------------------------------------------------------------------------

describe("getUserConsentState", () => {
  beforeEach(() => {
    warnSpy.mockReset();
  });

  it("returns never_opted_in when consent_at is null", async () => {
    const { client } = buildConsentClient({
      networking_consent_at: null,
      networking_revoked_at: null,
      networking_consent_version: null,
    });
    const state = await getUserConsentState(client, "u-1");
    expect(state).toEqual({
      networking: {
        state: "never_opted_in",
        sinceIso: null,
        consentVersion: null,
      },
    });
  });

  it("returns opted_in when consent_at is set and revoked_at is null", async () => {
    const { client } = buildConsentClient({
      networking_consent_at: "2026-05-01T00:00:00Z",
      networking_revoked_at: null,
      networking_consent_version: 2,
    });
    const state = await getUserConsentState(client, "u-1");
    expect(state).toEqual({
      networking: {
        state: "opted_in",
        sinceIso: "2026-05-01T00:00:00Z",
        consentVersion: 2,
      },
    });
  });

  it("returns revoked when revoked_at is later than consent_at", async () => {
    const { client } = buildConsentClient({
      networking_consent_at: "2026-05-01T00:00:00Z",
      networking_revoked_at: "2026-05-05T00:00:00Z",
      networking_consent_version: 2,
    });
    const state = await getUserConsentState(client, "u-1");
    expect(state).toEqual({
      networking: {
        state: "revoked",
        sinceIso: "2026-05-05T00:00:00Z",
        consentVersion: 2,
      },
    });
  });

  it("returns opted_in when consent_at is later than revoked_at (re-consent)", async () => {
    const { client } = buildConsentClient({
      networking_consent_at: "2026-05-10T00:00:00Z",
      networking_revoked_at: "2026-05-05T00:00:00Z",
      networking_consent_version: 2,
    });
    const state = await getUserConsentState(client, "u-1");
    expect(state.networking.state).toBe("opted_in");
    expect(state.networking.sinceIso).toBe("2026-05-10T00:00:00Z");
  });

  it("degrades to never_opted_in on read error (no throw)", async () => {
    const { client } = buildConsentClient(null, { message: "boom" });
    const state = await getUserConsentState(client, "u-1");
    expect(state).toEqual({
      networking: {
        state: "never_opted_in",
        sinceIso: null,
        consentVersion: null,
      },
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "trust_console.consent_state_read_failed",
      expect.objectContaining({ userId: "u-1", error: "boom" }),
    );
  });

  it("returns never_opted_in when no row exists", async () => {
    const { client } = buildConsentClient(null);
    const state = await getUserConsentState(client, "u-1");
    expect(state.networking.state).toBe("never_opted_in");
  });
});

// ---------------------------------------------------------------------------
// getRevokePreview — count fan-out
// ---------------------------------------------------------------------------

interface PreviewBuilderRecord {
  matchIndexCount: number | null;
  contactsCount: number | null;
  matchIndexShouldError?: { message: string };
  contactsShouldError?: { message: string };
}

function buildPreviewClient(setup: PreviewBuilderRecord): SupabaseClient {
  const calls: Array<{ table: string }> = [];
  return {
    from(table: string) {
      calls.push({ table });
      return {
        select(_arg: string, _opts?: { count?: string; head?: boolean }) {
          return {
            eq(_col: string, _val: unknown) {
              if (table === "networking_match_index") {
                return Promise.resolve({
                  count: setup.matchIndexCount,
                  error: setup.matchIndexShouldError ?? null,
                });
              }
              if (table === "contacts") {
                return Promise.resolve({
                  count: setup.contactsCount,
                  error: setup.contactsShouldError ?? null,
                });
              }
              return Promise.resolve({ count: 0, error: null });
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe("getRevokePreview", () => {
  beforeEach(() => {
    warnSpy.mockReset();
  });

  it("returns the empty preview shape when nothing would be erased", async () => {
    const client = buildPreviewClient({
      matchIndexCount: 0,
      contactsCount: 0,
    });
    const out = await getRevokePreview(client, "u-1");
    expect(out.itemsToErase).toBe(0);
    expect(out.tablesTouched).toEqual(["user_profiles"]);
  });

  it("sums match-index rows + contact count into itemsToErase", async () => {
    const client = buildPreviewClient({
      matchIndexCount: 3,
      contactsCount: 7,
    });
    const out = await getRevokePreview(client, "u-1");
    expect(out.itemsToErase).toBe(10);
    expect(out.tablesTouched).toEqual([
      "user_profiles",
      "networking_match_index",
      "match_candidate_index",
    ]);
  });

  it("only includes the match-index entry when contacts is empty", async () => {
    const client = buildPreviewClient({
      matchIndexCount: 4,
      contactsCount: 0,
    });
    const out = await getRevokePreview(client, "u-1");
    expect(out.itemsToErase).toBe(4);
    expect(out.tablesTouched).toEqual([
      "user_profiles",
      "networking_match_index",
    ]);
  });

  it("falls back to the empty preview on read error", async () => {
    const client = buildPreviewClient({
      matchIndexCount: null,
      contactsCount: null,
      matchIndexShouldError: { message: "rls denied" },
    });
    const out = await getRevokePreview(client, "u-1");
    expect(out.itemsToErase).toBe(0);
    expect(out.tablesTouched).toEqual(["user_profiles"]);
  });

  it("exposes REVOKE_PREVIEW_EMPTY as a frozen sentinel", () => {
    expect(Object.isFrozen(REVOKE_PREVIEW_EMPTY)).toBe(true);
    expect(REVOKE_PREVIEW_EMPTY.itemsToErase).toBe(0);
    expect(REVOKE_PREVIEW_EMPTY.tablesTouched).toEqual(["user_profiles"]);
  });
});
