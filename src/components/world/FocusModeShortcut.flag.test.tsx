// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

/**
 * Activation gauntlet: when `GATE_CONFIG.flags.focusModeEnabled === false`,
 * the FocusModeShortcut must render NOTHING and must not register its
 * window keydown listener. The cookie + server action remain on-disk and
 * become active again the moment the flag flips.
 */

const { toggleSpy } = vi.hoisted(() => ({
  toggleSpy: vi.fn(async () => ({ focusMode: true })),
}));

vi.mock("@/app/(authenticated)/actions/focus-mode", () => ({
  toggleFocusMode: toggleSpy,
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

vi.mock("@/lib/config/gate-config", () => ({
  GATE_CONFIG: {
    flags: {
      focusModeEnabled: false,
    },
  },
}));

import { FocusModeShortcut } from "./FocusModeShortcut";

let container: HTMLDivElement;
let root: Root;

describe("FocusModeShortcut — gate flag OFF", () => {
  beforeEach(() => {
    toggleSpy.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders nothing when focusModeEnabled is false", () => {
    act(() => {
      root.render(<FocusModeShortcut focusMode={false} />);
    });
    expect(container.children.length).toBe(0);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("does not register a Cmd+Shift+F listener when the flag is off", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    act(() => {
      root.render(<FocusModeShortcut focusMode={false} />);
    });

    const keydownRegistrations = addSpy.mock.calls.filter(
      ([type]) => type === "keydown",
    );
    expect(keydownRegistrations.length).toBe(0);

    addSpy.mockRestore();
  });

  it("ignores Cmd+Shift+F when the flag is off (no server action)", () => {
    act(() => {
      root.render(<FocusModeShortcut focusMode={false} />);
    });

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "F",
          metaKey: true,
          shiftKey: true,
          bubbles: true,
        }),
      );
    });

    expect(toggleSpy).not.toHaveBeenCalled();
  });
});
