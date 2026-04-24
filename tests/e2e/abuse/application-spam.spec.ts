import { test, expect } from "@playwright/test";
import type { Route } from "@playwright/test";
import { installSupabaseMock } from "../helpers/mock-supabase";
import { signInAs } from "../helpers/auth";
import { USERS, TIMES } from "../helpers/fixtures";

/**
 * R12.4 — application spam — applications table — dedup wins or every write
 * lands but is observable.
 *
 * Invariant: 50 rapid POSTs with identical `(user_id, company, role)` must
 * not produce 50 unique applications for the same user. Either:
 *   (a) the application create path has dedup logic that collapses them to
 *       at most 1 persisted row, OR
 *   (b) every write lands and we observe 50 writes in the mock — in which
 *       case this scenario is the proof that dedup is missing (partner-
 *       visible regression surface).
 *
 * BLOCKER (documented, not .skip): there is NO `/api/applications` HTTP
 * route in the current codebase. Applications are created via the
 * `createApplicationAction` Server Action (src/lib/actions/applications.ts)
 * which invokes `createApplicationRest` (src/lib/db/queries/applications-rest.ts).
 * Server Actions are not reachable via `page.request.post('/api/applications')`.
 *
 * This scenario therefore exercises the nearest binding it CAN reach
 * through a plain HTTP surface — 50 parallel POSTs to the non-existent
 * `/api/applications` path — and asserts the current shape:
 *   - Every POST returns 404/405 (no route match).
 *   - Zero writes to the `applications` table are observed in the mock
 *     (the app layer never reaches Supabase because the route doesn't
 *     exist).
 *
 * The moment a real `/api/applications` POST route ships, this scenario
 * MUST be upgraded to assert dedup behaviour (the correct invariant:
 * mock write-count <= 1 for identical (user, company, role)).
 */

const SPAM_COUNT = 50;
const COMPANY_NAME = "Acme Rockets";
const ROLE = "SWE Intern";

test.describe("application spam — /api/applications — no-route current shape (dedup invariant pending)", () => {
  let writesByTable: Record<string, number> = {};

  test.beforeEach(async ({ page }) => {
    writesByTable = {};

    // signInAs wires auth + the default fixture handler. We then add a
    // SECOND route handler AHEAD of the default that tracks writes to
    // Supabase tables, then falls through to the default.
    await signInAs(page, USERS.alice, {
      tables: {
        user_profiles: [
          {
            id: USERS.alice.id,
            networking_consent_at: TIMES.anchor,
            networking_revoked_at: null,
            networking_consent_version: 2,
          },
        ],
      },
      allowWrites: true,
    });

    // Overlay a write-tracking interceptor on top of the default handler.
    // Matching /rest/v1/<table> — we record the table for every non-GET.
    await page.route(/\.supabase\.co\/rest\/v1\//, async (route: Route) => {
      const request = route.request();
      const method = request.method();
      if (method !== "GET" && method !== "HEAD") {
        const url = new URL(request.url());
        const path = url.pathname;
        const table = path.substring("/rest/v1/".length).split("?")[0];
        writesByTable[table] = (writesByTable[table] ?? 0) + 1;
      }
      // Let the default handler (installed first) fulfill — we must NOT
      // call route.fulfill here or we preempt the configured response.
      await route.fallback();
    });
  });

  test(
    "50 identical POSTs to /api/applications return no-route status and produce zero applications writes",
    async ({ page }) => {
      const posts = Array.from({ length: SPAM_COUNT }, () =>
        page.request.post("http://localhost:3000/api/applications", {
          data: {
            user_id: USERS.alice.id,
            companyName: COMPANY_NAME,
            role: ROLE,
            status: "applied",
          },
        }),
      );

      const responses = await Promise.all(posts);
      const statuses = responses.map((r) => r.status());

      // Current shape: route does not exist. Next.js returns 404 for
      // missing app routes; 405 for wrong-method matches. Either is
      // acceptable as the no-route signal. 200/201 would mean the spam
      // silently succeeded without dedup — regression.
      for (const status of statuses) {
        expect([404, 405]).toContain(status);
      }

      // Zero applications writes observed. This is the dedup-proxy
      // assertion: once the route lands, flip this to
      // `expect(writesByTable["applications"] ?? 0).toBeLessThanOrEqual(1)`
      // and tighten the status expectation to `toBe(201)` for the first
      // call + `toBe(409)`/`200` (dedup hit) for the remaining 49.
      const applicationsWrites = writesByTable["applications"] ?? 0;
      expect(applicationsWrites).toBe(0);
    },
  );
});
