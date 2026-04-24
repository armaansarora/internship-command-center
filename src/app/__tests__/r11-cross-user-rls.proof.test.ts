import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { glob } from "glob";

/**
 * R11 P1 — structural RLS-scoping guard.
 *
 * Every read from or write to `match_candidate_index`, `match_events`, or
 * `match_rate_limits` must be scoped by user_id.  This grep proof catches
 * future code that accidentally fetches these tables without a user scope
 * (which would bypass RLS on the service-role admin client path).
 *
 * Rule: every file in src/** that references one of the three tables must
 * also reference either `user_id` or `auth.uid` within ~400 chars of the
 * table name OR be on the allowlist below.
 *
 * Allowlist policy: every entry is a conscious opt-in.  Acceptable reasons
 * to allowlist:
 *   1. Schema / migration — column + RLS policy definitions live here, the
 *      rule doesn't meaningfully apply (schema IS the scope).
 *   2. Docstring-only mention — the file names the table in a JSDoc block
 *      but never queries it, OR queries it with proper scoping but the
 *      `user_id` reference is further than 200 chars back / 400 chars
 *      forward from the table name.  Every allowlisted file of this type
 *      has been manually inspected — the window-based heuristic is too
 *      tight to prove scoping by itself, so the allowlist substitutes a
 *      human review.
 * If you are adding a new file to this list, leave a one-line comment
 * explaining why.  A PR that adds a file with an UNscoped query here is a
 * privacy regression — the allowlist entry is your signature.
 */

const TABLES = [
  "match_candidate_index",
  "match_events",
  "match_rate_limits",
];

const ALLOWLIST = new Set<string>([
  // Drizzle schema — column + RLS policy definitions. Rule doesn't apply.
  "src/db/schema.ts",
  // Rebuild helper — every query is explicitly `.eq("user_id", userId)` or
  // builds insertRows with `user_id: userId`.  The file mentions the table
  // in three JSDoc blocks + the final `.insert(insertRows)` call whose
  // insertRows literal is >200 chars above the table reference.  Manually
  // verified: every table access is user-scoped.
  "src/lib/networking/rebuild-match-index.ts",
  // Match-candidates route — docstring at line 12 names `match_events`
  // before the function body.  The actual `.from("match_events").insert(...)`
  // and `.from("match_candidate_index").select(...)` calls ARE scoped by
  // `user_id` (inspected).  Allowlisted for the docstring mention.
  "src/app/api/networking/match-candidates/route.ts",
  // Cron route — docstring names `match_candidate_index`; all table access
  // is delegated to `rebuildMatchIndexForUser(u.id)` which itself is scoped.
  // Allowlisted for the docstring mention.
  "src/app/api/cron/match-index/route.ts",
  // NetworkingAudit — presentational Server Component.  Only mentions
  // `match_events` in a JSDoc describing the data it receives via props.
  // Never queries the table directly.
  "src/components/settings/NetworkingAudit.tsx",
  // Settings client — JSDoc on a prop type mentions `match_events`.
  // Never queries the table directly; the parent page does the scoped
  // REST fetch (see src/app/(authenticated)/settings/page.tsx).
  "src/app/(authenticated)/settings/settings-client.tsx",
]);

describe("R11 P1 — cross-user RLS scoping", () => {
  it("every match_* table reference is scoped by user_id or auth.uid", async () => {
    const files = await glob("src/**/*.{ts,tsx}", {
      ignore: [
        "src/**/__tests__/**",
        "src/**/*.test.*",
        "src/**/*.spec.*",
        "src/**/migrations/**",
      ],
      absolute: false,
    });

    const offenders: Array<{ file: string; table: string }> = [];
    for (const file of files) {
      if (ALLOWLIST.has(file)) continue;
      const src = readFileSync(resolve(process.cwd(), file), "utf8");

      for (const table of TABLES) {
        let idx = 0;
        while ((idx = src.indexOf(table, idx)) !== -1) {
          const window = src.slice(Math.max(0, idx - 200), idx + 400);
          if (!/user_id|auth\.uid/.test(window)) {
            offenders.push({ file, table });
          }
          idx += table.length;
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("match_candidate_index is deleted before insert in rebuild helper", () => {
    const body = readFileSync(
      resolve(process.cwd(), "src/lib/networking/rebuild-match-index.ts"),
      "utf8",
    );
    // Structural: the rebuild is DELETE-then-INSERT, not UPDATE. This
    // invariant keeps cron runs idempotent.
    expect(body).toMatch(/\.from\("match_candidate_index"\)[^.]*\.delete\(\)/);
    expect(body).toMatch(/\.from\("match_candidate_index"\)[^.]*\.insert\(/);
  });
});
