// @vitest-environment happy-dom

import { act } from "react";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsClient } from "./settings-client";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const BASE_PROPS = {
  userName: "Alice",
  userEmail: "alice@example.com",
  avatarUrl: null,
  provider: "google",
  subscriptionTier: "free" as const,
  appsUsed: 0,
  deletedAt: null,
  networkingConsentAt: null,
  networkingRevokedAt: null,
  rejectionReflectionsEnabled: true,
  ceoVoiceEnabled: false,
  matchEvents: [],
};

const ATTENTION_HEALTH = {
  status: "attention" as const,
  cron: {
    configuredJobs: 14,
    lastRuns: [
      {
        jobName: "sync",
        startedAt: "2026-05-08T12:00:00.000Z",
        finishedAt: "2026-05-08T12:00:01.000Z",
        success: true,
        durationMs: 1000,
        errorMessage: null,
        stale: false,
      },
      {
        jobName: "briefing",
        startedAt: "2026-05-08T13:00:00.000Z",
        finishedAt: "2026-05-08T13:00:03.000Z",
        success: false,
        durationMs: 3000,
        errorMessage: "Provider 503",
        stale: false,
      },
    ],
    staleJobs: [],
    failingJobs: [
      {
        jobName: "briefing",
        startedAt: "2026-05-08T13:00:00.000Z",
        finishedAt: "2026-05-08T13:00:03.000Z",
        success: false,
        durationMs: 3000,
        errorMessage: "Provider 503",
        stale: false,
      },
    ],
  },
  stripe: {
    failedRecent: [
      {
        eventId: "evt_failed",
        type: "checkout.session.completed",
        receivedAt: "2026-05-08T14:00:00.000Z",
        status: "failed",
        error: "Failed to persist checkout tier",
      },
    ],
  },
};

interface Mounted {
  host: HTMLDivElement;
  root: Root;
  unmount: () => void;
}

function mount(node: ReactElement): Mounted {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(node);
  });
  return {
    host,
    root,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      host.remove();
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function installFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(handler);
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function click(button: HTMLButtonElement): Promise<void> {
  await act(async () => {
    button.click();
    await flushPromises();
  });
}

function findButton(host: HTMLElement, name: RegExp): HTMLButtonElement {
  const button = Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) =>
      name.test(candidate.textContent ?? "") ||
      name.test(candidate.getAttribute("aria-label") ?? ""),
  );
  if (!button) {
    throw new Error(`No button matched ${name}`);
  }
  return button;
}

function findButtonByAria(host: HTMLElement, label: RegExp): HTMLButtonElement {
  const button = Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) => label.test(candidate.getAttribute("aria-label") ?? ""),
  );
  if (!button) {
    throw new Error(`No button aria-label matched ${label}`);
  }
  return button;
}

let cleanups: Array<() => void> = [];
const originalFetch = globalThis.fetch;

