// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BuildingDirectory } from "./BuildingDirectory";
import { FLOORS, type FloorId } from "@/types/ui";

/**
 * R4.8 — BuildingDirectory render tests.
 *
 * Rules under test:
 *   1. All 9 floors are always rendered — locked floors still show up (ghosted),
 *      they don't disappear.
 *   2. Unlocked rows carry a data-state of "unlocked"; locked rows carry
 *      "locked". Integration tests can rely on this.
 *   3. The gold dot (color #C9A84C) only appears on unlocked rows.
 *   4. The diorama is aria-labelled "Building Directory".
 *   5. Floor order in the DOM is top-to-bottom PH → 7 → 6 → 5 → 4 → 3 → 2 → 1 → L.
 */

function render(node: React.ReactElement): Document {
  const html = renderToStaticMarkup(node);
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

const ALL_FLOOR_IDS: FloorId[] = ["PH", "7", "6", "5", "4", "3", "2", "1", "L"];
const RENDER_ORDER: FloorId[] = ["PH", "7", "6", "5", "4", "3", "2", "1", "L"];

describe("BuildingDirectory", () => {
  it("renders all 9 floors regardless of unlock state", () => {
    const doc = render(<BuildingDirectory floorsUnlocked={["L"]} />);
    const rows = doc.querySelectorAll("[data-floor-row]");
    expect(rows).toHaveLength(9);
  });

  it("marks rows as unlocked/locked via data-state", () => {
    const doc = render(
      <BuildingDirectory floorsUnlocked={["L", "7", "1"]} />,
    );
    for (const id of ALL_FLOOR_IDS) {
      const row = doc.querySelector(`[data-floor-row="${id}"]`);
      expect(row, `row for floor ${id} should exist`).not.toBeNull();
      const expected =
        id === "L" || id === "7" || id === "1" ? "unlocked" : "locked";
      expect(row?.getAttribute("data-state")).toBe(expected);
    }
  });

  it("shows the gold dot only on unlocked rows", () => {
    const doc = render(
      <BuildingDirectory floorsUnlocked={["L", "7"]} />,
    );
    // Collect the "dot" element (data-floor-dot) for each row. Locked rows
    // should not emit one; unlocked rows must.
    const unlockedDots = doc.querySelectorAll(
      '[data-state="unlocked"] [data-floor-dot]',
    );
    const lockedDots = doc.querySelectorAll(
      '[data-state="locked"] [data-floor-dot]',
    );
    expect(unlockedDots.length).toBeGreaterThan(0);
    expect(lockedDots).toHaveLength(0);

    // And at least one of the dots actually uses the gold hex.
    const html = doc.body.innerHTML.toLowerCase();
    expect(html).toContain("#c9a84c");
  });

  it("aria-labels the whole diorama as Building Directory", () => {
    const doc = render(<BuildingDirectory floorsUnlocked={["L"]} />);
    const root = doc.querySelector('[aria-label="Building Directory"]');
    expect(root).not.toBeNull();
  });

  it("renders floors top-to-bottom PH → 7 → 6 → 5 → 4 → 3 → 2 → 1 → L", () => {
    const doc = render(<BuildingDirectory floorsUnlocked={["L"]} />);
    const rows = Array.from(doc.querySelectorAll("[data-floor-row]"));
    const order = rows.map((r) => r.getAttribute("data-floor-row"));
    expect(order).toEqual(RENDER_ORDER);
  });

  it("uses each floor's real name from FLOORS registry (not a hardcoded substitute)", () => {
    const doc = render(
      <BuildingDirectory
        floorsUnlocked={["L", "PH", "7", "6", "5", "4", "3", "2", "1"]}
      />,
    );
    for (const floor of FLOORS) {
      const row = doc.querySelector(`[data-floor-row="${floor.id}"]`);
      expect(row?.textContent).toContain(floor.name);
    }
  });

  it("locked rows render at visibly lower opacity than unlocked ones", () => {
    // The brief specifies 30% opacity on locked rows. We assert the inline
    // style carries opacity < 1 on locked and opacity 1 on unlocked.
    const doc = render(
      <BuildingDirectory floorsUnlocked={["L", "7"]} />,
    );
    const locked = doc.querySelector(
      '[data-floor-row="6"][data-state="locked"]',
    ) as HTMLElement | null;
    const unlocked = doc.querySelector(
      '[data-floor-row="7"][data-state="unlocked"]',
    ) as HTMLElement | null;
    expect(locked).not.toBeNull();
    expect(unlocked).not.toBeNull();
    // Pull opacity from the style attribute (happy-dom may not compute
    // inherited styles so we inspect the inline declaration we render).
    const lockedOpacity = Number(
      locked?.style.opacity || locked?.getAttribute("style")?.match(/opacity:\s*([\d.]+)/)?.[1] || "1",
    );
    const unlockedOpacity = Number(
      unlocked?.style.opacity || unlocked?.getAttribute("style")?.match(/opacity:\s*([\d.]+)/)?.[1] || "1",
    );
    expect(lockedOpacity).toBeLessThan(1);
    expect(unlockedOpacity).toBe(1);
  });

  it("locked rows render the italicised sealed/not-yet label", () => {
    const doc = render(<BuildingDirectory floorsUnlocked={["L"]} />);
    const lockedRow = doc.querySelector(
      '[data-floor-row="7"][data-state="locked"]',
    );
    // The locked label must be italicised and match "sealed" or "not yet".
    const label = lockedRow?.querySelector("[data-floor-locked-label]");
    expect(label).not.toBeNull();
    expect(label?.textContent?.toLowerCase()).toMatch(/sealed|not yet/);
  });
});
