// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { ApplicationInput, Status } from "@/lib/orrery/types";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * R9.3 + R9.4 — Orrery consumer wrapper tests.
 *
 * The Orrery component is the click-to-history surface for the Observatory.
 * It owns focus state, owns the active layout mode (R9.4 via useOrreryMode),
 * wires OrreryRender → PlanetDetailPanel, listens for ESC, reveals a backdrop
 * that dismisses on click. These tests exercise the full focus lifecycle
 * (open via planet click, close via ESC / backdrop / close button) and the
 * panel's content formatting (status humanization, tier label, match-score
 * percentage, "—" for null), plus the R9.4 PatternModeToggle wiring.
 *
 * @testing-library/react isn't installed in this repo (see CLAUDE.md), so we
 * use the manual createRoot + react act() pattern that the rest of the codebase
 * uses (see useUndoBarController.test.ts and CinematicArrival.test.tsx).
 *
 * Fixture shape: as of R9.4 the wrapper takes `apps: ApplicationInput[]` (the
 * raw pipeline data) instead of pre-derived `OrreryPlanet[]`. The internal
 * useMemo runs the transformer; this is what enables a mode-change to
 * re-derive the layout and trigger the CSS-driven morph.
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

function findToggle(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>('[role="group"][aria-label="Orrery pattern mode"]');
}

function findToggleButton(host: HTMLElement, label: RegExp): HTMLButtonElement {
  const group = findToggle(host);
  if (!group) throw new Error("Pattern toggle group not found");
  const buttons = group.querySelectorAll<HTMLButtonElement>("button");
  for (const btn of Array.from(buttons)) {
    if (label.test(btn.textContent ?? "")) return btn;
  }
  throw new Error(`No toggle button matched ${label}`);
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

describe("Orrery — initial render", () => {
  it("renders without a dialog visible", () => {
    const m = mount(
      <Orrery apps={[makeApp({ id: "p1", companyName: "Acme", role: "Analyst" })]} />,
    );
    cleanups.push(m.unmount);
    expect(findDialog(m.host)).toBeNull();
  });

  it("does not render a backdrop until a planet is focused", () => {
    const m = mount(
      <Orrery apps={[makeApp({ id: "p1", companyName: "Acme", role: "Analyst" })]} />,
    );
    cleanups.push(m.unmount);
    expect(findBackdrop(m.host)).toBeNull();
  });

  it("renders the PatternModeToggle as part of the wrapper", () => {
    const m = mount(
      <Orrery apps={[makeApp({ id: "p1", companyName: "Acme", role: "Analyst" })]} />,
    );
    cleanups.push(m.unmount);
    expect(findToggle(m.host)).not.toBeNull();
  });
});

describe("Orrery — open via planet click", () => {
  it("clicking a planet opens the detail dialog", () => {
    const m = mount(
      <Orrery apps={[makeApp({ id: "p1", companyName: "Acme", role: "Analyst" })]} />,
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
        apps={[
          makeApp({
            id: "p1",
            companyName: "Acme Robotics",
            role: "Software Engineer Intern",
          }),
        ]}
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
        apps={[makeApp({ id: "p1", companyName: "Acme", role: "Analyst", tier: 1 })]}
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
        apps={[
          makeApp({
            id: "p1",
            companyName: "Acme",
            role: "Analyst",
            matchScore: 0.83,
          }),
        ]}
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
        apps={[
          makeApp({
            id: "p1",
            companyName: "Acme",
            role: "Analyst",
            matchScore: null,
          }),
        ]}
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
        apps={[
          makeApp({
            id: "p1",
            companyName: "Acme",
            role: "Analyst",
            status: "interview_scheduled",
          }),
        ]}
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
      <Orrery apps={[makeApp({ id: "p1", companyName: "Acme", role: "Analyst" })]} />,
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
      <Orrery apps={[makeApp({ id: "p1", companyName: "Acme", role: "Analyst" })]} />,
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
      <Orrery apps={[makeApp({ id: "p1", companyName: "Acme", role: "Analyst" })]} />,
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
      <Orrery apps={[makeApp({ id: "p1", companyName: "Acme", role: "Analyst" })]} />,
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
    const m = mount(<Orrery apps={[]} />);
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

  it("renders the toggle even with zero apps", () => {
    const m = mount(<Orrery apps={[]} />);
    cleanups.push(m.unmount);
    expect(findToggle(m.host)).not.toBeNull();
  });
});

describe("Orrery — PatternModeToggle wiring (R9.4)", () => {
  it("starts in stage mode by default", () => {
    const m = mount(<Orrery apps={[]} />);
    cleanups.push(m.unmount);
    const stageBtn = findToggleButton(m.host, /stage/i);
    expect(stageBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("clicking the tier button switches the active pressed state", () => {
    const m = mount(<Orrery apps={[]} />);
    cleanups.push(m.unmount);
    const tierBtn = findToggleButton(m.host, /tier/i);
    act(() => {
      tierBtn.click();
    });
    expect(findToggleButton(m.host, /tier/i).getAttribute("aria-pressed")).toBe("true");
    expect(findToggleButton(m.host, /stage/i).getAttribute("aria-pressed")).toBe("false");
  });

  it("clicking a mode persists the choice to localStorage", () => {
    const m = mount(<Orrery apps={[]} />);
    cleanups.push(m.unmount);
    act(() => {
      findToggleButton(m.host, /velocity/i).click();
    });
    expect(window.localStorage.getItem("orrery.mode")).toBe("velocity");
  });

  it("respects initialMode prop when no localStorage entry", () => {
    const m = mount(<Orrery apps={[]} initialMode="tier" />);
    cleanups.push(m.unmount);
    expect(findToggleButton(m.host, /tier/i).getAttribute("aria-pressed")).toBe("true");
  });

  it("hydrates from localStorage on mount, ignoring initialMode", () => {
    window.localStorage.setItem("orrery.mode", "velocity");
    const m = mount(<Orrery apps={[]} initialMode="stage" />);
    cleanups.push(m.unmount);
    expect(findToggleButton(m.host, /velocity/i).getAttribute("aria-pressed")).toBe("true");
  });

  it("changing mode keeps planets reactive — ARIA scene label still names them", () => {
    const apps = [
      makeApp({ id: "p1", companyName: "Acme", role: "Analyst", tier: 1 }),
      makeApp({ id: "p2", companyName: "Beta", role: "PM", tier: 3 }),
    ];
    const m = mount(<Orrery apps={apps} />);
    cleanups.push(m.unmount);
    // Switching mode does not unmount the planets — same DOM nodes, new
    // inline transform/background lets the CSS transition run.
    act(() => {
      findToggleButton(m.host, /tier/i).click();
    });
    expect(findPlanetButton(m.host, /Analyst at Acme/)).toBeTruthy();
    expect(findPlanetButton(m.host, /PM at Beta/)).toBeTruthy();
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
          apps={[makeApp({ id: "p1", companyName: "Acme", role: "Analyst" })]}
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
