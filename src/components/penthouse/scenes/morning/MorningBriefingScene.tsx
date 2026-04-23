"use client";
import { useState, type JSX } from "react";
import type { MorningBriefing } from "@/lib/ai/agents/morning-briefing";
import { CEOAtWindow } from "@/components/penthouse/ceo-at-window/CEOAtWindow";
import { BriefingGlass } from "./BriefingGlass";
import { SkipHint } from "./SkipHint";
import { useBriefingControls } from "./useBriefingControls";

/**
 * Morning Briefing Scene — Floor PH between ~05:00 and 11:59 local.
 *
 * Composition:
 *   [ CEO at Window (left)  ]   [ Briefing Glass (right) ]
 *                                [ beats revealed 1 at a time ]
 *                                [ skip hint ]
 *
 * Interaction:
 *   - Space     → advance to next beat (or fire onSkip at the end)
 *   - Esc       → skip all + fire onSkip (parent reveals RestPanel)
 *   - 8s idle   → auto-advance
 *
 * Once `onSkip` fires, the scene remains mounted (so Esc cycles back work),
 * but opacity drops so the RestPanel above it is the visual focus.
 */
interface Props {
  briefing: MorningBriefing;
  /** Fires when the user dismisses the scene (Esc or Space after last beat). */
  onDismiss?: () => void;
}

export function MorningBriefingScene({ briefing, onDismiss }: Props): JSX.Element {
  const [ceoEntered, setCeoEntered] = useState<boolean>(false);

  const { index, done } = useBriefingControls({
    beatsCount: briefing.beats.length,
    enabled: ceoEntered,
    onSkip: onDismiss,
    onDone: () => {
      // Gentle auto-dismiss 30s after the last beat, unless the user has
      // already moved on. Matches the brief's "rest" reveal timing.
      window.setTimeout(() => onDismiss?.(), 30_000);
    },
  });

  return (
    <section
      aria-label="Morning briefing"
      className="relative w-full"
      style={{
        minHeight: "calc(100dvh - 120px)",
        padding: "48px 24px",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: "36px",
      }}
    >
      <div
        className="mx-auto w-full"
        style={{
          maxWidth: "1240px",
          display: "grid",
          gridTemplateColumns: "minmax(220px, 320px) 1fr",
          columnGap: "56px",
          alignItems: "center",
        }}
      >
        <CEOAtWindow enterDelayMs={500} onEntered={() => setCeoEntered(true)} />
        <div style={{ alignSelf: "center" }}>
          <BriefingGlass briefing={briefing} currentIndex={ceoEntered ? index : -1} />
        </div>
      </div>

      <SkipHint done={done} />

      <style>{`
        @keyframes briefing-caret {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 1;    }
        }
        @media (max-width: 900px) {
          section[aria-label="Morning briefing"] > div {
            grid-template-columns: 1fr !important;
            row-gap: 24px;
          }
        }
      `}</style>
    </section>
  );
}
