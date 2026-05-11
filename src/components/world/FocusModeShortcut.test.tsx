// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const { toggleSpy } = vi.hoisted(() => ({
  toggleSpy: vi.fn(async () => ({ focusMode: true })),
}));

vi.mock("@/app/(authenticated)/actions/focus-mode", () => ({
  toggleFocusMode: toggleSpy,
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

// The Focus Mode UI is gated on GATE_CONFIG.flags.focusModeEnabled.
// During the activation gauntlet beta this flag defaults to false and
// the listener does not register, so we stub the gate to true here to
// keep the existing shortcut behavior covered.
vi.mock("@/lib/config/gate-config", () => ({
  GATE_CONFIG: {
    flags: {
      focusModeEnabled: true,
    },
  },
}));

import { FocusModeShortcut } from "./FocusModeShortcut";

let container: HTMLDivElement;
let root: Root;

function dispatchKey(init: KeyboardEventInit, target?: EventTarget) {
  const event = new KeyboardEvent("keydown", { bubbles: true, ...init });
  (target ?? window).dispatchEvent(event);
  return event;
}

describe("FocusModeShortcut", () => {
  beforeEach(() => {
    toggleSpy.mockClear();
    toggleSpy.mockResolvedValue({ focusMode: true });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(<FocusModeShortcut focusMode={false} />);
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it("calls toggleFocusMode on Cmd+Shift+F (mac path)", async () => {
    await act(async () => {
      dispatchKey({ key: "F", metaKey: true, shiftKey: true });
    });
    expect(toggleSpy).toHaveBeenCalledTimes(1);
  });

  it("calls toggleFocusMode on Ctrl+Shift+F (windows/linux path)", async () => {
    await act(async () => {
      dispatchKey({ key: "F", ctrlKey: true, shiftKey: true });
    });
    expect(toggleSpy).toHaveBeenCalledTimes(1);
  });

  it("does not fire on plain F", async () => {
    await act(async () => {
      dispatchKey({ key: "f" });
    });
    expect(toggleSpy).not.toHaveBeenCalled();
  });

  it("does not fire on Shift+F (no meta/ctrl)", async () => {
    await act(async () => {
      dispatchKey({ key: "F", shiftKey: true });
    });
    expect(toggleSpy).not.toHaveBeenCalled();
  });

  it("does not fire when the event target is an input element", async () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    try {
      await act(async () => {
        dispatchKey({ key: "F", metaKey: true, shiftKey: true }, input);
      });
      expect(toggleSpy).not.toHaveBeenCalled();
    } finally {
      input.remove();
    }
  });

  it("renders the role=status toast with correct text after toggle", async () => {
    await act(async () => {
      dispatchKey({ key: "F", metaKey: true, shiftKey: true });
    });
    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute("aria-live")).toBe("polite");
    expect(status?.textContent).toContain("Focus Mode ON");
  });
});
