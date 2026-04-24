"use client";

import { useCallback, useEffect, useState } from "react";
import type { PatternMode } from "./types";

/**
 * R9.4 — useOrreryMode.
 *
 * Client-only hook that mirrors the Observatory's selected layout into
 * localStorage so the choice survives reloads. The contract:
 *
 *   const [mode, setMode] = useOrreryMode("stage");
 *
 * Behavior:
 *   • SSR / first client render returns `initial` so the server-rendered
 *     markup matches the first pass on the client (no hydration mismatch).
 *   • A mount-time effect reads localStorage and promotes a valid value to
 *     the active state, falling back to `initial` on garbage / no entry.
 *   • setMode updates state AND writes to localStorage. localStorage failures
 *     (private mode, quota exceeded, blocked storage) are swallowed — state
 *     still updates so the user always sees their click reflected.
 *
 * Storage key: "orrery.mode". Valid values: "stage" | "tier" | "velocity".
 */

const STORAGE_KEY = "orrery.mode";

const VALID_MODES: ReadonlySet<PatternMode> = new Set<PatternMode>([
  "stage",
  "tier",
  "velocity",
]);

function isPatternMode(value: unknown): value is PatternMode {
  return typeof value === "string" && VALID_MODES.has(value as PatternMode);
}

function readStoredMode(): PatternMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    return isPatternMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeStoredMode(mode: PatternMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Private mode / quota exceeded — caller's state already updated, so the
    // session is consistent even if the next reload loses the preference.
  }
}

export function useOrreryMode(
  initial: PatternMode = "stage",
): [PatternMode, (mode: PatternMode) => void] {
  // Initial state is `initial` (NOT readStoredMode()) so SSR and first client
  // render agree. Hydration happens in the effect below.
  const [mode, setModeState] = useState<PatternMode>(initial);

  useEffect(() => {
    const stored = readStoredMode();
    if (stored !== null && stored !== mode) {
      setModeState(stored);
    }
    // Run once on mount only — re-running on `mode` changes would clobber
    // user-driven setMode calls with whatever's persisted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMode = useCallback((next: PatternMode) => {
    setModeState(next);
    writeStoredMode(next);
  }, []);

  return [mode, setMode];
}
