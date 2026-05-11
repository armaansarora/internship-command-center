// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { IncidentAlertsPanel } from "../IncidentAlertsPanel";
import type { IncidentAlertView } from "@/lib/db/queries/operations-ops-rest";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * IncidentAlertsPanel render contract.
 *
 * Asserts:
 *   - Empty list renders the "system quiet" empty state.
 *   - Open / crit incident → red "Open · crit" chip.
 *   - Open / warn incident → amber "Open · warn" chip.
 *   - Resolved incident → gold "Resolved" chip.
 *   - Header summary distinguishes "open / total" from "resolved-only".
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

describe("IncidentAlertsPanel", () => {
  it("renders the 'system quiet' empty state when no incidents have been opened", () => {
    const m = mount(<IncidentAlertsPanel incidents={[]} />);
    cleanups.push(m.unmount);

    const empty = m.host.querySelector(
      "[data-testid='incident-alerts-empty']",
    );
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toMatch(/system quiet|no incidents/i);
  });

  it("renders an 'open · crit' chip for an open crit incident", () => {
    const incidents: IncidentAlertView[] = [
      {
        id: "inc-1",
        jobName: "cron-stale",
        severity: "crit",
        lastSeenValue: "stale 6h",
        openedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        resolvedAt: null,
        open: true,
      },
    ];
    const m = mount(<IncidentAlertsPanel incidents={incidents} />);
    cleanups.push(m.unmount);

    const chip = m.host.querySelector("[data-testid='incident-chip-inc-1']");
    expect(chip?.textContent).toMatch(/open · crit/i);
  });

  it("renders an 'open · warn' chip for an open warn incident", () => {
    const incidents: IncidentAlertView[] = [
      {
        id: "inc-2",
        jobName: "ai-cost-hourly",
        severity: "warn",
        lastSeenValue: "$3.20/hr",
        openedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        resolvedAt: null,
        open: true,
      },
    ];
    const m = mount(<IncidentAlertsPanel incidents={incidents} />);
    cleanups.push(m.unmount);

    const chip = m.host.querySelector("[data-testid='incident-chip-inc-2']");
    expect(chip?.textContent).toMatch(/open · warn/i);
  });

  it("renders a 'resolved' chip for a resolved incident regardless of severity", () => {
    const incidents: IncidentAlertView[] = [
      {
        id: "inc-3",
        jobName: "ai-cost-hourly",
        severity: "crit",
        lastSeenValue: "$5.50/hr",
        openedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        resolvedAt: new Date().toISOString(),
        open: false,
      },
    ];
    const m = mount(<IncidentAlertsPanel incidents={incidents} />);
    cleanups.push(m.unmount);

    const chip = m.host.querySelector("[data-testid='incident-chip-inc-3']");
    expect(chip?.textContent).toMatch(/resolved/i);
  });

  it("shows the 'N open / M total' summary when at least one is open", () => {
    const incidents: IncidentAlertView[] = [
      {
        id: "inc-open",
        jobName: "x",
        severity: "warn",
        lastSeenValue: null,
        openedAt: new Date().toISOString(),
        resolvedAt: null,
        open: true,
      },
      {
        id: "inc-closed",
        jobName: "y",
        severity: "warn",
        lastSeenValue: null,
        openedAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
        open: false,
      },
    ];
    const m = mount(<IncidentAlertsPanel incidents={incidents} />);
    cleanups.push(m.unmount);

    expect(
      m.host
        .querySelector("[data-testid='incident-alerts-summary']")
        ?.textContent,
    ).toMatch(/1 open/i);
  });
});
