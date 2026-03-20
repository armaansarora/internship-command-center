"use client";

import type { JSX } from "react";
import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import type { Application } from "@/db/schema";
import { ApplicationCard } from "./ApplicationCard";
import { PipelineColumn } from "./PipelineColumn";
import { PIPELINE_COLUMNS, getColumnForStatus, getPrimaryStatusForColumn } from "./pipeline-config";
import type { PipelineColumnId } from "./pipeline-config";

interface WarTableProps {
  applications: Application[];
  onMoveApplication: (id: string, newStatus: string, newPosition: string) => Promise<void>;
  onDeleteApplication: (id: string) => Promise<void>;
  onEditApplication: (app: Application) => void;
}

// Lexicographic position helpers — simple midpoint approach
function lexMidpoint(a: string | null, b: string | null): string {
  const start = a ?? "aaaaaa";
  const end = b ?? "zzzzzz";

  // Simple character midpoint for ASCII range
  let result = "";
  let carry = 0;
  const maxLen = Math.max(start.length, end.length);

  for (let i = 0; i < maxLen; i++) {
    const aChar = i < start.length ? start.charCodeAt(i) : 96;
    const bChar = i < end.length ? end.charCodeAt(i) : 123;
    const mid = Math.floor((aChar + bChar + carry * 256) / 2);
    carry = (aChar + bChar + carry * 256) % 2;
    result += String.fromCharCode(Math.max(97, Math.min(122, mid)));
  }

  if (carry) result += "n";
  return result || "mmmmmm";
}

function generatePositionBetween(
  apps: Application[],
  insertIndex: number
): string {
  const sorted = [...apps].sort((a, b) => {
    const pa = a.position ?? "mmmmmm";
    const pb = b.position ?? "mmmmmm";
    return pa < pb ? -1 : pa > pb ? 1 : 0;
  });

  const before = sorted[insertIndex - 1]?.position ?? null;
  const after = sorted[insertIndex]?.position ?? null;

  return lexMidpoint(before, after);
}

