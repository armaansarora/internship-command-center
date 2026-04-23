"use client";

import type { JSX } from "react";
import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Application } from "@/db/schema";
import { ApplicationCard } from "./ApplicationCard";
import { ColumnHeader } from "./ColumnHeader";

interface PipelineColumnProps {
  columnId: string;
  tacticalName: string;
  color: string;
  applications: Application[];
  isCollapsed?: boolean;
  selection?: Set<string>;
  onEdit?: (app: Application) => void;
  onDelete?: (id: string) => void;
  onToggleSelection?: (id: string, event: { shiftKey: boolean }) => void;
}

export function PipelineColumn({
  columnId,
  tacticalName,
  color,
  applications,
  isCollapsed: initialCollapsed = false,
  selection,
  onEdit,
  onDelete,
  onToggleSelection,
}: PipelineColumnProps): JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: { columnId },
  });

  const itemIds = applications.map((a) => a.id);

  return (
    <div
      aria-label={`${tacticalName} column, ${applications.length} application${applications.length !== 1 ? "s" : ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: isCollapsed ? "72px" : "280px",
        width: isCollapsed ? "72px" : "280px",
        maxHeight: "calc(100vh - 180px)",
        background: isOver
          ? "rgba(30, 144, 255, 0.06)"
          : "rgba(15, 31, 61, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${isOver ? "rgba(30, 144, 255, 0.3)" : "rgba(30, 144, 255, 0.15)"}`,
        borderRadius: "2px",
        flexShrink: 0,
        transition: "min-width 0.25s ease, width 0.25s ease, border-color 0.15s ease, background 0.15s ease",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Left color band */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "3px",
          background: `linear-gradient(to bottom, ${color}, ${color}44)`,
          opacity: isOver ? 1 : 0.6,
          transition: "opacity 0.15s ease",
        }}
      />

      {/* Column header */}
      <div style={{ marginLeft: "3px" }}>
        <ColumnHeader
          tacticalName={tacticalName}
          color={color}
          count={applications.length}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        />
      </div>

      {/* Collapsed view — vertical text + count */}
      {isCollapsed ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 4px",
            gap: "8px",
            cursor: "pointer",
          }}
          onClick={() => setIsCollapsed(false)}
          role="button"
          tabIndex={0}
          aria-label={`Expand ${tacticalName} column`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsCollapsed(false);
            }
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "9px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              color: color,
              textTransform: "uppercase",
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              transform: "rotate(180deg)",
            }}
          >
            {tacticalName}
          </span>
        </div>
      ) : (
        /* Scrollable card area */
        <div
          ref={setNodeRef}
          role="list"
          aria-label={`${tacticalName} applications`}
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            minHeight: "80px",
            scrollbarWidth: "thin",
            scrollbarColor: `${color}33 transparent`,
          }}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {applications.length === 0 ? (
              <div
                aria-label="Empty column — drop applications here"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "80px",
                  border: `1px dashed ${color}33`,
                  borderRadius: "2px",
                  padding: "20px 12px",
                  gap: "6px",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{ fontSize: "16px", opacity: 0.3 }}
                >
                  ◎
                </span>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "9px",
                    color: "#4A7A9B",
                    letterSpacing: "0.08em",
                    textAlign: "center",
                  }}
                >
                  NO INTEL
                </span>
              </div>
            ) : (
              applications.map((app) => (
                <div key={app.id} role="listitem">
                  <ApplicationCard
                    application={app}
                    isSelected={selection?.has(app.id) ?? false}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleSelection={onToggleSelection}
                  />
                </div>
              ))
            )}
          </SortableContext>
        </div>
      )}
    </div>
  );
}
