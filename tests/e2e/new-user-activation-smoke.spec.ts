import { test, expect, type Page } from "@playwright/test";
import { signInAs } from "./helpers/auth";
import { TIMES, USERS } from "./helpers/fixtures";

const DRAFT_MARKERS = /\[(?:REVIEW|TODO|FIXME)\]|lorem ipsum|UNDER CONSTRUCTION|Coming Soon|search\.We're/i;
const ERROR_COPY = /out of service|something went wrong|application error|unhandled runtime error/i;

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
    errors.push(message.text());
  });
  return errors;
}

async function expectHealthyPage(page: Page, path: string): Promise<string> {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status(), `${path} should not hard-fail`).toBeLessThan(400);
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  const body = await page.locator("body").innerText();
  expect(body, `${path} should not expose draft or launch-trust markers`).not.toMatch(DRAFT_MARKERS);
  expect(body, `${path} should not render an error boundary`).not.toMatch(ERROR_COPY);
  return body;
}

test.describe("new-user activation smoke", () => {
  test("public launch surfaces are coherent and beta-gated", async ({ page }) => {
    const consoleErrors = watchConsole(page);

    await expectHealthyPage(page, "/lobby");
    await expect(page.getByLabel("Private beta access notice")).toContainText("PRIVATE BETA");
    await expect(page.getByRole("link", { name: /join the waitlist/i })).toBeVisible();

    await expectHealthyPage(page, "/waitlist");
    await expect(
      page.getByText("search. We're letting people in slowly", { exact: false }),
    ).toBeVisible();

    await expectHealthyPage(page, "/pricing");
    await expect(page.getByRole("link", { name: /^request key$/i })).toHaveCount(2);
    await expect(page.getByRole("link", { name: /request team access/i })).toHaveAttribute(
      "href",
      "/waitlist",
    );

    await expectHealthyPage(page, "/privacy");
    await expectHealthyPage(page, "/terms");
    expect(consoleErrors).toEqual([]);
  });

  test("a signed-in empty account can enter every floor and account surface", async ({
    page,
  }) => {
    const consoleErrors = watchConsole(page);
    await signInAs(page, USERS.alice, {
      tables: emptyFreshUserTables(),
      allowWrites: true,
    });

    const floorChecks: Array<{
      path: string;
      label: string | RegExp;
      check: () => Promise<void>;
    }> = [
      {
        path: "/penthouse",
        label: /Penthouse/i,
        check: async () => {
          await expect(page.getByLabel("Penthouse — Floor PH")).toBeVisible();
        },
      },
      {
        path: "/war-room",
        label: /War Room/i,
        check: async () => {
          await expect(page.getByLabel("War table", { exact: true })).toBeVisible();
          await expect(page.getByLabel("Empty war table — invitation to start")).toBeVisible();
        },
      },
      {
        path: "/rolodex-lounge",
        label: /Rolodex Lounge/i,
        check: async () => {
          await expect(page.getByText("No contacts yet. Add one to start building your network.")).toBeVisible();
        },
      },
      {
        path: "/writing-room",
        label: /Writing Room/i,
        check: async () => {
          await expect(page.getByRole("listbox", { name: "Cover letters" })).toBeVisible();
          await expect(page.getByLabel("No document selected")).toBeVisible();
        },
      },
      {
        path: "/situation-room",
        label: /Situation Room/i,
        check: async () => {
          await expect(page.getByLabel("No pending follow-ups")).toBeVisible();
        },
      },
      {
        path: "/briefing-room",
        label: /Briefing Room/i,
        check: async () => {
          await expect(page.getByLabel("Interview timeline panel")).toBeVisible();
          await expect(page.getByLabel("No interviews scheduled")).toBeVisible();
        },
      },
      {
        path: "/observatory",
        label: /Observatory/i,
        check: async () => {
          await expect(
            page.getByLabel("Pipeline orrery — the centerpiece of the Observatory"),
          ).toBeVisible();
        },
      },
      {
        path: "/c-suite",
        label: /C-Suite/i,
        check: async () => {
          await expect(page.getByRole("button", { name: /CEO — Click to open executive briefing/i })).toBeVisible();
          await expect(page.getByLabel("Agent network and orchestration")).toBeVisible();
          await expect(page.getByLabel("CEO control panel — agent network status")).toBeVisible();
        },
      },
      {
        path: "/settings",
        label: /Settings/,
        check: async () => {
          await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
          await expect(page.getByText("Gmail & Calendar")).toBeVisible();
          await expect(
            page.getByRole("button", { name: /connect gmail and google calendar/i }),
          ).toBeVisible();
          await expect(page.getByRole("button", { name: /request data export/i })).toBeVisible();
          await expect(page.getByRole("button", { name: /delete account/i })).toBeVisible();
          await expect(page.getByText("Sign Out")).toBeVisible();
        },
      },
    ];

    for (const floor of floorChecks) {
      const body = await expectHealthyPage(page, floor.path);
      expect(body, `${floor.path} should identify the floor`).toMatch(floor.label);
      await floor.check();
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await expectHealthyPage(page, "/penthouse");
    await page.addStyleTag({
      content: "nextjs-portal { display: none !important; }",
    });
    await expect(page.getByRole("button", { name: /open floor menu/i })).toBeVisible();
    await expect(page.getByRole("dialog", { name: /floor navigation/i })).toHaveCount(0);
    await page.getByRole("button", { name: /open floor menu/i }).click();
    const mobileFloorDialog = page.getByRole("dialog", { name: /floor navigation/i });
    await expect(mobileFloorDialog).toBeVisible();
    await expect(
      mobileFloorDialog.getByRole("button", { name: /The War Room/i }),
    ).toBeVisible();

    const parlorResponse = await page.goto("/parlor", { waitUntil: "domcontentloaded" });
    expect(parlorResponse?.status()).toBeLessThan(400);
    await expect(page).toHaveURL(/\/c-suite$/);
    expect(consoleErrors).toEqual([]);
  });
});
