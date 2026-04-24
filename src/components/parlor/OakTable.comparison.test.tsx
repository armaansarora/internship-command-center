// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * R10 post-mortem (test-tightening pass) — OakTable side-by-side comparison.
 *
 * The R10 Proof line says: "Side-by-side comparison works with 2+ offers."
 * The original CompBandChart test (CompBandChart.test.tsx:133-144) only
 * proved chart-pin multiplicity inside one SVG — that's chart-rail layout,
 * not the comparison UX. The side-by-side comparison surface is the
 * OakTable: two OfferFolders rendering simultaneously as siblings inside the
 * `role="list"` container, each showing its OWN totals.
 *
 * Invariants pinned here:
 *   1. Both folders render in the DOM (one per offer, not blended).
 *   2. Each folder shows its OWN company_name, role, location, and status.
 *   3. Each folder shows its OWN total (independent USD sum, not aggregated).
 *   4. Folders are layout-siblings inside the same container so an a11y user
 *      reading the list, OR a sighted user with the parlor-oak-table flex
 *      layout, sees them side-by-side rather than stacked-with-occlusion.
 *   5. Selection toggles visibly between folders without mutating the other.
 *
 * The diff/winner-highlight affordance is a post-R10 enhancement; this test
 * only binds the shipped contract — "both folders render with independent
 * totals in one container."
 */

import { OakTable } from "./OakTable";
import type { OfferRow } from "@/lib/db/queries/offers-rest";

function makeOffer(overrides: Partial<OfferRow>): OfferRow {
  return {
    id: "offer-base",
    user_id: "u1",
    application_id: null,
    company_name: "Acme Corp",
    role: "Staff Engineer",
    level: null,
    location: "San Francisco, CA",
    base: 180000,
    bonus: 0,
    equity: 0,
    sign_on: 0,
    housing: 0,
    start_date: null,
    benefits: {},
    received_at: "2026-04-20T10:00:00Z",
    deadline_at: null,
    status: "received",
    created_at: "2026-04-20T10:00:00Z",
    updated_at: "2026-04-20T10:00:00Z",
    ...overrides,
  };
}

interface Mounted {
  host: HTMLDivElement;
  root: Root;
  unmount: () => void;
}

function mount(node: React.ReactElement): Mounted {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(node);
  });
  return {
    host,
    root,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      host.remove();
    },
  };
}

let cleanups: Array<() => void> = [];
beforeEach(() => {
  cleanups = [];
});
afterEach(() => {
  for (const c of cleanups) c();
  cleanups = [];
});

