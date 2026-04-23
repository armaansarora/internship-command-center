"use client";
import { useState, type JSX } from "react";
import { EntranceSequence } from "@/components/transitions/EntranceSequence";
import { SceneRouter } from "@/components/penthouse/scenes/SceneRouter";
import { RestPanel } from "@/components/penthouse/rest/RestPanel";
import { QuickActionsRow } from "@/components/penthouse/quick-actions/QuickActionsRow";
import { IdleDetail } from "@/components/penthouse/idle/IdleDetail";
import { useIdleDetail } from "@/hooks/useIdleDetail";
import type { PenthouseScene } from "./penthouse-data";

/* ──────────────────────────────────────────────────────────────
   KEYFRAME CSS — consumed by scene components (BriefingBeat caret,
   GlassPanel entrance, QuickActionCard pulse). Injected once.
   ────────────────────────────────────────────────────────────── */
const KEYFRAMES = `
  @keyframes slide-in-left {
    from { opacity: 0; transform: translateX(-18px); }
    to   { opacity: 1; transform: translateX(0);     }
  }
  @keyframes pulse-ring-ph {
    0%   { transform: scale(1);   opacity: 0.7; }
    100% { transform: scale(2.6); opacity: 0;   }
  }
  @keyframes radar-pulse {
    0%   { transform: scale(0.8); opacity: 0.9; }
    50%  { transform: scale(1.5); opacity: 0.3; }
    100% { transform: scale(2.2); opacity: 0;   }
  }
  @keyframes pipeline-shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(400%);  }
  }
  @keyframes flow-dot {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50%      { opacity: 1;   transform: scale(1.4); }
  }
  @keyframes gold-underline-grow {
    from { width: 0; opacity: 0; }
    to   { width: 64px; opacity: 1; }
  }
`;

/**
 * Penthouse client — the new R2 scene-first composition.
 *
 * No greeting header. No 4-KPI grid. No "Phase 1 / Phase 2" badges. The
 * primary surface is a SceneRouter that picks the right scene for the
 * user's current time-of-day window. Dashboard data lives in the RestPanel
 * drawer, revealed when the user dismisses the scene (Esc / Space past the
 * final beat / 30s-after-done auto-reveal fires onDismiss).
 */
interface Props {
  scene: PenthouseScene;
}

export function PenthouseClient({ scene }: Props): JSX.Element {
  const [restOpen, setRestOpen] = useState<boolean>(false);

  const idleKind = useIdleDetail({
    userId: scene.user.userId,
    dateIso: scene.dateIso,
    recentRejection: scene.recentRejection,
  });

  return (
    <EntranceSequence>
      <style>{KEYFRAMES}</style>

      {/* Small spatial anchor — the floor chyron. NOT a "Welcome back!"
          banner; this is the sparse, always-visible identifier used on
          every floor. */}
      <FloorChyron />

      {/* Idle detail — subtle near-scene prop. Positioned bottom-right
          so it sits on the "desk plane" of the scene. Absent during
          late-night (where the scene is the lamp itself). */}
      {scene.timeOfDay !== "late-night" && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            right: "48px",
            bottom: "48px",
            zIndex: 5,
            pointerEvents: "none",
            opacity: 0.75,
          }}
        >
          <IdleDetail kind={idleKind} scale={1} />
        </div>
      )}

      <SceneRouter
        timeOfDay={scene.timeOfDay}
        briefing={scene.briefing}
        displayName={scene.user.displayName}
        changesSinceMorning={scene.overnightDelta.newApps + scene.overnightDelta.responses}
        todayTouched={scene.overnightDelta.newApps + scene.overnightDelta.responses}
        onDismiss={() => setRestOpen(true)}
      />

      <RestPanel
        isOpen={restOpen}
        onClose={() => setRestOpen(false)}
        stats={scene.stats}
        pipeline={scene.pipeline}
        activity={scene.activity}
        quickActions={<QuickActionsRow />}
      />
    </EntranceSequence>
  );
}

/**
 * FloorChyron — a small top-left marker ("FLOOR PH · PENTHOUSE") with a
 * pulsing gold dot. This is *not* the banned greeting banner; it's the
 * standing floor label used across the Tower's spatial design.
 */
function FloorChyron(): JSX.Element {
  return (
    <div
      aria-label="Penthouse — Floor PH"
      style={{
        position: "fixed",
        top: "24px",
        left: "28px",
        zIndex: 6,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "11px",
        letterSpacing: "0.3em",
        color: "var(--gold)",
        opacity: 0.55,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <span
        aria-hidden="true"
        style={{ position: "relative", width: "10px", height: "10px" }}
      >
        <span
          style={{
            display: "block",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "var(--gold)",
            boxShadow: "0 0 8px rgba(201, 168, 76, 0.7)",
            position: "absolute",
            top: "2px",
            left: "2px",
          }}
        />
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "1px solid rgba(201, 168, 76, 0.45)",
            animation: "pulse-ring-ph 2.6s ease-out infinite",
          }}
        />
      </span>
      <span>FLOOR PH · PENTHOUSE</span>
    </div>
  );
}
