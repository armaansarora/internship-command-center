"use client";

import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSoundEngine } from "./SoundProvider";

export interface ToastNotification {
  id: string;
  title: string;
  body: string;
  priority: "critical" | "high" | "medium" | "low";
  sourceAgent?: string | null;
  createdAt: string;
  floorUrl?: string;
}

interface NotificationToastProps {
  notification: ToastNotification;
  onDismiss: (id: string) => void;
  index: number; // 0 = newest/bottom, stacks upward
}

const AGENT_ICONS: Record<string, string> = {
  CRO: "◈",
  COO: "◎",
  CNO: "◉",
  CIO: "◇",
  CMO: "◆",
  CPO: "◊",
  CEO: "✦",
};

const PRIORITY_COLORS = {
  critical: { bg: "rgba(220, 60, 60, 0.12)", border: "rgba(220, 60, 60, 0.5)", accent: "rgba(220, 60, 60, 0.9)" },
  high:     { bg: "rgba(201, 168, 76, 0.1)",  border: "rgba(201, 168, 76, 0.5)", accent: "rgba(201, 168, 76, 0.9)" },
  medium:   { bg: "rgba(26, 26, 46, 0.85)",   border: "rgba(30, 144, 255, 0.3)", accent: "rgba(30, 144, 255, 0.8)" },
  low:      { bg: "rgba(26, 26, 46, 0.75)",   border: "rgba(30, 144, 255, 0.15)", accent: "rgba(74, 122, 155, 0.7)" },
};

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return "";
  }
}

export function NotificationToast({ notification, onDismiss, index }: NotificationToastProps): JSX.Element {
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const { playSound } = useSoundEngine();

  const colors = PRIORITY_COLORS[notification.priority] ?? PRIORITY_COLORS.medium;
  const icon = notification.sourceAgent ? (AGENT_ICONS[notification.sourceAgent] ?? "◎") : "◎";

  useEffect(() => {
    // Slide in
    const t = setTimeout(() => setVisible(true), 20);
    playSound("notification");
    return () => clearTimeout(t);
  }, [playSound]);

  function handleDismiss() {
    setExiting(true);
    setTimeout(() => onDismiss(notification.id), 250);
  }

  const translateY = index * -88; // stack upward

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      aria-label={`${notification.priority} notification: ${notification.title}`}
      style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        width: "min(340px, 90vw)",
        transform: `translateX(${(visible && !exiting) ? "0" : "120%"}) translateY(${translateY}px)`,
        transition: reducedMotion
          ? "none"
          : `transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease`,
        opacity: visible && !exiting ? 1 : 0,
        background: colors.bg,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${colors.border}`,
        borderRadius: "8px",
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px ${colors.border}`,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        {/* Agent icon */}
        <span
          aria-hidden="true"
          style={{
            fontSize: "14px",
            color: colors.accent,
            flexShrink: 0,
            lineHeight: 1.3,
          }}
        >
          {icon}
        </span>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "12px",
              fontFamily: "'Satoshi', system-ui, sans-serif",
              fontWeight: 600,
              color: "rgba(232, 244, 253, 0.95)",
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {notification.title}
          </div>
          {notification.sourceAgent && (
            <div
              style={{
                fontSize: "9px",
                fontFamily: "JetBrains Mono, IBM Plex Mono, monospace",
                color: colors.accent,
                letterSpacing: "0.08em",
                marginTop: "2px",
              }}
            >
              {notification.sourceAgent.toUpperCase()} · {timeAgo(notification.createdAt)}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "rgba(74, 122, 155, 0.7)",
            fontSize: "14px",
            lineHeight: 1,
            padding: "0",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          fontSize: "12px",
          fontFamily: "'Satoshi', system-ui, sans-serif",
          color: "rgba(168, 200, 230, 0.85)",
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {notification.body}
      </div>

      {/* Auto-dismiss progress bar */}
      <div
        aria-hidden="true"
        style={{
          height: "2px",
          borderRadius: "1px",
          background: "rgba(255, 255, 255, 0.08)",
          overflow: "hidden",
          marginTop: "2px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: "100%",
            background: colors.accent,
            transformOrigin: "left",
            animation: reducedMotion ? "none" : "notif-progress 8s linear forwards",
          }}
        />
      </div>

      <style>{`
        @keyframes notif-progress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