beforeEach(() => {
  cleanups = [];
  window.history.pushState(null, "", "/settings");
});

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
  document.body.innerHTML = "";
  window.history.pushState(null, "", "/settings");
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("SettingsClient connected services", () => {
  it("surfaces the Gmail and Calendar connection entry point", () => {
    const html = renderToStaticMarkup(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration={false} />,
    );

    expect(html).toContain("Gmail &amp; Calendar");
    expect(html).toContain("Connect Gmail and Calendar");
    expect(html).toContain("Connect");
    expect(html).not.toContain("Coming Soon");
  });

  it("surfaces manual sync controls after Google is connected", () => {
    const html = renderToStaticMarkup(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration />,
    );

    expect(html).toContain("Google workspace is connected");
    expect(html).toContain("Sync Gmail");
    expect(html).toContain("Sync Calendar");
    expect(html).toContain("Disconnect");
    expect(html).not.toContain("Coming Soon");
  });

  it("lets users revisit their concierge intake from settings", () => {
    const html = renderToStaticMarkup(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration={false} />,
    );

    expect(html).toContain("Career intake");
    expect(html).toContain("Update your target roles, locations, timeline, resume status, and constraints.");
    expect(html).toContain("Redo intake");
    expect(html).toContain("Resume intake");
  });

  it("describes current Google sign-in security without disabled roadmap copy", () => {
    const html = renderToStaticMarkup(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration={false} />,
    );

    expect(html).toContain("Google account security");
    expect(html).toContain("Protected");
    expect(html).not.toMatch(/future wave|not yet available|Unavailable/i);
  });

  it("opens the Google OAuth desk when the auth route returns a URL", async () => {
    const authUrl =
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=tower";
    const fetchMock = installFetch(async () => jsonResponse({ authUrl }));
    const mounted = mount(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration={false} />,
    );
    cleanups.push(mounted.unmount);

    await click(findButton(mounted.host, /^Connect$/i));

    expect(fetchMock).toHaveBeenCalledWith("/api/gmail/auth?next=/settings", {
      method: "GET",
    });
    expect(window.location.href).toBe(authUrl);
  });

  it("shows an error when the Google OAuth desk is unavailable", async () => {
    installFetch(async () => jsonResponse({ error: "unavailable" }, 503));
    const mounted = mount(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration={false} />,
    );
    cleanups.push(mounted.unmount);

    await click(findButton(mounted.host, /^Connect$/i));

    expect(mounted.host.textContent ?? "").toContain(
      "The connection desk did not answer. Try again in a moment.",
    );
  });

  it("requests Gmail and Calendar manual syncs from connected settings", async () => {
    const fetchMock = installFetch(async (input) =>
      String(input).includes("/api/gmail/sync")
        ? jsonResponse({ synced: 2, classified: 1, failed: 0 })
        : jsonResponse({ synced: 1 }),
    );
    const mounted = mount(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration />,
    );
    cleanups.push(mounted.unmount);

    await click(findButton(mounted.host, /Sync Gmail/i));
    expect(fetchMock).toHaveBeenLastCalledWith("/api/gmail/sync", {
      method: "POST",
    });
    expect(mounted.host.textContent ?? "").toContain(
      "Gmail sync complete: 2 items updated, 1 job-search signal classified.",
    );

    await click(findButton(mounted.host, /Sync Calendar/i));
    expect(fetchMock).toHaveBeenLastCalledWith("/api/calendar/sync", {
      method: "POST",
    });
  });

  it("surfaces a specific Google reconnect message when manual sync has no token", async () => {
    installFetch(async () =>
      jsonResponse(
        {
          error: "Google workspace is not connected.",
          code: "GOOGLE_NOT_CONNECTED",
        },
        409,
      ),
    );
    const mounted = mount(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration />,
    );
    cleanups.push(mounted.unmount);

    await click(findButton(mounted.host, /Sync Gmail/i));

    expect(mounted.host.textContent ?? "").toContain(
      "Google workspace is not connected. Reconnect Gmail and Calendar.",
    );
  });

  it("surfaces Google provider setup failures from manual sync", async () => {
    installFetch(async () =>
      jsonResponse(
        {
          error:
            "Google API access is not enabled for this Tower OAuth project.",
          code: "GOOGLE_API_DISABLED",
        },
        503,
      ),
    );
    const mounted = mount(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration />,
    );
    cleanups.push(mounted.unmount);

    await click(findButton(mounted.host, /Sync Calendar/i));

    expect(mounted.host.textContent ?? "").toContain(
      "Tower's Google API access is not fully enabled yet.",
    );
  });

  it("disconnects Google and returns the settings row to the connect state", async () => {
    const fetchMock = installFetch(async () => jsonResponse({ ok: true }));
    const mounted = mount(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration />,
    );
    cleanups.push(mounted.unmount);

    await click(findButton(mounted.host, /^Disconnect$/i));

    expect(fetchMock).toHaveBeenCalledWith("/api/gmail/disconnect", {
      method: "POST",
    });
    expect(mounted.host.textContent ?? "").toContain(
      "Connect Gmail and Calendar",
    );
    expect(mounted.host.textContent ?? "").not.toContain("Sync Gmail");
  });
});

