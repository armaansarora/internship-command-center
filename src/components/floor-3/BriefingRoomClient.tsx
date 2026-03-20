"use client";

import type { JSX } from "react";
import { useState, useCallback, useMemo } from "react";
import { BriefingRoomScene } from "./BriefingRoomScene";
import type { BriefingRoomStats } from "./BriefingRoomScene";
import { CPOCharacter } from "./cpo-character/CPOCharacter";
import { CPODialoguePanel } from "./cpo-character/CPODialoguePanel";
import { CPOWhiteboard } from "./cpo-character/CPOWhiteboard";
import type { PrepStats, UpcomingInterview } from "./cpo-character/CPOWhiteboard";
import { InterviewTimeline } from "./crud/InterviewTimeline";
import type { Interview } from "./crud/InterviewTimeline";
import { PrepPacketViewer } from "./crud/PrepPacketViewer";
import type { PrepPacket } from "./crud/PrepPacketViewer";

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
  onPrintPacket,
  onExportPacket,
  onCreatePacket,
}: BriefingRoomClientProps): JSX.Element {
  // ── State ──────────────────────────────────────────────────────────
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(
    null
  );
  const [dialogueOpen, setDialogueOpen] = useState(false);

  // ── Derived data ───────────────────────────────────────────────────
  const selectedPacket = useMemo<PrepPacket | null>(() => {
    if (!selectedInterviewId) return null;
    const interview = interviews.find((i) => i.id === selectedInterviewId);
    if (!interview?.prepPacketId) return null;
    return prepPackets.find((p) => p.id === interview.prepPacketId) ?? null;
  }, [selectedInterviewId, interviews, prepPackets]);

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
  }, []);

  const handleSelectInterview = useCallback((interview: Interview) => {
    setSelectedInterviewId(interview.id);
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
        <CPOCharacter onConversationOpen={handleOpenDialogue} />
      </div>

      {/* CPO whiteboard — right of character */}
      <div className="flex-1 min-w-0 max-w-sm">
        <CPOWhiteboard stats={whiteboardStats} />
      </div>
    </div>
  );

  // ── Content slot — interview timeline + prep packet viewer ─────────
  const tableSlot = (
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
          <PrepPacketViewer
            packet={selectedPacket}
            onPrint={onPrintPacket ? handlePrintPacket : undefined}
            onExport={onExportPacket ? handleExportPacket : undefined}
          />
        )}
      </div>
    </div>
  );

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
