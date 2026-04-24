import { test, expect, type Page } from "@playwright/test";
import { installSupabaseMock } from "../helpers/mock-supabase";
import { signInAs } from "../helpers/auth";
import { loadFixture, USERS } from "../helpers/fixtures";

/**
 * R12.9 — R9 Orrery frame-timing carryover proof.
 *
 * Closes the R9.5 caveat noted in the ledger: "Perf gate uses
 * architectural-invariant test (single GSAP timeline, CSS contain on planet,
 * will-change scoped to orbit groups) instead of JSDOM frame-time measurement.
 * JSDOM cannot measure real frame times." This spec runs in real Chromium,
 * mounts 100 planets, and binds three Intent-level R9 invariants:
 *   1. Render loop holds ≥30fps median at 100 planets.
 *   2. Click-to-detail opens the planet panel in <250ms.
 *   3. Supernova celebration completes within ±10% of the CSS-declared 2.4s.
 *
 * NEVER weakens a failing assertion. If the real Orrery doesn't meet one of
 * these thresholds, the failing test stays — partner files a blocker and we
 * investigate.
 *
 * Fixture: tests/e2e/fixtures/planets-100.json — 100 deterministic
 * applications with stable ids plt-000..plt-099, statuses spread so one
 * supernova (status="offer", index 95) fires, ten fade (rejected, indices
 * 85..94), and the remaining 89 are clickable (applied/screening/
 * interviewing/interview_scheduled).
 */

type PlanetFixtureRow = Record<string, unknown>;

const SUPERNOVA_SPEC_MS = 2400; // from src/components/floor-2/orrery/orrery.css
const FPS_FLOOR = 30;
const CLICK_TO_DETAIL_MAX_MS = 250;

/**
 * Wire the Supabase REST mock before navigation so requireUser() and the
 * observatory page's two .from("applications") calls hit the fixture, not the
 * real project. Supabase REST select with a count=exact head=true is routed
 * to /rest/v1/applications?select=id&status=eq.accepted; buildFixtureHandler
 * returns the full row list for any GET under /rest/v1/applications — the
 * head-true path gets the same body, length becomes the count. Since our
 * fixture has zero status="accepted" rows, hasOfferEverFired resolves false
 * and the supernova for the one status="offer" planet fires.
 */
async function installOrreryMock(page: Page): Promise<void> {
  const planets = loadFixture<PlanetFixtureRow[]>("planets-100.json");
  await signInAs(page, USERS.alice, {
    tables: {
      applications: planets,
      rejection_reflections: [],
      user_profiles: [
        {
          id: USERS.alice.id,
          email: USERS.alice.email,
          networking_consent_version: 2,
          consented_at: "2026-04-01T00:00:00Z",
        },
      ],
    },
  });
}

/**
 * Before any navigation, install an init-script that records the actual
 * wall-clock duration of the supernova CSS animation by listening for
 * animationstart + animationend. The orrery mounts the supernova planet with
 * class orrery-supernova on first paint, which triggers
 * @keyframes orrery-supernova-burst — we capture the two boundary timestamps
 * via window.__supernova{Start,End}.
 */
async function installSupernovaProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __supernovaStart?: number;
      __supernovaEnd?: number;
    };
    window.addEventListener("animationstart", (event: AnimationEvent) => {
      if (event.animationName === "orrery-supernova-burst" && w.__supernovaStart === undefined) {
        w.__supernovaStart = performance.now();
      }
    });
    window.addEventListener("animationend", (event: AnimationEvent) => {
      if (event.animationName === "orrery-supernova-burst" && w.__supernovaEnd === undefined) {
        w.__supernovaEnd = performance.now();
      }
    });
  });
}

test.describe("Orrery at 100 planets — render loop — median FPS ≥ 30", () => {
  test("rAF sampling over 3s shows median frame rate >= 30fps with 100 planets on ring", async ({
    page,
  }) => {
    await installOrreryMock(page);
    await page.goto("/observatory");
    await page.waitForSelector('[role="img"][aria-label*="Pipeline orrery"]', {
      timeout: 10_000,
    });
    // Let the GSAP timeline settle a beat before we measure — first frames
    // after mount are always noisy (layout, font-load, first paint).
    await page.waitForTimeout(500);

    const fps = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const frames: number[] = [];
        let last = performance.now();
        const start = last;
        const sampleMs = 3000;
        function tick(): void {
          const now = performance.now();
          const delta = now - last;
          if (delta > 0) frames.push(1000 / delta);
          last = now;
          if (now - start < sampleMs) {
            requestAnimationFrame(tick);
          } else {
            // Drop the first sample (initial-frame pacing skew) then take median.
            const sorted = frames.slice(1).sort((a, b) => a - b);
            const median = sorted.length === 0 ? 0 : sorted[Math.floor(sorted.length / 2)];
            resolve(median ?? 0);
          }
        }
        requestAnimationFrame(tick);
      });
    });

    // REGRESSION CANDIDATE: if this fails, the R9.5 structural invariants
    // (single GSAP timeline, CSS contain on planets, will-change scoped to
    // orbit groups) are not translating to real-Chromium frame pacing at the
    // 100-planet threshold. File a blocker, do NOT weaken this assert.
    expect(fps).toBeGreaterThanOrEqual(FPS_FLOOR);
  });
});

