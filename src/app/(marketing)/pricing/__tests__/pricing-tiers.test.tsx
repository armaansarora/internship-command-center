/**
 * Pricing page tier-display tests.
 *
 * Asserts the gating behaviour around the Internship Season Pass:
 *   - When `seasonPassEnabled()` is OFF, the page renders Free + Pro cards
 *     plus the Campus banner — and NO Season Pass card.
 *   - When `seasonPassEnabled()` is ON, the page renders Free + Season Pass
 *     + Pro cards, with the "Most popular" pin on the Season Pass card.
 *
 * These tests render the server component into static markup so they exercise
 * the actual TSX path (not a mocked surface). The seasonPass flag is a thunk
 * over `process.env.TOWER_SEASON_PASS`, so we toggle the env var per test.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PricingPage from "../page";

async function renderPricing(): Promise<string> {
  const element = await PricingPage({ searchParams: Promise.resolve({}) });
  return renderToStaticMarkup(element);
}

describe("PricingPage tier display", () => {
  const originalEnv = process.env.TOWER_SEASON_PASS;

  beforeEach(() => {
    delete process.env.TOWER_SEASON_PASS;
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.TOWER_SEASON_PASS;
    else process.env.TOWER_SEASON_PASS = originalEnv;
  });

  it("flag OFF: hides the Season Pass card and still shows Free + Pro + Campus", async () => {
    delete process.env.TOWER_SEASON_PASS;

    const html = await renderPricing();

    expect(html).toContain("Pricing");
    expect(html).toContain("Free");
    expect(html).toContain("Pro");
    expect(html).toContain("Flexibility for off-season usage");
    expect(html).toContain("Campus");
    expect(html).toContain("Talk to us");

    // Season Pass surfaces are absent.
    expect(html).not.toContain("data-tier=\"season-pass\"");
    expect(html).not.toContain("data-testid=\"season-pass-card\"");
    expect(html).not.toContain("Most popular");
  });

  it("flag ON: renders the Season Pass card with the 'Most popular' pin", async () => {
    process.env.TOWER_SEASON_PASS = "1";

    const html = await renderPricing();

    expect(html).toContain("data-testid=\"season-pass-card\"");
    expect(html).toContain("data-testid=\"season-pass-pin\"");
    expect(html).toContain("Most popular");
    expect(html).toContain("Season Pass");

    // Pricing-config drives the price — assert the number renders without
    // hard-coding it here so this test stays valid through reprices.
    // The runtime config value must appear at least once in the visible card.
    const { PRICING_CONFIG } = await import("@/lib/config/pricing-config");
    expect(html).toContain(`$${PRICING_CONFIG.tiers.seasonPass.price}`);

    // Campus banner remains a separate horizontal lane.
    expect(html).toContain("data-testid=\"campus-banner\"");
    expect(html).toContain("Talk to us");
  });

  it("flag ON: emits a Schema.org Product structured-data block for the Season Pass", async () => {
    process.env.TOWER_SEASON_PASS = "1";

    const html = await renderPricing();

    expect(html).toContain("application/ld+json");
    expect(html).toContain("\"@type\":\"Product\"");
    expect(html).toContain("Season Pass");
    expect(html).toContain("\"priceCurrency\":\"USD\"");
  });

  it("flag OFF: emits NO Season Pass structured data", async () => {
    delete process.env.TOWER_SEASON_PASS;

    const html = await renderPricing();

    expect(html).not.toContain("application/ld+json");
  });
});
