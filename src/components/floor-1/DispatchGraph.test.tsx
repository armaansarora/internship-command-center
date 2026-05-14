// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// The test file lives alongside the component and the component imports
// `useReducedMotion` from `@/hooks/useReducedMotion`. We hoist a mock so the
// default path returns `false` (motion on); reduced-motion tests use
// `vi.doMock` via dynamic imports to override per-test.
vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: (): boolean => false,
}));

import {
  DispatchGraph,
  describeDispatches,
  DISPATCH_GRAPH_AGENTS,
} from "./DispatchGraph";

/**
 * Parse the SSR-rendered markup into a DOM document so we can query it with
 * standard DOM APIs. happy-dom provides DOMParser in the test env.
 */
function render(node: React.ReactElement): Document {
  const html = renderToStaticMarkup(node);
  return new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, "text/html");
}

describe("describeDispatches", () => {
  it("returns the idle message for an empty object", () => {
    expect(describeDispatches({})).toBe(
      "Agent network — no departments dispatched",
    );
  });

  it("returns the idle message when every agent is explicitly idle", () => {
    const idle = Object.fromEntries(
      DISPATCH_GRAPH_AGENTS.map((k) => [k, { status: "idle" as const }]),
    );
    expect(describeDispatches(idle)).toBe(
      "Agent network — no departments dispatched",
    );
  });

  it("enumerates only non-idle agents in canonical order", () => {
    const label = describeDispatches({
      cfo: { status: "running" },
      cro: { status: "completed" },
      coo: { status: "running" },
    });
    // Canonical order is cro, coo, cno, cio, cmo, cpo, cfo — so cro appears
    // before coo which appears before cfo regardless of insertion order.
    expect(label).toBe(
      "Agent network: 3 of 7 departments dispatched — CRO completed, COO running, CFO running",
    );
  });

  it("reports all 7 when all agents are completed", () => {
    const all = Object.fromEntries(
      DISPATCH_GRAPH_AGENTS.map((k) => [k, { status: "completed" as const }]),
    );
    const label = describeDispatches(all);
    expect(label).toContain("7 of 7 departments dispatched");
    expect(label).toContain("CRO completed");
    expect(label).toContain("CFO completed");
  });

  it("includes failed entries with the failed verb", () => {
    const label = describeDispatches({
      cro: { status: "failed" },
      coo: { status: "completed" },
    });
    expect(label).toBe(
      "Agent network: 2 of 7 departments dispatched — CRO failed, COO completed",
    );
  });

  it("ignores unknown keys like 'ceo' or 'foo'", () => {
    const label = describeDispatches({
      ceo: { status: "running" },
      foo: { status: "failed" },
    });
    expect(label).toBe("Agent network — no departments dispatched");
  });
});

