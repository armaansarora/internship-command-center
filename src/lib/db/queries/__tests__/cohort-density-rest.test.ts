import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tests for `getCohortDensity` — the R13 network-density signal helper.
 *
 * The function returns aggregate counts only. The tests enforce four
 * invariants that the wire shape and privacy contract depend on:
 *
 *   1. Caller without `school_name` returns zero-counts with no cohort
 *      query — no leakage even if the cohort table is non-empty.
 *   2. Cohort count excludes the caller (denominator never includes the
 *      asking user) and excludes non-consented + stale-version users.
 *   3. `addedThisWeek` is a strict subset of `schoolCohortSize` and
 *      reflects the 7-day rolling window.
 *   4. Supabase REST errors propagate as thrown errors with a stable
 *      prefix so call-sites can branch on them.
 *
 * Mocks the Supabase client via a per-call dispatcher so the test can
 * pin both the caller's profile row and the cohort response row-by-row.
 */

import {
  getCohortDensity,
  COHORT_WEEK_MS,
  K_ANONYMITY_THRESHOLD,
} from "../cohort-density-rest";

interface CohortRow {
  networking_consent_at: string | null;
  networking_revoked_at: string | null;
  networking_consent_version: number | null;
  created_at: string;
}

interface MockResponse {
  data: unknown;
  error: { message: string } | null;
}

let ownProfileResponse: MockResponse = { data: null, error: null };
let cohortResponse: MockResponse = { data: [], error: null };

