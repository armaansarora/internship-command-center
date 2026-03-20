"use client";

import type { JSX } from "react";
import { useState, useCallback, useMemo, useTransition } from "react";
import type { Application } from "@/db/schema";
import { WarTable } from "./war-table/WarTable";
import { ApplicationModal } from "./crud/ApplicationModal";
import { ApplicationSearch } from "./crud/ApplicationSearch";

interface WarRoomClientProps {
  applications: Application[];
  onMoveApplication: (id: string, newStatus: string, newPosition: string) => Promise<void>;
  onDeleteApplication: (id: string) => Promise<void>;
  onCreateApplication: (formData: FormData) => Promise<void>;
  onUpdateApplication: (id: string, formData: FormData) => Promise<void>;
}

export function WarRoomClient({
  applications,
  onMoveApplication,
  onDeleteApplication,
  onCreateApplication,
  onUpdateApplication,
}: WarRoomClientProps): JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [, startTransition] = useTransition();

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

  // Filter applications based on search + status filters
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        gap: "16px",
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

        {/* Add new application button */}
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
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
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

      {/* Kanban board */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <WarTable
          applications={filteredApplications}
          onMoveApplication={onMoveApplication}
          onDeleteApplication={onDeleteApplication}
          onEditApplication={handleEditApplication}
        />
      </div>

      {/* Create/Edit Modal */}
      <ApplicationModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        application={editingApp}
      />
    </div>
  );
}
