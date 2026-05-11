// @vitest-environment happy-dom

/**
 * ActivatePassButton goal-firing test.
 *
 * Asserts the `season_pass_checkout_start` Plausible goal fires the moment
 * the user clicks "Activate the pass" — BEFORE the network round-trip to
 * /api/stripe/checkout. We deliberately track intent rather than success
 * because a checkout that never lands on Stripe is still a strong revenue
 * signal worth measuring against the eventual `season_pass_purchased` goal.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackGoalMock = vi.fn();
vi.mock("@/lib/analytics/plausible", () => ({
  trackGoal: (...args: unknown[]) => trackGoalMock(...args),
}));

import { createRoot } from "react-dom/client";
import { act } from "react";
import { ActivatePassButton } from "../activate-pass-button";

describe("ActivatePassButton — trackGoal('season_pass_checkout_start')", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let originalFetch: typeof globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    trackGoalMock.mockReset();
    originalFetch = globalThis.fetch;
    fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ url: "https://stripe.com/c/xyz" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    // window.location.assign is read-only in JSDOM; stub the prototype.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, assign: vi.fn() },
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    globalThis.fetch = originalFetch;
  });

  it("fires the goal at click — BEFORE the fetch resolves", async () => {
    await act(async () => {
      root.render(
        <ActivatePassButton
          label="Activate the pass"
          testId="season-pass-primary-cta"
        />,
      );
    });

    const button = container.querySelector("button");
    expect(button).toBeTruthy();

    await act(async () => {
      button!.click();
    });

    // The fire-and-forget call must already be recorded before the network
    // promise settles. We're not awaiting fetch yet — assert immediately.
    expect(trackGoalMock).toHaveBeenCalledTimes(1);
    expect(trackGoalMock).toHaveBeenCalledWith("season_pass_checkout_start", {
      surface: "season-pass",
    });

    // Belt-and-suspenders: the fetch did fire afterwards (the button isn't
    // wired in pure happy-talk).
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stripe/checkout",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("fires the goal BEFORE the fetch — even when the network is slow", async () => {
    // Hold the fetch promise pending forever to prove the goal call doesn't
    // wait on the network round-trip. Plausible conversion analytics needs
    // the click recorded immediately; the actual checkout URL navigation is
    // a separate, slower concern.
    const resolveFetchHolder: { fn: (() => void) | null } = { fn: null };
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetchHolder.fn = () =>
            resolve(
              new Response(JSON.stringify({ url: "https://stripe.com/c/xyz" }), {
                status: 200,
                headers: { "content-type": "application/json" },
              }),
            );
        }),
    );

    await act(async () => {
      root.render(
        <ActivatePassButton
          label="Activate the pass"
          testId="season-pass-primary-cta"
        />,
      );
    });

    const button = container.querySelector("button");

    await act(async () => {
      button!.click();
    });

    expect(trackGoalMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Cleanup — drain the hung fetch.
    resolveFetchHolder.fn?.();
  });
});
