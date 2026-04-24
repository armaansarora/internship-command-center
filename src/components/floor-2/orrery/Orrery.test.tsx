// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { OrreryPlanet } from "@/lib/orrery/types";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * R9.3 — Orrery consumer wrapper tests.
 *
 * The Orrery component is the click-to-history surface for the Observatory.
 * It owns focus state, wires OrreryRender → PlanetDetailPanel, listens for
 * ESC, and reveals a backdrop that dismisses on click. These tests exercise
 * the full focus lifecycle (open via planet click, close via ESC / backdrop /
 * close button) and the panel's content formatting (status humanization,
 * tier label, match-score percentage, "—" for null).
 *
 * @testing-library/react isn't installed in this repo (see CLAUDE.md), so we
 * use the manual createRoot + react act() pattern that the rest of the codebase
 * uses (see useUndoBarController.test.ts and CinematicArrival.test.tsx).
 */

// Default mock: motion on. Per-test overrides via vi.resetModules + vi.doMock.
vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: (): boolean => false,
}));

// GSAP is mocked because OrreryRender (which the consumer mounts) wires a
// timeline + camera-dolly tween. We don't want real RAF/animation in tests.
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

import { Orrery } from "./Orrery";

function makePlanet(over: Partial<OrreryPlanet> = {}): OrreryPlanet {
  return {
    id: "a",
    label: "Acme",
    role: "Analyst",
    tier: 1,
    status: "applied",
    radius: 0.25,
    angleDeg: 45,
    sizePx: 22,
    colorToken: "--orrery-status-applied",
    hasSatellite: false,
    isSupernova: false,
    isFading: false,
    matchScore: 0.8,
    appliedAt: "2026-04-01T00:00:00Z",
    lastActivityAt: "2026-04-10T00:00:00Z",
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

function findPlanetButton(host: HTMLElement, ariaLabelMatch: RegExp): HTMLButtonElement {
  const buttons = host.querySelectorAll<HTMLButtonElement>("button[aria-label]");
  for (const btn of Array.from(buttons)) {
    const label = btn.getAttribute("aria-label") ?? "";
    if (ariaLabelMatch.test(label)) return btn;
  }
  throw new Error(`No button matched ${ariaLabelMatch}`);
}

function findCloseButton(host: HTMLElement): HTMLButtonElement {
  const buttons = host.querySelectorAll<HTMLButtonElement>("button[aria-label]");
  for (const btn of Array.from(buttons)) {
    const label = btn.getAttribute("aria-label") ?? "";
    if (/close detail/i.test(label)) return btn;
  }
  throw new Error("Close button not found");
}

function findDialog(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>('[role="dialog"]');
}

function findBackdrop(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>('[data-testid="orrery-backdrop"]');
}

let cleanups: Array<() => void> = [];

beforeEach(() => {
  cleanups = [];
});

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
});

describe("Orrery — initial render", () => {
  it("renders without a dialog visible", () => {
    const m = mount(
      <Orrery
        planets={[makePlanet({ id: "p1", label: "Acme", role: "Analyst" })]}
        mode="stage"
      />,
    );
    cleanups.push(m.unmount);
    expect(findDialog(m.host)).toBeNull();
  });

  it("does not render a backdrop until a planet is focused", () => {
    const m = mount(
      <Orrery
        planets={[makePlanet({ id: "p1", label: "Acme", role: "Analyst" })]}
        mode="stage"
      />,
    );
    cleanups.push(m.unmount);
    expect(findBackdrop(m.host)).toBeNull();
  });
});

