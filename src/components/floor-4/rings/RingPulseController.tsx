"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type JSX,
  type ReactNode,
} from "react";
import "@/styles/floor-4-rings.css";
import { RingPulseContext, type RingPulseHandle } from "./useRingPulse";

interface RingPulseControllerProps {
  children: ReactNode;
}

/**
 * Context provider that exposes an imperative `pulse(x, y)` handle to
 * descendants. When called, a short-lived DOM node is appended to a
 * module-level portal that renders a radial shockwave from (x, y) via
 * CSS keyframes. The node is removed on `animationend`.
 *
 * Multiple rapid pulses stack — each is an independent node with its own
 * animation timeline.
 *
 * Mounts the portal on first render. Cleans up on unmount.
 *
 * Concrete on partner non-negotiable (R7): rings respond to interaction.
 * NOT polish — ships in Wave 2.
 */
export function RingPulseController({ children }: RingPulseControllerProps): JSX.Element {
  const portalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const portal = document.createElement("div");
    portal.dataset.ringPulsePortal = "true";
    portal.style.position = "fixed";
    portal.style.inset = "0";
    portal.style.pointerEvents = "none";
    portal.style.zIndex = "60";
    document.body.appendChild(portal);
    portalRef.current = portal;
    return () => {
      portal.remove();
      portalRef.current = null;
    };
  }, []);

  const pulse = useCallback((x: number, y: number) => {
    const portal = portalRef.current;
    if (!portal) return;
    const node = document.createElement("span");
    node.className = "alert-shockwave";
    node.setAttribute("aria-hidden", "true");
    node.style.setProperty("--sx", `${x}px`);
    node.style.setProperty("--sy", `${y}px`);
    const cleanup = () => node.remove();
    node.addEventListener("animationend", cleanup, { once: true });
    // Safety net: reduced-motion suppresses animationend, so fall back to a timeout.
    window.setTimeout(cleanup, 900);
    portal.appendChild(node);
  }, []);

  const handle = useMemo<RingPulseHandle>(() => ({ pulse }), [pulse]);

  return <RingPulseContext.Provider value={handle}>{children}</RingPulseContext.Provider>;
}
