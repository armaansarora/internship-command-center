import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PricingCards } from "./PricingCards";

describe("PricingCards billing actions", () => {
  it("sends free users to Checkout for paid upgrades", () => {
    const html = renderToStaticMarkup(
      <PricingCards currentTier="free" appsUsed={3} />,
    );

    expect(html).toContain("Current Plan");
    expect(html).toContain("Upgrade to Pro");
    expect(html).toContain("Upgrade to Team");
  });

  it("sends paid users to the billing portal for every plan change", () => {
    const html = renderToStaticMarkup(
      <PricingCards currentTier="pro" appsUsed={14} onManageBilling={() => {}} />,
    );

    expect(html).toContain("Current Plan");
    expect(html).toContain("Manage Billing");
    expect(html).not.toContain("Downgrade");
    expect(html).not.toContain("Upgrade to Team");
  });
});