describe("Orrery — open via planet click", () => {
  it("clicking a planet opens the detail dialog", () => {
    const m = mount(
      <Orrery
        planets={[makePlanet({ id: "p1", label: "Acme", role: "Analyst" })]}
        mode="stage"
      />,
    );
    cleanups.push(m.unmount);
    const btn = findPlanetButton(m.host, /Analyst at Acme/);
    act(() => {
      btn.click();
    });
    expect(findDialog(m.host)).not.toBeNull();
  });

  it("the dialog header contains both role and company", () => {
    const m = mount(
      <Orrery
        planets={[
          makePlanet({
            id: "p1",
            label: "Acme Robotics",
            role: "Software Engineer Intern",
          }),
        ]}
        mode="stage"
      />,
    );
    cleanups.push(m.unmount);
    act(() => {
      findPlanetButton(m.host, /Software Engineer Intern at Acme Robotics/).click();
    });
    const dialog = findDialog(m.host);
    expect(dialog).not.toBeNull();
    const titled = dialog?.querySelector("#planet-detail-title");
    expect(titled).not.toBeNull();
    const text = titled?.textContent ?? "";
    expect(text).toMatch(/Software Engineer Intern/);
    expect(text).toMatch(/Acme Robotics/);
  });

  it("dialog shows 'Tier 1' for a tier-1 planet", () => {
    const m = mount(
      <Orrery
        planets={[makePlanet({ id: "p1", label: "Acme", role: "Analyst", tier: 1 })]}
        mode="stage"
      />,
    );
    cleanups.push(m.unmount);
    act(() => {
      findPlanetButton(m.host, /Analyst at Acme/).click();
    });
    const dialog = findDialog(m.host);
    expect(dialog?.textContent ?? "").toMatch(/Tier 1/);
  });

  it("formats matchScore as a percentage when set", () => {
    const m = mount(
      <Orrery
        planets={[
          makePlanet({
            id: "p1",
            label: "Acme",
            role: "Analyst",
            matchScore: 0.83,
          }),
        ]}
        mode="stage"
      />,
    );
    cleanups.push(m.unmount);
    act(() => {
      findPlanetButton(m.host, /Analyst at Acme/).click();
    });
    const dialog = findDialog(m.host);
    expect(dialog?.textContent ?? "").toMatch(/83%/);
  });

  it("shows '—' for matchScore when null", () => {
    const m = mount(
      <Orrery
        planets={[
          makePlanet({
            id: "p1",
            label: "Acme",
            role: "Analyst",
            matchScore: null,
          }),
        ]}
        mode="stage"
      />,
    );
    cleanups.push(m.unmount);
    act(() => {
      findPlanetButton(m.host, /Analyst at Acme/).click();
    });
    const dialog = findDialog(m.host);
    expect(dialog?.textContent ?? "").toMatch(/—/);
  });

  it("humanizes underscored statuses (interview_scheduled → 'Interview scheduled')", () => {
    const m = mount(
      <Orrery
        planets={[
          makePlanet({
            id: "p1",
            label: "Acme",
            role: "Analyst",
            status: "interview_scheduled",
          }),
        ]}
        mode="stage"
      />,
    );
    cleanups.push(m.unmount);
    act(() => {
      findPlanetButton(m.host, /Analyst at Acme/).click();
    });
    const dialog = findDialog(m.host);
    expect(dialog?.textContent ?? "").toMatch(/Interview scheduled/);
  });

  it("renders a backdrop when a planet is focused", () => {
    const m = mount(
      <Orrery
        planets={[makePlanet({ id: "p1", label: "Acme", role: "Analyst" })]}
        mode="stage"
      />,
    );
    cleanups.push(m.unmount);
    act(() => {
      findPlanetButton(m.host, /Analyst at Acme/).click();
    });
    expect(findBackdrop(m.host)).not.toBeNull();
  });
});

describe("Orrery — close paths", () => {
  it("pressing Escape on document closes the dialog", () => {
    const m = mount(
      <Orrery
        planets={[makePlanet({ id: "p1", label: "Acme", role: "Analyst" })]}
        mode="stage"
      />,
    );
    cleanups.push(m.unmount);
    act(() => {
      findPlanetButton(m.host, /Analyst at Acme/).click();
    });
    expect(findDialog(m.host)).not.toBeNull();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(findDialog(m.host)).toBeNull();
  });

  it("clicking the close button closes the dialog", () => {
    const m = mount(
      <Orrery
        planets={[makePlanet({ id: "p1", label: "Acme", role: "Analyst" })]}
        mode="stage"
      />,
    );
    cleanups.push(m.unmount);
    act(() => {
      findPlanetButton(m.host, /Analyst at Acme/).click();
    });
    act(() => {
      findCloseButton(m.host).click();
    });
    expect(findDialog(m.host)).toBeNull();
  });

  it("clicking the backdrop closes the dialog", () => {
    const m = mount(
      <Orrery
        planets={[makePlanet({ id: "p1", label: "Acme", role: "Analyst" })]}
        mode="stage"
      />,
    );
    cleanups.push(m.unmount);
    act(() => {
      findPlanetButton(m.host, /Analyst at Acme/).click();
    });
    const backdrop = findBackdrop(m.host);
    expect(backdrop).not.toBeNull();
    act(() => {
      backdrop?.click();
    });
    expect(findDialog(m.host)).toBeNull();
  });
});

describe("Orrery — empty fixture", () => {
  it("with no planets, no dialog can be opened (sanity)", () => {
    const m = mount(<Orrery planets={[]} mode="stage" />);
    cleanups.push(m.unmount);
    expect(findDialog(m.host)).toBeNull();
    // Pressing escape on empty mount should not throw.
    expect(() => {
      act(() => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      });
    }).not.toThrow();
    expect(findDialog(m.host)).toBeNull();
  });
});

describe("Orrery — reduced-motion path", () => {
  it("dialog still opens when reduced motion is on", async () => {
    vi.resetModules();
    vi.doMock("@/hooks/useReducedMotion", () => ({
      useReducedMotion: (): boolean => true,
    }));
    vi.doMock("@/lib/gsap-init", () => {
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

    const { Orrery: ReducedOrrery } = await import("./Orrery");

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => {
      root.render(
        <ReducedOrrery
          planets={[makePlanet({ id: "p1", label: "Acme", role: "Analyst" })]}
          mode="stage"
        />,
      );
    });

    const btn = findPlanetButton(host, /Analyst at Acme/);
    act(() => {
      btn.click();
    });
    expect(findDialog(host)).not.toBeNull();

    act(() => {
      root.unmount();
    });
    host.remove();
  });
});
