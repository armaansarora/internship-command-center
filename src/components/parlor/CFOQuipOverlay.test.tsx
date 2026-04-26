// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * CFOQuipOverlay behavioral tests.
 *
 * Manual createRoot + react act() pattern (no @testing-library/react) —
 * matches the existing parlor suite (OfferFolder.test.tsx,
 * CEOVoicePlayButton.test.tsx, ParlorDoor.test.tsx).
 *
 * Contracts under test:
 *   - `show={true}` renders the quip with role="status" + aria-live="polite".
 *   - After AUTO_DISMISS_MS (6200ms) the overlay hides AND onDismiss fires once.
 *   - `show={false}` renders null immediately without firing onDismiss.
 *   - Esc key dismisses early and fires onDismiss once.
 *   - onDismiss never fires twice — the timer and Esc paths are idempotent.
 */

import { CFOQuipOverlay } from "./CFOQuipOverlay";

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

function findQuip(host: HTMLElement): HTMLElement | null {
  return host.querySelector<HTMLElement>(".parlor-cfo-quip");
}

let cleanups: Array<() => void> = [];

beforeEach(() => {
  cleanups = [];
  vi.useFakeTimers();
});

afterEach(() => {
  for (const c of cleanups) c();
  cleanups = [];
  vi.useRealTimers();
});

describe("R10.12 CFOQuipOverlay — render contract", () => {
  it("renders the quip as role=status + aria-live=polite when show=true", () => {
    const onDismiss = vi.fn();
    const m = mount(
      <CFOQuipOverlay quip="Solid offer." show onDismiss={onDismiss} />,
    );
    cleanups.push(m.unmount);
    const el = findQuip(m.host);
    expect(el).not.toBeNull();
    expect(el?.getAttribute("role")).toBe("status");
    expect(el?.getAttribute("aria-live")).toBe("polite");
    expect(el?.textContent).toMatch(/Solid offer\./);
    expect(el?.textContent).toMatch(/CFO/);
  });

  it("renders null immediately when show=false", () => {
    const onDismiss = vi.fn();
    const m = mount(
      <CFOQuipOverlay quip="Solid offer." show={false} onDismiss={onDismiss} />,
    );
    cleanups.push(m.unmount);
    expect(findQuip(m.host)).toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe("R10.12 CFOQuipOverlay — auto-dismiss", () => {
  it("hides the overlay AND fires onDismiss once after 6200ms", () => {
    const onDismiss = vi.fn();
    const m = mount(
      <CFOQuipOverlay
        quip="Market, not celebratory."
        show
        onDismiss={onDismiss}
      />,
    );
    cleanups.push(m.unmount);
    // Still mounted, onDismiss not yet fired.
    expect(findQuip(m.host)).not.toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();

    // Advance past the 6.2s threshold.
    act(() => {
      vi.advanceTimersByTime(6200);
    });
    expect(findQuip(m.host)).toBeNull();
    expect(onDismiss).toHaveBeenCalledTimes(1);

    // Advancing further should not retrigger — onDismiss is idempotent.
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not fire onDismiss before the full window elapses", () => {
    const onDismiss = vi.fn();
    const m = mount(
      <CFOQuipOverlay quip="Solid offer." show onDismiss={onDismiss} />,
    );
    cleanups.push(m.unmount);
    act(() => {
      vi.advanceTimersByTime(6100);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    expect(findQuip(m.host)).not.toBeNull();
  });
});

describe("R10.12 CFOQuipOverlay — Esc dismisses early", () => {
  it("hides AND fires onDismiss once on Esc", () => {
    const onDismiss = vi.fn();
    const m = mount(
      <CFOQuipOverlay quip="Solid offer." show onDismiss={onDismiss} />,
    );
    cleanups.push(m.unmount);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(findQuip(m.host)).toBeNull();
    expect(onDismiss).toHaveBeenCalledTimes(1);

    // The auto-dismiss timer should not re-fire after Esc.
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("ignores non-Esc keys", () => {
    const onDismiss = vi.fn();
    const m = mount(
      <CFOQuipOverlay quip="Solid offer." show onDismiss={onDismiss} />,
    );
    cleanups.push(m.unmount);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });
    expect(findQuip(m.host)).not.toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe("R10.12 CFOQuipOverlay — unmount safety", () => {
  it("unmounting before auto-dismiss does not fire onDismiss", () => {
    const onDismiss = vi.fn();
    const m = mount(
      <CFOQuipOverlay quip="Solid offer." show onDismiss={onDismiss} />,
    );
    act(() => {
      m.root.unmount();
    });
    m.host.remove();
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
