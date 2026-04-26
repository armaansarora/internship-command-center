/**
 * rebuildMatchIndexForUser contract tests.
 *
 * Table-driven: a minimal Supabase-admin fixture stands in for
 * @/lib/supabase/admin so we can drive the helper's exact
 * consent-filter + targets → counterparty-contacts → TOP_N insert flow
 * without hitting Postgres.
 *
 * Cases:
 *   1. Not consented (consent_at null) → DELETE user's rows, written=0.
 *   2. Revoked consent (revoked_at > consent_at) → same.
 *   3. Consent version stale (stored < CURRENT) → same.
 *   4. Consented but zero targets → DELETE + written=0.
 *   5. Happy path → DELETE + INSERT 1 row, written=1.
 *   6. Counterparty owner not consented → filtered out; no candidate.
 *   7. Counterparty owner at stale version → filtered out.
 *   8. TOP_N=25 cap — 30 eligible counterparties → 25 inserted.
 *   9. Idempotent — running twice with the same state yields the same output.
 *  10. invalidates_at = now + 24h on every inserted row.
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";

// ---------------------------------------------------------------------------
// Mock the @/lib/supabase/admin module with a hoisted fixture. Each test
// resets the fixture and re-imports the subject.
// ---------------------------------------------------------------------------
interface Profile {
  id: string;
  networking_consent_at: string | null;
  networking_revoked_at: string | null;
  networking_consent_version: number | null;
}

interface TargetRow {
  user_id: string;
  target_company_name: string;
  created_at: string;
}

interface ContactRow {
  id: string;
  company_name: string | null;
  last_contact_at: string | null;
  user_id: string;
}

interface Fixture {
  profiles: Profile[];
  targets: TargetRow[];
  contacts: ContactRow[];
  // Spies on the write surface of match_candidate_index:
  deleteCalls: Array<{ userId: string }>;
  insertCalls: Array<Record<string, unknown>[]>;
}

const fixture: Fixture = {
  profiles: [],
  targets: [],
  contacts: [],
  deleteCalls: [],
  insertCalls: [],
};

function resetFixture(): void {
  fixture.profiles = [];
  fixture.targets = [];
  fixture.contacts = [];
  fixture.deleteCalls = [];
  fixture.insertCalls = [];
}

function buildFrom(table: string): unknown {
  if (table === "user_profiles") {
    return {
      select: () => ({
        eq: (_col: string, userId: string) => ({
          maybeSingle: async () => {
            const row = fixture.profiles.find((p) => p.id === userId) ?? null;
            return { data: row, error: null };
          },
        }),
        in: async (_col: string, ids: string[]) => {
          return {
            data: fixture.profiles.filter((p) => ids.includes(p.id)),
            error: null,
          };
        },
      }),
    };
  }

  if (table === "networking_match_index") {
    return {
      select: () => ({
        eq: async (_col: string, userId: string) => {
          return {
            data: fixture.targets.filter((t) => t.user_id === userId),
            error: null,
          };
        },
      }),
    };
  }

  if (table === "contacts") {
    return {
      select: () => ({
        in: (_col1: string, companyNames: string[]) => ({
          neq: (_col2: string, selfUserId: string) => ({
            limit: async (_n: number) => {
              const lowered = companyNames.map((s) => s.toLowerCase());
              const filtered = fixture.contacts.filter(
                (c) =>
                  c.user_id !== selfUserId &&
                  c.company_name != null &&
                  lowered.includes(c.company_name.toLowerCase()),
              );
              return { data: filtered, error: null };
            },
          }),
        }),
      }),
    };
  }

  if (table === "match_candidate_index") {
    return {
      delete: () => ({
        eq: async (_col: string, userId: string) => {
          fixture.deleteCalls.push({ userId });
          return { data: null, error: null };
        },
      }),
      insert: async (rows: Record<string, unknown>[]) => {
        fixture.insertCalls.push(rows);
        return { data: null, error: null };
      },
    };
  }

  throw new Error(`unexpected table in rebuild-match-index fixture: ${table}`);
}

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => buildFrom(table),
  }),
}));

vi.mock("@/lib/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Must align with `src/lib/networking/consent-version.ts`. If that constant
// changes, update here — the test is deliberately explicit about the
// version it's pinning. (Cross-check: CURRENT_CONSENT_VERSION = 2 at R11.1.)
const CURRENT = 2;
const STALE = 1;

const NOW = new Date("2026-04-24T12:00:00Z");
const NOW_ISO = NOW.toISOString();
const TTL_ISO = new Date(NOW.getTime() + 24 * 60 * 60 * 1000).toISOString();

describe("rebuildMatchIndexForUser", () => {
  const originalSecret = process.env.MATCH_ANON_SECRET;

  beforeAll(() => {
    process.env.MATCH_ANON_SECRET =
      "test-secret-32-bytes-minimum-length-ok-padding";
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.MATCH_ANON_SECRET;
    else process.env.MATCH_ANON_SECRET = originalSecret;
  });

  beforeEach(() => {
    resetFixture();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deletes rows and returns written=0 when user has never consented", async () => {
    fixture.profiles.push({
      id: "u-A",
      networking_consent_at: null,
      networking_revoked_at: null,
      networking_consent_version: null,
    });

    const { rebuildMatchIndexForUser } = await import("../rebuild-match-index");
    const res = await rebuildMatchIndexForUser("u-A");
    expect(res).toEqual({ written: 0 });
    expect(fixture.deleteCalls).toEqual([{ userId: "u-A" }]);
    expect(fixture.insertCalls).toHaveLength(0);
  });

  it("deletes rows and returns written=0 when consent was revoked after consent", async () => {
    fixture.profiles.push({
      id: "u-A",
      networking_consent_at: "2026-04-20T00:00:00Z",
      networking_revoked_at: "2026-04-23T00:00:00Z",
      networking_consent_version: CURRENT,
    });

    const { rebuildMatchIndexForUser } = await import("../rebuild-match-index");
    const res = await rebuildMatchIndexForUser("u-A");
    expect(res).toEqual({ written: 0 });
    expect(fixture.deleteCalls).toEqual([{ userId: "u-A" }]);
    expect(fixture.insertCalls).toHaveLength(0);
  });

  it("deletes rows and returns written=0 when consent version is stale", async () => {
    fixture.profiles.push({
      id: "u-A",
      networking_consent_at: "2026-04-20T00:00:00Z",
      networking_revoked_at: null,
      networking_consent_version: STALE,
    });

    const { rebuildMatchIndexForUser } = await import("../rebuild-match-index");
    const res = await rebuildMatchIndexForUser("u-A");
    expect(res).toEqual({ written: 0 });
    expect(fixture.deleteCalls).toEqual([{ userId: "u-A" }]);
    expect(fixture.insertCalls).toHaveLength(0);
  });

  it("deletes rows and returns written=0 when user has zero targets", async () => {
    fixture.profiles.push({
      id: "u-A",
      networking_consent_at: "2026-04-20T00:00:00Z",
      networking_revoked_at: null,
      networking_consent_version: CURRENT,
    });
    // No targets for u-A.

    const { rebuildMatchIndexForUser } = await import("../rebuild-match-index");
    const res = await rebuildMatchIndexForUser("u-A");
    expect(res).toEqual({ written: 0 });
    expect(fixture.deleteCalls).toEqual([{ userId: "u-A" }]);
    expect(fixture.insertCalls).toHaveLength(0);
  });

  it("happy path — one target + one consented counterparty → 1 row written", async () => {
    fixture.profiles.push(
      {
        id: "u-A",
        networking_consent_at: "2026-04-20T00:00:00Z",
        networking_revoked_at: null,
        networking_consent_version: CURRENT,
      },
      {
        id: "u-B",
        networking_consent_at: "2026-04-20T00:00:00Z",
        networking_revoked_at: null,
        networking_consent_version: CURRENT,
      },
    );
    fixture.targets.push({
      user_id: "u-A",
      target_company_name: "Acme",
      created_at: NOW_ISO,
    });
    fixture.contacts.push({
      id: "contact-b1",
      company_name: "Acme",
      last_contact_at: NOW_ISO,
      user_id: "u-B",
    });

    const { rebuildMatchIndexForUser } = await import("../rebuild-match-index");
    const res = await rebuildMatchIndexForUser("u-A");
    expect(res).toEqual({ written: 1 });
    expect(fixture.deleteCalls).toEqual([{ userId: "u-A" }]);
    expect(fixture.insertCalls).toHaveLength(1);
    const rows = fixture.insertCalls[0]!;
    expect(rows).toHaveLength(1);
    const row = rows[0] as {
      user_id: string;
      company_context: string;
      counterparty_anon_key: string;
      invalidates_at: string;
    };
    expect(row.user_id).toBe("u-A");
    expect(row.company_context).toBe("Acme");
    expect(row.counterparty_anon_key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("excludes counterparty contacts whose owner has not consented", async () => {
    fixture.profiles.push(
      {
        id: "u-A",
        networking_consent_at: "2026-04-20T00:00:00Z",
        networking_revoked_at: null,
        networking_consent_version: CURRENT,
      },
      // u-B never consented — their contact must not surface.
      {
        id: "u-B",
        networking_consent_at: null,
        networking_revoked_at: null,
        networking_consent_version: null,
      },
    );
    fixture.targets.push({
      user_id: "u-A",
      target_company_name: "Acme",
      created_at: NOW_ISO,
    });
    fixture.contacts.push({
      id: "contact-b1",
      company_name: "Acme",
      last_contact_at: NOW_ISO,
      user_id: "u-B",
    });

    const { rebuildMatchIndexForUser } = await import("../rebuild-match-index");
    const res = await rebuildMatchIndexForUser("u-A");
    expect(res).toEqual({ written: 0 });
    expect(fixture.deleteCalls).toEqual([{ userId: "u-A" }]);
    expect(fixture.insertCalls).toHaveLength(0);
  });

  it("excludes counterparty contacts whose owner is on a stale consent version", async () => {
    fixture.profiles.push(
      {
        id: "u-A",
        networking_consent_at: "2026-04-20T00:00:00Z",
        networking_revoked_at: null,
        networking_consent_version: CURRENT,
      },
      {
        id: "u-B",
        networking_consent_at: "2026-04-20T00:00:00Z",
        networking_revoked_at: null,
        networking_consent_version: STALE,
      },
    );
    fixture.targets.push({
      user_id: "u-A",
      target_company_name: "Acme",
      created_at: NOW_ISO,
    });
    fixture.contacts.push({
      id: "contact-b1",
      company_name: "Acme",
      last_contact_at: NOW_ISO,
      user_id: "u-B",
    });

    const { rebuildMatchIndexForUser } = await import("../rebuild-match-index");
    const res = await rebuildMatchIndexForUser("u-A");
    expect(res).toEqual({ written: 0 });
    expect(fixture.deleteCalls).toEqual([{ userId: "u-A" }]);
    expect(fixture.insertCalls).toHaveLength(0);
  });

  it("enforces TOP_N = 25 when more qualifying contacts are present", async () => {
    fixture.profiles.push({
      id: "u-A",
      networking_consent_at: "2026-04-20T00:00:00Z",
      networking_revoked_at: null,
      networking_consent_version: CURRENT,
    });
    // Thirty distinct consented owners each with one contact at Acme.
    for (let i = 0; i < 30; i++) {
      const userId = `u-${i}`;
      fixture.profiles.push({
        id: userId,
        networking_consent_at: "2026-04-20T00:00:00Z",
        networking_revoked_at: null,
        networking_consent_version: CURRENT,
      });
      fixture.contacts.push({
        id: `contact-${i}`,
        company_name: "Acme",
        last_contact_at: NOW_ISO,
        user_id: userId,
      });
    }
    fixture.targets.push({
      user_id: "u-A",
      target_company_name: "Acme",
      created_at: NOW_ISO,
    });

    const { rebuildMatchIndexForUser } = await import("../rebuild-match-index");
    const res = await rebuildMatchIndexForUser("u-A");
    expect(res).toEqual({ written: 25 });
    expect(fixture.insertCalls).toHaveLength(1);
    expect(fixture.insertCalls[0]).toHaveLength(25);
  });

  it("is idempotent — two consecutive runs with the same state produce equal output", async () => {
    fixture.profiles.push(
      {
        id: "u-A",
        networking_consent_at: "2026-04-20T00:00:00Z",
        networking_revoked_at: null,
        networking_consent_version: CURRENT,
      },
      {
        id: "u-B",
        networking_consent_at: "2026-04-20T00:00:00Z",
        networking_revoked_at: null,
        networking_consent_version: CURRENT,
      },
    );
    fixture.targets.push({
      user_id: "u-A",
      target_company_name: "Acme",
      created_at: NOW_ISO,
    });
    fixture.contacts.push({
      id: "contact-b1",
      company_name: "Acme",
      last_contact_at: NOW_ISO,
      user_id: "u-B",
    });

    const { rebuildMatchIndexForUser } = await import("../rebuild-match-index");
    const a = await rebuildMatchIndexForUser("u-A");
    const firstInsertRows = fixture.insertCalls[0];
    const b = await rebuildMatchIndexForUser("u-A");
    const secondInsertRows = fixture.insertCalls[1];
    expect(a).toEqual(b);
    // Each run does a delete + insert of the same shape.
    expect(fixture.deleteCalls).toHaveLength(2);
    expect(firstInsertRows).toEqual(secondInsertRows);
  });

  it("stamps invalidates_at = now + 24h on every inserted row", async () => {
    fixture.profiles.push(
      {
        id: "u-A",
        networking_consent_at: "2026-04-20T00:00:00Z",
        networking_revoked_at: null,
        networking_consent_version: CURRENT,
      },
      {
        id: "u-B",
        networking_consent_at: "2026-04-20T00:00:00Z",
        networking_revoked_at: null,
        networking_consent_version: CURRENT,
      },
    );
    fixture.targets.push({
      user_id: "u-A",
      target_company_name: "Acme",
      created_at: NOW_ISO,
    });
    fixture.contacts.push({
      id: "contact-b1",
      company_name: "Acme",
      last_contact_at: NOW_ISO,
      user_id: "u-B",
    });

    const { rebuildMatchIndexForUser } = await import("../rebuild-match-index");
    await rebuildMatchIndexForUser("u-A");
    const rows = fixture.insertCalls[0] as Array<{ invalidates_at: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.invalidates_at).toBe(TTL_ISO);
  });
});
