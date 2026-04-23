"use client";

import { useEffect, useState, type JSX } from "react";
import { CEOCharacter } from "@/components/floor-1/ceo-character/CEOCharacter";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * CEOAtWindow — the CEO turning from the window on scene mount.
 *
 * Reuses the CEOCharacter primitive but frames it inside a larger scene
 * container with a "turning" entrance animation (rotateY 180° → 0°) that
 * runs once on mount, followed by the character's own idle state machine
 * taking over. Honors prefers-reduced-motion: no rotation, character just
 * fades in.
 *
 * The character is purely decorative in this scene — dialogue is handled by
 * the Briefing Glass next to it, not by the character's own dialogue panel.
 * We pass a no-op click handler so accidental clicks don't pop the Floor 1
 * conversation overlay.
 */
interface Props {
  /**
   * Extra delay (ms) before the turning animation starts — lets the parent
   * scene stage skyline/glass first, so the CEO's movement is the last
   * visual to resolve.
   */
  enterDelayMs?: number;
  /**
   * When true, the CEO appears already facing the user — used by the
   * afternoon/evening scenes where there's no "turn from window" beat.
   */
  prefaced?: boolean;
  /**
   * Emitted when the entrance animation completes (or immediately when
   * reduced-motion bypasses it). Parent uses this to time beat reveal.
   */
  onEntered?: () => void;
}

export function CEOAtWindow({ enterDelayMs = 400, prefaced = false, onEntered }: Props): JSX.Element {
  const reduced = useReducedMotion();
  const [entered, setEntered] = useState<boolean>(prefaced || reduced);

  useEffect(() => {
    if (entered) {
      onEntered?.();
      return;
    }
    const startAt = window.setTimeout(() => {
      setEntered(true);
      // Turning animation is 900ms; fire onEntered after it completes so
      // beat reveal doesn't overlap the rotation.
      window.setTimeout(() => onEntered?.(), 900);
    }, enterDelayMs);
    return () => window.clearTimeout(startAt);
  }, [enterDelayMs, entered, onEntered]);

  const turningStyle: React.CSSProperties = reduced
    ? { transform: "none", opacity: entered ? 1 : 0, transition: "opacity 0.6s ease-out" }
    : {
        transform: entered
          ? "perspective(1000px) rotateY(0deg) scale(1)"
          : "perspective(1000px) rotateY(180deg) scale(0.96)",
        opacity: entered ? 1 : 0.2,
        transformOrigin: "center center",
        transition: "transform 0.9s cubic-bezier(0.22, 0.8, 0.32, 1), opacity 0.9s ease-out",
      };

  return (
    <div
      className="relative flex items-end justify-center pointer-events-auto"
      aria-hidden="false"
      role="presentation"
      style={{ minHeight: "320px" }}
    >
      {/* Subtle floor reflection underneath — gives the CEO a grounded footprint */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "-12px",
          left: "50%",
          width: "180px",
          height: "30px",
          transform: "translateX(-50%)",
          background:
            "radial-gradient(ellipse at center, rgba(201, 168, 76, 0.14), transparent 70%)",
          filter: "blur(4px)",
          pointerEvents: "none",
        }}
      />
      <div style={turningStyle}>
        {/* Character's own click → dialogue wiring stays live but the
            scene doesn't open Floor 1 dialogue on tap; the scene's
            BriefingGlass is the dialogue surface. */}
        <CEOCharacter externalState="idle" />
      </div>
    </div>
  );
}
