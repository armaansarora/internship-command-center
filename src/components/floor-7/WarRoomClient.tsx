"use client";

import type { JSX } from "react";
import { useState, useCallback, useMemo, useTransition } from "react";
import dynamic from "next/dynamic";
import type { Application } from "@/db/schema";
import type { PipelineStats } from "@/lib/db/queries/applications-rest";
import { WarRoomScene } from "./WarRoomScene";
import { WarTable } from "./war-table/WarTable";
import { StampBar } from "./war-table/StampBar";
import { EmptyWarTable } from "./war-table/EmptyWarTable";
import { ApplicationSearch } from "./crud/ApplicationSearch";
import { CROCharacter } from "./cro-character/CROCharacter";
import { CRODialoguePanel } from "./cro-character/CRODialoguePanel";
import {
  CROWhiteboard,
  type WhiteboardFinding,
  type WhiteboardMemory,
} from "./cro-character/CROWhiteboard";
import type { TargetProfile } from "@/lib/agents/cro/target-profile";
import { useSoundEngine } from "@/components/world/SoundProvider";

// 721 LOC modal — code-split so the initial route bundle doesn't carry it.
const ApplicationModal = dynamic(
  () => import("./crud/ApplicationModal").then((m) => m.ApplicationModal),
  { ssr: false }
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface WarRoomClientProps {
  applications: Application[];
  stats: PipelineStats;
  whiteboard?: {
    targetProfile: TargetProfile | null;
    topDiscovered: WhiteboardFinding[];
    latestMemory: WhiteboardMemory | null;
  };
  onMoveApplication: (
    id: string,
    newStatus: string,
    newPosition: string
  ) => Promise<void>;
  onDeleteApplication: (id: string) => Promise<void>;
  onCreateApplication: (formData: FormData) => Promise<void>;
  onUpdateApplication: (id: string, formData: FormData) => Promise<void>;
  /** Batch-stamp action: bulk move selected applications to a new status. */
  onStampApplications?: (
    ids: string[],
    newStatus: string
  ) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function WarRoomClient({
  applications,
  stats,
  whiteboard,
  onMoveApplication,
  onDeleteApplication,
  onCreateApplication,
  onUpdateApplication,
  onStampApplications,
}: WarRoomClientProps): JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [croStatus, setCroStatus] = useState<"idle" | "thinking" | "talking">("idle");
  const [selection, setSelection] = useState<Set<string>>(() => new Set());
  const [stampPending, setStampPending] = useState(false);
  const [, startTransition] = useTransition();
  const { playSound } = useSoundEngine();

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleAddNew = useCallback(() => {
    setEditingApp(null);
    setModalOpen(true);
  }, []);

  const handleEditApplication = useCallback((app: Application) => {
    setEditingApp(app);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingApp(null);
  }, []);

  const handleModalSubmit = useCallback(
    async (formData: FormData) => {
      if (editingApp) {
        await onUpdateApplication(editingApp.id, formData);
      } else {
        await onCreateApplication(formData);
      }
      startTransition(() => {
        setModalOpen(false);
        setEditingApp(null);
      });
    },
    [editingApp, onCreateApplication, onUpdateApplication]
  );

  const handleOpenDialogue = useCallback(() => {
    setDialogueOpen(true);
  }, []);

  const handleCloseDialogue = useCallback(() => {
    setDialogueOpen(false);
    setCroStatus("idle");
  }, []);

  const handleCROStatusChange = useCallback((status: "idle" | "thinking" | "talking") => {
    setCroStatus(status);
  }, []);

  // ── Selection & batch stamp ──────────────────────────────────────────
  const handleToggleSelection = useCallback(
    (id: string, event: { shiftKey: boolean }) => {
      setSelection((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        // shiftKey is reserved for future range-select; single-toggle behavior
        // covers the primary flow and remains predictable.
        void event;
        return next;
      });
    },
    []
  );

  const handleClearSelection = useCallback(() => {
    setSelection(new Set());
  }, []);

  const handleStamp = useCallback(
    async (newStatus: string) => {
      const ids = [...selection];
      if (ids.length === 0 || !onStampApplications) return;
      setStampPending(true);
      try {
        playSound("bell-ring");
        await onStampApplications(ids, newStatus);
        setSelection(new Set());
      } finally {
        setStampPending(false);
      }
    },
    [selection, onStampApplications, playSound]
  );

  // ── Derived data ─────────────────────────────────────────────────────
  const filteredApplications = useMemo(() => {
    let filtered = applications;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (app) =>
          (app.companyName?.toLowerCase().includes(q) ?? false) ||
          app.role.toLowerCase().includes(q) ||
          (app.location?.toLowerCase().includes(q) ?? false) ||
          (app.sector?.toLowerCase().includes(q) ?? false)
      );
    }

    if (statusFilters.length > 0) {
      filtered = filtered.filter((app) => statusFilters.includes(app.status));
    }

    return filtered;
  }, [applications, searchQuery, statusFilters]);

  // Derive WarRoomStats from PipelineStats for the scene ticker
  const tickerStats = useMemo(
    () => ({
      total: stats.total,
      screening: stats.screening,
      interviewing: stats.interviewing,
      offers: stats.offers,
      stale: stats.staleCount,
    }),
    [stats]
  );

  // ── Character slot — CRO character + whiteboard ──────────────────────
  const characterSlot = (
    <div
      className="flex items-end justify-center gap-6 w-full h-full px-6 pb-4"
      style={{ maxWidth: "900px", margin: "0 auto" }}
    >
      {/* CRO character silhouette — left side */}
      <div className="flex-shrink-0">
        <CROCharacter
          onConversationOpen={handleOpenDialogue}
          dialogueOpen={dialogueOpen}
          dialogueStatus={croStatus}
        />
      </div>

      {/* CRO whiteboard — right side of character area */}
      <div className="flex-1 min-w-0 max-w-sm">
        <CROWhiteboard
          stats={stats}
          targetProfile={whiteboard?.targetProfile ?? null}
          topDiscovered={whiteboard?.topDiscovered ?? []}
          latestMemory={whiteboard?.latestMemory ?? null}
        />
      </div>
    </div>
  );

  // ── Table slot — search + kanban ─────────────────────────────────────
  const tableSlot = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        padding: "16px 20px",
        gap: "12px",
      }}
    >
      {/* Top bar: Search + Add button */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <ApplicationSearch
            onSearch={setSearchQuery}
            onFilterStatus={setStatusFilters}
            totalCount={applications.length}
          />
        </div>

        <button
          type="button"
          onClick={handleAddNew}
          aria-label="Add new application"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 16px",
            background: "rgba(30, 144, 255, 0.12)",
            border: "1px solid rgba(30, 144, 255, 0.4)",
            borderRadius: "2px",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "#1E90FF",
            cursor: "pointer",
            textTransform: "uppercase",
            transition: "background 0.15s ease, border-color 0.15s ease",
            outline: "none",
            flexShrink: 0,
            whiteSpace: "nowrap",
            height: "36px",
            alignSelf: "flex-start",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "rgba(30, 144, 255, 0.22)";
            el.style.borderColor = "rgba(30, 144, 255, 0.7)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "rgba(30, 144, 255, 0.12)";
            el.style.borderColor = "rgba(30, 144, 255, 0.4)";
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLButtonElement).style.outline =
              "2px solid rgba(30, 144, 255, 0.5)";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLButtonElement).style.outline = "none";
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 1V9M1 5H9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          NEW TARGET
        </button>
      </div>

      {/* Kanban board OR empty-state invitation */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {applications.length === 0 ? (
          <EmptyWarTable
            onSummonCRO={handleOpenDialogue}
            hasTargetProfile={Boolean(whiteboard?.targetProfile)}
          />
        ) : (
          <WarTable
            applications={filteredApplications}
            selection={selection}
            onMoveApplication={onMoveApplication}
            onDeleteApplication={onDeleteApplication}
            onEditApplication={handleEditApplication}
            onToggleSelection={
              onStampApplications ? handleToggleSelection : undefined
            }
          />
        )}
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <>
      {/* Full-screen War Room scene with character + table slots */}
      <WarRoomScene
        stats={tickerStats}
        characterSlot={characterSlot}
        tableSlot={tableSlot}
      />

      {/* CRO Dialogue Panel — slides in from right */}
      {dialogueOpen && (
        <div
          role="complementary"
          aria-label="CRO conversation panel"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(420px, 90vw)",
            zIndex: 50,
            animation: "cro-panel-slide-in 0.25s ease-out forwards",
          }}
        >
          <CRODialoguePanel
            isOpen={dialogueOpen}
            onClose={handleCloseDialogue}
            onStatusChange={handleCROStatusChange}
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
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            zIndex: 49,
            animation: "cro-backdrop-fade-in 0.2s ease-out forwards",
          }}
        />
      )}

      {/* Floating stamp bar — appears only when there's a selection */}
      {onStampApplications && (
        <StampBar
          selectionCount={selection.size}
          onStamp={handleStamp}
          onClear={handleClearSelection}
          disabled={stampPending}
        />
      )}

      {/* Create/Edit Modal */}
      <ApplicationModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        application={editingApp}
      />

      {/* Panel animations */}
      <style>{`
        @keyframes cro-panel-slide-in {
          from { transform: translateX(100%); opacity: 0.8; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes cro-backdrop-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes cro-panel-slide-in {
            from { opacity: 0.8; }
            to { opacity: 1; }
          }
          @keyframes cro-backdrop-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        }
      `}</style>
    </>
  );
}
