import { test, expect } from "@playwright/test";
import { signInAs } from "../helpers/auth";
import { USERS, TIMES } from "../helpers/fixtures";

/**
 * R12.7 — Supabase intermittent 503 — /penthouse render path —
 * recoverable, no hydration-mismatch, no uncaught React crash.
 *
 * The Penthouse floor (src/app/(authenticated)/penthouse/page.tsx) fans
 * out several Supabase reads via createClient() — auth, briefing storage,
 * application counts, recent activity. The invariant: under a 50% failure
 * injection (every 2nd Supabase request returns 503), the route must
 * recover to a consistent render. penthouse-data.ts already defaults to
 * empty stats / empty arrays on error, so the rendered tree should NEVER
 * crash React even if some reads fail.
 *
 * We bind:
 *   1. No pageerror events (uncaught exceptions) fired during load.
 *   2. No hydration-mismatch console errors.
 *   3. The page's final DOM is present (no React crash/error boundary).
 *
 * R12.10 update: closure-counter page.route handler replaced with the
 * stub-server `intermittent_failure` override. The stub increments a
 * shared REST/RPC counter and returns the configured 503 every 2nd call,
 * which exercises BOTH browser-origin AND Next.js server-side fetches —
 * the legacy page.route() flow only caught browser fetches.
 */
test.describe("Supabase intermittent 503 — /penthouse render — recoverable, no hydration mismatch or React crash", () => {
  test("50% Supabase 503 injection — Penthouse renders without uncaught errors", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => {
      pageErrors.push(err);
    });

    const hydrationErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      if (
        text.includes("Hydration") ||
        text.includes("hydration") ||
        text.includes("did not match") ||
        text.includes("Text content does not match")
      ) {
        hydrationErrors.push(text);
      }
    });

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
        applications: [],
        outreach_queue: [],
        match_candidate_index: [],
        morning_briefing_cache: [],
      },
      rpc: {},
      allowWrites: true,
      overrides: [
        {
          behavior: "intermittent_failure",
          everyNth: 2,
          status: 503,
          body: { message: "service unavailable" },
        },
      ],
    });

    const response = await page.goto("http://localhost:3000/penthouse", {
      waitUntil: "networkidle",
      timeout: 25_000,
    });

    const finalStatus = response?.status() ?? 0;
    expect(
      finalStatus,
      `expected 200/3xx from /penthouse under intermittent Supabase, got ${finalStatus}`,
    ).toBeLessThan(500);

    expect(
      pageErrors,
      `uncaught pageerror events under intermittent Supabase: ${pageErrors
        .map((e) => e.message)
        .join(" | ")}`,
    ).toHaveLength(0);

    expect(
      hydrationErrors,
      `hydration mismatches detected: ${hydrationErrors.join(" | ")}`,
    ).toHaveLength(0);

    const docText = await page.evaluate(() => document.body.innerText);
    expect(
      docText,
      "Next.js default error screen rendered — unexpected under graceful degradation",
    ).not.toContain("Application error: a server-side exception has occurred");

    // Sanity: the stub recorded REST calls during the render. /__test__/state
    // exposes the shared counter so we can assert the failure injector
    // actually fired.
    const stateRes = await page.request.get(
      "http://localhost:3001/__test__/state",
    );
    const stubState = (await stateRes.json()) as {
      counters: Record<string, number>;
    };
    const restCallCount = stubState.counters["intermittent:rest_call_count"] ?? 0;
    expect(
      restCallCount,
      "no Supabase requests reached the stub — mock topology not wired",
    ).toBeGreaterThan(0);
  });
});
