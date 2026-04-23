// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { RingPulseController } from "./RingPulseController";
import { useRingPulse, type RingPulseHandle } from "./useRingPulse";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

/** Test harness that captures the imperative handle so a test can call `.pulse`. */
function HandleGrabber({ onReady }: { onReady: (h: RingPulseHandle) => void }): null {
  const handle = useRingPulse();
  onReady(handle);
  return null;
}

describe("RingPulseController", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    // Clean up any stray portals between tests.
    document.querySelectorAll("[data-ring-pulse-portal]").forEach((n) => n.remove());
  });

  it("mounts a body-level portal on render", () => {
    act(() => {
      root.render(
        <RingPulseController>
          <div />
        </RingPulseController>,
      );
    });
    const portal = document.querySelector("[data-ring-pulse-portal]");
    expect(portal).not.toBeNull();
  });

  it("removes the portal on unmount", () => {
    act(() => {
      root.render(
        <RingPulseController>
          <div />
        </RingPulseController>,
      );
    });
    expect(document.querySelector("[data-ring-pulse-portal]")).not.toBeNull();
    act(() => {
      root.unmount();
    });
    expect(document.querySelector("[data-ring-pulse-portal]")).toBeNull();
  });

  it("appends a shockwave node at the clicked origin", () => {
    let handle: RingPulseHandle | null = null;
    act(() => {
      root.render(
        <RingPulseController>
          <HandleGrabber onReady={(h) => (handle = h)} />
        </RingPulseController>,
      );
    });
    expect(handle).not.toBeNull();
    act(() => {
      handle!.pulse(120, 240);
    });
    const shockwave = document.querySelector(".alert-shockwave") as HTMLElement | null;
    expect(shockwave).not.toBeNull();
    expect(shockwave?.style.getPropertyValue("--sx")).toBe("120px");
    expect(shockwave?.style.getPropertyValue("--sy")).toBe("240px");
    expect(shockwave?.getAttribute("aria-hidden")).toBe("true");
  });

  it("stacks multiple concurrent pulses", () => {
    let handle: RingPulseHandle | null = null;
    act(() => {
      root.render(
        <RingPulseController>
          <HandleGrabber onReady={(h) => (handle = h)} />
        </RingPulseController>,
      );
    });
    act(() => {
      handle!.pulse(10, 10);
      handle!.pulse(20, 20);
      handle!.pulse(30, 30);
    });
    const shockwaves = document.querySelectorAll(".alert-shockwave");
    expect(shockwaves.length).toBe(3);
  });

  it("removes a shockwave on animationend", () => {
    let handle: RingPulseHandle | null = null;
    act(() => {
      root.render(
        <RingPulseController>
          <HandleGrabber onReady={(h) => (handle = h)} />
        </RingPulseController>,
      );
    });
    act(() => {
      handle!.pulse(50, 50);
    });
    const shockwave = document.querySelector(".alert-shockwave");
    expect(shockwave).not.toBeNull();
    act(() => {
      shockwave!.dispatchEvent(new Event("animationend"));
    });
    expect(document.querySelector(".alert-shockwave")).toBeNull();
  });

  it("falls back to timeout cleanup (safety net for reduced-motion)", () => {
    vi.useFakeTimers();
    let handle: RingPulseHandle | null = null;
    act(() => {
      root.render(
        <RingPulseController>
          <HandleGrabber onReady={(h) => (handle = h)} />
        </RingPulseController>,
      );
    });
    act(() => {
      handle!.pulse(50, 50);
    });
    expect(document.querySelector(".alert-shockwave")).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(document.querySelector(".alert-shockwave")).toBeNull();
    vi.useRealTimers();
  });

  it("default context returns a no-op handle outside a provider", () => {
    let handle: RingPulseHandle | null = null;
    act(() => {
      root.render(<HandleGrabber onReady={(h) => (handle = h)} />);
    });
    expect(handle).not.toBeNull();
    // Calling pulse outside a provider should not throw.
    expect(() => handle!.pulse(0, 0)).not.toThrow();
    expect(document.querySelector(".alert-shockwave")).toBeNull();
  });
});
