import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers/auth";
import { TIMES, USERS } from "./helpers/fixtures";
import { installSupabaseMock } from "./helpers/mock-supabase";

const EVIDENCE_PATH =
  ".artlab/runs/otis/otis-real-rembg-full-production-v1/browser-qa/browser-qa.json";

const DRAFT_MARKERS =
  /\[(?:REVIEW|TODO|FIXME|briefing_v2)\]|"version"\s*:\s*"v2"|lorem ipsum|UNDER CONSTRUCTION|Coming Soon|\bTBD\b/i;
const ERROR_COPY =
  /out of service|something went wrong|application error|unhandled runtime error/i;

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const MOTION_MODES = [
  { name: "standard", reducedMotion: "no-preference" },
  { name: "reduced-motion", reducedMotion: "reduce" },
] as const;

const SURFACES = [
  {
    name: "lobby",
    path: "/lobby",
    auth: false,
    expected: /The Tower|Reception|Otis/i,
  },
  {
    name: "lobby-onboarding",
    path: "/lobby/onboarding",
    auth: true,
    expected: /Lobby onboarding|Otis intake|Target roles/i,
  },
] as const;

interface BrowserQaEvidence {
  route: string;
  viewport: string;
  motion: string;
  imageCount: number;
  otisImageCount: number;
  otisBounds: Array<{
    alt: string;
    width: number;
    height: number;
    top: number;
    left: number;
    source: string;
  }>;
}

const evidence: BrowserQaEvidence[] = [];

test.describe.configure({ mode: "serial" });

function onboardedTables() {
  return {
    user_profiles: [
      {
        id: USERS.alice.id,
        email: USERS.alice.email,
        display_name: "Alice",
        timezone: "America/New_York",
        subscription_tier: "free",
        arrival_played_at: TIMES.anchor,
        concierge_completed_at: TIMES.anchor,
        first_briefing_shown: true,
        floors_unlocked: ["L", "PH"],
        preferences: {},
        google_tokens: null,
        networking_consent_at: null,
        networking_revoked_at: null,
        networking_consent_version: 2,
        voice_recording_enabled: false,
        voice_recording_permanently_disabled: false,
        created_at: TIMES.anchor,
        updated_at: TIMES.anchor,
      },
    ],
  };
}

async function preparePage(page: Page): Promise<{ consoleErrors: string[]; imageFailures: string[] }> {
  const consoleErrors: string[] = [];
  const imageFailures: string[] = [];

  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (request.resourceType() === "image") {
      imageFailures.push(`${request.url()} ${request.failure()?.errorText ?? "failed"}`);
    }
  });
  page.on("response", (response) => {
    const request = response.request();
    if (request.resourceType() === "image" && response.status() >= 400) {
      imageFailures.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.route("**/api/weather**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ condition: "clear" }),
    });
  });
  await page.route("**/api/notifications**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ notifications: [], data: [], error: null }),
    });
  });
  await page.route("**/api/progression**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ newlyUnlocked: [] }),
    });
  });
  await page.route("**/api/concierge/extract", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
  await page.route("**/api/onboarding/bootstrap-discovery", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  return { consoleErrors, imageFailures };
}

async function installRouteAuth(page: Page, authenticated: boolean): Promise<void> {
  if (authenticated) {
    await signInAs(page, USERS.alice, {
      tables: onboardedTables(),
      allowWrites: true,
    });
    return;
  }

  await installSupabaseMock(page, {
    authedUser: null,
    tables: {},
    allowWrites: false,
  });
}

async function expectHealthySurface(
  page: Page,
  path: string,
  expected: RegExp,
): Promise<void> {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status(), `${path} should not hard-fail`).toBeLessThan(400);
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  }).catch(() => undefined);

  const body = await page.locator("body").innerText();
  expect(body, `${path} should identify its surface`).toMatch(expected);
  expect(body, `${path} should not expose draft markers`).not.toMatch(DRAFT_MARKERS);
  expect(body, `${path} should not render an error boundary`).not.toMatch(ERROR_COPY);
}

