"use client";
import { useEffect, useState, type JSX, type ReactNode } from "react";
import { GlassPanel } from "@/components/penthouse/GlassPanel";
import { PipelineNodes, PipelineBar } from "@/components/penthouse/PipelineNodes";
import { ActivityFeed } from "@/components/penthouse/ActivityFeed";
import type {
  PenthouseStats,
  PipelineStageData,
  ActivityItemData,
} from "@/app/(authenticated)/penthouse/penthouse-data";

/**
 * Rest Panel — the demoted dashboard that lived as the Penthouse's primary
 * surface before R2. Hidden by default. Slides up from the bottom when the
 * user dismisses the scene (Esc, or Space past the last beat).
 *
 * Contains, in order:
 *   1. (optional) Quick Actions row — slot, provided by parent
 *   2. Pipeline nodes + bar
 *   3. Recent activity
 *   4. Muted stat chips
 *
 * Inside the panel, Esc closes and hands focus back to the scene. Clicking
 * the scene backdrop also closes.
 */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  stats: PenthouseStats;
  pipeline: PipelineStageData[];
  activity: ActivityItemData[];
  quickActions?: ReactNode;
}

export function RestPanel({ isOpen, onClose, stats, pipeline, activity, quickActions }: Props): JSX.Element {
  const totalPipeline = pipeline.reduce((sum, s) => sum + s.count, 0);
  const [revealed, setRevealed] = useState<boolean>(false);

  // Two-step open — mount hidden, then flip revealed on next frame so the
  // transition runs cleanly.
  useEffect(() => {
    if (!isOpen) {
      // Reset the reveal flag when the drawer closes so the next open
      // replays the slide-in. Small synchronous setState here is intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevealed(false);
      return;
    }
    const id = window.requestAnimationFrame(() => setRevealed(true));
    return () => window.cancelAnimationFrame(id);
  }, [isOpen]);

  // Esc to close once the panel is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return <></>;

  return (
    <div
      role="dialog"
      aria-label="Full dashboard"
      aria-modal="false"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        pointerEvents: "auto",
      }}
    >
      {/* Scene-dim backdrop — clicking it closes the panel */}
      <button
        type="button"
        aria-label="Close dashboard"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(10, 12, 24, 0.52)",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "pointer",
          opacity: revealed ? 1 : 0,
          transition: "opacity 0.45s ease-out",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxHeight: "82vh",
          overflowY: "auto",
          transform: revealed ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.55s cubic-bezier(0.22, 0.8, 0.32, 1)",
          padding: "28px 24px 40px",
        }}
      >
        <div
          className="mx-auto flex flex-col gap-6"
          style={{ maxWidth: "1240px" }}
        >
          {/* Drag-hint pill so it reads as a pulled-up drawer */}
          <div
            aria-hidden="true"
            style={{
              alignSelf: "center",
              width: "48px",
              height: "4px",
              borderRadius: "2px",
              background: "rgba(201, 168, 76, 0.3)",
            }}
          />

          <div className="flex items-center justify-between">
            <h2
              style={{
                margin: 0,
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(18px, 1.5vw, 22px)",
                color: "var(--text-primary)",
                letterSpacing: "0.01em",
              }}
            >
              Working desk
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss dashboard"
              style={{
                padding: "6px 10px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "rgba(255, 255, 255, 0.55)",
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "3px",
                cursor: "pointer",
              }}
            >
              Esc · close
            </button>
          </div>

          {quickActions ? (
            <div role="group" aria-label="Quick actions">
              {quickActions}
            </div>
          ) : null}

          {/* Pipeline */}
          <GlassPanel className="p-6 md:p-7 space-y-5" delay={80}>
            <div className="flex items-center justify-between">
              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "15px",
                  color: "var(--text-primary)",
                }}
              >
                Pipeline
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                }}
              >
                {totalPipeline} total
              </span>
            </div>

            {totalPipeline === 0 ? (
              <p
                className="text-sm"
                style={{ color: "var(--text-secondary)", margin: 0 }}
              >
                Pipeline&apos;s empty. The War Room is on Floor 7.
              </p>
            ) : (
              <>
                <PipelineNodes pipeline={pipeline} totalPipeline={totalPipeline} />
                <PipelineBar pipeline={pipeline} totalPipeline={totalPipeline} />
              </>
            )}
          </GlassPanel>

          {/* Activity */}
          <GlassPanel className="p-6 md:p-7 space-y-3" delay={140}>
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "15px",
                color: "var(--text-primary)",
              }}
            >
              Recent activity
            </span>
            <ActivityFeed activity={activity} />
          </GlassPanel>

          {/* Muted stat chips (demoted KPI row) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-label="Quick stats">
            {[
              { label: "Applications", value: stats.totalApplications },
              { label: "In pipeline", value: stats.inPipeline },
              { label: "Interviews", value: stats.interviews },
              { label: "Response rate", value: `${stats.responseRate}%` },
            ].map((chip) => (
              <div
                key={chip.label}
                style={{
                  padding: "10px 12px",
                  background: "rgba(14, 16, 32, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "rgba(255, 255, 255, 0.45)",
                  }}
                >
                  {chip.label}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontVariantNumeric: "tabular-nums lining-nums",
                    fontSize: "20px",
                    color: "rgba(245, 232, 192, 0.86)",
                  }}
                >
                  {chip.value === 0 ? "—" : chip.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
