// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ElevatorPanel,
  ElevatorMobileBar,
  isObservatoryUnlocked,
  isParlorUnlocked,
} from "./ElevatorPanel";

/**
 * Activation-gauntlet gate proofs for the elevator chrome.
 *
 * The pragmatist pass trims the floor list to what a first-time beta user
 * has any reason to enter:
 *   - The Parlor annex button only surfaces once the user has ≥1 offer.
 *   - The Observatory floor (2) only surfaces once they have ≥5
 *     applications AND ≥7 days of pipeline history.
 *
 * Both gates are exposed as pure helpers (`isParlorUnlocked`,
 * `isObservatoryUnlocked`) so we can pin the math here and let the
 * server-side fetch in the layout focus on REST plumbing.
 */

vi.mock("@/components/world/elevator/ElevatorButton", () => ({
  ElevatorButton: ({
    floor,
  }: {
    floor: { id: string; name: string; label: string };
  }) => (
    <button type="button" aria-label={`${floor.name} — ${floor.label}`}>
      {floor.id}
    </button>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined }),
}));

const baseProps = {
  activeFloor: "PH" as const,
  isTransitioning: false,
  onNavigate: () => undefined,
};

describe("ElevatorPanel — Parlor gate", () => {
  it("hides the Parlor button when offerCount is 0", () => {
    const html = renderToStaticMarkup(
      <ElevatorPanel
        {...baseProps}
        offerCount={0}
        appCount={0}
        firstAppliedAt={null}
      />,
    );

    expect(html).not.toMatch(/data-elevator-button="parlor"/);
    expect(html).not.toMatch(/Negotiation Parlor/i);
  });

  it("surfaces the Parlor button when offerCount is ≥ 1", () => {
    const html = renderToStaticMarkup(
      <ElevatorPanel
        {...baseProps}
        offerCount={1}
        appCount={0}
        firstAppliedAt={null}
      />,
    );

    expect(html).toMatch(/data-elevator-button="parlor"/);
    expect(html).toMatch(/Negotiation Parlor/i);
  });
});

describe("ElevatorPanel — Observatory gate", () => {
  it("hides Observatory when appCount < 5 even if history is long", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      .toISOString();

    const html = renderToStaticMarkup(
      <ElevatorPanel
        {...baseProps}
        offerCount={0}
        appCount={4}
        firstAppliedAt={eightDaysAgo}
      />,
    );

    // The mock ElevatorButton renders `floor.name — floor.label` as its
    // aria-label. Observatory's label is "Analytics".
    expect(html).not.toMatch(/The Observatory/);
    expect(html).not.toMatch(/Analytics/);
  });

  it("hides Observatory when first applied is < 7 days ago even with 5+ apps", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString();

    const html = renderToStaticMarkup(
      <ElevatorPanel
        {...baseProps}
        offerCount={0}
        appCount={12}
        firstAppliedAt={threeDaysAgo}
      />,
    );

    expect(html).not.toMatch(/The Observatory/);
  });

  it("shows Observatory when appCount ≥ 5 AND first applied ≥ 7 days ago", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      .toISOString();

    const html = renderToStaticMarkup(
      <ElevatorPanel
        {...baseProps}
        offerCount={0}
        appCount={5}
        firstAppliedAt={eightDaysAgo}
      />,
    );

    expect(html).toMatch(/The Observatory/);
    expect(html).toMatch(/Analytics/);
  });

  it("hides Observatory when firstAppliedAt is null regardless of count", () => {
    const html = renderToStaticMarkup(
      <ElevatorPanel
        {...baseProps}
        offerCount={0}
        appCount={20}
        firstAppliedAt={null}
      />,
    );

    expect(html).not.toMatch(/The Observatory/);
  });
});

describe("ElevatorMobileBar — gauntlet gates", () => {
  it("does not surface the Parlor sheet item when offers=0 and sheet closed", () => {
    const html = renderToStaticMarkup(
      <ElevatorMobileBar
        {...baseProps}
        offerCount={0}
        appCount={0}
        firstAppliedAt={null}
      />,
    );

    expect(html).not.toMatch(/data-elevator-button="parlor"/);
  });
});

describe("isObservatoryUnlocked", () => {
  const now = new Date("2026-05-10T12:00:00Z");

  it("returns false when count is below the threshold", () => {
    const longHistory = new Date(
      now.getTime() - 60 * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(isObservatoryUnlocked(4, longHistory, now)).toBe(false);
  });

  it("returns false when history is below the day threshold", () => {
    const sixDaysAgo = new Date(
      now.getTime() - 6 * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(isObservatoryUnlocked(10, sixDaysAgo, now)).toBe(false);
  });

  it("returns false when firstAppliedAt is null", () => {
    expect(isObservatoryUnlocked(99, null, now)).toBe(false);
  });

  it("returns false for malformed firstAppliedAt strings", () => {
    expect(isObservatoryUnlocked(10, "not-a-date", now)).toBe(false);
  });

  it("returns true when both thresholds are met exactly", () => {
    const sevenDaysAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(isObservatoryUnlocked(5, sevenDaysAgo, now)).toBe(true);
  });
});

describe("isParlorUnlocked", () => {
  it("returns false at 0 offers", () => {
    expect(isParlorUnlocked(0)).toBe(false);
  });

  it("returns true at 1 offer", () => {
    expect(isParlorUnlocked(1)).toBe(true);
  });

  it("returns false for negative counts (defensive)", () => {
    expect(isParlorUnlocked(-1)).toBe(false);
  });
});