describe("SettingsClient production health", () => {
  it("renders owner-only production alerts when health needs attention", () => {
    const html = renderToStaticMarkup(
      <SettingsClient
        {...BASE_PROPS}
        hasGoogleIntegration={false}
        productionHealth={ATTENTION_HEALTH}
      />,
    );

    expect(html).toContain("Production health");
    expect(html).toContain("Needs attention");
    expect(html).toContain("briefing");
    expect(html).toContain("Provider 503");
    expect(html).toContain("checkout.session.completed");
    expect(html).not.toContain("customer_email");
  });

  it("hides production health from normal users", () => {
    const html = renderToStaticMarkup(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration={false} />,
    );

    expect(html).not.toContain("Production health");
  });
});

describe("SettingsClient account and billing actions", () => {
  it("queues a data export request from the settings button", async () => {
    const fetchMock = installFetch(async () => jsonResponse({ queued: true }));
    const mounted = mount(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration={false} />,
    );
    cleanups.push(mounted.unmount);

    await click(findButton(mounted.host, /^Export$/i));

    expect(fetchMock).toHaveBeenCalledWith("/api/account/export", {
      method: "POST",
    });
    expect(mounted.host.textContent ?? "").toContain(
      "Sealing your archive. You'll receive an email when it's ready.",
    );
  });

  it("surfaces export rate limits instead of leaving the row idle", async () => {
    installFetch(async () => jsonResponse({ error: "rate_limited" }, 429));
    const mounted = mount(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration={false} />,
    );
    cleanups.push(mounted.unmount);

    await click(findButton(mounted.host, /^Export$/i));

    expect(mounted.host.textContent ?? "").toContain(
      "You've already requested recently; please wait a bit.",
    );
  });

  it("opens the Stripe billing portal for paid accounts", async () => {
    const portalUrl = "https://billing.stripe.com/p/session_123";
    const fetchMock = installFetch(async () => jsonResponse({ url: portalUrl }));
    const mounted = mount(
      <SettingsClient
        {...BASE_PROPS}
        subscriptionTier="pro"
        appsUsed={18}
        hasGoogleIntegration={false}
      />,
    );
    cleanups.push(mounted.unmount);

    await click(findButtonByAria(mounted.host, /manage billing in stripe portal/i));

    expect(fetchMock).toHaveBeenCalledWith("/api/stripe/portal", {
      method: "POST",
    });
    expect(window.location.href).toBe(portalUrl);
  });

  it("shows a billing-desk error when Stripe portal creation fails", async () => {
    installFetch(async () => jsonResponse({ error: "unavailable" }, 503));
    const mounted = mount(
      <SettingsClient
        {...BASE_PROPS}
        subscriptionTier="pro"
        appsUsed={18}
        hasGoogleIntegration={false}
      />,
    );
    cleanups.push(mounted.unmount);

    await click(findButtonByAria(mounted.host, /manage billing in stripe portal/i));

    expect(mounted.host.querySelector('[role="alert"]')?.textContent).toContain(
      "The billing desk did not answer. Try again in a moment.",
    );
  });

  it("posts sign out through the server route form", async () => {
    const submitSpy = vi
      .spyOn(HTMLFormElement.prototype, "submit")
      .mockImplementation(() => undefined);
    const mounted = mount(
      <SettingsClient {...BASE_PROPS} hasGoogleIntegration={false} />,
    );
    cleanups.push(mounted.unmount);

    await click(findButton(mounted.host, /^Sign Out$/i));

    const form = document.body.querySelector<HTMLFormElement>(
      'form[action="/api/auth/signout"]',
    );
    expect(form).not.toBeNull();
    expect(form?.getAttribute("method")).toBe("POST");
    expect(submitSpy).toHaveBeenCalledTimes(1);
  });
});
