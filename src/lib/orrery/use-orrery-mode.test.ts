// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import type { PatternMode } from "./types";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * R9.4 — useOrreryMode tests.
 *
 * The hook reads/writes the user's preferred Orrery layout to localStorage so
 * the choice survives reloads. It must:
 *   • Return `initial` on the SSR pass (when window is undefined) without throwing.
 *   • Hydrate from localStorage AFTER mount via useEffect, so server and first
 *     client render agree (no React hydration mismatch).
 *   • Ignore garbage localStorage values and fall back to `initial`.
 *   • Persist on setMode.
 *
 * The hook is exercised through a thin probe component that surfaces its
 * value via a data-attr and exposes setMode via a hidden button — the project
 * does not install renderHook; this is the standard escape hatch.
 */

const STORAGE_KEY = "orrery.mode";

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

interface ProbeProps {
  initial?: PatternMode;
  capture?: (setter: (m: PatternMode) => void) => void;
}

// Probe component built ad-hoc inside each test (importing inside test fn so
// we can re-import after vi.resetModules() stubs the localStorage shape).
function buildProbe(useOrreryMode: typeof import("./use-orrery-mode").useOrreryMode) {
  return function Probe({ initial, capture }: ProbeProps) {
    const [mode, setMode] = useOrreryMode(initial);
    useEffect(() => {
      capture?.(setMode);
    }, [setMode, capture]);
    return createElement("div", { "data-mode": mode });
  };
}

let cleanups: Array<() => void> = [];

beforeEach(() => {
  cleanups = [];
  try {
    window.localStorage.clear();
  } catch {
    // ignore — some tests stub it out
  }
});

afterEach(() => {
  for (const cleanup of cleanups) cleanup();
  cleanups = [];
  vi.unstubAllGlobals();
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
});

describe("useOrreryMode — initial value", () => {
  it("returns 'stage' by default when no initial arg passed and no storage", async () => {
    const mod = await import("./use-orrery-mode");
    const Probe = buildProbe(mod.useOrreryMode);
    const m = mount(createElement(Probe));
    cleanups.push(m.unmount);
    expect(m.host.querySelector("[data-mode]")?.getAttribute("data-mode")).toBe("stage");
  });

  it("returns the explicit initial arg when no storage", async () => {
    const mod = await import("./use-orrery-mode");
    const Probe = buildProbe(mod.useOrreryMode);
    const m = mount(createElement(Probe, { initial: "tier" }));
    cleanups.push(m.unmount);
    expect(m.host.querySelector("[data-mode]")?.getAttribute("data-mode")).toBe("tier");
  });
});

describe("useOrreryMode — localStorage hydration", () => {
  it("hydrates from a valid localStorage entry on mount", async () => {
    window.localStorage.setItem(STORAGE_KEY, "velocity");
    const mod = await import("./use-orrery-mode");
    const Probe = buildProbe(mod.useOrreryMode);
    const m = mount(createElement(Probe, { initial: "stage" }));
    cleanups.push(m.unmount);
    expect(m.host.querySelector("[data-mode]")?.getAttribute("data-mode")).toBe("velocity");
  });

  it("hydrates 'tier' from localStorage", async () => {
    window.localStorage.setItem(STORAGE_KEY, "tier");
    const mod = await import("./use-orrery-mode");
    const Probe = buildProbe(mod.useOrreryMode);
    const m = mount(createElement(Probe, { initial: "stage" }));
    cleanups.push(m.unmount);
    expect(m.host.querySelector("[data-mode]")?.getAttribute("data-mode")).toBe("tier");
  });

  it("ignores garbage in localStorage and falls back to initial", async () => {
    window.localStorage.setItem(STORAGE_KEY, "garbage");
    const mod = await import("./use-orrery-mode");
    const Probe = buildProbe(mod.useOrreryMode);
    const m = mount(createElement(Probe, { initial: "tier" }));
    cleanups.push(m.unmount);
    expect(m.host.querySelector("[data-mode]")?.getAttribute("data-mode")).toBe("tier");
  });

  it("ignores empty string in localStorage", async () => {
    window.localStorage.setItem(STORAGE_KEY, "");
    const mod = await import("./use-orrery-mode");
    const Probe = buildProbe(mod.useOrreryMode);
    const m = mount(createElement(Probe, { initial: "velocity" }));
    cleanups.push(m.unmount);
    expect(m.host.querySelector("[data-mode]")?.getAttribute("data-mode")).toBe("velocity");
  });
});

describe("useOrreryMode — setMode persists and updates state", () => {
  it("setMode updates the rendered value", async () => {
    const mod = await import("./use-orrery-mode");
    const Probe = buildProbe(mod.useOrreryMode);
    let setter: ((m: PatternMode) => void) | null = null;
    const m = mount(
      createElement(Probe, {
        initial: "stage",
        capture: (s) => {
          setter = s;
        },
      }),
    );
    cleanups.push(m.unmount);
    expect(m.host.querySelector("[data-mode]")?.getAttribute("data-mode")).toBe("stage");
    act(() => {
      setter?.("velocity");
    });
    expect(m.host.querySelector("[data-mode]")?.getAttribute("data-mode")).toBe("velocity");
  });

  it("setMode writes the new value to localStorage", async () => {
    const mod = await import("./use-orrery-mode");
    const Probe = buildProbe(mod.useOrreryMode);
    let setter: ((m: PatternMode) => void) | null = null;
    const m = mount(
      createElement(Probe, {
        capture: (s) => {
          setter = s;
        },
      }),
    );
    cleanups.push(m.unmount);
    act(() => {
      setter?.("tier");
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("tier");
  });

  it("setting through every mode persists each value", async () => {
    const mod = await import("./use-orrery-mode");
    const Probe = buildProbe(mod.useOrreryMode);
    let setter: ((m: PatternMode) => void) | null = null;
    const m = mount(
      createElement(Probe, {
        capture: (s) => {
          setter = s;
        },
      }),
    );
    cleanups.push(m.unmount);
    act(() => {
      setter?.("tier");
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("tier");
    act(() => {
      setter?.("velocity");
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("velocity");
    act(() => {
      setter?.("stage");
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("stage");
  });
});

describe("useOrreryMode — SSR safety", () => {
  it("returns initial without throwing when localStorage throws on read", async () => {
    // Simulate a hardened browser where localStorage access throws
    // (private mode in some Safari builds).
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("blocked");
      },
    });
    try {
      const mod = await import("./use-orrery-mode");
      const Probe = buildProbe(mod.useOrreryMode);
      const m = mount(createElement(Probe, { initial: "tier" }));
      cleanups.push(m.unmount);
      expect(m.host.querySelector("[data-mode]")?.getAttribute("data-mode")).toBe("tier");
    } finally {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: originalLocalStorage,
      });
    }
  });

  it("does not throw when localStorage.setItem throws", async () => {
    const setItemSpy = vi
      .spyOn(window.localStorage, "setItem")
      .mockImplementation(() => {
        throw new Error("quota exceeded");
      });
    const mod = await import("./use-orrery-mode");
    const Probe = buildProbe(mod.useOrreryMode);
    let setter: ((m: PatternMode) => void) | null = null;
    const m = mount(
      createElement(Probe, {
        capture: (s) => {
          setter = s;
        },
      }),
    );
    cleanups.push(m.unmount);
    expect(() => {
      act(() => {
        setter?.("velocity");
      });
    }).not.toThrow();
    // State still updated even though storage write failed
    expect(m.host.querySelector("[data-mode]")?.getAttribute("data-mode")).toBe("velocity");
    setItemSpy.mockRestore();
  });
});
