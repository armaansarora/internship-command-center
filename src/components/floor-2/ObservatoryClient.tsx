"use client";

import type { JSX } from "react";
import { useState, useCallback, useMemo } from "react";
import type { PipelineStats } from "@/lib/db/queries/applications-rest";
import { ObservatoryScene } from "./ObservatoryScene";
import { CFOCharacter } from "./cfo-character/CFOCharacter";
import { CFODialoguePanel } from "./cfo-character/CFODialoguePanel";
import { CFOWhiteboard } from "./cfo-character/CFOWhiteboard";
import { ConversionFunnel } from "./analytics/ConversionFunnel";
import { PipelineVelocity } from "./analytics/PipelineVelocity";
import { WeeklyTrend } from "./analytics/WeeklyTrend";
import { ActivityHeatmap } from "./analytics/ActivityHeatmap";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface ObservatoryClientProps {
  stats: PipelineStats;
}

// ---------------------------------------------------------------------------
// Analytics panel
// ---------------------------------------------------------------------------
function AnalyticsPanel({ children, title }: { children: React.ReactNode; title: string }): JSX.Element {
  return (
    <div
      className="instrument-panel"
      style={{
        padding: "14px",
        marginBottom: "14px",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
          color: "rgba(74, 122, 155, 0.8)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: "10px",
          borderBottom: "1px solid rgba(60, 140, 220, 0.1)",
          paddingBottom: "6px",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ObservatoryClient({ stats }: ObservatoryClientProps): JSX.Element {
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [cfoStatus, setCfoStatus] = useState<"idle" | "thinking" | "talking">("idle");

  const handleOpenDialogue = useCallback(() => setDialogueOpen(true), []);
  const handleCloseDialogue = useCallback(() => {
    setDialogueOpen(false);
    setCfoStatus("idle");
  }, []);

  const handleCFOStatusChange = useCallback((status: "idle" | "thinking" | "talking") => {
    setCfoStatus(status);
  }, []);

  const tickerStats = useMemo(() => ({
    total: stats.total,
    conversionRate: stats.conversionRate,
    weeklyActivity: stats.weeklyActivity,
    staleCount: stats.staleCount,
    screening: stats.screening,
    interviewing: stats.interviewing,
    offers: stats.offers,
  }), [stats]);

  // ── Character slot ──────────────────────────────────────────────────────
  const characterSlot = (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <CFOCharacter
        onConversationOpen={handleOpenDialogue}
        dialogueOpen={dialogueOpen}
        dialogueStatus={cfoStatus}
      />
      <div style={{ width: "100%" }}>
        <CFOWhiteboard stats={stats} />
      </div>
    </div>
  );

  // ── Dashboard slot ──────────────────────────────────────────────────────
  const dashboardSlot = (
    <div style={{ maxWidth: "900px" }}>
      {/* Grid: Funnel + Velocity */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "14px",
          marginBottom: "0",
        }}
      >
        <AnalyticsPanel title="CONVERSION FUNNEL">
          <ConversionFunnel stats={stats} />
        </AnalyticsPanel>

        <AnalyticsPanel title="PIPELINE VELOCITY">
          <PipelineVelocity />
        </AnalyticsPanel>
      </div>

      {/* Grid: Weekly Trend + Heatmap */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "14px",
        }}
      >
        <AnalyticsPanel title="WEEKLY TREND (8 WEEKS)">
          <WeeklyTrend />
        </AnalyticsPanel>

        <AnalyticsPanel title="ACTIVITY HEATMAP">
          <ActivityHeatmap />
        </AnalyticsPanel>
      </div>
    </div>
  );

  return (
    <>
      <ObservatoryScene
        stats={tickerStats}
        characterSlot={characterSlot}
        dashboardSlot={dashboardSlot}
      />

      {/* CFO Dialogue Panel */}
      {dialogueOpen && (
        <div
          role="complementary"
          aria-label="CFO conversation panel"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(420px, 90vw)",
            zIndex: 50,
            animation: "cfo-panel-slide-in 0.25s ease-out forwards",
          }}
        >
          <CFODialoguePanel
            isOpen={dialogueOpen}
            onClose={handleCloseDialogue}
            onStatusChange={handleCFOStatusChange}
          />
        </div>
      )}

      {dialogueOpen && (
        <div
          role="presentation"
          onClick={handleCloseDialogue}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            zIndex: 49,
            animation: "cfo-backdrop-fade-in 0.2s ease-out forwards",
          }}
        />
      )}

      <style>{`
        @keyframes cfo-panel-slide-in {
          from { transform: translateX(100%); opacity: 0.8; }
          to   { transform: translateX(0); opacity: 1; }
        }
        @keyframes cfo-backdrop-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes cfo-panel-slide-in {
            from { opacity: 0.8; }
            to   { opacity: 1; }
          }
        }
      `}</style>
    </>
  );
}
