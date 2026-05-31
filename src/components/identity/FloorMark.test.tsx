import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { FloorMark, KEYSTONE_BODY_PATH, KEYSTONE_LIGHT_PATH } from "./FloorMark";

// The reactive notify state uses GSAP (effects don't run under SSR markup, but
// the module is imported at load) — mock the tree-shaken layer like the rest of
// the repo, plus the reduced-motion hook.
vi.mock("@/lib/gsap-init", () => ({
  gsap: {
    timeline: () => ({
      fromTo: () => ({ fromTo: () => ({ kill: vi.fn() }), kill: vi.fn() }),
      kill: vi.fn(),
    }),
  },
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

describe("FloorMark", () => {
  it("renders the LOCKED keystone geometry with an accessible label", () => {
    const html = renderToStaticMarkup(<FloorMark floor="L" />);
    expect(html).toContain(KEYSTONE_BODY_PATH);
    expect(html).toContain(KEYSTONE_LIGHT_PATH);
    expect(html).toContain('role="img"');
    expect(html).toContain("<title");
    expect(html).toContain("The Tower");
    expect(html).toContain('data-floor="L"');
  });

  it("tints the soul light with the per-floor accent", () => {
    const html = renderToStaticMarkup(<FloorMark floor="PH" />);
    expect(html).toContain("#FBE9B0"); // Penthouse accent → --fm-accent
    expect(html).toContain('data-floor="PH"');
    expect(html).toContain("var(--fm-accent)");
  });

  it("draws the navy app-icon tile only when ground is set", () => {
    expect(renderToStaticMarkup(<FloorMark floor="L" ground />)).toContain('rx="26"');
    expect(renderToStaticMarkup(<FloorMark floor="L" />)).not.toContain('rx="26"');
  });

  it("exposes idle vs active via data-state and never animates the outline", () => {
    expect(renderToStaticMarkup(<FloorMark floor="L" state="active" />)).toContain('data-state="active"');
    // notify collapses to the idle resting silhouette in markup (ring is GSAP-driven)
    expect(renderToStaticMarkup(<FloorMark floor="L" state="notify" />)).toContain('data-state="idle"');
  });
});
