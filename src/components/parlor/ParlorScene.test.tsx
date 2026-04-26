// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * ParlorScene composition tests.
 *
 * The Scene is a pure environment compositor — wood panels, sconces, oak
 * floor, plus four slots (table, chart, chairs, optional draft + signature).
 * Tests verify the structural contract the R10.7/R10.8 follow-ups depend on:
 *   - All required slots render into the DOM.
 *   - The optional `draftSlot` is absent by default (no stray wrapper div).
 *   - Back-wall wraps the chartSlot; floor wraps table + chairs slots.
 *   - Scene carries a `data-floor="parlor"` scope attribute.
 *
 * SSR via renderToStaticMarkup keeps the test hermetic — no DOM mount,
 * no effects, just the static tree the server emits.
 */

import { ParlorScene } from "./ParlorScene";

describe("R10.6 ParlorScene — structural composition", () => {
  it("renders the parlor root with a data-floor scope", () => {
    const html = renderToStaticMarkup(
      <ParlorScene
        tableSlot={<div data-testid="table" />}
        chartSlot={<div data-testid="chart" />}
        chairsSlot={<div data-testid="chairs" />}
      />,
    );
    expect(html).toMatch(/data-floor="parlor"/);
    expect(html).toMatch(/class="parlor-bg"/);
  });

  it("renders chartSlot inside the back-wall area", () => {
    const html = renderToStaticMarkup(
      <ParlorScene
        tableSlot={<div data-testid="table" />}
        chartSlot={<div data-testid="chart-unique" />}
        chairsSlot={<div data-testid="chairs" />}
      />,
    );
    expect(html).toMatch(
      /class="parlor-backwall">[\s\S]*data-testid="chart-unique"/,
    );
  });

  it("renders tableSlot inside the table area on the floor", () => {
    const html = renderToStaticMarkup(
      <ParlorScene
        tableSlot={<div data-testid="table-unique" />}
        chartSlot={<div data-testid="chart" />}
        chairsSlot={<div data-testid="chairs" />}
      />,
    );
    expect(html).toMatch(
      /class="parlor-table-area">[\s\S]*data-testid="table-unique"/,
    );
  });

  it("renders chairsSlot inside the chairs area on the floor", () => {
    const html = renderToStaticMarkup(
      <ParlorScene
        tableSlot={<div data-testid="table" />}
        chartSlot={<div data-testid="chart" />}
        chairsSlot={<div data-testid="chairs-unique" />}
      />,
    );
    expect(html).toMatch(
      /class="parlor-chairs-area">[\s\S]*data-testid="chairs-unique"/,
    );
  });

  it("renders sconces as aria-hidden decoration", () => {
    const html = renderToStaticMarkup(
      <ParlorScene
        tableSlot={<div />}
        chartSlot={<div />}
        chairsSlot={<div />}
      />,
    );
    // aria-hidden on a void-ish decorative div
    expect(html).toMatch(/class="parlor-sconces"[^>]*aria-hidden/);
  });
});

describe("R10.6 ParlorScene — optional slots", () => {
  it("does NOT render a parlor-draft-area when draftSlot is omitted", () => {
    const html = renderToStaticMarkup(
      <ParlorScene
        tableSlot={<div />}
        chartSlot={<div />}
        chairsSlot={<div />}
      />,
    );
    expect(html).not.toMatch(/parlor-draft-area/);
  });

  it("renders the parlor-draft-area when draftSlot is provided", () => {
    const html = renderToStaticMarkup(
      <ParlorScene
        tableSlot={<div />}
        chartSlot={<div />}
        chairsSlot={<div />}
        draftSlot={<div data-testid="draft-unique" />}
      />,
    );
    expect(html).toMatch(/parlor-draft-area/);
    expect(html).toMatch(/data-testid="draft-unique"/);
  });

  it("renders signatureSlot content when provided", () => {
    const html = renderToStaticMarkup(
      <ParlorScene
        tableSlot={<div />}
        chartSlot={<div />}
        chairsSlot={<div />}
        signatureSlot={<div data-testid="sig-unique" />}
      />,
    );
    expect(html).toMatch(/data-testid="sig-unique"/);
  });
});
