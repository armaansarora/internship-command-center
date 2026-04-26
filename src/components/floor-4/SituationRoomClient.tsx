"use client";

import type { JSX } from "react";
import { useState, useCallback, useMemo } from "react";
import type { Application } from "@/db/schema";
import type { BriefingData } from "@/lib/db/queries/communications-rest";
import { SituationRoomScene } from "./SituationRoomScene";
import type { SituationRoomStats } from "./SituationRoomScene";
import { COOCharacter } from "./coo-character/COOCharacter";
import { COODialoguePanel } from "./coo-character/COODialoguePanel";
import { COOWhiteboard } from "./coo-character/COOWhiteboard";
import { RingPulseController } from "./rings/RingPulseController";
import { useRingPulse } from "./rings/useRingPulse";
import { UndoBarProvider } from "./undo-bar/UndoBarProvider";
import { ConflictsSection, type ConflictEntry } from "./conflicts/ConflictsSection";
import {
  FinalCountdownSection,
  type CountdownCard,
} from "./final-countdown/FinalCountdownSection";
import { SituationMap } from "./situation-map/SituationMap";
import type { ShapeInput } from "@/lib/situation/outreach-arcs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SituationRoomClientProps {
  briefingData: BriefingData;
  applications: Application[];
  approveOutreach?: (outreachId: string) => Promise<void>;
  dismissNotification?: (notificationId: string) => Promise<void>;
  /** R7 — calendar conflicts surfaced as a section at the top of the tableSlot. */
  conflicts?: ConflictEntry[];
  /** R7.9 — outreach rows for the Situation Map. */
  mapOutreach?: ShapeInput["outreach"];
  /** R7.9 — company directory for the map. */
  mapCompanies?: ShapeInput["companies"];
}

// ---------------------------------------------------------------------------
// Deadline card urgency helpers
// ---------------------------------------------------------------------------
type CardTier = "overdue" | "today" | "upcoming";

interface DeadlineCard {
  id: string;
  companyName: string;
  role: string;
  tier: CardTier;
  daysSinceActivity: number;
  status: string;
}

function getCardTier(daysSince: number): CardTier {
  if (daysSince >= 14) return "overdue";
  if (daysSince >= 7) return "today";
  return "upcoming";
}

function buildDeadlineCards(applications: Application[]): DeadlineCard[] {
  const now = new Date();

  return applications
    .filter((app) => {
      const lastActivity = app.lastActivityAt ?? app.createdAt;
      const msAgo = now.getTime() - new Date(lastActivity).getTime();
      const daysSince = Math.floor(msAgo / (24 * 60 * 60 * 1000));
      return (
        daysSince >= 5 &&
        !["rejected", "withdrawn", "accepted", "offer_accepted"].includes(
          app.status
        )
      );
    })
    .map((app) => {
      const lastActivity = app.lastActivityAt ?? app.createdAt;
      const msAgo = now.getTime() - new Date(lastActivity).getTime();
      const daysSince = Math.floor(msAgo / (24 * 60 * 60 * 1000));
      return {
        id: app.id,
        companyName: app.companyName ?? "Unknown Company",
        role: app.role,
        tier: getCardTier(daysSince),
        daysSinceActivity: daysSince,
        status: app.status,
      };
    })
    .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
}

// ---------------------------------------------------------------------------
// Single deadline card
// ---------------------------------------------------------------------------
const TIER_STYLES: Record<
  CardTier,
  { background: string; border: string; labelColor: string; label: string }
> = {
  overdue: {
    background: "rgba(220, 60, 60, 0.07)",
    border: "rgba(220, 60, 60, 0.22)",
    labelColor: "#E84040",
    label: "OVERDUE",
  },
  today: {
    background: "rgba(220, 124, 40, 0.08)",
    border: "rgba(220, 124, 40, 0.25)",
    labelColor: "#DC7C28",
    label: "DUE SOON",
  },
  upcoming: {
    background: "rgba(240, 160, 80, 0.05)",
    border: "rgba(240, 160, 80, 0.14)",
    labelColor: "#F0A050",
    label: "UPCOMING",
  },
};

