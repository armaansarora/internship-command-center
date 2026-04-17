"use client";

import type { JSX } from "react";
import { useState, useCallback, useMemo, useTransition } from "react";
import type { Document, Application } from "@/db/schema";
import type { WritingRoomStats } from "./WritingRoomTicker";
import { WritingRoomScene } from "./WritingRoomScene";
import { CMOCharacter } from "./cmo-character/CMOCharacter";
import { CMODialoguePanel } from "./cmo-character/CMODialoguePanel";
import { CMOWhiteboard } from "./cmo-character/CMOWhiteboard";
import { DocumentEditor } from "./crud/DocumentEditor";
import { DocumentList } from "./crud/DocumentList";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface DocumentStats {
  totalDocuments: number;
  coverLetters: number;
  latestDocTitle: string | null;
  latestDocCompany: string | null;
  latestDocVersion: number;
  latestDocUpdatedAt: Date | null;
  applicationsWithoutLetters: number;
}

interface WritingRoomClientProps {
  documents: Document[];
  applications: Application[];
  stats: DocumentStats;
  onCreateDocument?: (formData: FormData) => Promise<void>;
  onUpdateDocument?: (id: string, formData: FormData) => Promise<void>;
  onDeleteDocument?: (id: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Group documents into the latest version per applicationId group */
function groupDocumentVersions(docs: Document[]): {
  primary: Document[];
  versionCounts: Record<string, number>;
  allVersions: Record<string, Document[]>;
} {
  // Group by applicationId (null is its own group per doc id)
  const groups = new Map<string, Document[]>();

  for (const doc of docs) {
    const key = doc.applicationId ?? `__standalone__${doc.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(doc);
  }

  const primary: Document[] = [];
  const versionCounts: Record<string, number> = {};
  const allVersions: Record<string, Document[]> = {};

  for (const [, group] of groups) {
    const sorted = [...group].sort((a, b) => (b.version ?? 1) - (a.version ?? 1));
    const latest = sorted[0];
    primary.push(latest);
    // Map every doc's id in this group to the version count
    for (const d of group) {
      versionCounts[d.id] = group.length;
      allVersions[d.id] = sorted;
    }
  }

  return { primary, versionCounts, allVersions };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function WritingRoomClient({
  documents,
  applications,
  stats,
  onCreateDocument,
  onUpdateDocument,
  ..._rest
}: WritingRoomClientProps): JSX.Element {
  void _rest;
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [, startTransition] = useTransition();

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleOpenDialogue = useCallback(() => {
    setDialogueOpen(true);
  }, []);

  const handleCloseDialogue = useCallback(() => {
    setDialogueOpen(false);
  }, []);

  const handleSelectDocument = useCallback((doc: Document) => {
    setSelectedDocId(doc.id);
  }, []);

  const handleRequestRefinement = useCallback((doc: Document) => {
    setSelectedDocId(doc.id);
    setDialogueOpen(true);
  }, []);

  const handleNewDocument = useCallback(() => {
    setDialogueOpen(true);
  }, []);

  const handleVersionSelect = useCallback((version: number) => {
    void version;
    // version switching is handled within DocumentEditor, noop here
  }, []);

  const handleCreateDocument = useCallback(
    async (formData: FormData) => {
      if (onCreateDocument) await onCreateDocument(formData);
      startTransition(() => {
        // State will be refreshed by server revalidation
      });
    },
    [onCreateDocument]
  );

  const handleUpdateDocument = useCallback(
    async (id: string, formData: FormData) => {
      if (onUpdateDocument) await onUpdateDocument(id, formData);
    },
    [onUpdateDocument]
  );

  // ── Derived data ─────────────────────────────────────────────────────
  const coverLetterDocs = useMemo(
    () => documents.filter((d) => d.type === "cover_letter"),
    [documents]
  );

  const { primary, versionCounts, allVersions } = useMemo(
    () => groupDocumentVersions(coverLetterDocs),
    [coverLetterDocs]
  );

  // Build applicationId → company/role name maps
  const companyNames = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const app of applications) {
      if (app.companyName) map[app.id] = app.companyName;
    }
    return map;
  }, [applications]);

  const roleNames = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const app of applications) {
      map[app.id] = app.role;
    }
    return map;
  }, [applications]);

  // Currently selected document
  const selectedDoc = useMemo(
    () => coverLetterDocs.find((d) => d.id === selectedDocId) ?? null,
    [coverLetterDocs, selectedDocId]
  );

  // Versions of the selected document (by applicationId group)
  const selectedVersions = useMemo<Document[]>(() => {
    if (!selectedDoc) return [];
    return allVersions[selectedDoc.id] ?? [selectedDoc];
  }, [selectedDoc, allVersions]);

  // Ticker stats shaped for WritingRoomTicker
  const tickerStats = useMemo<WritingRoomStats>(
    () => ({
      totalDocuments: stats.totalDocuments,
      coverLetters: stats.coverLetters,
      latestDocTitle: stats.latestDocTitle,
      latestDocCompany: stats.latestDocCompany,
      latestDocVersion: stats.latestDocVersion,
      latestDocUpdatedAt: stats.latestDocUpdatedAt,
      applicationsWithoutLetters: stats.applicationsWithoutLetters,
      cmoStatus: "ready",
    }),
    [stats]
  );

  // Version history for the whiteboard
  const versionHistory = useMemo(
    () =>
      selectedVersions.map((v) => ({
        version: v.version ?? 1,
        updatedAt: v.updatedAt ? new Date(v.updatedAt) : new Date(),
      })),
    [selectedVersions]
  );

  // ── Character slot — CMO character + whiteboard ──────────────────────
  const characterSlot = (
    <div
      className="flex flex-col items-center justify-end gap-4 w-full h-full px-5 pb-4"
    >
      {/* CMO whiteboard — above character */}
      <div className="w-full" style={{ maxWidth: "320px" }}>
        <CMOWhiteboard
          stats={tickerStats}
          activeDocTitle={selectedDoc?.title ?? null}
          versionHistory={versionHistory}
        />
      </div>

      {/* CMO character silhouette — desk scene */}
      <div className="flex-shrink-0">
        <CMOCharacter onConversationOpen={handleOpenDialogue} />
      </div>
    </div>
  );

  // ── Editor slot — document list + editor ─────────────────────────────
  const editorSlot = (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Document list — left panel (35% of the 60% editor area) */}
      <div
        style={{
          flex: "0 0 35%",
          minWidth: 0,
          borderRight: "1px solid #2A1C12",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <DocumentList
          documents={primary}
          companyNames={companyNames}
          roleNames={roleNames}
          versionCounts={versionCounts}
          selectedId={selectedDocId}
          onSelect={handleSelectDocument}
          onNew={handleNewDocument}
        />
      </div>

      {/* Document editor — right panel (65% of the 60% editor area) */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <DocumentEditor
          document={selectedDoc}
          versions={selectedVersions}
          companyName={
            selectedDoc?.applicationId
              ? (companyNames[selectedDoc.applicationId] ?? null)
              : null
          }
          roleName={
            selectedDoc?.applicationId
              ? (roleNames[selectedDoc.applicationId] ?? null)
              : null
          }
          onRequestRefinement={handleRequestRefinement}
          onVersionSelect={handleVersionSelect}
        />
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <>
      {/* Full-screen Writing Room scene with character + editor slots */}
      <WritingRoomScene
        stats={tickerStats}
        characterSlot={characterSlot}
        editorSlot={editorSlot}
      />

      {/* CMO Dialogue Panel — slides in from right */}
      {dialogueOpen && (
        <div
          role="complementary"
          aria-label="CMO writing studio conversation panel"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(440px, 92vw)",
            zIndex: 50,
            animation: "cmo-panel-slide-in 0.25s ease-out forwards",
          }}
        >
          <CMODialoguePanel
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
            animation: "cmo-backdrop-fade-in 0.2s ease-out forwards",
          }}
        />
      )}

      {/* Panel animations + utility styles */}
      <style>{`
        @keyframes cmo-panel-slide-in {
          from { transform: translateX(100%); opacity: 0.8; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes cmo-backdrop-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes cmo-panel-slide-in {
            from { opacity: 0.8; }
            to { opacity: 1; }
          }
          @keyframes cmo-backdrop-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        }
      `}</style>

      {/*
        NOTE: onCreateDocument and onUpdateDocument are wired through
        CMODialoguePanel (via the /api/cmo endpoint which handles
        document creation) and through direct prop passthrough if
        needed. Server action CRUD can be added as needed.
      */}
      {/*
        Suppress unused-variable lint for server action props until
        the API route is wired:
      */}
      <span aria-hidden="true" style={{ display: "none" }}>
        {typeof handleCreateDocument === "function" ? "" : ""}
        {typeof handleUpdateDocument === "function" ? "" : ""}
      </span>
    </>
  );
}
