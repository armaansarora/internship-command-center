"use client";

import type { JSX } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Application } from "@/db/schema";

interface ApplicationCardProps {
  application: Application;
  isOverlay?: boolean;
  isSelected?: boolean;
  onEdit?: (app: Application) => void;
  onDelete?: (id: string) => void;
  onToggleSelection?: (id: string, event: { shiftKey: boolean }) => void;
}

type ClassificationStamp =
  | "PRIORITY TARGET"
  | "FOLLOW-UP REQUIRED"
  | "ACTIVE OPERATION"
  | "MISSION SUCCESS"
  | "ARCHIVED";

function getClassificationStamp(app: Application): ClassificationStamp {
  if (app.status === "offer" || app.status === "accepted") return "MISSION SUCCESS";
  if (app.status === "rejected" || app.status === "withdrawn") return "ARCHIVED";
  if (app.status === "interview_scheduled" || app.status === "interviewing") return "ACTIVE OPERATION";
  if (app.tier !== null && app.tier <= 2) return "PRIORITY TARGET";
  if (app.lastActivityAt) {
    const daysSince = (Date.now() - new Date(app.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 7) return "FOLLOW-UP REQUIRED";
  }
  return "PRIORITY TARGET";
}

function getStampColor(stamp: ClassificationStamp): string {
  switch (stamp) {
    case "MISSION SUCCESS": return "#00FF87";
    case "ARCHIVED": return "#4A7A9B";
    case "ACTIVE OPERATION": return "#F59E0B";
    case "FOLLOW-UP REQUIRED": return "#F59E0B";
    case "PRIORITY TARGET": return "#9B59B6";
    default: return "#4A7A9B";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "discovered": return "#4A7A9B";
    case "applied": return "#1E90FF";
    case "screening": return "#00D4FF";
    case "interview_scheduled":
    case "interviewing": return "#F59E0B";
    case "under_review": return "#F59E0B";
    case "offer": return "#00FF87";
    case "accepted": return "#00FF87";
    case "rejected": return "#DC3C3C";
    case "withdrawn": return "#4A7A9B";
    default: return "#4A7A9B";
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    discovered: "RECON",
    applied: "SUBMITTED",
    screening: "SCREENING",
    interview_scheduled: "INTERVIEW",
    interviewing: "ACTIVE",
    under_review: "REVIEW",
    offer: "OFFER",
    accepted: "ACCEPTED",
    rejected: "REJECTED",
    withdrawn: "WITHDRAWN",
  };
  return labels[status] ?? status.toUpperCase();
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isStale(lastActivityAt: Date | string | null): boolean {
  if (!lastActivityAt) return false;
  const daysSince = (Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > 14;
}

export function ApplicationCard({
  application,
  isOverlay = false,
  isSelected = false,
  onEdit,
  onDelete,
  onToggleSelection,
}: ApplicationCardProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: application.id,
    data: { application },
    disabled: isOverlay,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };

  const stamp = getClassificationStamp(application);
  const stampColor = getStampColor(stamp);
  const statusColor = getStatusColor(application.status);
  const stale = isStale(application.lastActivityAt);
  const companyDisplay = application.companyName ?? "UNKNOWN TARGET";

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      className="application-card group"
      role="article"
      aria-label={`${companyDisplay} — ${application.role}`}
      data-dragging={isDragging}
      data-overlay={isOverlay}
    >
      {/* Selection checkbox — positioned absolutely so dnd-kit's drag listeners
          on the outer div don't swallow the click. */}
      {onToggleSelection && !isOverlay && (
        <button
          type="button"
          aria-label={
            isSelected
              ? `Deselect ${companyDisplay} — ${application.role}`
              : `Select ${companyDisplay} — ${application.role} for batch stamp`
          }
          aria-pressed={isSelected}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(application.id, { shiftKey: e.shiftKey });
          }}
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            width: "18px",
            height: "18px",
            borderRadius: "2px",
            border: `1px solid ${isSelected ? "#C9A84C" : "rgba(127, 179, 211, 0.35)"}`,
            background: isSelected
              ? "rgba(201, 168, 76, 0.9)"
              : "rgba(10, 22, 40, 0.4)",
            cursor: "pointer",
            zIndex: 5,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isSelected ? "#1A1A2E" : "transparent",
            fontSize: "12px",
            lineHeight: 1,
            transition: "background 0.15s ease, border-color 0.15s ease",
          }}
        >
          {isSelected ? "✓" : ""}
        </button>
      )}

      {/* Outer card container */}
      <div
        style={{
          position: "relative",
          background: isSelected
            ? "rgba(201, 168, 76, 0.08)"
            : "rgba(15, 31, 61, 0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: `1px solid ${
            isSelected
              ? "rgba(201, 168, 76, 0.55)"
              : isDragging || isOverlay
                ? "rgba(30, 144, 255, 0.5)"
                : "rgba(30, 58, 95, 1)"
          }`,
          borderRadius: "2px",
          padding: "12px",
          cursor: isDragging ? "grabbing" : "grab",
          transform: isDragging || isOverlay ? "scale(1.04) rotate(-1.5deg)" : undefined,
          boxShadow: isDragging || isOverlay
            ? "0 16px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(30, 144, 255, 0.2)"
            : isSelected
              ? "0 2px 10px rgba(201, 168, 76, 0.25)"
              : "0 2px 8px rgba(0, 0, 0, 0.3)",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease, background 0.15s ease",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            const el = e.currentTarget as HTMLDivElement;
            el.style.borderColor = "rgba(30, 144, 255, 0.4)";
            el.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.4), 0 0 12px rgba(30, 144, 255, 0.1)";
            el.style.transform = "scale(1.02)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            const el = e.currentTarget as HTMLDivElement;
            el.style.borderColor = "rgba(30, 58, 95, 1)";
            el.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3)";
            el.style.transform = "scale(1)";
          }
        }}
      >
        {/* Corner bracket decorations — top-left */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "4px",
            left: "4px",
            width: "8px",
            height: "8px",
            borderTop: "1px solid rgba(30, 144, 255, 0.4)",
            borderLeft: "1px solid rgba(30, 144, 255, 0.4)",
            pointerEvents: "none",
          }}
        />
        {/* Corner bracket decorations — top-right */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "4px",
            right: "4px",
            width: "8px",
            height: "8px",
            borderTop: "1px solid rgba(30, 144, 255, 0.4)",
            borderRight: "1px solid rgba(30, 144, 255, 0.4)",
            pointerEvents: "none",
          }}
        />
        {/* Corner bracket decorations — bottom-left */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "4px",
            left: "4px",
            width: "8px",
            height: "8px",
            borderBottom: "1px solid rgba(30, 144, 255, 0.4)",
            borderLeft: "1px solid rgba(30, 144, 255, 0.4)",
            pointerEvents: "none",
          }}
        />
        {/* Corner bracket decorations — bottom-right */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: "4px",
            right: "4px",
            width: "8px",
            height: "8px",
            borderBottom: "1px solid rgba(30, 144, 255, 0.4)",
            borderRight: "1px solid rgba(30, 144, 255, 0.4)",
            pointerEvents: "none",
          }}
        />

        {/* Company name */}
        <div
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "13px",
            fontWeight: 700,
            color: "#E8F4FD",
            letterSpacing: "0.02em",
            marginBottom: "3px",
            paddingRight: "40px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {companyDisplay}
        </div>

        {/* Role */}
        <div
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontSize: "11px",
            color: "#7FB3D3",
            marginBottom: "8px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {application.role}
        </div>

        {/* Status badge + stale indicator row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "8px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: "16px",
              padding: "0 6px",
              background: `${statusColor}18`,
              border: `1px solid ${statusColor}55`,
              borderRadius: "2px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: statusColor,
            }}
          >
            {getStatusLabel(application.status)}
          </span>

          {stale && (
            <span
              aria-label="Stale — no activity in 14+ days"
              title="No activity in 14+ days"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                height: "16px",
                padding: "0 5px",
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "2px",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "9px",
                color: "#F59E0B",
                animation: "stale-pulse 2s ease-in-out infinite",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: "#F59E0B",
                  animation: "stale-dot 2s ease-in-out infinite",
                }}
              />
              STALE
            </span>
          )}

          {(application.tier !== null && application.tier !== undefined) && (
            <span
              aria-label={`Tier ${application.tier}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "16px",
                padding: "0 5px",
                background: "rgba(155, 89, 182, 0.12)",
                border: "1px solid rgba(155, 89, 182, 0.3)",
                borderRadius: "2px",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "9px",
                color: "#9B59B6",
              }}
            >
              T{application.tier}
            </span>
          )}
        </div>

        {/* Applied date */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "6px",
          }}
        >
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "9px",
              color: "#4A7A9B",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            FILED
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "9px",
              color: "#7FB3D3",
            }}
          >
            {formatDate(application.appliedAt)}
          </span>

          {application.lastActivityAt && (
            <>
              <span
                aria-hidden="true"
                style={{ color: "#1E3A5F", fontSize: "9px" }}
              >
                ·
              </span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "9px",
                  color: "#4A7A9B",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                LAST ACT
              </span>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "9px",
                  color: stale ? "#F59E0B" : "#7FB3D3",
                }}
              >
                {formatDate(application.lastActivityAt)}
              </span>
            </>
          )}
        </div>

        {/* Classification stamp */}
        <div
          aria-label={`Classification: ${stamp}`}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "8px",
            fontWeight: 700,
            letterSpacing: "0.15em",
            color: `${stampColor}66`,
            textTransform: "uppercase",
            borderTop: `1px solid rgba(30, 58, 95, 0.5)`,
            paddingTop: "6px",
            marginTop: "2px",
          }}
        >
          ▸ {stamp}
        </div>

        {/* Quick action buttons — visible on hover only */}
        {!isOverlay && (onEdit || onDelete) && (
          <div
            className="card-actions"
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              display: "flex",
              gap: "4px",
              opacity: 0,
              transition: "opacity 0.15s ease",
            }}
          >
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(application);
                }}
                aria-label={`Edit ${companyDisplay} application`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "22px",
                  height: "22px",
                  background: "rgba(30, 144, 255, 0.1)",
                  border: "1px solid rgba(30, 144, 255, 0.3)",
                  borderRadius: "2px",
                  cursor: "pointer",
                  color: "#1E90FF",
                  padding: 0,
                  outline: "none",
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.outline = "2px solid #1E90FF";
                  (e.currentTarget as HTMLButtonElement).style.outlineOffset = "2px";
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.outline = "none";
                }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                  <path
                    d="M7.5 1.5L9.5 3.5L3.5 9.5H1.5V7.5L7.5 1.5Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(application.id);
                }}
                aria-label={`Archive ${companyDisplay} application`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "22px",
                  height: "22px",
                  background: "rgba(220, 60, 60, 0.08)",
                  border: "1px solid rgba(220, 60, 60, 0.2)",
                  borderRadius: "2px",
                  cursor: "pointer",
                  color: "#DC3C3C",
                  padding: 0,
                  outline: "none",
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.outline = "2px solid #DC3C3C";
                  (e.currentTarget as HTMLButtonElement).style.outlineOffset = "2px";
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.outline = "none";
                }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                  <path d="M2 3H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <path
                    d="M4 3V2H7V3M3.5 3L4 9H7L7.5 3"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        .application-card:hover .card-actions {
          opacity: 1 !important;
        }
        @keyframes stale-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes stale-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes stale-pulse { 0%, 100% { opacity: 1; } }
          @keyframes stale-dot { 0%, 100% { opacity: 1; } }
        }
      `}</style>
    </div>
  );
}
