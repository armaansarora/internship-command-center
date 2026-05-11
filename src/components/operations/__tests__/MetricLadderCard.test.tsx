// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { MetricLadderCard } from "../MetricLadderCard";
import type { FunnelMetricReading } from "@/lib/analytics/funnel-rollup";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * MetricLadderCard render contract.
 *
 * Manual createRoot + react act() pattern (same as
 * components/settings/__tests__/NetworkingAudit.test.tsx — no
 * @testing-library/react in this repo).
 *
 * Asserts:
 *   - Ratio values format as percentages, USD values as "$0.05".
 *   - Null observed renders as the em dash sentinel.
 *   - Health chip text and inline color match the
 *     above_target / below_target / kill spec.
 */

interface Mounted {
  host: HTMLDivElement;
  root: Root;
  unmount: () => void;
}

function mount(node: ReactElement): Mounted {
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

const ROWS: FunnelMetricReading[] = [
  {
    key: "landing_to_signin",
    description: "Landing to sign-in",
    target: 0.22,
    killThreshold: 0.12,
    unit: "ratio",
    observed: 0.3,
    health: "above_target",
  },
  {
    key: "signin_to_first_app_5min",
    description: "Sign-in to first app",
    target: 0.6,
    killThreshold: 0.35,
    unit: "ratio",
    observed: 0.4,
    health: "below_target",
  },
  {
    key: "first_app_to_first_action",
    description: "First app to first action",
    target: 0.45,
    killThreshold: 0.25,
    unit: "ratio",
    observed: 0.1,
    health: "kill",
  },
  {
    key: "cost_per_activation_usd",
    description: "Cost per activation",
    target: 0.05,
    killThreshold: 0.15,
    unit: "usd",
    observed: null,
    health: "below_target",
  },
];

describe("MetricLadderCard", () => {
  it("renders each row's description and formats ratio + usd values", () => {
    const m = mount(<MetricLadderCard rows={ROWS} />);
    cleanups.push(m.unmount);
    const text = m.host.textContent ?? "";

    // descriptions
    expect(text).toContain("Landing to sign-in");
    expect(text).toContain("Cost per activation");

    // ratio formatting: 0.22 → "22%", 0.12 → "12%", 0.3 → "30%"
    expect(text).toContain("22%");
    expect(text).toContain("12%");
    expect(text).toContain("30%");

    // usd formatting
    expect(text).toContain("$0.05");
    expect(text).toContain("$0.15");
  });

  it("renders null observed as an em dash", () => {
    const m = mount(<MetricLadderCard rows={ROWS} />);
    cleanups.push(m.unmount);

    const text = m.host.textContent ?? "";
    expect(text).toContain("—");
  });

  it("colors health chips per spec (above_target gold, below amber, kill red)", () => {
    const m = mount(<MetricLadderCard rows={ROWS} />);
    cleanups.push(m.unmount);

    const above = m.host.querySelector<HTMLElement>(
      "[data-testid='health-chip-landing_to_signin']",
    );
    const below = m.host.querySelector<HTMLElement>(
      "[data-testid='health-chip-signin_to_first_app_5min']",
    );
    const kill = m.host.querySelector<HTMLElement>(
      "[data-testid='health-chip-first_app_to_first_action']",
    );

    expect(above).not.toBeNull();
    expect(below).not.toBeNull();
    expect(kill).not.toBeNull();

    // Inline `color` style — happy-dom normalizes hex to rgb()
    // so we check the underlying CSS variable holding the colour.
    expect(above?.style.color.toLowerCase()).toMatch(
      /#c9a84c|rgb\(\s*201,\s*168,\s*76\)/,
    );
    expect(below?.style.color.toLowerCase()).toMatch(
      /#ffa500|rgb\(\s*255,\s*165,\s*0\)/,
    );
    expect(kill?.style.color.toLowerCase()).toMatch(
      /#ff6b6b|rgb\(\s*255,\s*107,\s*107\)/,
    );

    // Labels reflect the health classification.
    expect(above?.textContent).toMatch(/on target/i);
    expect(below?.textContent).toMatch(/below target/i);
    expect(kill?.textContent).toMatch(/kill/i);
  });

  it("exposes an aria-label on each health chip", () => {
    const m = mount(<MetricLadderCard rows={ROWS} />);
    cleanups.push(m.unmount);

    const chips = m.host.querySelectorAll<HTMLElement>(
      "[data-testid^='health-chip-']",
    );
    expect(chips.length).toBe(ROWS.length);
    for (const chip of Array.from(chips)) {
      expect(chip.getAttribute("aria-label")).toMatch(/^Health: /);
    }
  });
});
