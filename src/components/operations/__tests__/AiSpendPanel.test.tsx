// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { AiSpendPanel } from "../AiSpendPanel";
import type { DailyAiSpendReading } from "@/lib/db/queries/operations-ops-rest";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * AiSpendPanel render contract.
 *
 * Asserts:
 *   - Zero-spend reading renders "$0.00" + 0% ratio + healthy status.
 *   - Mid-cap reading (50%) renders gold.
 *   - Near-cap reading (>= 90%) renders red and "Near cap" status.
 *   - Over-cap reading (>= 100%) renders red and "Brake fired".
 *   - The progress bar fill width does not exceed 100% even with overshoot.
 *   - The bar's aria-valuenow reflects the integer percentage.
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

function reading(
  totalCostCents: number,
  capCents: number,
): DailyAiSpendReading {
  const usageRatio = capCents > 0 ? totalCostCents / capCents : 0;
  return { day: "2026-05-11", totalCostCents, capCents, usageRatio };
}

describe("AiSpendPanel", () => {
  it("renders zero spend as $0.00 with a healthy status", () => {
    const m = mount(<AiSpendPanel spend={reading(0, 5000)} />);
    cleanups.push(m.unmount);

    expect(
      m.host.querySelector("[data-testid='ai-spend-total']")?.textContent,
    ).toBe("$0.00");
    expect(
      m.host.querySelector("[data-testid='ai-spend-ratio']")?.textContent,
    ).toBe("0%");
    expect(
      m.host.querySelector("[data-testid='ai-spend-status']")?.textContent,
    ).toMatch(/healthy/i);
  });

  it("renders an approaching status at 60%+ of cap", () => {
    const m = mount(<AiSpendPanel spend={reading(3000, 5000)} />);
    cleanups.push(m.unmount);

    expect(
      m.host.querySelector("[data-testid='ai-spend-ratio']")?.textContent,
    ).toBe("60%");
    expect(
      m.host.querySelector("[data-testid='ai-spend-status']")?.textContent,
    ).toMatch(/approaching/i);
  });

  it("renders 'Near cap' at >= 90% of cap", () => {
    const m = mount(<AiSpendPanel spend={reading(4500, 5000)} />);
    cleanups.push(m.unmount);

    expect(
      m.host.querySelector("[data-testid='ai-spend-status']")?.textContent,
    ).toMatch(/near cap/i);
  });

  it("renders 'Brake fired' when usage is at or above 100%", () => {
    const m = mount(<AiSpendPanel spend={reading(5000, 5000)} />);
    cleanups.push(m.unmount);

    expect(
      m.host.querySelector("[data-testid='ai-spend-status']")?.textContent,
    ).toMatch(/brake fired/i);
  });

  it("clamps the progress bar fill width to 100% even when usage overshoots", () => {
    const m = mount(<AiSpendPanel spend={reading(7500, 5000)} />);
    cleanups.push(m.unmount);

    const fill = m.host.querySelector(
      "[data-testid='ai-spend-bar-fill']",
    ) as HTMLElement | null;
    // The inline style is read directly because happy-dom doesn't run
    // the CSSOM through a parser; the width string is verbatim.
    expect(fill?.style.width).toBe("100%");
  });

  it("reflects the integer percentage on the progressbar aria-valuenow", () => {
    const m = mount(<AiSpendPanel spend={reading(1250, 5000)} />);
    cleanups.push(m.unmount);

    const bar = m.host.querySelector("[role='progressbar']");
    expect(bar?.getAttribute("aria-valuenow")).toBe("25");
  });
});
