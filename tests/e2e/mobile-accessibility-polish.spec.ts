import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers/auth";
import { TIMES, USERS } from "./helpers/fixtures";

const DRAFT_MARKERS =
  /\[(?:REVIEW|TODO|FIXME|briefing_v2)\]|"version"\s*:\s*"v2"|lorem ipsum|UNDER CONSTRUCTION|Coming Soon|search\.We're/i;
const ERROR_COPY =
  /out of service|something went wrong|application error|unhandled runtime error/i;

const VIEWPORTS = [
  { name: "iPhone", width: 390, height: 844, touch: true },
  { name: "iPad", width: 820, height: 1180, touch: true },
  { name: "desktop", width: 1440, height: 900, touch: false },
] as const;

const PUBLIC_ROUTES = [
  { path: "/lobby", expected: /The Tower|Reception/i },
  { path: "/waitlist", expected: /Step into the lobby|Request key/i },
  { path: "/pricing", expected: /Every specialist floor unlocked|Request key/i },
  { path: "/privacy", expected: /Privacy/i },
  { path: "/terms", expected: /Terms/i },
] as const;

const AUTH_ROUTES = [
  { path: "/penthouse", expected: /Penthouse|Command center/i, spatialChrome: true },
  { path: "/war-room", expected: /War Room|war table/i, spatialChrome: true },
  { path: "/rolodex-lounge", expected: /Rolodex Lounge|No contacts yet/i, spatialChrome: true },
  { path: "/writing-room", expected: /Writing Room|No document selected/i, spatialChrome: true },
  { path: "/situation-room", expected: /Situation Room|No pending follow-ups/i, spatialChrome: true },
  { path: "/briefing-room", expected: /Briefing Room|No interviews scheduled/i, spatialChrome: true },
  { path: "/observatory", expected: /Observatory|orrery/i, spatialChrome: true },
  { path: "/c-suite", expected: /C-Suite|CEO/i, spatialChrome: true },
  { path: "/settings", expected: /Settings|Gmail & Calendar/i, spatialChrome: true },
  { path: "/lobby/onboarding", expected: /Target roles|Lobby onboarding/i, spatialChrome: false },
  { path: "/milestones", expected: /Milestones|Tower progression/i, spatialChrome: true },
] as const;

function emptyFreshUserTables(): Record<string, Array<Record<string, unknown>>> {
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
        last_floor_visited: "PH",
        floors_unlocked: ["L", "PH", "7", "6", "5", "4", "3", "2", "1"],
        preferences: {
          rejectionReflections: { enabled: true },
          ceoVoice: { enabled: false },
        },
        google_tokens: null,
        networking_consent_at: null,
        networking_revoked_at: null,
        networking_consent_version: 2,
        voice_recording_enabled: false,
        voice_recording_permanently_disabled: false,
        drill_preferences: { interruptFirmness: "firm", timerSeconds: 90 },
        created_at: TIMES.anchor,
        updated_at: TIMES.anchor,
      },
    ],
    applications: [],
    calendar_events: [],
    companies: [],
    contacts: [],
    documents: [],
    emails: [],
    interviews: [],
    notifications: [],
    offers: [],
    outreach_queue: [],
    progression_milestones: [],
    agent_memory: [],
    agent_dispatches: [],
    match_events: [],
    user_preferences: [],
  };
}

function watchConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const location = message.location();
    const suffix = location.url
      ? ` @ ${location.url}:${location.lineNumber}:${location.columnNumber}`
      : "";
    errors.push(`${message.text()}${suffix}`);
  });
  return errors;
}

async function preparePage(page: Page, viewport: (typeof VIEWPORTS)[number]): Promise<void> {
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
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  }).catch(() => undefined);
}

