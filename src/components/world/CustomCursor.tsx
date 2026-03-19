"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CursorState } from "@/types/ui";

/**
 * CustomCursor — brushed gold pointer with contextual states.
 * Falls back to native cursor on touch devices.
 *
 * States: default (gold line), interactive (glow ring), character (speech bubble),
 * data (magnify), dragging (grab), loading (elevator indicator), idle (dimmed).
 */
export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [cursorState, setCursorState] = useState<CursorState>("default");
  const [isTouch, setIsTouch] = useState(false);
  const posRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect touch device
  useEffect(() => {
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouch(isTouchDevice);
  }, []);

  // Track mouse position with RAF for smooth rendering
  const onMouseMove = useCallback((e: MouseEvent) => {
    posRef.current = { x: e.clientX, y: e.clientY };

    // Reset idle timer
    setCursorState((prev) => (prev === "idle" ? "default" : prev));
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setCursorState("idle"), 30_000);
  }, []);

  // Animation loop
  useEffect(() => {
    if (isTouch) return;

    const animate = () => {
      const cursor = cursorRef.current;
      const dot = dotRef.current;
      if (cursor && dot) {
        cursor.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
        dot.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [isTouch]);

  // Mouse event listeners
  useEffect(() => {
    if (isTouch) return;

    document.addEventListener("mousemove", onMouseMove, { passive: true });

    // Detect hover targets for state changes
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-cursor='character']")) {
        setCursorState("character");
      } else if (target.closest("[data-cursor='data']")) {
        setCursorState("data");
      } else if (
        target.closest("a, button, [role='button'], input, textarea, select, [data-cursor='interactive']")
      ) {
        setCursorState("interactive");
      } else {
        setCursorState("default");
      }
    };

    const onMouseDown = () => setCursorState("dragging");
    const onMouseUp = () => setCursorState("default");

    document.addEventListener("mouseover", onMouseOver, { passive: true });
    document.addEventListener("mousedown", onMouseDown, { passive: true });
    document.addEventListener("mouseup", onMouseUp, { passive: true });

    // Hide system cursor
    document.body.style.cursor = "none";

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [isTouch, onMouseMove]);

  // Don't render on touch devices
  if (isTouch) return null;

  const stateStyles: Record<CursorState, string> = {
    default: "w-5 h-5 border border-[var(--gold)] opacity-80",
    interactive:
      "w-8 h-8 border-2 border-[var(--gold)] opacity-100 shadow-[0_0_12px_rgba(201,168,76,0.4)]",
    character:
      "w-8 h-8 border-2 border-[var(--gold)] opacity-100 rounded-[50%_50%_50%_20%]",
    data: "w-7 h-7 border border-[var(--gold)] opacity-90",
    dragging: "w-4 h-4 bg-[var(--gold)] opacity-60",
    loading: "w-6 h-6 border-2 border-[var(--gold)] border-t-transparent animate-spin",
    idle: "w-5 h-5 border border-[var(--gold)] opacity-20",
  };

  return (
    <>
      {/* Outer ring */}
      <div
        ref={cursorRef}
        className={`pointer-events-none fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-150 ease-out ${stateStyles[cursorState]}`}
        style={{ zIndex: "var(--z-cursor)" as string }}
      />
      {/* Center dot */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[var(--gold)]"
        style={{ zIndex: "var(--z-cursor)" as string }}
      />
    </>
  );
}
