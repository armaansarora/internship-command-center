"use client";

import type { JSX } from "react";

interface ColumnHeaderProps {
  tacticalName: string;
  color: string;
  count: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ColumnHeader({
  tacticalName,
  color,
  count,
  isCollapsed,
  onToggleCollapse,
}: ColumnHeaderProps): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderBottom: isCollapsed ? "none" : `1px solid rgba(30, 58, 95, 0.6)`,
        position: "relative",
      }}
    >
      {/* Left color band accent */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "3px",
          background: color,
          borderRadius: "2px 0 0 2px",
          opacity: 0.9,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginLeft: "8px",
        }}
      >
        {/* Tactical column name */}
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: color,
          }}
        >
          {tacticalName}
        </span>

        {/* Count badge */}
        <span
          aria-label={`${count} application${count !== 1 ? "s" : ""}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "20px",
            height: "18px",
            padding: "0 5px",
            background: `${color}22`,
            border: `1px solid ${color}44`,
            borderRadius: "2px",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "10px",
            fontWeight: 700,
            color: color,
            lineHeight: 1,
          }}
        >
          {count}
        </span>
      </div>

      {/* Collapse/expand toggle */}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? `Expand ${tacticalName} column` : `Collapse ${tacticalName} column`}
        aria-expanded={!isCollapsed}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "20px",
          height: "20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "rgba(126, 179, 211, 0.5)",
          borderRadius: "2px",
          padding: 0,
          transition: "color 0.15s ease, background 0.15s ease",
          outline: "none",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = color;
          (e.currentTarget as HTMLButtonElement).style.background = `${color}18`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(126, 179, 211, 0.5)";
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
        onFocus={(e) => {
          (e.currentTarget as HTMLButtonElement).style.outline = `2px solid ${color}`;
          (e.currentTarget as HTMLButtonElement).style.outlineOffset = "2px";
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLButtonElement).style.outline = "none";
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          style={{
            transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          <path
            d="M2 4L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