test.describe("Orrery click — planet selection — detail opens in <250ms", () => {
  test("clicking a clickable planet reveals orrery-planet-detail dialog under 250ms", async ({
    page,
  }) => {
    await installOrreryMock(page);
    await page.goto("/observatory");
    await page.waitForSelector('[role="img"][aria-label*="Pipeline orrery"]', {
      timeout: 10_000,
    });

    // Pick the first clickable (non-fading) planet — plt-000 is status="applied"
    // so it has no pointer-events:none override. A rejected planet would be
    // uninteractable by design (R9 "rejections fade" invariant).
    const planetLocator = page.locator('[data-orrery-planet="plt-000"]');
    await planetLocator.waitFor({ state: "visible", timeout: 5_000 });

    const startNs = Date.now();
    // R12.10 — `force: true` bypasses Playwright's "stable" check. The
    // planet sits in a perpetual GSAP orbital animation, so Playwright's
    // default actionability gate would flake or time out waiting for it
    // to stop moving. `force` is appropriate here: the click target is
    // a real button, the bug we're binding is "click → detail < 250ms",
    // not "is the planet stable for 0ms first."
    await planetLocator.click({ force: true });
    await page.waitForSelector('[data-testid="orrery-planet-detail"]', {
      timeout: 1_000,
    });
    const elapsedMs = Date.now() - startNs;

    // REGRESSION CANDIDATE: if this exceeds 250ms, click-to-detail has
    // regressed from the R9.3 "click-to-history is instant" intent. Most
    // likely causes: unnecessary data fetch in the click handler, or the
    // GSAP camera-dolly blocking paint. File a blocker, do NOT weaken.
    expect(elapsedMs).toBeLessThan(CLICK_TO_DETAIL_MAX_MS);
  });
});

test.describe("Orrery supernova — celebration animation — completes within ±10% of spec", () => {
  test("orrery-supernova-burst keyframe runs 2.4s (±240ms) start-to-finish on mount", async ({
    page,
  }) => {
    await installSupernovaProbe(page);
    await installOrreryMock(page);
    await page.goto("/observatory");
    await page.waitForSelector('[role="img"][aria-label*="Pipeline orrery"]', {
      timeout: 10_000,
    });

    // The supernova planet is plt-095 (status="offer"). applicationsToPlanets
    // sets isSupernova=true because the mock returns count=0 for accepted —
    // hasOfferEverFired resolves false. OrreryRender then applies the
    // .orrery-supernova class, CSS kicks @keyframes orrery-supernova-burst.
    await page.waitForSelector('[data-orrery-planet="plt-095"].orrery-supernova', {
      timeout: 5_000,
    });

    // Wait for both animationstart and animationend to fire on the window
    // (installed via addInitScript above). Total CSS spec is 2.4s so allow
    // up to 5s wall clock for slow CI before giving up.
    const duration = await page.waitForFunction(
      () => {
        const w = window as unknown as {
          __supernovaStart?: number;
          __supernovaEnd?: number;
        };
        if (w.__supernovaStart === undefined || w.__supernovaEnd === undefined) {
          return null;
        }
        return w.__supernovaEnd - w.__supernovaStart;
      },
      null,
      { timeout: 5_000 },
    );

    const ms = await duration.jsonValue();
    expect(typeof ms).toBe("number");
    const tolerance = SUPERNOVA_SPEC_MS * 0.1;
    const lower = SUPERNOVA_SPEC_MS - tolerance;
    const upper = SUPERNOVA_SPEC_MS + tolerance;

    // REGRESSION CANDIDATE: if actual animation duration drifts outside
    // 2160–2640ms, the CSS keyframe timing has been edited OR the browser
    // throttled the animation frame budget. Check orrery.css
    // @keyframes orrery-supernova-burst and any reduced-motion overrides.
    // File a blocker, do NOT weaken tolerance.
    expect(ms as number).toBeGreaterThanOrEqual(lower);
    expect(ms as number).toBeLessThanOrEqual(upper);
  });
});

// Guard against unused-import lint errors if a future refactor removes an
// above helper — kept here so static readers see the mock surface wiring.
void installSupabaseMock;
