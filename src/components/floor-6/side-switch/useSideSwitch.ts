"use client";

import { useCallback, useEffect, useState } from "react";

export type Side = "cno" | "cio";

/**
 * Returns a pure decision for a given key + focused element.  Extracted so
 * the keybinding behavior is unit-testable without mounting a component.
 *
 *  - `"["` → pan to CNO (left), unless a text input is focused.
 *  - `"]"` → pan to CIO (right), unless a text input is focused.
 *  - Anything else → null (do nothing).
 *
 * The "text input is focused" guard prevents the bracket keys from stealing
 * input when the user is typing in a search box, modal, etc.  Same pattern
 * the `/`-inject prompt uses on Floor 1.
 */
export function decideSideSwitch(
  key: string,
  target: EventTarget | null,
): Side | null {
  if (isEditable(target)) return null;
  if (key === "[") return "cno";
  if (key === "]") return "cio";
  return null;
}

function isEditable(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Mounts a `keydown` listener on `window` and exposes the current side.
 */
export function useSideSwitch(initial: Side = "cno") {
  const [side, setSide] = useState<Side>(initial);

  const setSideSafe = useCallback((next: Side) => setSide(next), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const next = decideSideSwitch(e.key, e.target);
      if (next) setSide(next);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { side, setSide: setSideSafe };
}