describe("DispatchGraph — structural rendering", () => {
  it("renders 7 satellite nodes + 1 CEO center when given no dispatches", () => {
    const doc = render(<DispatchGraph dispatches={{}} />);

    // 7 satellite nodes, one per canonical agent.
    const satellites = doc.querySelectorAll("[data-agent]");
    expect(satellites.length).toBe(7);
    const agentKeys = Array.from(satellites).map((g) => g.getAttribute("data-agent"));
    expect(agentKeys.sort()).toEqual([...DISPATCH_GRAPH_AGENTS].sort());

    // CEO label rendered.
    expect(doc.body.textContent).toContain("CEO");

    // All 7 uppercase agent labels rendered.
    for (const key of DISPATCH_GRAPH_AGENTS) {
      expect(doc.body.textContent).toContain(key.toUpperCase());
    }

    // Every satellite is idle and the wrapper aria-label says so.
    const wrapper = doc.querySelector('[role="img"]');
    expect(wrapper?.getAttribute("aria-label")).toBe(
      "Agent network — no departments dispatched",
    );
    for (const g of Array.from(satellites)) {
      expect(g.getAttribute("data-state")).toBe("idle");
    }
  });

  it("aria-label enumerates exactly the running agents given 3 running dispatches", () => {
    const doc = render(
      <DispatchGraph
        dispatches={{
          cro: { status: "running" },
          coo: { status: "running" },
          cio: { status: "running" },
        }}
      />,
    );
    const wrapper = doc.querySelector('[role="img"]');
    expect(wrapper?.getAttribute("aria-label")).toBe(
      "Agent network: 3 of 7 departments dispatched — CRO running, COO running, CIO running",
    );

    // data-state attributes reflect the status.
    const running = doc.querySelectorAll('[data-agent][data-state="running"]');
    expect(running.length).toBe(3);
  });

  it("aria-label handles a mixed state (2 running, 1 completed, 1 failed)", () => {
    const doc = render(
      <DispatchGraph
        dispatches={{
          cro: { status: "running" },
          coo: { status: "running" },
          cio: { status: "completed" },
          cfo: { status: "failed" },
        }}
      />,
    );
    const wrapper = doc.querySelector('[role="img"]');
    const label = wrapper?.getAttribute("aria-label") ?? "";
    expect(label).toContain("4 of 7 departments dispatched");
    expect(label).toContain("CRO running");
    expect(label).toContain("COO running");
    expect(label).toContain("CIO completed");
    expect(label).toContain("CFO failed");
  });

  it("ignores unknown keys — 'ceo' as a dispatch target does not change the graph", () => {
    const doc = render(
      <DispatchGraph dispatches={{ ceo: { status: "running" } }} />,
    );
    const wrapper = doc.querySelector('[role="img"]');
    expect(wrapper?.getAttribute("aria-label")).toBe(
      "Agent network — no departments dispatched",
    );
    // All 7 satellites remain idle; no rogue 'ceo' satellite group.
    const satellites = doc.querySelectorAll("[data-agent]");
    expect(satellites.length).toBe(7);
    for (const g of Array.from(satellites)) {
      expect(g.getAttribute("data-state")).toBe("idle");
      expect(g.getAttribute("data-agent")).not.toBe("ceo");
    }
  });

  it("renders an outbound CSS streak for each running agent", () => {
    const doc = render(
      <DispatchGraph
        dispatches={{
          cro: { status: "running" },
          coo: { status: "running" },
        }}
      />,
    );
    const streaks = doc.querySelectorAll('[data-dispatch-streak="outbound"]');
    expect(streaks.length).toBe(2);
    expect(
      Array.from(streaks).map((s) => s.getAttribute("data-dispatch-agent")).sort(),
    ).toEqual(["coo", "cro"]);
  });

  it("renders a single-shot return streak for a completed agent (showReturnStreak default)", () => {
    const doc = render(
      <DispatchGraph dispatches={{ cro: { status: "completed" } }} />,
    );
    const streaks = doc.querySelectorAll('[data-dispatch-streak="return"]');
    expect(streaks.length).toBe(1);
    expect(streaks[0]?.getAttribute("data-dispatch-agent")).toBe("cro");
  });

  it("suppresses return streak when showReturnStreak=false", () => {
    const doc = render(
      <DispatchGraph
        dispatches={{ cro: { status: "completed" } }}
        showReturnStreak={false}
      />,
    );
    const streaks = doc.querySelectorAll("[data-dispatch-streak]");
    expect(streaks.length).toBe(0);
  });
});

describe("DispatchGraph — prefers-reduced-motion", () => {
  it("omits all <animateMotion> elements when useReducedMotion returns true", async () => {
    vi.resetModules();
    vi.doMock("@/hooks/useReducedMotion", () => ({
      useReducedMotion: (): boolean => true,
    }));

    // Re-import after the module reset so the component picks up the new mock.
    const { DispatchGraph: RmDispatchGraph } = await import("./DispatchGraph");

    const html = renderToStaticMarkup(
      <RmDispatchGraph
        dispatches={{
          cro: { status: "running" },
          coo: { status: "running" },
          cio: { status: "completed" },
          cfo: { status: "failed" },
        }}
      />,
    );
    const doc = new DOMParser().parseFromString(
      `<!doctype html><body>${html}</body>`,
      "text/html",
    );

    // Zero streak elements regardless of dispatch state.
    expect(doc.querySelectorAll("[data-dispatch-streak]").length).toBe(0);

    // Nodes still carry the right data-state so colours communicate status.
    expect(doc.querySelector('[data-agent="cro"]')?.getAttribute("data-state")).toBe(
      "running",
    );
    expect(doc.querySelector('[data-agent="cio"]')?.getAttribute("data-state")).toBe(
      "completed",
    );
    expect(doc.querySelector('[data-agent="cfo"]')?.getAttribute("data-state")).toBe(
      "failed",
    );

    // The CSS pulse is also suppressed on running nodes.
    const runningNode = doc.querySelector('[data-agent="cro"]');
    expect(runningNode?.getAttribute("style") ?? "").not.toContain("animation");
  });
});