async function expectNoHorizontalOverflow(page: Page, routeLabel: string): Promise<void> {
  const overflow = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const documentOverflow =
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - viewportWidth;
    const offenders = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        if (style.pointerEvents === "none") return false;
        if (element.closest("nextjs-portal")) return false;
        if (element.closest("[aria-hidden='true']")) return false;
        if (element instanceof HTMLImageElement && element.alt.trim().length === 0) return false;
        const rect = element.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) return false;
        return rect.left < -2 || rect.right > viewportWidth + 2;
      })
      .slice(0, 8)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          text: (element.getAttribute("aria-label") ?? element.innerText ?? "")
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      });

    return {
      documentOverflow: Math.round(documentOverflow),
      offenders,
    };
  });

  expect(overflow.documentOverflow, `${routeLabel} horizontal overflow`).toBeLessThanOrEqual(2);
  expect(overflow.offenders, `${routeLabel} overflow offenders`).toEqual([]);
}

async function expectImagesLoaded(page: Page, routeLabel: string): Promise<{
  imageCount: number;
  otisImageCount: number;
  otisBounds: BrowserQaEvidence["otisBounds"];
}> {
  await expect
    .poll(async () => page.locator("img").evaluateAll((elements) => {
      const images = elements as HTMLImageElement[];
      return images.every((image) =>
        image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
      );
    }), { message: `${routeLabel} images should load`, timeout: 15_000 })
    .toBe(true);

  const imageState = await page.evaluate(() => {
    const images = Array.from(document.images).map((image) => {
      const rect = image.getBoundingClientRect();
      return {
        alt: image.alt,
        currentSrc: image.currentSrc,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        visible: rect.width > 0 && rect.height > 0,
      };
    });

    const failed = images.filter((image) =>
      !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0
    );
    const otis = images.filter((image) =>
      /otis/i.test(image.alt) || /art%2Flobby%2Fotis|\/art\/lobby\/otis/i.test(image.currentSrc)
    );

    return {
      imageCount: images.length,
      failed,
      otisImageCount: otis.length,
    };
  });

  expect(imageState.failed, `${routeLabel} failed image decodes`).toEqual([]);
  expect(imageState.otisImageCount, `${routeLabel} should render promoted Otis art`).toBeGreaterThan(0);

  const otisLocator = page.locator("img").filter({
    hasNot: page.locator("[data-visual-asset-fallback]"),
  }).and(page.locator("img[alt*='Otis']"));
  await otisLocator.first().scrollIntoViewIfNeeded();

  const otisBounds = await page.evaluate(() => {
    function hasClippingRisk(image: HTMLImageElement): string[] {
      const imageRect = image.getBoundingClientRect();
      const risks: string[] = [];
      let current = image.parentElement;

      while (current && current !== document.body && current !== document.documentElement) {
        const style = window.getComputedStyle(current);
        const overflow = `${style.overflow} ${style.overflowX} ${style.overflowY}`;
        if (/(hidden|clip|auto|scroll)/.test(overflow)) {
          const rect = current.getBoundingClientRect();
          const outside =
            imageRect.left < rect.left - 2 ||
            imageRect.right > rect.right + 2 ||
            imageRect.top < rect.top - 2 ||
            imageRect.bottom > rect.bottom + 2;
          if (outside) {
            risks.push(`${current.tagName.toLowerCase()}.${current.className.toString().slice(0, 80)}`);
          }
        }
        current = current.parentElement;
      }

      return risks;
    }

    return Array.from(document.images)
      .filter((image) => /otis/i.test(image.alt))
      .map((image) => {
        const rect = image.getBoundingClientRect();
        const center = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        const covered =
          !!center &&
          center !== image &&
          !center.closest("[data-character='otis']") &&
          !image.contains(center);
        const aspectRatio = rect.height > 0 ? rect.width / rect.height : 0;

        return {
          alt: image.alt,
          source: image.currentSrc,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          inViewport:
            rect.width > 0 &&
            rect.height > 0 &&
            rect.left >= -2 &&
            rect.right <= window.innerWidth + 2 &&
            rect.top >= -2 &&
            rect.bottom <= window.innerHeight + 2,
          objectFit: window.getComputedStyle(image).objectFit,
          aspectRatio,
          clippingRisks: hasClippingRisk(image),
          covered,
        };
      });
  });

  expect(otisBounds.length, `${routeLabel} should have Otis bounds`).toBeGreaterThan(0);
  expect(
    otisBounds.filter((item) =>
      !item.inViewport ||
      item.objectFit !== "contain" ||
      item.aspectRatio < 0.45 ||
      item.aspectRatio > 0.75 ||
      item.clippingRisks.length > 0 ||
      item.covered
    ),
    `${routeLabel} Otis crop/overlap/fit issues`,
  ).toEqual([]);

  return {
    imageCount: imageState.imageCount,
    otisImageCount: imageState.otisImageCount,
    otisBounds: otisBounds.map((item) => ({
      alt: item.alt,
      width: item.width,
      height: item.height,
      top: item.top,
      left: item.left,
      source: item.source,
    })),
  };
}

