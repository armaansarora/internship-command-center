// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { computeBuildingDim } from "./RingTheBell";
import { CSuiteScene } from "./CSuiteScene";

/**
 * R3.10 — unit tests for the pure side-effect helper + a spot-check that
 * CSuiteScene renders the `data-bell-phase` attribute on its root div given
 * the new prop.
 *
 * The `useEffect` inside RingTheBell that actually calls
 * `document.documentElement.style.setProperty("--building-dim", ...)` is a
 * thin wrapper around `computeBuildingDim`; testing the helper in isolation
 * gives us 100% coverage of the decision logic without needing to mount the
 * full component under a JSDOM window. This is the pattern already used
 * elsewhere in the R3 phase (see `describeDispatches`, `extractBatchRequestId`,
 * `mergeGraphDispatches`).
 */

describe("computeBuildingDim", () => {
  it("returns null for idle with reducedMotion=false (clear the CSS var)", () => {
    expect(computeBuildingDim("idle", false)).toBeNull();
  });

  it("returns '0.4' for ringing with reducedMotion=false (building dims)", () => {
    expect(computeBuildingDim("ringing", false)).toBe("0.4");
  });

  it("returns '1' for orchestrating with reducedMotion=false (lights lift)", () => {
    expect(computeBuildingDim("orchestrating", false)).toBe("1");
  });

  it("returns '1' for complete with reducedMotion=false (keep lights lifted)", () => {
    expect(computeBuildingDim("complete", false)).toBe("1");
  });

  it("returns null for every phase when reducedMotion=true", () => {
    expect(computeBuildingDim("idle", true)).toBeNull();
    expect(computeBuildingDim("ringing", true)).toBeNull();
    expect(computeBuildingDim("orchestrating", true)).toBeNull();
    expect(computeBuildingDim("complete", true)).toBeNull();
  });
});

/**
 * Spot-check — CSuiteScene plumbs the `bellPhase` prop through to the root
 * div as `data-bell-phase`. The actual camera-pullback transform is
 * CSS-only and untestable in JSDOM (no layout engine), but we can verify
 * the attribute that keys those rules renders correctly.
 */

function renderScene(node: React.ReactElement): Document {
  const html = renderToStaticMarkup(node);
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

const EMPTY_STATS = {
  pipelineTotal: 0,
  offers: 0,
  screening: 0,
  staleCount: 0,
  weeklyActivity: 0,
};

describe("CSuiteScene — data-bell-phase plumbing", () => {
  it("renders data-bell-phase='idle' when the prop is omitted", () => {
    const doc = renderScene(<CSuiteScene stats={EMPTY_STATS} />);
    const root = doc.querySelector('[data-floor="1"]');
    expect(root).not.toBeNull();
    expect(root?.getAttribute("data-bell-phase")).toBe("idle");
  });

  it("forwards data-bell-phase='ringing' when prop is 'ringing'", () => {
    const doc = renderScene(
      <CSuiteScene stats={EMPTY_STATS} bellPhase="ringing" />,
    );
    expect(
      doc.querySelector('[data-floor="1"]')?.getAttribute("data-bell-phase"),
    ).toBe("ringing");
  });

  it("forwards data-bell-phase='orchestrating' when prop is 'orchestrating'", () => {
    const doc = renderScene(
      <CSuiteScene stats={EMPTY_STATS} bellPhase="orchestrating" />,
    );
    expect(
      doc.querySelector('[data-floor="1"]')?.getAttribute("data-bell-phase"),
    ).toBe("orchestrating");
  });

  it("forwards data-bell-phase='complete' when prop is 'complete'", () => {
    const doc = renderScene(
      <CSuiteScene stats={EMPTY_STATS} bellPhase="complete" />,
    );
    expect(
      doc.querySelector('[data-floor="1"]')?.getAttribute("data-bell-phase"),
    ).toBe("complete");
  });
});
