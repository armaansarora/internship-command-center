"use client";

import type { JSX } from "react";
import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { BriefingRoomScene } from "./BriefingRoomScene";
import type { BriefingRoomStats } from "./BriefingRoomScene";
import { CPOCharacter } from "./cpo-character/CPOCharacter";
import { CPODialoguePanel } from "./cpo-character/CPODialoguePanel";
import { CPOWhiteboard } from "./cpo-character/CPOWhiteboard";
import type { PrepStats, UpcomingInterview } from "./cpo-character/CPOWhiteboard";
import { InterviewTimeline } from "./crud/InterviewTimeline";
import type { Interview } from "./crud/InterviewTimeline";
import type { PrepPacket } from "./crud/PrepPacketViewer";
import type { Firmness } from "./star/interrupt-rules";

// 1114 LOC viewer — largest component in the project. Code-split aggressively.
const PrepPacketViewer = dynamic(
  () => import("./crud/PrepPacketViewer").then((m) => m.PrepPacketViewer),
  { ssr: false }
);

// DrillStage is lazy-loaded — only pulled in when the user hits START DRILL,
// so it stays off the Briefing Room first-paint path.
const DrillStage = dynamic(
  () => import("./drill/DrillStage").then((m) => m.DrillStage),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface BriefingRoomClientProps {
  /** Prep packets (full documents) */
  prepPackets: PrepPacket[];
  /** All interviews (upcoming + past) */
  interviews: Interview[];
  /** All applications — for ticker stats derivation */
  applications: Array<{ id: string; companyName?: string | null; status: string }>;
  /** Aggregated prep statistics for whiteboard */
  stats: PrepStats;
  /** R6.6 — voice opt-in flags, read from user_profiles on the server. */
  voiceEnabled: boolean;
  voicePermDisabled: boolean;
  /** R6.6 — firmness + timer target read from user_profiles.drill_preferences */
  drillFirmness: Firmness;
  drillTimerSeconds: number;
  /** Server actions */
  onPrintPacket?: (packetId: string) => Promise<void>;
  onExportPacket?: (packetId: string) => Promise<void>;
  onCreatePacket?: (interviewId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Ticker stats derivation
// ---------------------------------------------------------------------------
function deriveTickerStats(
  interviews: Interview[],
  stats: PrepStats
): BriefingRoomStats {
  const now = new Date();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weekEnd = new Date(now.getTime() + weekMs);

  const interviewsThisWeek = interviews.filter((i) => {
    const t = new Date(i.scheduledAt);
    return t >= now && t <= weekEnd;
  }).length;

  // Find next upcoming interview
  const upcoming = interviews
    .filter(
      (i) =>
        i.status === "upcoming" && new Date(i.scheduledAt) >= now
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

  const next = upcoming[0] ?? null;
  let nextInterviewCompany: string | null = null;
  let nextInterviewHours: number | null = null;

  if (next) {
    nextInterviewCompany = next.company;
    const diffMs = new Date(next.scheduledAt).getTime() - now.getTime();
    nextInterviewHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
  }

  // CPO status
  const cpoStatus: BriefingRoomStats["cpoStatus"] =
    next && nextInterviewHours !== null && nextInterviewHours < 48
      ? "briefing"
      : "standing-by";

  return {
    interviewsThisWeek,
    prepCoverage: stats.prepCoverage,
    nextInterviewCompany,
    nextInterviewHours,
    cpoStatus,
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function BriefingRoomClient({
  prepPackets,
  interviews,
  stats,
  voiceEnabled,
  voicePermDisabled,
  drillFirmness,
  drillTimerSeconds,
  onPrintPacket,
  onExportPacket,
  onCreatePacket,
}: BriefingRoomClientProps): JSX.Element {
  // ── State ──────────────────────────────────────────────────────────
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(
    null
  );
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [cpoStatus, setCpoStatus] = useState<"idle" | "thinking" | "talking">("idle");
  const [drillInterviewId, setDrillInterviewId] = useState<string | null>(null);

  // ── Derived data ───────────────────────────────────────────────────
  const selectedInterview = useMemo<Interview | null>(() => {
    if (!selectedInterviewId) return null;
    return interviews.find((i) => i.id === selectedInterviewId) ?? null;
  }, [selectedInterviewId, interviews]);

  const selectedPacket = useMemo<PrepPacket | null>(() => {
    if (!selectedInterview?.prepPacketId) return null;
    return prepPackets.find((p) => p.id === selectedInterview.prepPacketId) ?? null;
  }, [selectedInterview, prepPackets]);

  // START DRILL button is available on any selected upcoming interview,
  // regardless of whether a packet exists — per partner constraint, "CPO
  // can drill you cold".
  const canStartDrill = selectedInterview?.status === "upcoming";

  const tickerStats = useMemo<BriefingRoomStats>(
    () => deriveTickerStats(interviews, stats),
    [interviews, stats]
  );

  // Prep upcoming interviews list for CPO whiteboard
  const whiteboardUpcoming = useMemo<UpcomingInterview[]>(() => {
    const now = new Date();
    return interviews
      .filter(
        (i) => i.status === "upcoming" && new Date(i.scheduledAt) >= now
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      )
      .slice(0, 5)
      .map((i) => ({
        id: i.id,
        company: i.company,
        role: i.role,
        scheduledAt: i.scheduledAt,
        hasPacket: !!i.prepPacketId,
        round: i.round,
      }));
  }, [interviews]);

  const whiteboardStats = useMemo<PrepStats>(
    () => ({
      ...stats,
      upcomingInterviews: whiteboardUpcoming,
    }),
    [stats, whiteboardUpcoming]
  );

  // ── Handlers ───────────────────────────────────────────────────────
  const handleOpenDialogue = useCallback(() => {
    setDialogueOpen(true);
  }, []);

  const handleCloseDialogue = useCallback(() => {
    setDialogueOpen(false);
    setCpoStatus("idle");
  }, []);

  const handleCPOStatusChange = useCallback((status: "idle" | "thinking" | "talking") => {
    setCpoStatus(status);
  }, []);

  const handleSelectInterview = useCallback((interview: Interview) => {
    setSelectedInterviewId(interview.id);
  }, []);

  const handleStartDrill = useCallback(() => {
    if (!selectedInterviewId) return;
    setDrillInterviewId(selectedInterviewId);
  }, [selectedInterviewId]);

  const handleExitDrill = useCallback(() => {
    setDrillInterviewId(null);
  }, []);

  const handleDrillComplete = useCallback(() => {
    setDrillInterviewId(null);
  }, []);

  const handlePrintPacket = useCallback(
    async (packetId: string) => {
      await onPrintPacket?.(packetId);
    },
    [onPrintPacket]
  );

  const handleExportPacket = useCallback(
    async (packetId: string) => {
      await onExportPacket?.(packetId);
    },
    [onExportPacket]
  );

  // ── Character slot — CPO + whiteboard ─────────────────────────────
  const characterSlot = (
    <div
      className="flex items-end justify-center gap-6 w-full h-full px-6 pb-4"
      style={{ maxWidth: "900px", margin: "0 auto" }}
    >
      {/* CPO character — left side */}
      <div className="flex-shrink-0">
        <CPOCharacter
          onConversationOpen={handleOpenDialogue}
          dialogueOpen={dialogueOpen}
          dialogueStatus={cpoStatus}
        />
      </div>

      {/* CPO whiteboard — right of character */}
      <div className="flex-1 min-w-0 max-w-sm">
        <CPOWhiteboard stats={whiteboardStats} />
      </div>
    </div>
  );

  // ── Drill mode toggle — swaps the whole content slot for DrillStage ─
  const drillActiveSlot = drillInterviewId ? (
    <DrillStage
      interviewId={drillInterviewId}
      voiceEnabled={voiceEnabled}
      voicePermDisabled={voicePermDisabled}
      firmness={drillFirmness}
      timerSeconds={drillTimerSeconds}
      onComplete={handleDrillComplete}
      onExit={handleExitDrill}
    />
  ) : null;

  // The START DRILL action — rendered alongside GENERATE WITH CPO in the
  // "no packet" state, and as a floating action when a packet exists.
  const startDrillButton = canStartDrill ? (
    <button
      type="button"
      onClick={handleStartDrill}
      aria-label="Start drill with CPO"
      style={{
        fontSize: "10px",
        fontFamily: "'JetBrains Mono', monospace",
        color: "#C9A84C",
        backgroundColor: "rgba(201, 168, 76, 0.1)",
        border: "1px solid rgba(201, 168, 76, 0.4)",
        borderRadius: "2px",
        padding: "8px 16px",
        cursor: "pointer",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
          "rgba(201, 168, 76, 0.2)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
          "rgba(201, 168, 76, 0.1)";
      }}
      className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C]"
    >
      START DRILL →
    </button>
  ) : null;

  // ── Content slot — interview timeline + prep packet viewer ─────────
  const defaultTableSlot = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Left panel — Interview timeline */}
      <div
        style={{
          borderRight: "1px solid rgba(26, 46, 74, 0.7)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        aria-label="Interview timeline panel"
      >
        <InterviewTimeline
          interviews={interviews}
          selectedInterviewId={selectedInterviewId ?? undefined}
          onSelectInterview={handleSelectInterview}
        />
      </div>

      {/* Right panel — Prep packet viewer */}
      <div
        style={{
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "rgba(6, 10, 18, 0.3)",
          position: "relative",
        }}
        aria-label="Prep packet viewer panel"
      >
        {selectedInterviewId && !selectedPacket ? (
          /* Interview selected but no packet exists */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: "12px",
              padding: "24px",
            }}
            role="status"
            aria-label="No prep packet for this interview"
          >
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "#4A6A85",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              NO PREP PACKET FOR THIS INTERVIEW
            </span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {onCreatePacket && (
                <button
                  type="button"
                  onClick={() =>
                    selectedInterviewId &&
                    onCreatePacket(selectedInterviewId)
                  }
                  aria-label="Generate prep packet with CPO"
                  style={{
                    fontSize: "10px",
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#4A9EDB",
                    backgroundColor: "rgba(74, 158, 219, 0.1)",
                    border: "1px solid rgba(74, 158, 219, 0.35)",
                    borderRadius: "2px",
                    padding: "8px 16px",
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      "rgba(74, 158, 219, 0.18)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      "rgba(74, 158, 219, 0.1)";
                  }}
                  className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4A9EDB]"
                >
                  GENERATE WITH CPO
                </button>
              )}
              {startDrillButton}
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "9px",
                color: "#2D4A62",
                textAlign: "center",
              }}
            >
              Or ask the CPO to generate one for you
            </span>
          </div>
        ) : (
          <>
            <PrepPacketViewer
              packet={selectedPacket}
              onPrint={onPrintPacket ? handlePrintPacket : undefined}
              onExport={onExportPacket ? handleExportPacket : undefined}
            />
            {/* START DRILL overlay — visible on upcoming interviews regardless
                of whether a packet exists. CPO can drill cold. */}
            {startDrillButton && (
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  right: 16,
                  zIndex: 5,
                }}
              >
                {startDrillButton}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const tableSlot = drillActiveSlot ?? defaultTableSlot;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      {/* Full-screen Briefing Room scene */}
      <BriefingRoomScene
        stats={tickerStats}
        characterSlot={characterSlot}
        tableSlot={tableSlot}
      />

      {/* CPO Dialogue Panel — slides in from right */}
      {dialogueOpen && (
        <div
          role="complementary"
          aria-label="CPO interview preparation panel"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(420px, 90vw)",
            zIndex: 50,
            animation: "cpo-panel-slide-in 0.25s ease-out forwards",
          }}
        >
          <CPODialoguePanel
            isOpen={dialogueOpen}
            onClose={handleCloseDialogue}
            onStatusChange={handleCPOStatusChange}
          />
        </div>
      )}

      {/* Backdrop overlay when dialogue is open */}
      {dialogueOpen && (
        <div
          role="presentation"
          onClick={handleCloseDialogue}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            zIndex: 49,
            animation: "cpo-backdrop-fade-in 0.2s ease-out forwards",
          }}
        />
      )}

      {/* Panel animations — with reduced motion fallbacks */}
      <style>{`
        @keyframes cpo-panel-slide-in {
          from { transform: translateX(100%); opacity: 0.8; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes cpo-backdrop-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes cpo-panel-slide-in {
            from { opacity: 0.8; }
            to { opacity: 1; }
          }
          @keyframes cpo-backdrop-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        }
      `}</style>
    </>
  );
}