describe("R10 post-mortem — OakTable side-by-side comparison (2+ offers)", () => {
  function twoOffers(): OfferRow[] {
    return [
      makeOffer({
        id: "offer-acme",
        company_name: "Acme Corp",
        role: "Staff Engineer",
        location: "San Francisco, CA",
        base: 180000,
        bonus: 20000,
        equity: 50000,
        sign_on: 10000,
        housing: 0,
        // Total: 260000
      }),
      makeOffer({
        id: "offer-globex",
        company_name: "Globex",
        role: "Senior Trader",
        location: "New York, NY",
        base: 220000,
        bonus: 30000,
        equity: 80000,
        sign_on: 25000,
        housing: 5000,
        // Total: 360000
      }),
    ];
  }

  it("renders BOTH offer folders simultaneously (not just the selected one)", () => {
    const offers = twoOffers();
    const m = mount(
      <OakTable
        offers={offers}
        selectedOfferId={offers[0]!.id}
        onSelect={vi.fn()}
      />,
    );
    cleanups.push(m.unmount);

    const listitems = m.host.querySelectorAll("[role='listitem']");
    expect(listitems.length).toBe(2);

    const buttons = m.host.querySelectorAll<HTMLButtonElement>(
      "button.parlor-offer-folder",
    );
    expect(buttons.length).toBe(2);
    // Each button is keyed to its own offer id — no folder duplication.
    const offerIds = Array.from(buttons).map((b) => b.dataset.offerId);
    expect(offerIds).toEqual(["offer-acme", "offer-globex"]);
  });

  it("each folder shows its OWN company / role / location (no blending)", () => {
    const offers = twoOffers();
    const m = mount(
      <OakTable
        offers={offers}
        selectedOfferId={offers[0]!.id}
        onSelect={vi.fn()}
      />,
    );
    cleanups.push(m.unmount);

    const buttons = m.host.querySelectorAll<HTMLButtonElement>(
      "button.parlor-offer-folder",
    );
    const acme = buttons[0]!;
    const globex = buttons[1]!;

    expect(acme.textContent).toContain("Acme Corp");
    expect(acme.textContent).toContain("Staff Engineer");
    expect(acme.textContent).toContain("San Francisco, CA");
    expect(acme.textContent).not.toContain("Globex");
    expect(acme.textContent).not.toContain("Senior Trader");

    expect(globex.textContent).toContain("Globex");
    expect(globex.textContent).toContain("Senior Trader");
    expect(globex.textContent).toContain("New York, NY");
    expect(globex.textContent).not.toContain("Acme Corp");
    expect(globex.textContent).not.toContain("Staff Engineer");
  });

  it("each folder shows its OWN total comp (independent sum, not aggregated)", () => {
    const offers = twoOffers();
    const m = mount(
      <OakTable
        offers={offers}
        selectedOfferId={offers[0]!.id}
        onSelect={vi.fn()}
      />,
    );
    cleanups.push(m.unmount);

    const totals = m.host.querySelectorAll(".parlor-offer-folder-total");
    expect(totals.length).toBe(2);
    // Acme: 180000 + 20000 + 50000 + 10000 + 0 = 260,000
    expect(totals[0]!.textContent).toMatch(/\$260,000/);
    // Globex: 220000 + 30000 + 80000 + 25000 + 5000 = 360,000
    expect(totals[1]!.textContent).toMatch(/\$360,000/);
    // Trip-wire: if a future "blended total" affordance ships, the per-folder
    // totals must remain. This asserts neither folder shows the SUM of both.
    // Sum would be 620,000 — must NOT appear in either folder.
    expect(totals[0]!.textContent).not.toMatch(/\$620,000/);
    expect(totals[1]!.textContent).not.toMatch(/\$620,000/);
  });

  it("renders both folders as siblings inside the same role=list container (side-by-side, not stacked into separate lists)", () => {
    const offers = twoOffers();
    const m = mount(
      <OakTable
        offers={offers}
        selectedOfferId={offers[0]!.id}
        onSelect={vi.fn()}
      />,
    );
    cleanups.push(m.unmount);

    const lists = m.host.querySelectorAll("[role='list']");
    expect(lists.length).toBe(1);
    const list = lists[0]! as HTMLElement;
    expect(list.classList.contains("parlor-oak-table")).toBe(true);

    // Both listitems are direct children of the SAME list container —
    // confirms the "side-by-side" structural invariant the visual layout
    // (parlor.css: `.parlor-oak-table { display: flex; flex-direction: row; }`)
    // hangs off of. If a future regression nests one folder inside the other
    // or splits them across two lists, this fails.
    const directListItems = Array.from(list.children).filter(
      (el) => el.getAttribute("role") === "listitem",
    );
    expect(directListItems.length).toBe(2);
  });

  it("selection toggles between folders without mutating the other's render", () => {
    const offers = twoOffers();
    const onSelect = vi.fn();

    // Render with offer-acme selected.
    const m1 = mount(
      <OakTable
        offers={offers}
        selectedOfferId="offer-acme"
        onSelect={onSelect}
      />,
    );
    cleanups.push(m1.unmount);
    let buttons = m1.host.querySelectorAll<HTMLButtonElement>(
      "button.parlor-offer-folder",
    );
    expect(buttons[0]!.getAttribute("aria-pressed")).toBe("true");
    expect(buttons[1]!.getAttribute("aria-pressed")).toBe("false");

    // Re-render with offer-globex selected; both folders still present, only
    // aria-pressed flips.
    act(() => {
      m1.root.render(
        <OakTable
          offers={offers}
          selectedOfferId="offer-globex"
          onSelect={onSelect}
        />,
      );
    });
    buttons = m1.host.querySelectorAll<HTMLButtonElement>(
      "button.parlor-offer-folder",
    );
    expect(buttons.length).toBe(2);
    expect(buttons[0]!.getAttribute("aria-pressed")).toBe("false");
    expect(buttons[1]!.getAttribute("aria-pressed")).toBe("true");
    // The non-selected folder still shows its own data.
    expect(buttons[0]!.textContent).toContain("Acme Corp");
  });
});
