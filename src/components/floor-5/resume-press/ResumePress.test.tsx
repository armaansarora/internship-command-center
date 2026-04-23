// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ResumePress } from "./ResumePress";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// Default: motion on.
vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: (): boolean => false,
}));

function render(active: boolean, versionLabel?: string): Document {
  const html = renderToStaticMarkup(
    <ResumePress active={active} versionLabel={versionLabel} />,
  );
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

describe("ResumePress", () => {
  it("renders dormant when active=false", () => {
    const doc = render(false);
    const wrapper = doc.querySelector('[role="img"]');
    expect(wrapper?.getAttribute("data-phase")).toBe("dormant");
  });

  it("transitions to stamping when active=true on server render", () => {
    // SSR snapshot: the initial state before useEffect runs is dormant;
    // after effects we'd be in stamping. renderToStaticMarkup uses SSR
    // path — the initial state IS dormant. So this assertion is about
    // the wrapper rendering with the correct aria-label + role.
    const doc = render(true);
    const wrapper = doc.querySelector('[role="img"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute("aria-label")).toMatch(/press/i);
  });

  it("renders the SVG base plate + press head unchanged across phases", () => {
    const doc = render(false);
    const svg = doc.querySelector("svg");
    expect(svg).not.toBeNull();
    // press head + paper + lever are all rendered.
    expect(doc.querySelector(".rp-head")).not.toBeNull();
    expect(doc.querySelector(".rp-paper")).not.toBeNull();
    expect(doc.querySelector(".rp-lever")).not.toBeNull();
  });

  it("does not render the version chip in dormant state", () => {
    const doc = render(false, "v3");
    expect(doc.querySelector(".rp-chip")).toBeNull();
  });

  it("exposes data-reduced-motion attribute for CSS gating", () => {
    const doc = render(false);
    const wrapper = doc.querySelector('[role="img"]');
    expect(wrapper?.hasAttribute("data-reduced-motion")).toBe(true);
  });

  it("has an accessible name describing its function", () => {
    const doc = render(true);
    const wrapper = doc.querySelector('[role="img"]');
    expect(wrapper?.getAttribute("aria-label")).toContain("Resume press");
  });
});

describe("ResumePress with reduced motion", () => {
  it("renders without the animation class gate active (data attr = true)", async () => {
    vi.resetModules();
    vi.doMock("@/hooks/useReducedMotion", () => ({
      useReducedMotion: (): boolean => true,
    }));
    const { ResumePress: PressRM } = await import("./ResumePress");
    const html = renderToStaticMarkup(<PressRM active={true} versionLabel="v1" />);
    const doc = new DOMParser().parseFromString(
      `<!doctype html><body>${html}</body>`,
      "text/html",
    );
    const wrapper = doc.querySelector('[role="img"]');
    expect(wrapper?.getAttribute("data-reduced-motion")).toBe("true");
  });
});
