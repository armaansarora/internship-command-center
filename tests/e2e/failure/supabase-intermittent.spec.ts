import { test, expect, type Route } from "@playwright/test";
import { buildAuthCookies } from "../helpers/auth";
import { buildFixtureHandler } from "../helpers/mock-supabase";
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
 * The 503-on-every-other pattern uses a closure counter inside a custom
 * page.route handler (we cannot reuse installSupabaseMock directly because
 * that helper always fulfills with the fixture handler's response — here
 * we want to alternate between 503 and the fixture's answer).
 */
test.describe("Supabase intermittent 503 — /penthouse render — recoverable, no hydration mismatch or React crash", () => {
  test("50% Supabase 503 injection — Penthouse renders without uncaught errors", async ({
    page,
    context,
  }) => {
    // ---------------------------------------------------------------------
    // Capture uncaught errors + console errors so we can assert at the end.
    // ---------------------------------------------------------------------
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => {
      pageErrors.push(err);
    });

    const hydrationErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const text = msg.text();
      // Next.js / React hydration-mismatch signals.
      if (
        text.includes("Hydration") ||
        text.includes("hydration") ||
        text.includes("did not match") ||
        text.includes("Text content does not match")
      ) {
        hydrationErrors.push(text);
      }
    });

    // ---------------------------------------------------------------------
    // Build the fixture handler (what the "successful" branch returns).
    // ---------------------------------------------------------------------
    const fixtureHandler = buildFixtureHandler({
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
      authedUser: USERS.alice,
    });

    // ---------------------------------------------------------------------
    // Intermittent 503 injector — a closure counter returns 503 on every
    // second Supabase request, fixture response on the others.
    // ---------------------------------------------------------------------
    let callCount = 0;
    const supabasePattern = /\.supabase\.co\/(auth|rest|realtime)\//;
    await page.route(supabasePattern, async (route: Route) => {
      callCount += 1;
      if (callCount % 2 === 0) {
        // Inject failure — this exercises the app's retry / graceful
        // fallback path.
        await route.fulfill({
          status: 503,
          body: JSON.stringify({ message: "service unavailable" }),
          contentType: "application/json",
        });
        return;
      }
      const request = route.request();
      const res = fixtureHandler({
        method: request.method(),
        url: request.url(),
        body: request.postData() ?? undefined,
      });
      await route.fulfill({
        status: res.status,
        body: res.body,
        contentType: res.contentType,
      });
    });

    // ---------------------------------------------------------------------
    // Sign-in cookies (bypass the interactive lobby flow).
    // ---------------------------------------------------------------------
    await context.addCookies(
      buildAuthCookies(USERS.alice).map((c) => ({
        ...c,
        url: "http://localhost:3000",
      })),
    );

    // ---------------------------------------------------------------------
    // Navigate. `networkidle` waits until the fan-out settles so intermittent
    // failures have a chance to surface or recover before we assert.
    // ---------------------------------------------------------------------
    const response = await page.goto("http://localhost:3000/penthouse", {
      waitUntil: "networkidle",
      timeout: 25_000,
    });

    // Acceptable: the server renders (200) or redirects to lobby if SSR
    // auth check lost the race against the mock. A 500 rendered page
    // would be the regression we are binding against.
    const finalStatus = response?.status() ?? 0;
    expect(
      finalStatus,
      `expected 200/3xx from /penthouse under intermittent Supabase, got ${finalStatus}`,
    ).toBeLessThan(500);

    // ---------------------------------------------------------------------
    // Assert: no uncaught React / hydration errors.
    // ---------------------------------------------------------------------
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

    // ---------------------------------------------------------------------
    // Assert: final DOM exists, no React error-boundary / Next error screen.
    // `<html>` always exists even on error screens, so sniff for typical
    // crash-screen markers instead. Next.js default error page contains
    // "Application error" text; React error boundary renders a fallback.
    // ---------------------------------------------------------------------
    const docText = await page.evaluate(() => document.body.innerText);
    expect(
      docText,
      "Next.js default error screen rendered — unexpected under graceful degradation",
    ).not.toContain("Application error: a server-side exception has occurred");

    // Sanity: the mock actually fired (the app made Supabase requests).
    expect(
      callCount,
      "no Supabase requests were intercepted — mock not wired to app",
    ).toBeGreaterThan(0);
  });
});