async function expectHealthyPage(
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
    const root = document.documentElement;
    const body = document.body;
    const viewportWidth = window.innerWidth;
    const documentOverflow = Math.max(root.scrollWidth, body.scrollWidth) - viewportWidth;
    const offenders = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        if (style.pointerEvents === "none") return false;
        if (element.closest("nextjs-portal")) return false;
        if (element.closest("[aria-hidden='true']")) return false;
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
          classes: element.className.toString().slice(0, 120),
        };
      });

    return {
      documentOverflow: Math.round(documentOverflow),
      offenders,
    };
  });

  expect(
    overflow.documentOverflow,
    `${routeLabel} should not create body-level horizontal overflow`,
  ).toBeLessThanOrEqual(2);
  expect(overflow.offenders, `${routeLabel} overflow offenders`).toEqual([]);
}

async function expectNamedInteractiveControls(
  page: Page,
  routeLabel: string,
): Promise<void> {
  const unnamed = await page.evaluate(() => {
    function isVisible(element: HTMLElement): boolean {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    }

    function labelText(element: HTMLElement): string {
      const aria = element.getAttribute("aria-label")?.trim();
      if (aria) return aria;
      const labelledBy = element.getAttribute("aria-labelledby");
      if (labelledBy) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
          .join(" ")
          .trim();
        if (text) return text;
      }
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        if (element.labels?.length) {
          const text = Array.from(element.labels)
            .map((label) => label.textContent?.trim() ?? "")
            .join(" ")
            .trim();
          if (text) return text;
        }
        if (element.placeholder) return element.placeholder;
      }
      if (element instanceof HTMLImageElement && element.alt) return element.alt;
      return element.textContent?.trim() ?? "";
    }

    return Array.from(
      document.querySelectorAll<HTMLElement>(
        "a[href], button, input, select, textarea, summary, [role='button'], [role='menuitem']",
      ),
    )
      .filter((element) => isVisible(element))
      .filter((element) => !element.closest("nextjs-portal"))
      .filter((element) => labelText(element).replace(/\s+/g, "").length === 0)
      .slice(0, 10)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        role: element.getAttribute("role"),
        classes: element.className.toString().slice(0, 100),
      }));
  });

  expect(unnamed, `${routeLabel} should not expose unnamed interactive controls`).toEqual([]);
}

async function expectTouchTargets(page: Page, routeLabel: string): Promise<void> {
  const tooSmall = await page.evaluate(() => {
    function isVisible(element: HTMLElement): boolean {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    }

    function labelText(element: HTMLElement): string {
      return (
        element.getAttribute("aria-label") ??
        element.getAttribute("title") ??
        element.textContent ??
        ""
      )
        .trim()
        .replace(/\s+/g, " ");
    }

    return Array.from(
      document.querySelectorAll<HTMLElement>(
        "button, input, select, textarea, summary, [role='button'], [role='menuitem'], a[href]",
      ),
    )
      .filter((element) => isVisible(element))
      .filter((element) => !element.closest("p, li"))
      .filter((element) => !element.closest("nextjs-portal"))
      .filter((element) => {
        if (!(element instanceof HTMLInputElement)) return true;
        return element.type !== "checkbox" && element.type !== "radio";
      })
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      })
      .slice(0, 12)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          label: labelText(element).slice(0, 80),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          classes: element.className.toString().slice(0, 120),
        };
      });
  });

  expect(tooSmall, `${routeLabel} should keep touch targets at least 44px`).toEqual([]);
}

async function expectKeyboardFocus(page: Page, routeLabel: string): Promise<void> {
  await page.keyboard.press("Home").catch(() => undefined);
  const seen: string[] = [];

  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press("Tab");
    const focusState = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || active === document.body) return null;
      const rect = active.getBoundingClientRect();
      const style = window.getComputedStyle(active);
      const label =
        active.getAttribute("aria-label") ??
        active.textContent?.trim().replace(/\s+/g, " ") ??
        active.tagName.toLowerCase();
      const hasVisibleFocus =
        style.outlineStyle !== "none" ||
        style.boxShadow !== "none" ||
        style.borderColor.includes("201, 168, 76") ||
        style.borderColor.includes("rgb(201");

      return {
        key: `${active.tagName.toLowerCase()}:${label.slice(0, 40)}`,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        hasVisibleFocus,
      };
    });

    if (!focusState) continue;
    seen.push(focusState.key);
    expect(focusState.width, `${routeLabel} focused item should have width`).toBeGreaterThan(0);
    expect(focusState.height, `${routeLabel} focused item should have height`).toBeGreaterThan(0);
    expect(focusState.hasVisibleFocus, `${routeLabel} focused item should show focus`).toBe(true);
  }

  expect(new Set(seen).size, `${routeLabel} should expose multiple keyboard stops`).toBeGreaterThan(1);
}

