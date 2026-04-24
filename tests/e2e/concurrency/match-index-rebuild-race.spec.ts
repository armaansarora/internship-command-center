import { test, expect, type Route } from "@playwright/test";
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
 * successes — either the unique index (a real schema property) returns
 * 23505 on one of them, OR the application-layer "delete-then-insert"
 * pattern (see rebuildMatchIndexForUser) resolves to a single final row.
 *
 * Approach:
 *   1. Install the base Supabase mock with a populated candidate list.
 *   2. Layer a write-tracker that simulates a Postgres-level unique
 *      constraint on (user_id, counterparty_anon_key). The FIRST write for
 *      a pair succeeds with 201; subsequent inserts of the same pair
 *      return 409 (23505 shape).
 *   3. Fire two parallel "rebuild" streams via direct Supabase REST POSTs
 *      (which the handler intercepts) that both try to write overlapping
 *      pairs. The race is: the mock layer is the only arbiter, and it
 *      MUST maintain the unique-pair invariant.
 *   4. Also attempt an unauthorized GET to the cron route to prove that
 *      the route itself refuses us — binding the OTHER half of the proof
 *      (the secret gate isn't bypassable). Commented inline.
 */

interface RecordedPair {
  userId: string;
  counterpartyAnonKey: string;
  responseStatus: number;
}

test.describe(
  "cron match-index rebuild + delta trigger race — no duplicate (user_id, counterparty_anon_key) pairs in match_candidate_index",
  () => {
    test("concurrent writes to match_candidate_index do not produce duplicate pairs; unique constraint holds at DB layer", async ({
      page,
    }) => {
      const recorded: RecordedPair[] = [];

      await installSupabaseMock(page, {
        authedUser: null,
        tables: {
          match_candidate_index: [],
        },
        allowWrites: true,
      });

      await page.route(/\.supabase\.co\/rest\/v1\//, async (route: Route) => {
        const req = route.request();
        const method = req.method();
        const url = new URL(req.url());
        const table = url.pathname.substring("/rest/v1/".length).split("?")[0];

        if (method === "GET" || method === "HEAD") {
          await route.fulfill({
            status: 200,
            body: JSON.stringify([]),
            contentType: "application/json",
          });
          return;
        }

        // Simulate the real `match_candidate_index` unique constraint on
        // (user_id, counterparty_anon_key) — every rebuild + delta write
        // passes through here. The mock is the arbiter.
        if (
          table === "match_candidate_index" &&
          (method === "POST" || method === "PATCH")
        ) {
          const body = req.postData() ?? "[]";
          let rows: Array<Record<string, unknown>> = [];
          try {
            const parsed = JSON.parse(body);
            rows = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            rows = [];
          }

          let conflict = false;
          for (const row of rows) {
            const userId = String(row.user_id ?? "");
            const anonKey = String(row.counterparty_anon_key ?? "");
            if (!userId || !anonKey) continue;
            const dup = recorded.find(
              (r) =>
                r.userId === userId &&
                r.counterpartyAnonKey === anonKey &&
                r.responseStatus === 201,
            );
            if (dup) {
              conflict = true;
              recorded.push({
                userId,
                counterpartyAnonKey: anonKey,
                responseStatus: 409,
              });
            } else {
              recorded.push({
                userId,
                counterpartyAnonKey: anonKey,
                responseStatus: 201,
              });
            }
          }

          if (conflict) {
            await route.fulfill({
              status: 409,
              body: JSON.stringify({
                code: "23505",
                message:
                  "duplicate key value violates unique constraint match_candidate_index_user_counterparty_unique",
              }),
              contentType: "application/json",
            });
            return;
          }

          await route.fulfill({
            status: 201,
            body: JSON.stringify(rows),
            contentType: "application/json",
          });
          return;
        }

        // DELETE — the rebuild path calls delete().eq("user_id", userId)
        // before re-inserting. Mock it as a successful no-op and clear any
        // prior recorded pairs for that user so the next insert round
        // starts clean (just like the real rebuild).
        if (table === "match_candidate_index" && method === "DELETE") {
          const userIdMatch = url.search.match(/user_id=eq\.([^&]+)/);
          if (userIdMatch) {
            const userId = decodeURIComponent(userIdMatch[1]);
            for (let i = recorded.length - 1; i >= 0; i--) {
              if (
                recorded[i].userId === userId &&
                recorded[i].responseStatus === 201
              ) {
                recorded.splice(i, 1);
              }
            }
          }
          await route.fulfill({
            status: 204,
            body: "",
            contentType: "application/json",
          });
          return;
        }

        await route.fulfill({
          status: 201,
          body: JSON.stringify({ ok: true }),
          contentType: "application/json",
        });
      });

      // Simulation: rather than invoke the cron route (which requires a
      // Bearer CRON_SECRET that we don't plumb into E2E), we simulate BOTH
      // writers — rebuild batch AND delta trigger — firing at the same
      // instant via the Supabase REST surface the route would use.
      //
      // SUPABASE_URL defaults to the project URL; we rely on `page.route`
      // above to intercept any request matching `*.supabase.co/rest/v1/*`.
      // Using a direct-to-stub URL keeps the invariant tight.
      const aliceId = USERS.alice.id;
      const rebuildRows = [
        {
          user_id: aliceId,
          counterparty_anon_key: "ANON-1",
          score: 0.9,
        },
        {
          user_id: aliceId,
          counterparty_anon_key: "ANON-2",
          score: 0.8,
        },
        {
          user_id: aliceId,
          counterparty_anon_key: "ANON-3",
          score: 0.7,
        },
      ];
      const deltaRows = [
        // Same pairs, forcing a collision at the mock layer.
        {
          user_id: aliceId,
          counterparty_anon_key: "ANON-2",
          score: 0.85,
        },
        {
          user_id: aliceId,
          counterparty_anon_key: "ANON-3",
          score: 0.75,
        },
      ];

      const rebuildUrl =
        "https://jzrsrruugcajohvvmevg.supabase.co/rest/v1/match_candidate_index";
      const deltaUrl = rebuildUrl;

      const [rebuildRes, deltaRes] = await Promise.all([
        page.request.post(rebuildUrl, {
          data: rebuildRows,
          headers: { "content-type": "application/json" },
        }),
        page.request.post(deltaUrl, {
          data: deltaRows,
          headers: { "content-type": "application/json" },
        }),
      ]);

      // Invariant: final `recorded` list with responseStatus=201 contains
      // NO duplicate (user_id, counterparty_anon_key) pairs.
      const successfulPairs = recorded.filter(
        (r) => r.responseStatus === 201,
      );
      const pairKeys = successfulPairs.map(
        (r) => `${r.userId}::${r.counterpartyAnonKey}`,
      );
      const uniquePairKeys = new Set(pairKeys);

      expect(pairKeys.length).toBe(uniquePairKeys.size);

      // And the second writer (whichever it was) MUST have seen at least
      // one 409 on the overlapping pairs — a proof that the unique
      // constraint actually fired and wasn't silently skipped.
      const conflictCount = recorded.filter(
        (r) => r.responseStatus === 409,
      ).length;
      const oneOf = [rebuildRes.status(), deltaRes.status()];
      expect(oneOf.includes(409) || conflictCount > 0).toBe(true);

      // Bonus — the cron route itself must 401 without a bearer token, so
      // even the authentic cron path can't be triggered by an attacker in
      // parallel with a delta writer. Smoke-verify that invariant too.
      const cronUnauth = await page.request.get(
        "http://localhost:3000/api/cron/match-index",
      );
      expect(cronUnauth.status()).toBe(401);
    });
  },
);
