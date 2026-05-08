// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { trackPlausibleEvent } from "./plausible";

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