function makeClient(): SupabaseClient {
  // Each `.from("user_profiles")` builds a per-call chain. The chain
  // routes via the presence of `.maybeSingle()` (caller's own profile)
  // vs the absence (cohort listing).
  return {
    from(table: string) {
      if (table !== "user_profiles") {
        throw new Error(`unexpected table in cohort-density test: ${table}`);
      }
      return {
        select() {
          return {
            eq(_col: string, _val: unknown) {
              return {
                async maybeSingle() {
                  return ownProfileResponse;
                },
                neq(_neqCol: string, _neqVal: unknown) {
                  return Promise.resolve(cohortResponse);
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

beforeEach(() => {
  ownProfileResponse = { data: null, error: null };
  cohortResponse = { data: [], error: null };
});

describe("getCohortDensity", () => {
  it("returns zero counts and skips the cohort query when caller has no school_name", async () => {
    ownProfileResponse = {
      data: { school_name: null },
      error: null,
    };
    // Deliberately stub the cohort response with data — if the function
    // queries cohort despite a null school, it would leak the count
    // back. The test makes the regression visible by checking the
    // returned counts are still zero.
    cohortResponse = {
      data: [
        {
          networking_consent_at: "2026-01-01T00:00:00Z",
          networking_revoked_at: null,
          networking_consent_version: 2,
          created_at: "2026-04-01T00:00:00Z",
        },
      ],
      error: null,
    };
    const client = makeClient();
    const result = await getCohortDensity(client, "u-1");
    expect(result).toEqual({
      schoolCohortSize: 0,
      addedThisWeek: 0,
      suppressed: false,
    });
  });

  it("throws when caller has no user_profiles row (system invariant)", async () => {
    ownProfileResponse = { data: null, error: null };
    const client = makeClient();
    await expect(getCohortDensity(client, "u-missing")).rejects.toThrow(
      /caller profile not found/,
    );
  });

  it("propagates REST errors with the 'cohort-density:' prefix on own-row read", async () => {
    ownProfileResponse = {
      data: null,
      error: { message: "rls denied" },
    };
    const client = makeClient();
    await expect(getCohortDensity(client, "u-1")).rejects.toThrow(
      /cohort-density: rls denied/,
    );
  });

  it("propagates REST errors with the 'cohort-density:' prefix on cohort read", async () => {
    ownProfileResponse = {
      data: { school_name: "Stanford" },
      error: null,
    };
    cohortResponse = { data: null, error: { message: "connection lost" } };
    const client = makeClient();
    await expect(getCohortDensity(client, "u-1")).rejects.toThrow(
      /cohort-density: connection lost/,
    );
  });

  it("counts only consented current-version users (excludes never-consented and revoked)", async () => {
    ownProfileResponse = {
      data: { school_name: "Stanford" },
      error: null,
    };
    const now = new Date("2026-05-10T00:00:00Z");
    const consentedRow: CohortRow = {
      networking_consent_at: "2026-01-01T00:00:00Z",
      networking_revoked_at: null,
      networking_consent_version: 2,
      created_at: "2026-01-01T00:00:00Z",
    };
    cohortResponse = {
      data: [
        // 5 consented current-version → counts (sized to clear the
        // k-anonymity threshold so the assertion can read the raw
        // count instead of the suppressed sentinel).
        consentedRow,
        consentedRow,
        consentedRow,
        consentedRow,
        consentedRow,
        // Never consented → excluded.
        {
          networking_consent_at: null,
          networking_revoked_at: null,
          networking_consent_version: null,
          created_at: "2026-02-01T00:00:00Z",
        },
        // Revoked AFTER consent → excluded.
        {
          networking_consent_at: "2026-01-01T00:00:00Z",
          networking_revoked_at: "2026-03-01T00:00:00Z",
          networking_consent_version: 2,
          created_at: "2026-01-01T00:00:00Z",
        },
        // Stale version → excluded.
        {
          networking_consent_at: "2026-01-01T00:00:00Z",
          networking_revoked_at: null,
          networking_consent_version: 1,
          created_at: "2026-02-15T00:00:00Z",
        },
        // Re-consented after revoke → counts (brings total to 6).
        {
          networking_consent_at: "2026-04-01T00:00:00Z",
          networking_revoked_at: "2026-03-01T00:00:00Z",
          networking_consent_version: 2,
          created_at: "2026-01-01T00:00:00Z",
        },
      ] satisfies CohortRow[],
      error: null,
    };
    const client = makeClient();
    const result = await getCohortDensity(client, "u-self", now);
    expect(result.schoolCohortSize).toBe(6);
    // All consented rows have created_at in January — well outside the
    // 7-day window from now=May 10. addedThisWeek must be 0.
    expect(result.addedThisWeek).toBe(0);
    expect(result.suppressed).toBe(false);
  });

  it("addedThisWeek is the 7-day subset of schoolCohortSize", async () => {
    ownProfileResponse = {
      data: { school_name: "MIT" },
      error: null,
    };
    const now = new Date("2026-05-10T12:00:00Z");
    const thisWeek = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const lastWeek = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const justOutside = new Date(now.getTime() - (COHORT_WEEK_MS + 1000)); // just outside
    // Cohort size has to clear the k-anonymity threshold for the
    // assertion to read raw counts. We use 5 thisWeek + 5 lastWeek = 10
    // total, where 5 fall inside the 7-day window.
    const thisWeekRow: CohortRow = {
      networking_consent_at: "2026-01-01T00:00:00Z",
      networking_revoked_at: null,
      networking_consent_version: 2,
      created_at: thisWeek.toISOString(),
    };
    const lastWeekRow: CohortRow = {
      networking_consent_at: "2026-01-01T00:00:00Z",
      networking_revoked_at: null,
      networking_consent_version: 2,
      created_at: lastWeek.toISOString(),
    };
    const justOutsideRow: CohortRow = {
      networking_consent_at: "2026-01-01T00:00:00Z",
      networking_revoked_at: null,
      networking_consent_version: 2,
      created_at: justOutside.toISOString(),
    };
    cohortResponse = {
      data: [
        thisWeekRow, thisWeekRow, thisWeekRow, thisWeekRow, thisWeekRow,
        lastWeekRow, lastWeekRow, lastWeekRow, lastWeekRow, lastWeekRow,
        justOutsideRow,
      ] satisfies CohortRow[],
      error: null,
    };
    const client = makeClient();
    const result = await getCohortDensity(client, "u-self", now);
    expect(result.schoolCohortSize).toBe(11);
    expect(result.addedThisWeek).toBe(5);
    // Invariant: addedThisWeek is bounded by total cohort size.
    expect(result.addedThisWeek).toBeLessThanOrEqual(result.schoolCohortSize);
    expect(result.suppressed).toBe(false);
  });

  it("suppresses small cohorts to zero with suppressed=true (k-anonymity)", async () => {
    ownProfileResponse = {
      data: { school_name: "Tiny College" },
      error: null,
    };
    const now = new Date("2026-05-10T00:00:00Z");
    // 3 consented rows — below K_ANONYMITY_THRESHOLD (5). The count
    // is a deanonymization vector ("you and 3 others" in a small
    // school is identifying), so the result MUST be suppressed.
    const consentedRow: CohortRow = {
      networking_consent_at: "2026-01-01T00:00:00Z",
      networking_revoked_at: null,
      networking_consent_version: 2,
      created_at: "2026-01-01T00:00:00Z",
    };
    cohortResponse = {
      data: [consentedRow, consentedRow, consentedRow] satisfies CohortRow[],
      error: null,
    };
    const client = makeClient();
    const result = await getCohortDensity(client, "u-self", now);
    expect(result.schoolCohortSize).toBe(0);
    expect(result.addedThisWeek).toBe(0);
    expect(result.suppressed).toBe(true);
  });

  it("returns honest zero (not suppressed) when cohort is genuinely empty", async () => {
    ownProfileResponse = {
      data: { school_name: "Empty School" },
      error: null,
    };
    cohortResponse = { data: [], error: null };
    const client = makeClient();
    const result = await getCohortDensity(client, "u-self");
    // Empty cohort is the threshold-met case: rawSize === 0 does NOT
    // suppress. The UI can render "you're the first" copy.
    expect(result).toEqual({
      schoolCohortSize: 0,
      addedThisWeek: 0,
      suppressed: false,
    });
  });

  it("k-anonymity boundary: exactly THRESHOLD passes; THRESHOLD-1 suppresses", async () => {
    ownProfileResponse = {
      data: { school_name: "Borderline U" },
      error: null,
    };
    const consentedRow: CohortRow = {
      networking_consent_at: "2026-01-01T00:00:00Z",
      networking_revoked_at: null,
      networking_consent_version: 2,
      created_at: "2026-01-01T00:00:00Z",
    };

    // Exactly threshold → honest count.
    cohortResponse = {
      data: Array(K_ANONYMITY_THRESHOLD).fill(consentedRow) as CohortRow[],
      error: null,
    };
    const atThreshold = await getCohortDensity(makeClient(), "u-self");
    expect(atThreshold.schoolCohortSize).toBe(K_ANONYMITY_THRESHOLD);
    expect(atThreshold.suppressed).toBe(false);

    // Threshold - 1 → suppressed.
    cohortResponse = {
      data: Array(K_ANONYMITY_THRESHOLD - 1).fill(consentedRow) as CohortRow[],
      error: null,
    };
    const belowThreshold = await getCohortDensity(makeClient(), "u-self");
    expect(belowThreshold.schoolCohortSize).toBe(0);
    expect(belowThreshold.suppressed).toBe(true);
  });

  it("never returns identifying fields — only the count/suppressed properties", async () => {
    ownProfileResponse = {
      data: { school_name: "Berkeley" },
      error: null,
    };
    const consented: CohortRow = {
      networking_consent_at: "2026-04-15T00:00:00Z",
      networking_revoked_at: null,
      networking_consent_version: 2,
      created_at: "2026-04-15T00:00:00Z",
    };
    cohortResponse = {
      data: Array(K_ANONYMITY_THRESHOLD).fill(consented) as CohortRow[],
      error: null,
    };
    const client = makeClient();
    const result = await getCohortDensity(
      client,
      "u-self",
      new Date("2026-04-20T00:00:00Z"),
    );
    // The wire shape is exactly three properties: two counts +
    // suppression sentinel. Anything else would be a privacy
    // regression (per-row identity leaking through the function's
    // return).
    expect(Object.keys(result).sort()).toEqual([
      "addedThisWeek",
      "schoolCohortSize",
      "suppressed",
    ]);
    expect(typeof result.schoolCohortSize).toBe("number");
    expect(typeof result.addedThisWeek).toBe("number");
    expect(typeof result.suppressed).toBe("boolean");
  });

  it("structural: SELECT projection contains zero identifying columns (privacy contract)", async () => {
    // The cohort query projects ONLY consent-gating + created_at
    // columns. If a future PR adds `email`, `display_name`, `avatar_url`
    // — or any other identifying field — to the SELECT string, this
    // test must fail. Bound by reading the source file as text so the
    // assertion is robust against query-builder refactors.
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(
      resolve(process.cwd(), "src/lib/db/queries/cohort-density-rest.ts"),
      "utf8",
    );
    // Grab every `.select("...")` literal (the first is
    // `.select("school_name")` for the caller's own row; the second is
    // the cohort projection). The literal may have a trailing comma
    // before the closing paren (multi-line formatter style).
    const selectMatches = [
      ...src.matchAll(/\.select\(\s*"([^"]+)"\s*,?\s*\)/g),
    ];
    expect(selectMatches.length).toBeGreaterThanOrEqual(2);
    const cohortSelect = selectMatches[1][1];
    const projectedColumns = cohortSelect
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    // Every projected column must be on the privacy-cleared allowlist.
    const allowedColumns = new Set([
      "networking_consent_at",
      "networking_revoked_at",
      "networking_consent_version",
      "created_at",
    ]);
    for (const col of projectedColumns) {
      expect(
        allowedColumns.has(col),
        `cohort SELECT projects "${col}" — not on the privacy allowlist`,
      ).toBe(true);
    }
    // Belt-and-suspenders: explicitly forbidden identifying fields
    // must never appear anywhere in the cohort projection.
    const forbidden = ["email", "display_name", "avatar_url", "id", "school_name"];
    for (const f of forbidden) {
      expect(
        projectedColumns.includes(f),
        `cohort SELECT must not project "${f}" — identifying data`,
      ).toBe(false);
    }
  });

  it("excludes calling user from cohort via the .neq id filter at REST level", async () => {
    // This test asserts the REST QUERY shape — the chain calls `.neq("id", userId)`
    // before issuing the request. We bind the assertion to the
    // dispatched arguments so a future refactor that drops the .neq()
    // (which would include the caller in their own cohort) is caught
    // structurally.
    const neqSpy = vi.fn();
    const client = {
      from(table: string) {
        if (table !== "user_profiles") {
          throw new Error(`unexpected table: ${table}`);
        }
        return {
          select() {
            return {
              eq(_col: string, _val: unknown) {
                return {
                  async maybeSingle() {
                    return {
                      data: { school_name: "Stanford" },
                      error: null,
                    };
                  },
                  neq(col: string, val: unknown) {
                    neqSpy(col, val);
                    return Promise.resolve({ data: [], error: null });
                  },
                };
              },
            };
          },
        };
      },
    } as unknown as SupabaseClient;
    await getCohortDensity(client, "u-the-caller");
    expect(neqSpy).toHaveBeenCalledWith("id", "u-the-caller");
  });
});
