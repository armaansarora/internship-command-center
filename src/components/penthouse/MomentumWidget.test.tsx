// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MomentumWidget } from "./MomentumWidget";
import { computeMomentum, type SnapshotPoint } from "@/lib/penthouse/momentum";

function point(date: string, overrides: Partial<SnapshotPoint> = {}): SnapshotPoint {
  return {
    date,
    totalApplications: 10,
    activePipeline: 5,
    appliedCount: 4,
    interviewCount: 1,
    offerCount: 0,
    staleCount: 0,
    ...overrides,
  };
}

function render(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("MomentumWidget", () => {
  it("renders the designed empty state with zero snapshots — never a broken chart", () => {
    const doc = render(renderToStaticMarkup(<MomentumWidget momentum={computeMomentum([])} />));
    expect(doc.querySelector('[data-testid="momentum-empty"]')).not.toBeNull();
    expect(doc.querySelector('[data-testid="momentum-chart"]')).toBeNull();
    expect(doc.body.textContent).toContain("No snapshot history yet");
  });

  it("one snapshot gets first-day copy, still no chart", () => {
    const doc = render(
      renderToStaticMarkup(<MomentumWidget momentum={computeMomentum([point("2026-06-09")])} />)
    );
    expect(doc.body.textContent).toContain("First snapshot logged");
    expect(doc.querySelector('[data-testid="momentum-chart"]')).toBeNull();
  });

  it("renders one bar per snapshot with rising headline and interview dot", () => {
    const momentum = computeMomentum([
      point("2026-06-07", { totalApplications: 10, activePipeline: 4, interviewCount: 1 }),
      point("2026-06-08", { totalApplications: 12, activePipeline: 6, interviewCount: 2 }),
      point("2026-06-09", { totalApplications: 13, activePipeline: 7, interviewCount: 2 }),
    ]);
    const doc = render(renderToStaticMarkup(<MomentumWidget momentum={momentum} />));

    expect(doc.querySelectorAll('[data-testid="momentum-bar"]')).toHaveLength(3);
    // exactly one day where interviews moved (06-07 → 06-08)
    expect(doc.querySelectorAll('[data-testid="momentum-interview-dot"]')).toHaveLength(1);
    const headline = doc.querySelector('[data-testid="momentum-headline"]');
    expect(headline?.textContent).toContain("+3 applications");
    expect(headline?.textContent).toContain("momentum rising");
    // a11y: the chart container narrates itself (divs, not SVG — house rule)
    const chart = doc.querySelector('[data-testid="momentum-chart"]');
    expect(chart?.getAttribute("role")).toBe("img");
    expect(chart?.getAttribute("aria-label")).toContain("2026-06-07");
    expect(doc.querySelector("svg")).toBeNull();
  });

  it("cooling window says so", () => {
    const momentum = computeMomentum([
      point("2026-06-07", { totalApplications: 12, activePipeline: 9, interviewCount: 2 }),
      point("2026-06-09", { totalApplications: 12, activePipeline: 5, interviewCount: 2 }),
    ]);
    const doc = render(renderToStaticMarkup(<MomentumWidget momentum={momentum} />));
    const headline = doc.querySelector('[data-testid="momentum-headline"]');
    expect(headline?.textContent).toContain("no new applications");
    expect(headline?.textContent).toContain("momentum cooling");
  });
});
