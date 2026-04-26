// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * ParlorDoor render + accessibility tests.
 *
 * Uses the project's manual createRoot + react act() pattern (no
 * @testing-library/react in this repo — see Orrery.test.tsx).
 *
 * GSAP is mocked so we can assert the reduced-motion branch fires
 * onFirstAppearanceDone via setTimeout, and the full-motion branch fires
 * it via the timeline's onComplete. We don't care about real timing; we
 * care about the contract: first-appearance ends with the callback.
 */

// Mock gsap-init BEFORE importing the component.
vi.mock("@/lib/gsap-init", () => {
  type Timeline = {
    from: (..._args: unknown[]) => Timeline;
    kill: () => void;
    _onComplete?: () => void;
  };
  let lastTl: Timeline | null = null;
  function makeTimeline(opts?: { onComplete?: () => void }): Timeline {
    const tl: Timeline = {
      from: () => tl,
      kill: () => undefined,
      _onComplete: opts?.onComplete,
    };
    lastTl = tl;
    return tl;
  }
  return {
    gsap: {
      timeline: (opts?: { onComplete?: () => void }) => makeTimeline(opts),
      get __lastTimeline() {
        return lastTl;
      },
    },
  };
});

import { ParlorDoor } from "./ParlorDoor";

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
});

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
});

function findLink(host: HTMLElement): HTMLAnchorElement {
  const a = host.querySelector<HTMLAnchorElement>("a[data-parlor-door]");
  if (!a) throw new Error("ParlorDoor link not found");
  return a;
}

describe("ParlorDoor — render contract", () => {
  it("renders an accessible anchor linking to /parlor", () => {
    const m = mount(<ParlorDoor firstAppearance={false} />);
    cleanups.push(m.unmount);
    const link = findLink(m.host);
    expect(link.getAttribute("href")).toBe("/parlor");
    expect(link.getAttribute("data-parlor-door")).toBe("true");
    expect(link.getAttribute("aria-label")).toMatch(/negotiation parlor/i);
  });

  it("carries the four inner span markers for the materialization beats", () => {
    const m = mount(<ParlorDoor firstAppearance={false} />);
    cleanups.push(m.unmount);
    const link = findLink(m.host);
    expect(link.querySelector("[data-seam]")).not.toBeNull();
    expect(link.querySelector("[data-outline]")).not.toBeNull();
    expect(link.querySelector("[data-wood]")).not.toBeNull();
    expect(link.querySelector("[data-handle]")).not.toBeNull();
  });

  it("carries the visually-hidden label for screen readers", () => {
    const m = mount(<ParlorDoor firstAppearance={false} />);
    cleanups.push(m.unmount);
    const sr = m.host.querySelector(".sr-only");
    expect(sr?.textContent).toMatch(/negotiation parlor/i);
  });

  it("sets data-first-appearance=true when firstAppearance=true", () => {
    const m = mount(<ParlorDoor firstAppearance />);
    cleanups.push(m.unmount);
    expect(findLink(m.host).getAttribute("data-first-appearance")).toBe("true");
  });

  it("sets data-first-appearance=false when firstAppearance=false", () => {
    const m = mount(<ParlorDoor firstAppearance={false} />);
    cleanups.push(m.unmount);
    expect(findLink(m.host).getAttribute("data-first-appearance")).toBe("false");
  });
});

describe("ParlorDoor — first-appearance side-effects", () => {
  it("does NOT call onFirstAppearanceDone when firstAppearance=false", () => {
    const spy = vi.fn();
    const m = mount(
      <ParlorDoor firstAppearance={false} onFirstAppearanceDone={spy} />,
    );
    cleanups.push(m.unmount);
    expect(spy).not.toHaveBeenCalled();
  });

  it("schedules the reduced-motion fade via setTimeout when the media query matches", () => {
    // happy-dom returns a default matchMedia; stub it to report reduced motion.
    const mqls: Array<{ query: string; matches: boolean }> = [];
    const origMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => {
      const mql = {
        query,
        matches: /reduce/.test(query) ? true : false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      } as unknown as MediaQueryList;
      mqls.push({ query, matches: /reduce/.test(query) });
      return mql;
    }) as typeof window.matchMedia;

    vi.useFakeTimers();
    try {
      const spy = vi.fn();
      const m = mount(
        <ParlorDoor firstAppearance onFirstAppearanceDone={spy} />,
      );
      cleanups.push(m.unmount);
      expect(spy).not.toHaveBeenCalled();
      // Reduced-motion path: 200ms fade.
      act(() => {
        vi.advanceTimersByTime(210);
      });
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
      window.matchMedia = origMatchMedia;
    }
  });
});
