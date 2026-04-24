// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { renderToString } from "react-dom/server";
import type { ApplicationInput, Status } from "@/lib/orrery/types";
import type { PipelineStats } from "@/lib/db/queries/applications-rest";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * R9.9 — ObservatoryClient composition tests.
 *
 * The Observatory's centerpiece is the Orrery (R9.1–R9.5). Charts are
 * supporting material. This test file is the structural guard against the
 * "dashboard with a theme" anti-pattern called out in the partner brief:
 * any future regression that puts the chart grid above the Orrery (or
 * elevates it back to centerpiece status) will fail the DOM-order assertion.
 *
 * Tests use the project's manual createRoot + react act() pattern (no
 * @testing-library/react — see CLAUDE.md). The DOM-order check uses
 * react-dom/server's renderToString to inspect the SSR output as a string,
 * which is the cheapest way to assert "X comes before Y in the rendered
 * tree" without traversing live DOM nodes.
 */

// Default mock: motion on. Mirrors Orrery.test.tsx.
vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: (): boolean => false,
}));

// GSAP mock — OrreryRender wires a timeline and a camera-dolly tween.
vi.mock("@/lib/gsap-init", () => {
  type Tween = { kill: () => void };
  type Timeline = {
    to: (..._args: unknown[]) => Timeline;
    set: (..._args: unknown[]) => Timeline;
    fromTo: (..._args: unknown[]) => Timeline;
    add: (..._args: unknown[]) => Timeline;
    kill: () => void;
  };
  function makeTimeline(): Timeline {
    const tl: Timeline = {
      to: () => tl,
      set: () => tl,
      fromTo: () => tl,
      add: () => tl,
      kill: () => undefined,
    };
    return tl;
  }
  function makeTween(): Tween {
    return { kill: () => undefined };
  }
  return {
    gsap: {
      timeline: () => makeTimeline(),
      to: () => makeTween(),
      set: () => undefined,
      fromTo: () => makeTween(),
    },
  };
});

import { ObservatoryClient } from "./ObservatoryClient";

function makeStats(overrides: Partial<PipelineStats> = {}): PipelineStats {
  return {
    total: 12,
    discovered: 2,
    applied: 5,
    screening: 2,
    interviewing: 2,
    offers: 1,
    stale: 0,
    weeklyActivity: 4,
    conversionRate: 12.5,
    scheduledInterviews: 1,
    byStatus: { applied: 5, screening: 2, interviewing: 2, offer: 1 },
    appliedToScreeningRate: 40,
    screeningToInterviewRate: 50,
    interviewToOfferRate: 50,
    staleCount: 0,
    warmCount: 3,
    conversionLabel: "12.5%",
    ...overrides,
  };
}

function makeApp(over: Partial<ApplicationInput> = {}): ApplicationInput {
  return {
    id: "a",
    companyName: "Acme",
    role: "Analyst",
    tier: 1,
    status: "applied" as Status,
    matchScore: 0.8,
    appliedAt: "2026-04-01T00:00:00Z",
    lastActivityAt: "2026-04-10T00:00:00Z",
    hasOfferEverFired: false,
    ...over,
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
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
});

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
});

describe("ObservatoryClient — empty apps fixture", () => {
  it("renders without throwing when apps is empty", () => {
    expect(() => {
      const m = mount(<ObservatoryClient stats={makeStats()} apps={[]} />);
      cleanups.push(m.unmount);
    }).not.toThrow();
  });

  it("with empty apps, the orrery scene still mounts (empty-state aria label)", () => {
    const m = mount(<ObservatoryClient stats={makeStats()} apps={[]} />);
    cleanups.push(m.unmount);
    const sceneByLabel = m.host.querySelector('[aria-label^="Pipeline orrery"]');
    expect(sceneByLabel).not.toBeNull();
  });
});

