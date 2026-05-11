// @vitest-environment happy-dom

/**
 * WaitlistForm goal-firing test.
 *
 * Asserts the `waitlist_submit` Plausible goal fires exactly once after the
 * server action acks success — and never on a failure path. The granular
 * tower_waitlist_submit_succeeded event is exercised elsewhere; this file
 * pins ONLY the GTM funnel goal.
 *
 * We mock the server action so the form can be driven through happy-dom's
 * synthetic submit event without touching Supabase.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const joinWaitlistMock = vi.fn();
vi.mock("../actions", () => ({
  joinWaitlist: (formData: FormData) => joinWaitlistMock(formData),
}));

const trackGoalMock = vi.fn();
const trackPlausibleEventMock = vi.fn();
vi.mock("@/lib/analytics/plausible", () => ({
  trackGoal: (...args: unknown[]) => trackGoalMock(...args),
  trackPlausibleEvent: (...args: unknown[]) => trackPlausibleEventMock(...args),
}));

import { createRoot } from "react-dom/client";
import { act } from "react";
import { WaitlistForm } from "../WaitlistForm";

describe("WaitlistForm — trackGoal('waitlist_submit')", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    trackGoalMock.mockReset();
    trackPlausibleEventMock.mockReset();
    joinWaitlistMock.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("fires trackGoal('waitlist_submit') after the server action acks success", async () => {
    joinWaitlistMock.mockResolvedValueOnce({ ok: true });

    await act(async () => {
      root.render(<WaitlistForm />);
    });

    const input = container.querySelector('input[name="email"]');
    const form = container.querySelector("form");
    expect(input).toBeTruthy();
    expect(form).toBeTruthy();

    await act(async () => {
      (input as HTMLInputElement).value = "guest@example.com";
      form!.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    // Wait one microtask flush — the server action resolves on the next tick
    // and the success branch fires the goal.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(joinWaitlistMock).toHaveBeenCalledTimes(1);
    expect(trackGoalMock).toHaveBeenCalledWith("waitlist_submit", {
      source: "direct",
    });
  });

  it("does NOT fire trackGoal on a failed submit", async () => {
    joinWaitlistMock.mockResolvedValueOnce({ ok: false, error: "boom" });

    await act(async () => {
      root.render(<WaitlistForm />);
    });

    const input = container.querySelector('input[name="email"]');
    const form = container.querySelector("form");

    await act(async () => {
      (input as HTMLInputElement).value = "guest@example.com";
      form!.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // tower_waitlist_submit_failed (granular event) is allowed to fire, but
    // the GTM goal must NOT — failure path is not a conversion.
    expect(trackGoalMock).not.toHaveBeenCalled();
  });
});
