// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { CostMeter } from "../CostMeter";
import type { ActivationCost } from "@/lib/db/queries/operations-rest";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * CostMeter render contract.
 *
 * Asserts:
 *   - totalUsd renders as `$N.NN`.
 *   - observedCostPerActivation renders with 3 decimals so $0.034 doesn't
 *     round to $0.03.
 *   - Null observedCostPerActivation falls back to the em dash.
 *   - Token totals compact: thousands → "k", millions → "M".
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

describe("CostMeter", () => {
  it("formats totals with currency and compact-token suffixes", () => {
    const cost: ActivationCost = {
      totalTokens: 1_250_000,
      totalUsd: 12.34,
      dispatches: 42,
    };
    const m = mount(
      <CostMeter
        cost={cost}
        observedCostPerActivation={0.034}
        windowLabel="Last 7 days"
      />,
    );
    cleanups.push(m.unmount);

    const totalUsd = m.host.querySelector(
      "[data-testid='cost-meter-total-usd']",
    );
    const perActivation = m.host.querySelector(
      "[data-testid='cost-meter-per-activation']",
    );
    const tokens = m.host.querySelector(
      "[data-testid='cost-meter-total-tokens']",
    );
    const dispatches = m.host.querySelector(
      "[data-testid='cost-meter-dispatches']",
    );

    expect(totalUsd?.textContent).toBe("$12.34");
    expect(perActivation?.textContent).toBe("$0.034");
    expect(tokens?.textContent).toBe("1.25M");
    expect(dispatches?.textContent).toBe("42");
  });

  it("renders null observed cost as an em dash", () => {
    const cost: ActivationCost = {
      totalTokens: 0,
      totalUsd: 0,
      dispatches: 0,
    };
    const m = mount(
      <CostMeter cost={cost} observedCostPerActivation={null} />,
    );
    cleanups.push(m.unmount);

    const perActivation = m.host.querySelector(
      "[data-testid='cost-meter-per-activation']",
    );
    expect(perActivation?.textContent).toBe("—");
  });

  it("renders smaller token counts with a 'k' suffix", () => {
    const cost: ActivationCost = {
      totalTokens: 12_500,
      totalUsd: 0.5,
      dispatches: 5,
    };
    const m = mount(
      <CostMeter cost={cost} observedCostPerActivation={0.1} />,
    );
    cleanups.push(m.unmount);

    const tokens = m.host.querySelector(
      "[data-testid='cost-meter-total-tokens']",
    );
    expect(tokens?.textContent).toBe("12.5k");
  });

  it("renders raw integer for sub-thousand token counts", () => {
    const cost: ActivationCost = {
      totalTokens: 500,
      totalUsd: 0.01,
      dispatches: 1,
    };
    const m = mount(
      <CostMeter cost={cost} observedCostPerActivation={0.01} />,
    );
    cleanups.push(m.unmount);

    const tokens = m.host.querySelector(
      "[data-testid='cost-meter-total-tokens']",
    );
    expect(tokens?.textContent).toBe("500");
  });
});
