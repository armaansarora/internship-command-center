/**
 * R12 Red Team scale fix — OakTable render cap test.
 *
 * Caps visible folder stack at MAX_VISIBLE_OFFERS (50). Above the cap an
 * overflow banner counts hidden offers and points to Settings archive.
 * Defense-in-depth — realistic users top out at ≤10 offers.
 */
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import type { OfferRow } from "@/lib/db/queries/offers-rest";
import { OakTable } from "./OakTable";

function makeOffer(i: number): OfferRow {
  return {
    id: `offer-${i.toString().padStart(4, "0")}`,
    user_id: "u1",
    application_id: null,
    company_name: `Company ${i}`,
    role: "Engineer",
    level: null,
    location: "NYC",
    base: 150000,
    bonus: 0,
    equity: 0,
    sign_on: 0,
    housing: 0,
    start_date: null,
    benefits: {},
    received_at: "2026-04-24T00:00:00.000Z",
    deadline_at: null,
    status: "received",
    created_at: "2026-04-24T00:00:00.000Z",
    updated_at: "2026-04-24T00:00:00.000Z",
  } as unknown as OfferRow;
}

function renderTable(count: number): string {
  const offers = Array.from({ length: count }, (_, i) => makeOffer(i));
  return renderToString(
    <OakTable
      offers={offers}
      selectedOfferId={null}
      onSelect={() => {}}
    />,
  );
}

function count(html: string, needle: string): number {
  let n = 0;
  let i = 0;
  while ((i = html.indexOf(needle, i)) !== -1) {
    n++;
    i += needle.length;
  }
  return n;
}

describe("OakTable render cap (defense at scale)", () => {
  it("renders all folders when count is at or below the cap (10)", () => {
    const html = renderTable(10);
    expect(html).not.toContain("parlor-oak-table-overflow-banner");
    expect(count(html, 'role="listitem"')).toBe(10);
  });

  it("renders all folders when count equals the cap exactly (50)", () => {
    const html = renderTable(50);
    expect(html).not.toContain("parlor-oak-table-overflow-banner");
    expect(count(html, 'role="listitem"')).toBe(50);
  });

  it("caps at 50 + shows overflow banner with hidden count when count is 75", () => {
    const html = renderTable(75);
    expect(html).toContain("parlor-oak-table-overflow-banner");
    expect(html).toContain("+ 25 more offers");
    expect(html).toContain("50 most recent");
    expect(count(html, 'role="listitem"')).toBe(50);
  });

  it("caps at 50 + correct count at 100 (the R12 scale-scenario fixture)", () => {
    const html = renderTable(100);
    expect(html).toContain("parlor-oak-table-overflow-banner");
    expect(html).toContain("+ 50 more offers");
    expect(count(html, 'role="listitem"')).toBe(50);
  });

  it("singular 'offer' (not 'offers') when overflow is exactly 1", () => {
    const html = renderTable(51);
    expect(html).toContain("+ 1 more offer");
    expect(html).not.toContain("+ 1 more offers");
  });

  it("renders nothing offer-related when count is 0", () => {
    const html = renderTable(0);
    expect(html).not.toContain("parlor-oak-table-overflow-banner");
    expect(count(html, 'role="listitem"')).toBe(0);
  });
});
