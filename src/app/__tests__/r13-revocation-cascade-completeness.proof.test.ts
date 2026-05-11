import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * R13 (Differentiate council) — revocation-cascade completeness guard.
 *
 * The consent copy promises "Revoking is instant. Within 60 seconds, your
 * name and applications are removed from the match index." That promise is
 * load-bearing legally and ethically — every table that holds DERIVED data
 * referencing a revoking user's contacts/applications must either be
 * purged by the revoke cascade OR have an explicit, audited reason it does
 * not. This proof binds that contract.
 *
 * The pattern mirrors R11's allowlist-with-justification convention: every
 * cross-user-derived table appears in EITHER
 *
 *   - CASCADED_TABLES  — purged synchronously by the revoke cascade
 *                        (whether in `/api/networking/revoke/route.ts` or
 *                        the mirrored `settings/privacy/actions.ts`)
 *   - DOCUMENTED_EXEMPT — explicitly retained, with a per-table justification
 *                         comment that explains why retention is correct
 *
 * Adding a new cross-user-derived table without listing it in one of the
 * two buckets is a privacy regression — the test exists so the PR review
 * stops before the table ships.
 *
 * What "cross-user-derived" means
 * -------------------------------
 * A table is cross-user-derived iff one of:
 *   (a) Rows from user A can be surfaced (in anonymized OR identified form)
 *       to user B at runtime, OR
 *   (b) Rows are populated FROM user A's contacts/applications and stored
 *       in a layout that maps back to user A's underlying entities.
 *
 * Single-user-private tables (companies, applications, etc.) are out of
 * scope — RLS already prevents cross-user reads and revocation does not
 * change the contract on those tables.
 */

const CASCADED_TABLES = new Set([
  // Source-of-truth for THIS user's target companies — exposes which
  // companies the revoker is interested in to other users' match
  // candidate scans. Cleared in step 2 of the cascade
  // (`/api/networking/revoke/route.ts` + `settings/privacy/actions.ts`).
  "networking_match_index",
  // Precomputed cross-user candidate cache. Holds the revoker's anon-keys
  // in OTHER users' caches. Cleared in step 3 of the cascade
  // (admin-client DELETE by `counterparty_anon_key IN (...)` where the
  // anon-keys are derived from `contacts.id` rows scoped by the
  // revoker's `user_id`).
  "match_candidate_index",
]);

/**
 * Tables that are NETWORKING-FAMILY (their existence is part of the
 * cross-user matching surface) but exist on `match_*` / `networking_*`
 * prefixes. This proof guards the whole family together: any new
 * member of the family must be declared as either CASCADED or
 * DOCUMENTED_EXEMPT — otherwise the cascade guard cannot judge it.
 *
 * Detection: any pgTable name matching one of the patterns below is
 * considered a member of the family. If a new networking-family table
 * lands without classification, the test fails — the author must
 * decide whether to cascade it or exempt it with justification.
 */
const NETWORKING_FAMILY_PATTERNS = [
  /^match_/,
  /^networking_/,
];

