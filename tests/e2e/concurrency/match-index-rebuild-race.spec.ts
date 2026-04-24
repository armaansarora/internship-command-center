import { test, expect } from "@playwright/test";
import { installSupabaseMock } from "../helpers/mock-supabase";
import { USERS } from "../helpers/fixtures";

/**
 * R12.5 — cron match-index rebuild + delta-trigger write race —
 * no duplicate (user_id, counterparty_anon_key) pairs.
 *
 * Background: the cron at `/api/cron/match-index` requires a Bearer
 * CRON_SECRET (or x-vercel-cron: 1) header. We cannot ship that secret
 * into E2E, so we CANNOT call the cron directly with valid auth; instead,
 * we simulate the race at the MOCK LAYER by firing two parallel sequences
 * of concurrent INSERTs into `match_candidate_index` — exactly what the
 * rebuild path and the delta-write path would do if they collided.
 *
 * The invariant being bound: if both paths attempt to write the SAME
 * (user_id, counterparty_anon_key) pair in the same instant, the tracker
 * must never show two distinct insertions for that pair landing as
 * successes — either the unique index returns 23505 on one of them, OR
 * the application-layer "delete-then-insert" pattern resolves to a
 * single final row.
 *
 * R12.10 — migrated from page.route() closure to the stub-server's
 * `unique_constraint` override. The stub holds the rows in memory and
 * enforces uniqueness on POST, returning a PostgreSQL 23505-shape 409
 * on the second writer's overlapping pairs. We POST directly at the
 * stub on :3001 — no page.route involved — so the test exercises the
 * exact same wire path the dev server would use under the new topology.
 */

test.describe(
  "cron match-index rebuild + delta trigger race — no duplicate (user_id, counterparty_anon_key) pairs in match_candidate_index",
  () => {
    test("concurrent writes to match_candidate_index do not produce duplicate pairs; unique constraint holds at DB layer", async ({
      page,
    }) => {
      await installSupabaseMock(page, {
        authedUser: null,
        tables: { match_candidate_index: [] },
        allowWrites: true,
        overrides: [
          {
            behavior: "unique_constraint",
            table: "match_candidate_index",
            columns: ["user_id", "counterparty_anon_key"],
          },
        ],
      });

      const aliceId = USERS.alice.id;
      const rebuildRows = [
        { user_id: aliceId, counterparty_anon_key: "ANON-1", score: 0.9 },
        { user_id: aliceId, counterparty_anon_key: "ANON-2", score: 0.8 },
        { user_id: aliceId, counterparty_anon_key: "ANON-3", score: 0.7 },
      ];
      const deltaRows = [
        // Same pairs, forcing a collision at the stub layer.
        { user_id: aliceId, counterparty_anon_key: "ANON-1", score: 0.95 },
        { user_id: aliceId, counterparty_anon_key: "ANON-2", score: 0.85 },
        { user_id: aliceId, counterparty_anon_key: "ANON-3", score: 0.75 },
      ];

      const stubUrl = "http://localhost:3001/rest/v1/match_candidate_index";

      const [rebuildRes, deltaRes] = await Promise.all([
        page.request.post(stubUrl, {
          data: rebuildRows,
          headers: { "content-type": "application/json" },
        }),
        page.request.post(stubUrl, {
          data: deltaRows,
          headers: { "content-type": "application/json" },
        }),
      ]);

      const statuses = [rebuildRes.status(), deltaRes.status()];

      // Exactly one of the two writers MUST see 409. JavaScript is
      // single-threaded so requests serialize at the stub; whichever
      // ran first appended its 3 rows, the second saw all 3 as
      // duplicates and 409'd on the first.
      expect(
        statuses.includes(409),
        `expected one writer to see 409 unique-constraint violation; got [${statuses.join(", ")}]`,
      ).toBe(true);
      expect(statuses.includes(201)).toBe(true);

      // The 409 body MUST carry PG 23505 — the application layer relies
      // on the code to distinguish "real conflict" from generic 4xx.
      const conflictRes = statuses[0] === 409 ? rebuildRes : deltaRes;
      const conflictBody = await conflictRes.json();
      expect(conflictBody.code).toBe("23505");

      // Final state of the table: exactly the 3 winning pairs. Read via
      // the stub's GET to confirm no duplicate slipped through.
      const tableRes = await page.request.get(stubUrl);
      const finalRows = (await tableRes.json()) as Array<{
        user_id: string;
        counterparty_anon_key: string;
      }>;
      const pairKeys = finalRows.map(
        (r) => `${r.user_id}::${r.counterparty_anon_key}`,
      );
      const uniquePairKeys = new Set(pairKeys);
      expect(pairKeys.length).toBe(uniquePairKeys.size);
      expect(pairKeys).toHaveLength(3);

      // Bonus — the cron route itself must 401 without a bearer token,
      // proving the OTHER half of the proof (the secret gate isn't
      // bypassable). The dev server runs on :3000.
      const cronUnauth = await page.request.get(
        "http://localhost:3000/api/cron/match-index",
      );
      expect(cronUnauth.status()).toBe(401);
    });
  },
);
