// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * R10.7 — ThreeChairsConvening render + interaction tests.
 *
 * Uses the project's manual createRoot + react act() pattern (no
 * @testing-library/react — see CLAUDE.md and OfferFolder.test.tsx).
 *
 * Contracts under test:
 *   - Empty state (no result + not loading) shows the Convene button.
 *   - Loading state shows a polite, aria-live announcement.
 *   - Result state renders three chairs — offer_evaluator, cfo, cno.
 *   - Offer Evaluator chair shows verdict + narrative + risk list (when any).
 *   - CFO chair formats year-1 and 4yr totals as USD.
 *   - CNO chair renders the contact list when populated.
 *   - Convene button click calls onConvene exactly once.
 */

import { ThreeChairsConvening } from "./ThreeChairsConvening";
import type { ParlorConveningResult } from "@/lib/ai/agents/parlor-convening";

function makeResult(
  overrides: Partial<ParlorConveningResult> = {},
): ParlorConveningResult {
  return {
    offer_evaluator: {
      verdict: "MARKET",
      narrative: "Base sits at p50. Bonus thin.",
      risks: ["exploding offer"],
    },
    cfo: {
      total_comp_year1: 150000,
      total_comp_4yr: 600000,
      vesting_note: "1yr cliff",
      narrative: "Standard package.",
    },
    cno: {
      contacts_at_company: [],
      narrative: "No contacts yet.",
    },
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

describe("R10.7 ThreeChairsConvening — empty state", () => {
  it("renders a Convene button when there is no result and not loading", () => {
    const m = mount(
      <ThreeChairsConvening loading={false} result={null} onConvene={() => {}} />,
    );
    cleanups.push(m.unmount);
    const btn = m.host.querySelector("button");
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toMatch(/convene/i);
  });

  it("calls onConvene when the button is clicked", () => {
    const spy = vi.fn();
    const m = mount(
      <ThreeChairsConvening loading={false} result={null} onConvene={spy} />,
    );
    cleanups.push(m.unmount);
    const btn = m.host.querySelector("button")!;
    act(() => {
      btn.click();
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("R10.7 ThreeChairsConvening — loading state", () => {
  it("announces via aria-live polite when loading", () => {
    const html = renderToStaticMarkup(
      <ThreeChairsConvening loading={true} result={null} onConvene={() => {}} />,
    );
    expect(html).toMatch(/aria-live="polite"/);
    expect(html).toMatch(/lean in/i);
  });
});

describe("R10.7 ThreeChairsConvening — result state", () => {
  it("renders three chairs keyed by seat", () => {
    const html = renderToStaticMarkup(
      <ThreeChairsConvening
        loading={false}
        result={makeResult()}
        onConvene={() => {}}
      />,
    );
    expect(html).toMatch(/data-seat="offer_evaluator"/);
    expect(html).toMatch(/data-seat="cfo"/);
    expect(html).toMatch(/data-seat="cno"/);
  });

  it("shows verdict + narrative + risks on the Offer Evaluator chair", () => {
    const m = mount(
      <ThreeChairsConvening
        loading={false}
        result={makeResult()}
        onConvene={() => {}}
      />,
    );
    cleanups.push(m.unmount);
    const seat = m.host.querySelector('[data-seat="offer_evaluator"]')!;
    expect(seat.innerHTML).toMatch(/MARKET/);
    expect(seat.innerHTML).toMatch(/Base sits at p50/);
    expect(seat.innerHTML).toMatch(/exploding offer/);
  });

  it("formats CFO totals as USD", () => {
    const m = mount(
      <ThreeChairsConvening
        loading={false}
        result={makeResult()}
        onConvene={() => {}}
      />,
    );
    cleanups.push(m.unmount);
    const seat = m.host.querySelector('[data-seat="cfo"]')!;
    expect(seat.innerHTML).toMatch(/\$150,000/);
    expect(seat.innerHTML).toMatch(/\$600,000/);
  });

  it("renders CNO contact list when populated", () => {
    const result = makeResult({
      cno: {
        contacts_at_company: [
          { name: "Sarah Chen", warmth: 80, note: "Warm intro" },
          { name: "Michael Torres", warmth: 40, note: "Cold outreach" },
        ],
        narrative: "Two contacts.",
      },
    });
    const m = mount(
      <ThreeChairsConvening
        loading={false}
        result={result}
        onConvene={() => {}}
      />,
    );
    cleanups.push(m.unmount);
    const seat = m.host.querySelector('[data-seat="cno"]')!;
    expect(seat.innerHTML).toMatch(/Sarah Chen/);
    expect(seat.innerHTML).toMatch(/Michael Torres/);
  });

  it("omits the risks list when Offer Evaluator returned no risks", () => {
    const result = makeResult({
      offer_evaluator: {
        verdict: "STRONG",
        narrative: "Top of band.",
        risks: [],
      },
    });
    const m = mount(
      <ThreeChairsConvening
        loading={false}
        result={result}
        onConvene={() => {}}
      />,
    );
    cleanups.push(m.unmount);
    const seat = m.host.querySelector('[data-seat="offer_evaluator"]')!;
    expect(seat.querySelector("ul")).toBeNull();
  });
});