async function expectReducedMotionSettled(page: Page, routeLabel: string): Promise<void> {
  const moving = await page.evaluate(() => {
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
        const animationDuration = seconds(style.animationDuration);
        const transitionDuration = seconds(style.transitionDuration);
        return {
          tag: element.tagName.toLowerCase(),
          text: (element.getAttribute("aria-label") ?? element.textContent ?? "")
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 80),
          animationDuration,
          animationIterationCount: style.animationIterationCount,
          transitionDuration,
        };
      })
      .filter(
        (item) =>
          item.animationDuration > 0.05 ||
          item.transitionDuration > 0.05 ||
          item.animationIterationCount === "infinite",
      )
      .slice(0, 10);
  });

  expect(moving, `${routeLabel} should respect prefers-reduced-motion`).toEqual([]);
}

async function expectSpatialChrome(page: Page, routeLabel: string): Promise<void> {
  await expect(
    page.getByRole("navigation", { name: /floor navigation/i }).first(),
    `${routeLabel} should keep the elevator navigation available`,
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /account menu/i }),
    `${routeLabel} should keep account controls available`,
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /mute sound|enable sound/i }),
    `${routeLabel} should keep the spatial sound toggle available`,
  ).toBeVisible();
}

test.describe("mobile-first visual and accessibility polish", () => {
  for (const viewport of VIEWPORTS) {
    test(`public pages hold up at ${viewport.name}`, async ({ page }) => {
      const consoleErrors = watchConsole(page);
      await preparePage(page, viewport);

      for (const route of PUBLIC_ROUTES) {
        await expectHealthyPage(page, route.path, route.expected);
        await expectNoHorizontalOverflow(page, `${route.path} at ${viewport.name}`);
        await expectNamedInteractiveControls(page, `${route.path} at ${viewport.name}`);
        await expectKeyboardFocus(page, `${route.path} at ${viewport.name}`);
        await expectReducedMotionSettled(page, `${route.path} at ${viewport.name}`);
        if (viewport.touch) {
          await expectTouchTargets(page, `${route.path} at ${viewport.name}`);
        }
      }

      expect(consoleErrors).toEqual([]);
    });

    test(`authenticated floors hold up at ${viewport.name}`, async ({ page }) => {
      const consoleErrors = watchConsole(page);
      await preparePage(page, viewport);
      await signInAs(page, USERS.alice, {
        tables: emptyFreshUserTables(),
        allowWrites: true,
      });

      for (const route of AUTH_ROUTES) {
        await expectHealthyPage(page, route.path, route.expected);
        if (route.spatialChrome !== false) {
          await expectSpatialChrome(page, `${route.path} at ${viewport.name}`);
        }
        await expectNoHorizontalOverflow(page, `${route.path} at ${viewport.name}`);
        await expectNamedInteractiveControls(page, `${route.path} at ${viewport.name}`);
        await expectKeyboardFocus(page, `${route.path} at ${viewport.name}`);
        await expectReducedMotionSettled(page, `${route.path} at ${viewport.name}`);
        if (viewport.touch) {
          await expectTouchTargets(page, `${route.path} at ${viewport.name}`);
        }
      }

      const parlorResponse = await page.goto("/parlor", { waitUntil: "domcontentloaded" });
      expect(parlorResponse?.status(), "/parlor should resolve or redirect cleanly").toBeLessThan(400);
      await expect(page).toHaveURL(/\/c-suite$/);
      expect(consoleErrors).toEqual([]);
    });
  }
});
