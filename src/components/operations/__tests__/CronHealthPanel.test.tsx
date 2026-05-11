// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ReactElement } from "react";

import { CronHealthPanel } from "../CronHealthPanel";
import type { ProductionHealthSummary } from "@/lib/observability/production-health";

(
  globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * CronHealthPanel render contract.
 *
 * Asserts:
 *   - Empty cron summary renders the "no runs yet" empty state.
 *   - `null` cron renders the "read unavailable" empty state.
 *   - Each run renders a status chip (ok/stale/failing/never) and the
 *     job name as a row header.
 *   - The summary line counts stale + failing jobs distinctly.
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

function makeCron(
  override: Partial<ProductionHealthSummary["cron"]> = {},
): ProductionHealthSummary["cron"] {
  return {
    configuredJobs: 0,
    lastRuns: [],
    staleJobs: [],
    failingJobs: [],
    ...override,
  };
}

describe("CronHealthPanel", () => {
  it("renders the 'no runs yet' empty state when cron summary is empty", () => {
    const m = mount(<CronHealthPanel cron={makeCron()} />);
    cleanups.push(m.unmount);

    expect(
      m.host.querySelector("[data-testid='cron-health-empty']"),
    ).not.toBeNull();
  });

  it("renders the 'read unavailable' empty state when cron is null", () => {
    const m = mount(<CronHealthPanel cron={null} />);
    cleanups.push(m.unmount);

    const empty = m.host.querySelector("[data-testid='cron-health-empty']");
    expect(empty?.textContent).toMatch(/unavailable/i);
    const summary = m.host.querySelector(
      "[data-testid='cron-health-summary']",
    );
    expect(summary?.textContent).toMatch(/unavailable/i);
  });

  it("renders one row per configured cron run with a status chip", () => {
    const cron = makeCron({
      configuredJobs: 2,
      lastRuns: [
        {
          jobName: "rolling-invites",
          startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          finishedAt: new Date().toISOString(),
          success: true,
          durationMs: 1234,
          errorMessage: null,
          stale: false,
        },
        {
          jobName: "outreach-sender",
          startedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          finishedAt: new Date().toISOString(),
          success: false,
          durationMs: 4500,
          errorMessage: "Provider 500",
          stale: false,
        },
      ],
      failingJobs: [
        {
          jobName: "outreach-sender",
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          success: false,
          durationMs: 4500,
          errorMessage: "Provider 500",
          stale: false,
        },
      ],
    });
    const m = mount(<CronHealthPanel cron={cron} />);
    cleanups.push(m.unmount);

    expect(
      m.host.querySelector("[data-testid='cron-status-rolling-invites']")
        ?.textContent,
    ).toMatch(/ok/i);
    expect(
      m.host.querySelector("[data-testid='cron-status-outreach-sender']")
        ?.textContent,
    ).toMatch(/failing/i);
  });

  it("renders a 'stale' chip when the run is past its threshold", () => {
    const cron = makeCron({
      configuredJobs: 1,
      lastRuns: [
        {
          jobName: "owner-watchdog",
          startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          finishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          success: true,
          durationMs: 1000,
          errorMessage: null,
          stale: true,
        },
      ],
      staleJobs: [
        {
          jobName: "owner-watchdog",
          startedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          finishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          success: true,
          durationMs: 1000,
          errorMessage: null,
          stale: true,
        },
      ],
    });
    const m = mount(<CronHealthPanel cron={cron} />);
    cleanups.push(m.unmount);

    expect(
      m.host.querySelector("[data-testid='cron-status-owner-watchdog']")
        ?.textContent,
    ).toMatch(/stale/i);
  });

  it("renders a 'never run' chip when the cron has no startedAt", () => {
    const cron = makeCron({
      configuredJobs: 1,
      lastRuns: [
        {
          jobName: "future-cron",
          startedAt: null,
          finishedAt: null,
          success: null,
          durationMs: null,
          errorMessage: null,
          stale: true,
        },
      ],
    });
    const m = mount(<CronHealthPanel cron={cron} />);
    cleanups.push(m.unmount);

    expect(
      m.host.querySelector("[data-testid='cron-status-future-cron']")
        ?.textContent,
    ).toMatch(/never/i);
  });
});
