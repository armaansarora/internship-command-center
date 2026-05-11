// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackGoal, trackPlausibleEvent } from "./plausible";

describe("trackPlausibleEvent", () => {
  it("sends allowlisted custom-event props to Plausible", () => {
    window.plausible = vi.fn();

    trackPlausibleEvent("tower_onboarding_submitted", {
      surface: "lobby",
      action: "submit",
      status: "ok",
      email: "guest@example.com",
      promptText: "sensitive user content",
    });

    expect(window.plausible).toHaveBeenCalledWith("tower_onboarding_submitted", {
      props: {
        surface: "lobby",
        action: "submit",
        status: "ok",
      },
    });
  });

  it("does nothing when Plausible has not loaded", () => {
    delete window.plausible;

    expect(() =>
      trackPlausibleEvent("tower_billing_portal_failed", {
        surface: "settings",
        status: "error",
      }),
    ).not.toThrow();
  });
});

describe("trackGoal", () => {
  const originalDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

  beforeEach(() => {
    // Flag-on: the domain env var is what gate-config.plausibleEnabled reads.
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = "interntower.com";
    delete window.plausible;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalDomain === undefined) {
      delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    } else {
      process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = originalDomain;
    }
  });

  it("fires the goal with sanitized props when Plausible is loaded", () => {
    window.plausible = vi.fn();

    trackGoal("waitlist_submit", { source: "campus" });

    expect(window.plausible).toHaveBeenCalledWith("waitlist_submit", {
      props: { source: "campus" },
    });
  });

  it("fires without props when none are supplied", () => {
    window.plausible = vi.fn();

    trackGoal("activate_complete");

    // No props branch — Plausible expects `undefined` rather than an empty
    // object so the event lands cleanly in the dashboard.
    expect(window.plausible).toHaveBeenCalledWith("activate_complete", undefined);
  });

  it("no-ops on server-side renders (window undefined)", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error — happy-dom polyfills window; we delete to simulate SSR.
    delete globalThis.window;

    expect(() => trackGoal("activate_complete")).not.toThrow();

    // Restore for subsequent tests.
    globalThis.window = originalWindow;
  });

  it("honors the plausibleEnabled gate (flag OFF silences the call)", () => {
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    window.plausible = vi.fn();

    trackGoal("season_pass_checkout_start", { surface: "season-pass" });

    expect(window.plausible).not.toHaveBeenCalled();
  });

  it("refuses to send props that look like an email — console.warn fired, plausible NOT called", () => {
    window.plausible = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    trackGoal("waitlist_submit", {
      source: "campus",
      // Deliberately PII-shaped value smuggled through the typed contract.
      email: "guest@example.com",
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [warnMessage] = warnSpy.mock.calls[0] ?? [];
    expect(String(warnMessage)).toContain("refused");
    expect(window.plausible).not.toHaveBeenCalled();
  });

  it("PII guard refuses ANY field — even fields without 'email' in the name", () => {
    window.plausible = vi.fn();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    trackGoal("season_pass_purchased", {
      // Same shape, different key — must still be refused.
      source: "user@school.edu",
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(window.plausible).not.toHaveBeenCalled();
  });

  it("no-ops silently when Plausible script hasn't loaded yet (flag ON, window.plausible undefined)", () => {
    delete window.plausible;

    expect(() =>
      trackGoal("season_pass_checkout_start", { surface: "season-pass" }),
    ).not.toThrow();
  });

  it("drops empty-string and non-finite-number prop values rather than passing them through", () => {
    window.plausible = vi.fn();

    trackGoal("waitlist_submit", {
      source: "campus",
      // Empty trimmed string → dropped.
      surface: "   ",
      // NaN → dropped.
      tier: Number.NaN,
    });

    expect(window.plausible).toHaveBeenCalledWith("waitlist_submit", {
      props: { source: "campus" },
    });
  });
});
