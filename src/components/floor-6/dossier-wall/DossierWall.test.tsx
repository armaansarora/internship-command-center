// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeDossierAge, DOSSIER_AGE_STYLE } from "./dossier-age";
import { DossierWall } from "./DossierWall";
import type { DossierShape } from "./DossierCard";

const NOW = new Date("2026-04-23T12:00:00Z");

describe("computeDossierAge", () => {
  it("fresh when < 7 days old", () => {
    expect(computeDossierAge(new Date("2026-04-22T12:00:00Z"), NOW)).toBe("fresh");
    expect(computeDossierAge(new Date("2026-04-18T12:00:00Z"), NOW)).toBe("fresh");
  });
  it("aging between 7 and 29 days", () => {
    expect(computeDossierAge(new Date("2026-04-10T12:00:00Z"), NOW)).toBe("aging");
    expect(computeDossierAge(new Date("2026-03-26T12:00:00Z"), NOW)).toBe("aging");
  });
  it("stale at 30+ days", () => {
    expect(computeDossierAge(new Date("2026-02-01T12:00:00Z"), NOW)).toBe("stale");
  });
  it("stale when lastResearchedAt is null (never researched)", () => {
    expect(computeDossierAge(null, NOW)).toBe("stale");
  });
});

describe("DOSSIER_AGE_STYLE", () => {
  it("fresh has no filter, stale has sepia/saturate filter", () => {
    expect(DOSSIER_AGE_STYLE.fresh.filter).toBe("none");
    expect(DOSSIER_AGE_STYLE.stale.filter).toContain("sepia");
  });
  it("labels are descriptive, not punitive", () => {
    expect(DOSSIER_AGE_STYLE.stale.label.toLowerCase()).toMatch(/refresh pending/);
    expect(DOSSIER_AGE_STYLE.stale.label.toLowerCase()).not.toMatch(/error|warn|fail/);
  });
});

describe("DossierWall SSR", () => {
  const dossiers: DossierShape[] = [
    { id: "d-1", companyName: "Blackstone", sector: "Alternatives", lastResearchedAt: new Date("2026-04-20"), hasNotes: true, domain: "blackstone.com" },
    { id: "d-2", companyName: "Tiger Global", sector: "Growth", lastResearchedAt: new Date("2026-01-01"), hasNotes: false, domain: null },
    { id: "d-3", companyName: "Apollo", sector: "Credit", lastResearchedAt: null, hasNotes: false, domain: null },
  ];

  it("renders one card per dossier with data-dossier attribute", () => {
    const markup = renderToStaticMarkup(<DossierWall dossiers={dossiers} now={NOW} />);
    expect(markup).toMatch(/data-dossier="d-1"/);
    expect(markup).toMatch(/data-dossier="d-2"/);
    expect(markup).toMatch(/data-dossier="d-3"/);
  });

  it("tags each card with data-age reflecting its freshness tier", () => {
    const markup = renderToStaticMarkup(<DossierWall dossiers={dossiers} now={NOW} />);
    expect(markup).toMatch(/data-dossier="d-1"[^>]*data-age="fresh"/);
    expect(markup).toMatch(/data-dossier="d-2"[^>]*data-age="stale"/);
    expect(markup).toMatch(/data-dossier="d-3"[^>]*data-age="stale"/);
  });

  it("renders the empty state with role=status", () => {
    const markup = renderToStaticMarkup(<DossierWall dossiers={[]} now={NOW} />);
    expect(markup).toMatch(/role="status"/);
    expect(markup).toMatch(/no dossiers yet/i);
  });

  it("exposes role=region with count in aria-label", () => {
    const markup = renderToStaticMarkup(<DossierWall dossiers={dossiers} now={NOW} />);
    expect(markup).toMatch(/role="region"/);
    expect(markup).toMatch(/3 companies/);
  });

  it("no red hex appears on any tier of a dossier wall", () => {
    const markup = renderToStaticMarkup(<DossierWall dossiers={dossiers} now={NOW} />);
    expect(markup.toLowerCase()).not.toContain("#ef4444");
    expect(markup).not.toMatch(/239,\s*68,\s*68/);
  });
});