export function WarTable({
  applications: initialApplications,
  onMoveApplication,
  onDeleteApplication,
  onEditApplication,
}: WarTableProps): JSX.Element {
  // Local optimistic state
  const [localApplications, setLocalApplications] = useState<Application[]>(initialApplications);
  const [activeApplication, setActiveApplication] = useState<Application | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Sync with parent when props change (server revalidation)
  // We use a ref-based approach to avoid re-setting on every render
  const [lastInitial, setLastInitial] = useState(initialApplications);
  if (initialApplications !== lastInitial) {
    setLastInitial(initialApplications);
    setLocalApplications(initialApplications);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Organize applications into columns
  const columnApplications = useMemo(() => {
    const map = new Map<PipelineColumnId, Application[]>();
    for (const col of PIPELINE_COLUMNS) {
      map.set(col.id, []);
    }
    for (const app of localApplications) {
      const colId = getColumnForStatus(app.status);
      const bucket = map.get(colId) ?? [];
      bucket.push(app);
      map.set(colId, bucket);
    }
    // Sort each column by position
    for (const [colId, apps] of map) {
      map.set(
        colId,
        apps.sort((a, b) => {
          const pa = a.position ?? "mmmmmm";
          const pb = b.position ?? "mmmmmm";
          return pa < pb ? -1 : pa > pb ? 1 : 0;
        })
      );
    }
    return map;
  }, [localApplications]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const app = localApplications.find((a) => a.id === event.active.id);
      if (app) setActiveApplication(app);
    },
    [localApplications]
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id?.toString() ?? null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveApplication(null);
      setOverId(null);

      const { active, over } = event;
      if (!over) return;

      const draggedApp = localApplications.find((a) => a.id === active.id);
      if (!draggedApp) return;

      const activeId = active.id.toString();
      const overId = over.id.toString();

      // Determine target column
      let targetColumnId: PipelineColumnId | null = null;
      let targetAppId: string | null = null;

      // Check if dropped over a column droppable
      const isColumn = PIPELINE_COLUMNS.some((col) => col.id === overId);
      if (isColumn) {
        targetColumnId = overId as PipelineColumnId;
      } else {
        // Dropped over another card — find its column
        const targetApp = localApplications.find((a) => a.id === overId);
        if (targetApp) {
          targetColumnId = getColumnForStatus(targetApp.status);
          targetAppId = overId;
        }
      }

      if (!targetColumnId) return;

      const newStatus = getPrimaryStatusForColumn(targetColumnId);
      const sourceColumnId = getColumnForStatus(draggedApp.status);

      const targetColApps = columnApplications.get(targetColumnId) ?? [];

      // Calculate new position
      let insertIndex = targetColApps.length;
      if (targetAppId) {
        const idx = targetColApps.findIndex((a) => a.id === targetAppId);
        if (idx !== -1) insertIndex = idx;
      }

      const appsWithoutDragged = targetColApps.filter((a) => a.id !== activeId);
      const newPosition = generatePositionBetween(appsWithoutDragged, insertIndex);

      // Optimistic update
      setLocalApplications((prev) => {
        const updated = prev.map((a) =>
          a.id === activeId
            ? { ...a, status: newStatus as Application["status"], position: newPosition }
            : a
        );

        // If same column, reorder using arrayMove
        if (sourceColumnId === targetColumnId) {
          const colApps = updated
            .filter((a) => getColumnForStatus(a.status) === targetColumnId)
            .sort((a, b) => {
              const pa = a.position ?? "mmmmmm";
              const pb = b.position ?? "mmmmmm";
              return pa < pb ? -1 : 1;
            });

          const oldIndex = colApps.findIndex((a) => a.id === activeId);
          const newIndex = Math.min(insertIndex, colApps.length - 1);

          if (oldIndex !== -1 && oldIndex !== newIndex) {
            const reordered = arrayMove(colApps, oldIndex, newIndex);
            // Assign new positions based on reorder
            return updated.map((a) => {
              const ri = reordered.findIndex((r) => r.id === a.id);
              if (ri === -1) return a;
              return { ...a, position: `pos_${ri.toString().padStart(6, "0")}` };
            });
          }
        }

        return updated;
      });

      // Persist to server (fire and forget — parent handles error)
      try {
        await onMoveApplication(activeId, newStatus, newPosition);
      } catch {
        // Revert on failure
        setLocalApplications(initialApplications);
      }
    },
    [localApplications, columnApplications, onMoveApplication, initialApplications]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      // Optimistic removal
      setLocalApplications((prev) => prev.filter((a) => a.id !== id));
      try {
        await onDeleteApplication(id);
      } catch {
        setLocalApplications(initialApplications);
      }
    },
    [onDeleteApplication, initialApplications]
  );

  return (
    <div
      aria-label="War Table — Application Pipeline"
      role="region"
      style={{
        display: "flex",
        gap: "12px",
        overflowX: "auto",
        overflowY: "hidden",
        paddingBottom: "16px",
        minHeight: "400px",
        // Custom scrollbar
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(30, 144, 255, 0.2) transparent",
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements: {
            onDragStart: ({ active }) => {
              const app = localApplications.find((a) => a.id === active.id);
              if (app) {
                return `Picked up application for ${app.companyName ?? "unknown"} — ${app.role}. Use arrow keys to move between columns.`;
              }
              return "Picked up application.";
            },
            onDragOver: ({ active, over }) => {
              if (!over) return "Not over a drop area.";
              const app = localApplications.find((a) => a.id === active.id);
              const col = PIPELINE_COLUMNS.find((c) => c.id === over.id);
              if (col && app) {
                return `${app.companyName ?? "Application"} is over the ${col.tacticalName} column.`;
              }
              return `Over position ${over.id}.`;
            },
            onDragEnd: ({ active, over }) => {
              if (!over) return "Application dropped outside a column.";
              const app = localApplications.find((a) => a.id === active.id);
              const col = PIPELINE_COLUMNS.find((c) => c.id === over.id);
              if (col && app) {
                return `${app.companyName ?? "Application"} moved to ${col.tacticalName}.`;
              }
              return "Application moved.";
            },
            onDragCancel: ({ active }) => {
              const app = localApplications.find((a) => a.id === active.id);
              return `Drag cancelled. ${app?.companyName ?? "Application"} returned to original position.`;
            },
          },
        }}
      >
        {PIPELINE_COLUMNS.map((col) => (
          <PipelineColumn
            key={col.id}
            columnId={col.id}
            tacticalName={col.tacticalName}
            color={col.color}
            applications={columnApplications.get(col.id) ?? []}
            isCollapsed={col.collapsed}
            onEdit={onEditApplication}
            onDelete={handleDelete}
          />
        ))}

        <DragOverlay>
          {activeApplication ? (
            <ApplicationCard
              application={activeApplication}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
