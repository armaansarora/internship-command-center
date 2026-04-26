// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { CSuiteScene, type CSuiteStats } from "@/components/floor-1/CSuiteScene";

/**
 * Parlor door absence invariant.
 *
 * NON-NEGOTIABLE: When `doorSlot` is not provided (user has 0 offers), the
 * rendered HTML must contain ZERO door markers — no `data-parlor-door`
 * attribute, no "parlor-door" class, no "Negotiation Parlor" label. The
 * door must be ABSENT from the DOM, not hidden via CSS / aria-hidden /
 * display:none / hidden attr. This is the architectural invariant the
 * whole offer-gated feature rests on.
 *
 * If this test ever starts passing because someone always-renders the door
 * and hides it with a CSS class, that's a regression — fix the render path,
 * don't loosen the assertion.
 */

const stats: CSuiteStats = {
  pipelineTotal: 0,
  offers: 0,
  screening: 0,
  staleCount: 0,
  weeklyActivity: 0,
};

describe("Parlor door absence invariant", () => {
  it("renders NO door markers when doorSlot is not provided", () => {
    const html = renderToString(<CSuiteScene stats={stats} />);
    expect(html).not.toMatch(/data-parlor-door/i);
    expect(html).not.toMatch(/negotiation parlor/i);
    expect(html).not.toMatch(/parlor-door/i);
  });

  it("renders door markers when doorSlot IS provided", () => {
    const html = renderToString(
      <CSuiteScene
        stats={stats}
        doorSlot={
          <div
            data-parlor-door
            aria-label="Enter the Negotiation Parlor"
            className="parlor-door"
          >
            door
          </div>
        }
      />,
    );
    expect(html).toMatch(/data-parlor-door/i);
    expect(html).toMatch(/negotiation parlor/i);
    expect(html).toMatch(/parlor-door/i);
  });
});