function DeadlineCard({ card }: { card: DeadlineCard }): JSX.Element {
  const style = TIER_STYLES[card.tier];
  const rings = useRingPulse();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      rings.pulse(e.clientX, e.clientY);
    },
    [rings],
  );

  return (
    <article
      aria-label={`${card.tier} follow-up: ${card.companyName} — ${card.role}, ${card.daysSinceActivity} days since activity`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          rings.pulse(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
      }}
      tabIndex={0}
      role="button"
      style={{
        background: style.background,
        border: `1px solid ${style.border}`,
        borderRadius: "4px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        fontFamily: "IBM Plex Mono, monospace",
        cursor: "pointer",
      }}
    >
      {/* Tier badge + days */}
      <div className="flex items-center justify-between gap-2">
        <span
          style={{
            fontSize: "8px",
            color: style.labelColor,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {style.label}
        </span>
        <span
          style={{
            fontSize: "10px",
            color: style.labelColor,
            fontWeight: 700,
          }}
        >
          {card.daysSinceActivity}d
        </span>
      </div>

      {/* Company */}
      <div
        style={{
          fontSize: "13px",
          color: "#FDF3E8",
          fontWeight: 600,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {card.companyName}
      </div>

      {/* Role */}
      <div
        style={{
          fontSize: "11px",
          color: "#C4925A",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {card.role}
      </div>

      {/* Status */}
      <div
        style={{
          fontSize: "9px",
          color: "#7A5B35",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginTop: "2px",
        }}
      >
        {card.status.replace(/_/g, " ")}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------
function SectionHeader({
  title,
  count,
  color,
}: {
  title: string;
  count: number;
  color: string;
}): JSX.Element {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span
        style={{
          fontSize: "10px",
          fontFamily: "IBM Plex Mono, monospace",
          color: "#7A5B35",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontSize: "10px",
          fontFamily: "IBM Plex Mono, monospace",
          color,
          fontWeight: 700,
        }}
        aria-label={`${count} items`}
      >
        {count}
      </span>
      <div
        aria-hidden="true"
        style={{
          flex: 1,
          height: "1px",
          background: `linear-gradient(to right, ${color}44, transparent)`,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function SituationRoomClient({
  briefingData,
  applications,
  approveOutreach,
  dismissNotification,
  conflicts = [],
  mapOutreach = [],
  mapCompanies = [],
}: SituationRoomClientProps): JSX.Element {
  // Reserved for next interaction pass when action controls are exposed in this UI.
  void approveOutreach;
  void dismissNotification;
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [cooStatus, setCooStatus] = useState<"idle" | "thinking" | "talking">("idle");

  const handleOpenDialogue = useCallback(() => {
    setDialogueOpen(true);
  }, []);

  const handleCloseDialogue = useCallback(() => {
    setDialogueOpen(false);
    setCooStatus("idle");
  }, []);

  const handleCooStatusChange = useCallback((status: "idle" | "thinking" | "talking") => {
    setCooStatus(status);
  }, []);

  // Build deadline cards from applications (stale follow-up cards)
  const deadlineCards = useMemo(
    () => buildDeadlineCards(applications),
    [applications]
  );

  // Build Final Countdown cards from applications with a deadline set.
  const countdownCards = useMemo<CountdownCard[]>(
    () =>
      applications
        .filter((a) => a.deadlineAt !== null)
        .map((a) => ({
          id: a.id,
          companyName: a.companyName ?? "Unknown company",
          role: a.role,
          deadlineAtMs: new Date(a.deadlineAt as unknown as string | Date).getTime(),
        })),
    [applications]
  );

  const overdueCards = useMemo(
    () => deadlineCards.filter((c) => c.tier === "overdue"),
    [deadlineCards]
  );
  const todayCards = useMemo(
    () => deadlineCards.filter((c) => c.tier === "today"),
    [deadlineCards]
  );
  const upcomingCards = useMemo(
    () => deadlineCards.filter((c) => c.tier === "upcoming"),
    [deadlineCards]
  );

  // Derive ticker stats from briefingData
  const tickerStats: SituationRoomStats = useMemo(
    () => ({
      overdueFollowUps: briefingData.overdueFollowUpsCount,
      todayInterviews: briefingData.todaysInterviews.length,
      pendingOutreach: briefingData.pendingOutreachCount,
      unreadEmails: briefingData.unreadEmailsCount,
    }),
    [briefingData]
  );

  // ── Character slot ────────────────────────────────────────────────
  const characterSlot = (
    <div
      className="flex items-end justify-center gap-6 w-full h-full px-6 pb-4"
      style={{ maxWidth: "900px", margin: "0 auto" }}
    >
      {/* COO character — left side */}
      <div className="flex-shrink-0">
        <COOCharacter
          onConversationOpen={handleOpenDialogue}
          overdueCount={briefingData.overdueFollowUpsCount}
          dialogueOpen={dialogueOpen}
          dialogueStatus={cooStatus}
        />
      </div>

      {/* COO whiteboard — right of character */}
      <div className="flex-1 min-w-0 max-w-sm">
        <COOWhiteboard briefingData={briefingData} />
      </div>
    </div>
  );

  // ── Table slot — deadline cards ───────────────────────────────────
  const tableSlot = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        padding: "16px 20px",
        gap: "20px",
      }}
    >
      {/* R7.9 — Situation Map — outreach in flight (Canvas2D or list fallback) */}
      <SituationMap outreach={mapOutreach} companies={mapCompanies} />

      {/* R7.7 — Calendar conflicts at the top (only renders when non-empty) */}
      <ConflictsSection conflicts={conflicts} />

      {/* R7.8 — Final Countdown section: apps with deadlines in next 7 days */}
      <FinalCountdownSection cards={countdownCards} />

      {/* Empty state */}
      {deadlineCards.length === 0 &&
        conflicts.length === 0 &&
        countdownCards.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: "8px",
            opacity: 0.5,
          }}
          role="status"
          aria-label="No pending follow-ups"
        >
          <span
            style={{
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: "11px",
              color: "#7A5B35",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            All caught up — no pending follow-ups
          </span>
        </div>
      )}

      {/* Overdue section */}
      {overdueCards.length > 0 && (
        <section aria-label="Overdue follow-ups">
          <SectionHeader
            title="Overdue"
            count={overdueCards.length}
            color="#E84040"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "10px",
            }}
          >
            {overdueCards.map((card) => (
              <DeadlineCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      )}

      {/* Due soon section */}
      {todayCards.length > 0 && (
        <section aria-label="Follow-ups due soon">
          <SectionHeader
            title="Due Soon"
            count={todayCards.length}
            color="#DC7C28"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "10px",
            }}
          >
            {todayCards.map((card) => (
              <DeadlineCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming section */}
      {upcomingCards.length > 0 && (
        <section aria-label="Upcoming follow-ups">
          <SectionHeader
            title="Upcoming"
            count={upcomingCards.length}
            color="#F0A050"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "10px",
            }}
          >
            {upcomingCards.map((card) => (
              <DeadlineCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      )}

      {/* Today's interviews — if any */}
      {briefingData.todaysInterviews.length > 0 && (
        <section aria-label="Today's interviews">
          <SectionHeader
            title="Interviews Today"
            count={briefingData.todaysInterviews.length}
            color="#F0A050"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "10px",
            }}
          >
            {briefingData.todaysInterviews.map((interview) => (
              <article
                key={interview.id}
                aria-label={`Interview: ${interview.companyName ?? "Unknown"} — ${interview.round ?? "Interview"}`}
                style={{
                  background: "rgba(240, 160, 80, 0.06)",
                  border: "1px solid rgba(240, 160, 80, 0.2)",
                  borderRadius: "4px",
                  padding: "12px",
                  fontFamily: "IBM Plex Mono, monospace",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "8px",
                    color: "#F0A050",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  {new Date(interview.scheduledAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "#FDF3E8",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {interview.companyName ?? "Unknown Company"}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "#C4925A",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {interview.round ?? interview.format ?? "Interview"} —{" "}
                  {interview.role}
                </span>
                {interview.location && (
                  <span
                    style={{
                      fontSize: "9px",
                      color: "#7A5B35",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {interview.location}
                  </span>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────
  return (
    <RingPulseController>
      <UndoBarProvider>
      {/* Full-screen Situation Room scene */}
      <SituationRoomScene
        stats={tickerStats}
        characterSlot={characterSlot}
        tableSlot={tableSlot}
      />

      {/* COO Dialogue Panel — slides in from right */}
      {dialogueOpen && (
        <div
          role="complementary"
          aria-label="COO operations briefing panel"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(420px, 90vw)",
            zIndex: 50,
            animation: "coo-panel-slide-in 0.25s ease-out forwards",
          }}
        >
          <COODialoguePanel
            isOpen={dialogueOpen}
            onClose={handleCloseDialogue}
            onStatusChange={handleCooStatusChange}
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
            animation: "coo-backdrop-fade-in 0.2s ease-out forwards",
          }}
        />
      )}

      {/* Panel animations — with reduced motion fallbacks */}
      <style>{`
        @keyframes coo-panel-slide-in {
          from { transform: translateX(100%); opacity: 0.8; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes coo-backdrop-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes coo-panel-slide-in {
            from { opacity: 0.8; }
            to { opacity: 1; }
          }
          @keyframes coo-backdrop-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        }
      `}</style>
      </UndoBarProvider>
    </RingPulseController>
  );
}