const DOCUMENTED_EXEMPT: Record<string, string> = {
  // match_events is THIS user's own audit log of matches surfaced TO them.
  // RLS gates reads on `auth.uid() = user_id` — no other user can read
  // these rows even via the admin client outside cron paths. Retention
  // is the correct call because:
  //   1. The user themselves needs the audit trail to inspect what was
  //      historically surfaced (Trust Console exposes this).
  //   2. The audit log NEVER exposes another user's identity — it only
  //      stores the anon-key + company_context the user already saw.
  //   3. Once the consent stamp flips to revoked, the consent guard
  //      blocks future reads via the match-candidates route, so the rows
  //      never seed a new cross-user surfacing.
  // If a future change adds a path that reads match_events for someone
  // OTHER than the row's user_id, this exemption must be revisited.
  match_events:
    "audit-trail retention; never exposes another user's identity; future cross-user reads must revisit",
  // match_rate_limits is a per-user hourly counter for match-candidate
  // calls. Composite primary key `(user_id, hour_bucket)`. The row is
  // NOT derived from contacts — it is a self-contained call counter.
  // Cron cleanup sweeps rows older than 24h. Retaining post-revoke is
  // harmless: the consent guard blocks new calls so no new rows are
  // bumped; old rows expire on their own.
  match_rate_limits:
    "per-user call counter, not derived from contacts; consent guard blocks new calls; cron sweeps stale rows",
  // contact_embeddings is per-user pgvector cache of the user's OWN
  // contacts. Single-user-private — RLS isolates by `user_id`. The
  // embeddings are an input to the per-user warm-intro scan, not a
  // cross-user surfacing. Post-revoke the scan stops running (consent
  // guard), so the cache is dormant data. Hard-account-delete removes
  // it via `ON DELETE CASCADE` from contacts/user_profiles; soft revoke
  // does not need to clear it because no surface reads it without
  // consent.
  contact_embeddings:
    "single-user pgvector cache; never read cross-user; dormant after revoke; hard-delete cascade handles cleanup",
};

interface PgTable {
  name: string;
  body: string;
  hasUserIdFk: boolean;
}

function parsePgTables(schemaSrc: string): PgTable[] {
  // Match `export const X = pgTable("name", { ... }, [ ... ])` blocks.
  // Capture both the table name and the body so we can probe for
  // user_id columns and ON DELETE CASCADE references back to user_profiles.
  const tableRe = /pgTable\("([^"]+)"\s*,\s*\{([\s\S]*?)\}\s*,\s*(?:\([^)]*\)\s*=>\s*\[[\s\S]*?\]|\(\)\s*=>\s*\[[\s\S]*?\])\s*\)/g;
  const tables: PgTable[] = [];
  let m: RegExpExecArray | null;
  while ((m = tableRe.exec(schemaSrc)) !== null) {
    const [, name, body] = m;
    const hasUserIdFk =
      /uuid\("user_id"\)\s*\.notNull\(\)\s*\.references\s*\(\s*\(\)\s*=>\s*userProfiles\.id/.test(
        body,
      );
    tables.push({ name, body, hasUserIdFk });
  }
  return tables;
}

