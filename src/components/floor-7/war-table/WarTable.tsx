"use client";

import type { JSX } from "react";
import { useState, useCallback, useMemo, useOptimistic, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
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

// Optimistic action shapes — applied transactionally to the React 19 useOptimistic state
type OptimisticAction =
  | {
      type: "move";
      id: string;
      newStatus: Application["status"];
      newPosition: string;
      sameColumnReorder?: { columnId: PipelineColumnId; insertIndex: number };
    }
  | { type: "delete"; id: string };

function reduceOptimistic(
  state: Application[],
  action: OptimisticAction
): Application[] {
  if (action.type === "delete") {
    return state.filter((a) => a.id !== action.id);
  }

  // type === "move"
  const updated = state.map((a) =>
    a.id === action.id
      ? { ...a, status: action.newStatus, position: action.newPosition }
      : a
  );

  // Same-column reorder — assign synthetic positions so render order matches drop intent
  if (action.sameColumnReorder) {
    const { columnId, insertIndex } = action.sameColumnReorder;
    const colApps = updated
      .filter((a) => getColumnForStatus(a.status) === columnId)
      .sort((a, b) => {
        const pa = a.position ?? "mmmmmm";
        const pb = b.position ?? "mmmmmm";
        return pa < pb ? -1 : 1;
      });

    const oldIndex = colApps.findIndex((a) => a.id === action.id);
    const newIndex = Math.min(insertIndex, colApps.length - 1);

    if (oldIndex !== -1 && oldIndex !== newIndex) {
      const reordered = arrayMove(colApps, oldIndex, newIndex);
      return updated.map((a) => {
        const ri = reordered.findIndex((r) => r.id === a.id);
        if (ri === -1) return a;
        return { ...a, position: `pos_${ri.toString().padStart(6, "0")}` };
      });
    }
  }

  return updated;
}

export function WarTable({
  applications: initialApplications,
  onMoveApplication,
  onDeleteApplication,
  onEditApplication,
}: WarTableProps): JSX.Element {
  // React 19 — useOptimistic handles instant UI updates with automatic revert
  // when the surrounding transition rejects. No more manual rollback bookkeeping.
  const [optimisticApplications, applyOptimistic] = useOptimistic<
    Application[],
    OptimisticAction
  >(initialApplications, reduceOptimistic);
  const [, startTransition] = useTransition();
  const [activeApplication, setActiveApplication] = useState<Application | null>(null);
  const [, setOverId] = useState<string | null>(null);

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
    for (const app of optimisticApplications) {
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
  }, [optimisticApplications]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const app = optimisticApplications.find((a) => a.id === event.active.id);
      if (app) setActiveApplication(app);
    },
    [optimisticApplications]
  );

  const handleDragOver = useCallback(() => {
    /* reserved for hover highlights */
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveApplication(null);

      const { active, over } = event;
      if (!over) return;

      const draggedApp = optimisticApplications.find((a) => a.id === active.id);
      if (!draggedApp) return;

      const activeId = active.id.toString();
      const overIdLocal = over.id.toString();

      // Determine target column
      let targetColumnId: PipelineColumnId | null = null;
      let targetAppId: string | null = null;

      // Check if dropped over a column droppable
      const isColumn = PIPELINE_COLUMNS.some((col) => col.id === overIdLocal);
      if (isColumn) {
        targetColumnId = overIdLocal as PipelineColumnId;
      } else {
        // Dropped over another card — find its column
        const targetApp = optimisticApplications.find((a) => a.id === overIdLocal);
        if (targetApp) {
          targetColumnId = getColumnForStatus(targetApp.status);
          targetAppId = overIdLocal;
        }
      }

      if (!targetColumnId) return;

      const newStatus = getPrimaryStatusForColumn(targetColumnId) as Application["status"];
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

      // React 19 useOptimistic — must be invoked inside a transition. Optimistic
      // state lives only for this transition's lifetime: if onMoveApplication
      // throws, React reverts to initialApplications automatically.
      startTransition(async () => {
        applyOptimistic({
          type: "move",
          id: activeId,
          newStatus,
          newPosition,
          sameColumnReorder:
            sourceColumnId === targetColumnId
              ? { columnId: targetColumnId, insertIndex }
              : undefined,
        });
        await onMoveApplication(activeId, newStatus, newPosition);
      });
    },
    [
      optimisticApplications,
      columnApplications,
      onMoveApplication,
      applyOptimistic,
      startTransition,
    ]
  );

  const handleDelete = useCallback(
    (id: string) => {
      startTransition(async () => {
        applyOptimistic({ type: "delete", id });
        await onDeleteApplication(id);
      });
    },
    [onDeleteApplication, applyOptimistic, startTransition]
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
              const app = optimisticApplications.find((a) => a.id === active.id);
              if (app) {
                return `Picked up application for ${app.companyName ?? "unknown"} — ${app.role}. Use arrow keys to move between columns.`;
              }
              return "Picked up application.";
            },
            onDragOver: ({ active, over }) => {
              if (!over) return "Not over a drop area.";
              const app = optimisticApplications.find((a) => a.id === active.id);
              const col = PIPELINE_COLUMNS.find((c) => c.id === over.id);
              if (col && app) {
                return `${app.companyName ?? "Application"} is over the ${col.tacticalName} column.`;
              }
              return `Over position ${over.id}.`;
            },
            onDragEnd: ({ active, over }) => {
              if (!over) return "Application dropped outside a column.";
              const app = optimisticApplications.find((a) => a.id === active.id);
              const col = PIPELINE_COLUMNS.find((c) => c.id === over.id);
              if (col && app) {
                return `${app.companyName ?? "Application"} moved to ${col.tacticalName}.`;
              }
              return "Application moved.";
            },
            onDragCancel: ({ active }) => {
              const app = optimisticApplications.find((a) => a.id === active.id);
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
