"use client";

import type { CSSProperties, JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { OrreryPlanet, PatternMode } from "@/lib/orrery/types";
import { OrreryRender } from "./OrreryRender";
import { PlanetDetailPanel } from "./PlanetDetailPanel";

/**
 * R9.3 — Orrery (consumer wrapper).
 *
 * Holds the focus state, wires OrreryRender's planet click to a slide-up
 * PlanetDetailPanel, and dismisses on ESC, click-on-backdrop, or close-button.
 * The render layer (OrreryRender) handles the camera dolly when focusPlanetId
 * is set; this wrapper owns the data binding only.
 *
 * Layout: a `position: relative` container so the absolutely-positioned
 * PlanetDetailPanel and backdrop can pin to the orrery scene rather than the
 * viewport. The backdrop is a transparent dismiss surface layered between
 * the orrery (z=1) and the panel (z=3); the backdrop is z=2.
 */

interface Props {
  planets: OrreryPlanet[];
  mode: PatternMode;
}

const containerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "1 / 1",
  maxHeight: "70vh",
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

export function Orrery({ planets, mode }: Props): JSX.Element {
  const [focusId, setFocusId] = useState<string | null>(null);
  const reduced = useReducedMotion();

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
