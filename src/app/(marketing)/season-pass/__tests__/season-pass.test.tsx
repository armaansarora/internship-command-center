/**
 * Season Pass landing-page tests.
 *
 * Two flag states:
 *   - OFF: the page renders a "Coming soon" surface with the waitlist form
 *     so we don't bleed inbound interest while the SKU is being staged.
 *   - ON: the page renders the full marketing surface (hero, included
 *     bullets, the "why a season" essay, FAQ, footer CTA).
 *
 * We mock the waitlist server action so the "Coming soon" surface renders
 * without touching Supabase, and mock the Activate-Pass client component
 * because it consumes runtime browser APIs (fetch + window.location).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../../waitlist/actions", () => ({
  joinWaitlist: vi.fn(),
}));

vi.mock("../activate-pass-button", () => ({
  ActivatePassButton: ({
    label,
    testId,
  }: {
    label: string;
    testId?: string;
  }) => (
    <button type="button" data-testid={testId}>
      {label}
    </button>
  ),
}));

import SeasonPassPage from "../page";

describe("SeasonPassPage", () => {
  const originalSeasonPass = process.env.TOWER_SEASON_PASS;

  beforeEach(() => {
    delete process.env.TOWER_SEASON_PASS;
  });

  afterEach(() => {
    if (originalSeasonPass === undefined) delete process.env.TOWER_SEASON_PASS;
    else process.env.TOWER_SEASON_PASS = originalSeasonPass;
  });

  it("flag OFF: renders the 'Coming soon' surface with the waitlist form", () => {
    delete process.env.TOWER_SEASON_PASS;

    const html = renderToStaticMarkup(<SeasonPassPage />);

    expect(html).toContain("data-testid=\"season-pass-coming-soon\"");
    expect(html).toContain("Coming soon");
    expect(html).toContain("The Season Pass opens soon");

    // The waitlist form embeds the email input — its presence is the proof
    // we re-use the existing waitlist mechanism rather than rolling a parallel
    // capture surface.
    expect(html).toContain("name=\"email\"");

    // Marketing surface NOT rendered while the gate is closed.
    expect(html).not.toContain("Your recruiting season, paid once");
    expect(html).not.toContain("Frequently asked");
  });

  it("flag ON: renders the full landing surface — hero, included list, FAQ, footer CTA", async () => {
    process.env.TOWER_SEASON_PASS = "1";

    const html = renderToStaticMarkup(<SeasonPassPage />);

    // Hero
    expect(html).toContain("Your recruiting season, paid once");
    expect(html).toContain("data-testid=\"season-pass-hero-price\"");

    // Price comes from PRICING_CONFIG — never hardcoded.
    const { PRICING_CONFIG } = await import("@/lib/config/pricing-config");
    expect(html).toContain(`$${PRICING_CONFIG.tiers.seasonPass.price}`);

    // What's included — six bullets
    expect(html).toContain("What&#x27;s included");
    expect(html).toContain("CEO morning briefing");
    expect(html).toContain("All eight character agents");
    expect(html).toContain("Unlimited applications");
    expect(html).toContain("Negotiation Parlor");
    expect(html).toContain("Warm-intro graph");
    expect(html).toContain("Full analytics, rejection autopsy");

    // Why-a-season essay
    expect(html).toContain("Why a season, not a subscription");

    // FAQ — six entries
    expect(html).toContain("Frequently asked");
    expect(html).toContain("Can I get a refund");
    expect(html).toContain("What happens after");
    expect(html).toContain("multiple seasons");
    expect(html).toContain("different from Pro");
    expect(html).toContain("data after the season ends");
    expect(html).toContain("Pro on top of the Season Pass");

    // Footer CTA repeated
    expect(html).toContain("One purchase. One season");

    // Activate-pass button mock renders in both hero and footer slots.
    expect(html).toContain("data-testid=\"season-pass-primary-cta\"");
    expect(html).toContain("data-testid=\"season-pass-footer-cta\"");

    // Coming-soon surface is gone.
    expect(html).not.toContain("data-testid=\"season-pass-coming-soon\"");
  });

  it("flag ON: emits a Schema.org Product structured-data block", () => {
    process.env.TOWER_SEASON_PASS = "1";

    const html = renderToStaticMarkup(<SeasonPassPage />);

    expect(html).toContain("application/ld+json");
    expect(html).toContain("\"@type\":\"Product\"");
    expect(html).toContain("Season Pass");
  });
});