describe("ObservatoryClient — orrery is the centerpiece", () => {
  it("renders the orrery when given a small apps fixture", () => {
    const apps = [
      makeApp({ id: "p1", companyName: "Acme", role: "Analyst" }),
      makeApp({ id: "p2", companyName: "Beta", role: "PM", tier: 2 }),
    ];
    const m = mount(<ObservatoryClient stats={makeStats()} apps={apps} />);
    cleanups.push(m.unmount);
    const scene = m.host.querySelector(".orrery-scene");
    expect(scene).not.toBeNull();
  });

  it("supporting chart panels (CONVERSION FUNNEL, PIPELINE VELOCITY) are still rendered below the Orrery", () => {
    const m = mount(
      <ObservatoryClient
        stats={makeStats()}
        apps={[makeApp({ id: "p1", companyName: "Acme", role: "Analyst" })]}
      />,
    );
    cleanups.push(m.unmount);
    const text = m.host.textContent ?? "";
    expect(text).toMatch(/CONVERSION FUNNEL/);
    expect(text).toMatch(/PIPELINE VELOCITY/);
  });

  it('exposes a labeled centerpiece region marking the Orrery as the signature moment', () => {
    const m = mount(
      <ObservatoryClient
        stats={makeStats()}
        apps={[makeApp({ id: "p1", companyName: "Acme", role: "Analyst" })]}
      />,
    );
    cleanups.push(m.unmount);
    const centerpiece = m.host.querySelector('[aria-label*="centerpiece"]');
    expect(centerpiece).not.toBeNull();
  });
});

describe('ObservatoryClient — "More analytics" is collapsed by default', () => {
  it("the More analytics details element is not open by default", () => {
    const m = mount(<ObservatoryClient stats={makeStats()} apps={[]} />);
    cleanups.push(m.unmount);
    const details = m.host.querySelector("details");
    expect(details).not.toBeNull();
    expect(details?.hasAttribute("open")).toBe(false);
  });

  it("the More analytics summary text is present", () => {
    const m = mount(<ObservatoryClient stats={makeStats()} apps={[]} />);
    cleanups.push(m.unmount);
    const summary = m.host.querySelector("details > summary");
    expect(summary).not.toBeNull();
    expect((summary?.textContent ?? "").toLowerCase()).toMatch(/more analytics/);
  });

  it("WeeklyTrend and ActivityHeatmap are rendered inside the <details> wrapper (collapsible)", () => {
    const m = mount(<ObservatoryClient stats={makeStats()} apps={[]} />);
    cleanups.push(m.unmount);
    const details = m.host.querySelector("details");
    expect(details).not.toBeNull();
    const inside = details?.textContent ?? "";
    // Two markers from the AnalyticsPanel titles for the demoted charts
    expect(inside).toMatch(/WEEKLY TREND/);
    expect(inside).toMatch(/ACTIVITY HEATMAP/);
  });
});

describe("ObservatoryClient — Orrery comes BEFORE the chart panels in DOM order", () => {
  it("SSR output renders the Orrery centerpiece marker before CONVERSION FUNNEL", () => {
    // This is the load-bearing anti-pattern guard. If a future change reorders
    // dashboardSlot to put the chart grid first, this test breaks immediately.
    const html = renderToString(
      <ObservatoryClient
        stats={makeStats()}
        apps={[makeApp({ id: "p1", companyName: "Acme", role: "Analyst" })]}
      />,
    );
    const orreryIdx = html.indexOf("centerpiece");
    const funnelIdx = html.indexOf("CONVERSION FUNNEL");
    const velocityIdx = html.indexOf("PIPELINE VELOCITY");
    expect(orreryIdx).toBeGreaterThanOrEqual(0);
    expect(funnelIdx).toBeGreaterThanOrEqual(0);
    expect(velocityIdx).toBeGreaterThanOrEqual(0);
    expect(orreryIdx).toBeLessThan(funnelIdx);
    expect(orreryIdx).toBeLessThan(velocityIdx);
  });

  it("SSR output renders CONVERSION FUNNEL before the More analytics summary", () => {
    const html = renderToString(<ObservatoryClient stats={makeStats()} apps={[]} />);
    const funnelIdx = html.indexOf("CONVERSION FUNNEL");
    const moreIdx = html.toLowerCase().indexOf("more analytics");
    expect(funnelIdx).toBeGreaterThanOrEqual(0);
    expect(moreIdx).toBeGreaterThan(0);
    expect(funnelIdx).toBeLessThan(moreIdx);
  });
});