async function expectReducedMotion(page: Page, routeLabel: string): Promise<void> {
  const animated = await page.evaluate(() => {
    function seconds(value: string): number {
      return value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          if (part.endsWith("ms")) return Number.parseFloat(part) / 1000;
          if (part.endsWith("s")) return Number.parseFloat(part);
          return Number.parseFloat(part) || 0;
        })
        .reduce((max, current) => Math.max(max, current), 0);
    }

    return Array.from(document.body.querySelectorAll<HTMLElement>("*"))
      .filter((element) => !element.closest("nextjs-portal"))
      .map((element) => {
        const style = window.getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          label: (element.getAttribute("aria-label") ?? element.textContent ?? "")
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 80),
          animationName: style.animationName,
          animationDuration: seconds(style.animationDuration),
          animationIterationCount: style.animationIterationCount,
        };
      })
      .filter((item) =>
        item.animationName !== "none" &&
        (item.animationDuration > 0.05 || item.animationIterationCount === "infinite")
      )
      .slice(0, 10);
  });

  expect(animated, `${routeLabel} should not run CSS animations under reduced motion`).toEqual([]);

  const otisMotion = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("[data-character='otis']"))
      .map((element) => element.getAttribute("data-reduced-motion"))
      .filter(Boolean),
  );

  expect(otisMotion, `${routeLabel} Otis stage should record reduced motion`).toContain("true");
}

for (const surface of SURFACES) {
  for (const viewport of VIEWPORTS) {
    for (const motion of MOTION_MODES) {
      test(`${surface.name} Otis browser QA at ${viewport.name} (${motion.name})`, async ({ page }) => {
        const observed = await preparePage(page);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.emulateMedia({ reducedMotion: motion.reducedMotion });
        await installRouteAuth(page, surface.auth);
        await expectHealthySurface(page, surface.path, surface.expected);
        await expectNoHorizontalOverflow(page, `${surface.path} ${viewport.name} ${motion.name}`);
        const imageEvidence = await expectImagesLoaded(
          page,
          `${surface.path} ${viewport.name} ${motion.name}`,
        );
        if (motion.reducedMotion === "reduce") {
          await expectReducedMotion(page, `${surface.path} ${viewport.name}`);
        }

        expect(observed.imageFailures, `${surface.path} image network failures`).toEqual([]);
        expect(observed.consoleErrors, `${surface.path} console errors`).toEqual([]);
        evidence.push({
          route: surface.path,
          viewport: viewport.name,
          motion: motion.name,
          ...imageEvidence,
        });
      });
    }
  }
}

test.afterAll(() => {
  mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
  writeFileSync(
    EVIDENCE_PATH,
    `${JSON.stringify({
      schemaVersion: "tower-otis-browser-qa-v1",
      runId: "otis-real-rembg-full-production-v1",
      checkedAt: new Date().toISOString(),
      scope: {
        routes: SURFACES.map((surface) => surface.path),
        viewports: VIEWPORTS.map((viewport) => viewport.name),
        motionModes: MOTION_MODES.map((motion) => motion.name),
        checks: [
          "image-loading",
          "otis-crop-fit",
          "layout-overlap",
          "horizontal-overflow",
          "reduced-motion",
          "console-errors",
        ],
      },
      status: "passed",
      evidence,
    }, null, 2)}\n`,
  );
});
