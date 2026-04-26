"use client";

import type { CSSProperties, JSX } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { applicationsToPlanets } from "@/lib/orrery/applications-to-planets";
import type { ApplicationInput, PatternMode } from "@/lib/orrery/types";
import { useOrreryMode } from "@/lib/orrery/use-orrery-mode";
import { OrreryRender } from "./OrreryRender";
import { PatternModeToggle } from "./PatternModeToggle";
import { PlanetDetailPanel } from "./PlanetDetailPanel";

/**
 * R9.4 — Orrery (consumer wrapper).
 *
 * Owns the focus state for click-to-history, owns the active layout mode
 * (via useOrreryMode → localStorage), and re-derives the planet array on
 * every mode change. The morph between modes is CSS-transition-driven on
 * `.orrery-planet` (orrery.css) — no second GSAP timeline.
 *
 * Layout: a `position: relative` container so the absolutely-positioned
 * PlanetDetailPanel and backdrop can pin to the orrery scene rather than the
 * viewport. The PatternModeToggle sits in the upper-right of the container
 * so users can flip layouts without leaving the orrery's eyeline.
 *
 * Backwards compatibility: callers pass `apps: ApplicationInput[]`, the raw
 * pipeline data. The transformer runs inside this component so a mode change
 * triggers the re-derivation that drives the morph.
 */

interface Props {
  apps: ApplicationInput[];
  initialMode?: PatternMode;
}

const containerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "1 / 1",
  maxHeight: "70vh",
};

const toggleAnchorStyle: CSSProperties = {
  position: "absolute",
  top: "12px",
  right: "12px",
  zIndex: 4,
};

const backdropStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  background: "rgba(0, 0, 0, 0.2)",
  backdropFilter: "blur(2px)",
  WebkitBackdropFilter: "blur(2px)",
  cursor: "pointer",
};

export function Orrery({ apps, initialMode = "stage" }: Props): JSX.Element {
  const [mode, setMode] = useOrreryMode(initialMode);
  const [focusId, setFocusId] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const planets = useMemo(() => applicationsToPlanets(apps, mode), [apps, mode]);

  const focusPlanet = planets.find((p) => p.id === focusId) ?? null;

  const handlePlanetClick = useCallback((id: string) => {
    setFocusId(id);
  }, []);

  const handleClose = useCallback(() => {
    setFocusId(null);
  }, []);

  // ESC dismisses the panel. Listener only attaches while a planet is focused
  // so we don't burn an idle keydown handler the rest of the time.
  useEffect(() => {
    if (focusId === null) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setFocusId(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [focusId]);

  return (
    <div style={containerStyle} data-orrery-container>
      <OrreryRender
        planets={planets}
        mode={mode}
        focusPlanetId={focusId}
        reducedMotion={reduced}
        onPlanetClick={handlePlanetClick}
      />
      <div style={toggleAnchorStyle}>
        <PatternModeToggle mode={mode} onChange={setMode} />
      </div>
      {focusPlanet ? (
        <>
          <div
            style={backdropStyle}
            data-testid="orrery-backdrop"
            onClick={handleClose}
            aria-hidden="true"
          />
          <PlanetDetailPanel planet={focusPlanet} onClose={handleClose} />
        </>
      ) : null}
    </div>
  );
}