describe("R13 — revocation cascade completeness", () => {
  it("every cross-user-derived table is either cascaded or explicitly documented exempt", () => {
    const schemaSrc = readFileSync(
      resolve(process.cwd(), "src/db/schema.ts"),
      "utf8",
    );
    const tables = parsePgTables(schemaSrc);

    // Build the union of all tables this guard knows about. Any table
    // listed as cascaded OR exempt is accounted for.
    const accountedFor = new Set<string>([
      ...CASCADED_TABLES,
      ...Object.keys(DOCUMENTED_EXEMPT),
    ]);

    // We do NOT use the full pgTable list as the input set — single-user
    // private tables (applications, contacts, emails, etc.) are out of
    // scope. Instead we cross-reference the accounted-for set against
    // the schema to confirm every table we claim to track actually
    // exists. This is the half of the test that catches RENAMES — if a
    // schema rename slips a table out from under the guard, the
    // matching `accountedFor` entry no longer appears in the live
    // schema and the assertion fails.
    for (const tableName of accountedFor) {
      const found = tables.find((t) => t.name === tableName);
      expect(
        found,
        `table "${tableName}" is referenced by the revoke cascade guard but no longer exists in src/db/schema.ts`,
      ).toBeDefined();
    }
  });

  it("every networking-family table is declared as CASCADED or DOCUMENTED_EXEMPT", () => {
    // This is the catch-the-newcomer test: any pgTable whose name
    // matches a networking-family pattern (match_*, networking_*) MUST
    // be classified — either cascaded by the revoke cascade or
    // explicitly retained with a justification comment. A new family
    // member that ships unlisted is the exact regression this proof
    // exists to prevent.
    const schemaSrc = readFileSync(
      resolve(process.cwd(), "src/db/schema.ts"),
      "utf8",
    );
    const tables = parsePgTables(schemaSrc);
    const accountedFor = new Set<string>([
      ...CASCADED_TABLES,
      ...Object.keys(DOCUMENTED_EXEMPT),
    ]);

    const familyTables = tables.filter((t) =>
      NETWORKING_FAMILY_PATTERNS.some((re) => re.test(t.name)),
    );
    expect(familyTables.length).toBeGreaterThan(0); // sanity

    const undeclared = familyTables
      .filter((t) => !accountedFor.has(t.name))
      .map((t) => t.name);

    expect(
      undeclared,
      `the following networking-family tables are NOT declared as CASCADED or DOCUMENTED_EXEMPT — privacy classification missing: ${undeclared.join(", ")}`,
    ).toEqual([]);
  });

  it("revoke route + privacy action cascade the tables in CASCADED_TABLES", () => {
    const revokeRouteSrc = readFileSync(
      resolve(process.cwd(), "src/app/api/networking/revoke/route.ts"),
      "utf8",
    );
    const privacyActionsSrc = readFileSync(
      resolve(
        process.cwd(),
        "src/app/(authenticated)/settings/privacy/actions.ts",
      ),
      "utf8",
    );

    // Each cascaded table must be referenced by BOTH the API route and
    // the server action (they implement the same cascade contract and
    // must not drift). The reference must be inside a `.from("<table>")`
    // call so JSDoc mentions don't satisfy the check.
    for (const table of CASCADED_TABLES) {
      const fromCall = new RegExp(`\\.from\\("${table}"\\)`);
      expect(
        fromCall.test(revokeRouteSrc),
        `revoke route does not call .from("${table}") — cascade contract regression`,
      ).toBe(true);
      expect(
        fromCall.test(privacyActionsSrc),
        `privacy actions does not call .from("${table}") — cascade contract regression`,
      ).toBe(true);
    }
  });

  it("DOCUMENTED_EXEMPT entries have non-empty per-table justification strings", () => {
    // Mechanical guard against an empty allowlist entry being slipped
    // in. Every exemption is a deliberate retention decision and must
    // carry a one-line rationale the reviewer can audit.
    for (const [table, justification] of Object.entries(DOCUMENTED_EXEMPT)) {
      expect(
        typeof justification === "string" && justification.trim().length >= 20,
        `DOCUMENTED_EXEMPT["${table}"] missing or too short — must explain why retention is correct (got: "${justification}")`,
      ).toBe(true);
    }
  });

  it("no cross-user-derived table is on BOTH lists (cascaded XOR exempt)", () => {
    const overlaps = [...CASCADED_TABLES].filter((t) =>
      Object.keys(DOCUMENTED_EXEMPT).includes(t),
    );
    expect(
      overlaps,
      `tables listed as both cascaded AND exempt — pick one: ${overlaps.join(", ")}`,
    ).toEqual([]);
  });

  it("revoke cascade emits a recordRevokeCascade audit row referencing the cascaded table set", () => {
    const revokeRouteSrc = readFileSync(
      resolve(process.cwd(), "src/app/api/networking/revoke/route.ts"),
      "utf8",
    );
    // The recordRevokeCascade helper writes a `networking_revoked`
    // audit row whose metadata.tables_touched is the proof shown in the
    // Trust Console. The route MUST call recordRevokeCascade on every
    // terminal path (success + each failure branch).
    expect(revokeRouteSrc).toMatch(/recordRevokeCascade\(/);
    // Sanity: tablesTouched is populated with the cascaded names. The
    // route uses string pushes per step; we assert each cascaded table
    // name appears in a `tablesTouched.push("<table>")` literal.
    for (const table of CASCADED_TABLES) {
      const pushPat = new RegExp(`tablesTouched\\.push\\("${table}"\\)`);
      expect(
        pushPat.test(revokeRouteSrc),
        `revoke route does not push "${table}" to tablesTouched — Trust Console audit would not record the cascade`,
      ).toBe(true);
    }
  });
});
