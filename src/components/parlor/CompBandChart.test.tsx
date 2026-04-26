// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * CompBandChart render tests.
 *
 * Uses the project's manual createRoot + react act() pattern (no
 * @testing-library/react — see CLAUDE.md, ParlorDoor.test.tsx, and
 * OfferFolder.test.tsx for the R10.5/R10.6 pattern).
 *
 * Contracts under test:
 *   - Empty state (bands=null) renders a parlor-chart-empty block with a
 *     human-readable "not enough benchmark data" message and no SVG.
 *   - Present state renders the three percentile rails (p25/p50/p75) with
 *     data-testid hooks the integration tests can target.
 *   - Pin colour is driven by colorForPercentile — red when base < p25,
 *     gold when base > p75, ink otherwise. Each pin surfaces its label
 *     via `data-testid="pin-<label>"` and its colour via `data-color`.
 *   - Multiple pins render in the same svg (stack-of-offers affordance).
 */

import { CompBandChart, type CompBands, type CompPin } from "./CompBandChart";

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

function makeBands(overrides: Partial<CompBands> = {}): CompBands {
  return {
    p25: 100000,
    p50: 120000,
    p75: 140000,
    sampleSize: 42,
    source: "levels.fyi",
    ...overrides,
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

describe("R10.8 CompBandChart — empty state", () => {
  it("renders empty-state copy when bands are null", () => {
    const m = mount(<CompBandChart bands={null} pins={[]} />);
    cleanups.push(m.unmount);
    expect(m.host.innerHTML).toMatch(/not enough benchmark data/i);
  });

  it("does NOT render an svg when bands are null", () => {
    const m = mount(<CompBandChart bands={null} pins={[]} />);
    cleanups.push(m.unmount);
    expect(m.host.querySelector("svg")).toBeNull();
  });
});

describe("R10.8 CompBandChart — band rails", () => {
  it("renders p25, p50, and p75 percentile bars when bands are present", () => {
    const m = mount(<CompBandChart bands={makeBands()} pins={[]} />);
    cleanups.push(m.unmount);
    expect(m.host.querySelector('[data-testid="band-p25"]')).not.toBeNull();
    expect(m.host.querySelector('[data-testid="band-p50"]')).not.toBeNull();
    expect(m.host.querySelector('[data-testid="band-p75"]')).not.toBeNull();
  });

  it("renders an svg with role=img and an accessible label", () => {
    const m = mount(<CompBandChart bands={makeBands()} pins={[]} />);
    cleanups.push(m.unmount);
    const svg = m.host.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toMatch(/compensation/i);
  });
});

describe("R10.8 CompBandChart — pin colour verdicts", () => {
  it("paints a red pin when the offer base is below p25", () => {
    const pin: CompPin = { label: "Acme", base: 80000 };
    const m = mount(<CompBandChart bands={makeBands()} pins={[pin]} />);
    cleanups.push(m.unmount);
    const node = m.host.querySelector('[data-testid="pin-Acme"]');
    expect(node).not.toBeNull();
    expect(node?.getAttribute("data-color")).toBe("red");
  });

  it("paints a gold pin when the offer base is above p75", () => {
    const pin: CompPin = { label: "Acme", base: 160000 };
    const m = mount(<CompBandChart bands={makeBands()} pins={[pin]} />);
    cleanups.push(m.unmount);
    const node = m.host.querySelector('[data-testid="pin-Acme"]');
    expect(node?.getAttribute("data-color")).toBe("gold");
  });

  it("paints an ink pin when the offer base sits inside the band", () => {
    const pin: CompPin = { label: "Acme", base: 120000 };
    const m = mount(<CompBandChart bands={makeBands()} pins={[pin]} />);
    cleanups.push(m.unmount);
    const node = m.host.querySelector('[data-testid="pin-Acme"]');
    expect(node?.getAttribute("data-color")).toBe("ink");
  });
});

describe("R10.8 CompBandChart — multiple pins", () => {
  it("renders both pins when two offers are supplied", () => {
    const pins: CompPin[] = [
      { label: "A", base: 80000 },
      { label: "B", base: 160000 },
    ];
    const m = mount(<CompBandChart bands={makeBands()} pins={pins} />);
    cleanups.push(m.unmount);
    expect(m.host.querySelector('[data-testid="pin-A"]')).not.toBeNull();
    expect(m.host.querySelector('[data-testid="pin-B"]')).not.toBeNull();
  });
});
