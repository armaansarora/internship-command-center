// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ContactForAgent } from "@/lib/db/queries/contacts-rest";
import { normalizeDelta } from "./useRolodexRotation";

// GSAP shim — the rolodex hook uses gsap.to() for spring-damped rotation; in
// the test environment we don't exercise the animation, we only assert the
// SSR markup (initial angle = 0). Mirrors the pattern used in
// CinematicArrival.test.tsx so no real animation machinery is touched.
vi.mock("gsap", () => ({
  gsap: {
    to: () => ({ kill: () => {} }),
  },
}));

// Have to import the component after the gsap mock so its module graph picks
// the stub up rather than the real package.
const { Rolodex } = await import("./Rolodex");

function makeContact(i: number): ContactForAgent {
  return {
    id: `c-${i}`,
    name: `Contact ${i}`,
    email: `c${i}@acme.com`,
    title: "Associate",
    companyId: null,
    companyName: `Acme ${i % 10}`,
    relationship: "referral",
    linkedinUrl: null,
    phone: null,
    introducedBy: null,
    notes: null,
    privateNote: null,
    source: null,
    lastContactAt: null,
    warmthLevel: "warm",
    warmthScore: 80,
    daysSinceContact: i % 60,
  };
}

function countLiveCards(markup: string): number {
  return (markup.match(/data-rolodex-card="live"/g) || []).length;
}

/**
 * P1 invariant — rolodex at 200+ cards keeps the live DOM child count capped.
 * At angle 0 (initial SSR), only cards whose angle falls within ±45° of the
 * camera center get rendered; the rest are virtualized (omitted from markup).
 */
describe("R8 P1 — Rolodex virtualizes at 200+ card fixture", () => {
  it("≤ 50 live cards at the 200-card fixture", () => {
    const contacts = Array.from({ length: 200 }, (_, i) => makeContact(i));
    const markup = renderToStaticMarkup(<Rolodex contacts={contacts} onFlipCard={() => {}} />);
    const live = countLiveCards(markup);
    expect(live).toBeGreaterThan(0);
    expect(live).toBeLessThanOrEqual(50);
  });

  it("≤ 100 live cards at the 400-card fixture (still bounded)", () => {
    const contacts = Array.from({ length: 400 }, (_, i) => makeContact(i));
    const markup = renderToStaticMarkup(<Rolodex contacts={contacts} onFlipCard={() => {}} />);
    const live = countLiveCards(markup);
    expect(live).toBeGreaterThan(0);
    expect(live).toBeLessThanOrEqual(100);
  });

  it("empty contacts renders the honest empty state with role=status", () => {
    const markup = renderToStaticMarkup(<Rolodex contacts={[]} onFlipCard={() => {}} />);
    expect(markup).toMatch(/no contacts yet/i);
    expect(markup).toMatch(/role="status"/);
    expect(countLiveCards(markup)).toBe(0);
  });

  it("exposes role=region with the contact count in aria-label", () => {
    const contacts = Array.from({ length: 5 }, (_, i) => makeContact(i));
    const markup = renderToStaticMarkup(<Rolodex contacts={contacts} onFlipCard={() => {}} />);
    expect(markup).toMatch(/role="region"/);
    expect(markup).toMatch(/5 contacts/);
  });

  it("cards carry a data-warmth-tier attribute (not a red class name)", () => {
    const contacts = Array.from({ length: 3 }, (_, i) => makeContact(i));
    const markup = renderToStaticMarkup(<Rolodex contacts={contacts} onFlipCard={() => {}} />);
    expect(markup).toMatch(/data-warmth-tier="[a-z]+"/);
    // P4-class constraint: no red hex on any card bg/edge in default fixture
    expect(markup.toLowerCase()).not.toContain("#ef4444");
    expect(markup.toLowerCase()).not.toContain("239, 68, 68");
  });
});

describe("normalizeDelta — angle wrapping to (-180, 180]", () => {
  it("identities", () => {
    expect(normalizeDelta(0)).toBe(0);
    expect(normalizeDelta(90)).toBe(90);
    expect(normalizeDelta(-90)).toBe(-90);
    expect(normalizeDelta(180)).toBe(180);
  });
  it("wraps positive excess", () => {
    expect(normalizeDelta(190)).toBe(-170);
    expect(normalizeDelta(720)).toBe(0);
  });
  it("wraps negative excess", () => {
    expect(normalizeDelta(-190)).toBe(170);
    // -720 mod 360 is a signed zero (-0) in JS; both are equivalent to zero
    // for card-position arithmetic, so we just check the magnitude.
    expect(Math.abs(normalizeDelta(-720))).toBe(0);
  });
});
