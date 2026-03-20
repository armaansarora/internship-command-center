"use client";

import type { JSX } from "react";
import { useState, useCallback, useMemo, useTransition } from "react";
import type { ContactForAgent, ContactStats } from "@/lib/db/queries/contacts-rest";
import { RolodexLoungeScene } from "./RolodexLoungeScene";
import type { RolodexLoungeStats } from "./RolodexLoungeScene";
import { CNOCharacter } from "./cno-character/CNOCharacter";
import { CNODialoguePanel } from "./cno-character/CNODialoguePanel";
import { CNOWhiteboard } from "./cno-character/CNOWhiteboard";
import { ContactModal } from "./crud/ContactModal";
import { ContactSearch } from "./crud/ContactSearch";
import type { ContactSearchParams } from "./crud/ContactSearch";
import { ContactGrid } from "./contact-grid/ContactGrid";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface RolodexLoungeClientProps {
  contacts: ContactForAgent[];
  contactStats: ContactStats;
  companies?: Array<{ id: string; name: string }>;
  onCreateContact: (formData: FormData) => Promise<void>;
  onUpdateContact: (id: string, formData: FormData) => Promise<void>;
  onDeleteContact: (id: string) => Promise<void>;
  onLinkContactToApplication?: (
    contactId: string,
    applicationId: string
  ) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function RolodexLoungeClient({
  contacts,
  contactStats,
  companies = [],
  onCreateContact,
  onUpdateContact,
  onDeleteContact,
  onLinkContactToApplication,
}: RolodexLoungeClientProps): JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactForAgent | null>(null);
  const [searchParams, setSearchParams] = useState<ContactSearchParams>({
    query: "",
    warmth: "all",
    relationship: "all",
    sort: "warmth",
  });
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Available for future use in linking contacts to applications
  void onLinkContactToApplication;

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleAddNew = useCallback(() => {
    setEditingContact(null);
    setModalOpen(true);
  }, []);

  const handleEditContact = useCallback((contact: ContactForAgent) => {
    setEditingContact(contact);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingContact(null);
  }, []);

  const handleModalSubmit = useCallback(
    async (formData: FormData) => {
      if (editingContact) {
        await onUpdateContact(editingContact.id, formData);
      } else {
        await onCreateContact(formData);
      }
      startTransition(() => {
        setModalOpen(false);
        setEditingContact(null);
      });
    },
    [editingContact, onCreateContact, onUpdateContact]
  );

  const handleDeleteContact = useCallback(
    async (id: string) => {
      await onDeleteContact(id);
      startTransition(() => {
        setModalOpen(false);
        setEditingContact(null);
      });
    },
    [onDeleteContact]
  );

  const handleOpenDialogue = useCallback(() => {
    setDialogueOpen(true);
  }, []);

  const handleCloseDialogue = useCallback(() => {
    setDialogueOpen(false);
  }, []);

  const handleSearch = useCallback((params: ContactSearchParams) => {
    setSearchParams(params);
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────
  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    if (searchParams.query.trim()) {
      const q = searchParams.query.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.companyName?.toLowerCase().includes(q) ?? false) ||
          (c.email?.toLowerCase().includes(q) ?? false)
      );
    }

    if (searchParams.warmth !== "all") {
      filtered = filtered.filter((c) => c.warmthLevel === searchParams.warmth);
    }

    if (searchParams.relationship !== "all") {
      filtered = filtered.filter(
        (c) => c.relationship === searchParams.relationship
      );
    }

    // Sort
    switch (searchParams.sort) {
      case "name":
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "company":
        filtered = [...filtered].sort((a, b) =>
          (a.companyName ?? "").localeCompare(b.companyName ?? "")
        );
        break;
      case "last_contact":
        filtered = [...filtered].sort(
          (a, b) => a.daysSinceContact - b.daysSinceContact
        );
        break;
      default:
        // warmth: cold first (most urgent)
        filtered = [...filtered].sort(
          (a, b) => b.daysSinceContact - a.daysSinceContact
        );
    }

    return filtered;
  }, [contacts, searchParams]);

  // Ticker stats from contactStats
  const tickerStats: RolodexLoungeStats = useMemo(() => {
    const recentName = contacts
      .filter((c) => c.daysSinceContact < 2)
      .map((c) => c.name)
      .at(0);
    return {
      totalContacts: contactStats.total,
      warmCount: contactStats.warm,
      coolingCount: contactStats.cooling,
      coldCount: contactStats.cold,
      companiesCount: contactStats.companiesRepresented,
      recentActivity: recentName ? `Contacted ${recentName}` : "",
    };
  }, [contacts, contactStats]);

  // Alert contacts for whiteboard
  const coldContacts = useMemo(
    () => contacts.filter((c) => c.warmthLevel === "cold").slice(0, 3),
    [contacts]
  );
  const coolingContacts = useMemo(
    () => contacts.filter((c) => c.warmthLevel === "cooling").slice(0, 3),
    [contacts]
  );

  // ── Character slot ────────────────────────────────────────────────────
  const characterSlot = (
    <div
      className="flex items-end justify-center gap-6 w-full h-full px-6 pb-4"
      style={{ maxWidth: "900px", margin: "0 auto" }}
    >
      {/* CNO character — left side */}
      <div className="flex-shrink-0">
        <CNOCharacter
          onConversationOpen={handleOpenDialogue}
          coldAlertsCount={contactStats.cold}
        />
      </div>

      {/* CNO whiteboard — right of character */}
      <div className="flex-1 min-w-0 max-w-sm">
        <CNOWhiteboard
          stats={contactStats}
          coldContacts={coldContacts}
          coolingContacts={coolingContacts}
        />
      </div>
    </div>
  );

  // ── Table slot — search + contact grid ───────────────────────────────
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
          <ContactSearch
            onSearch={handleSearch}
            totalCount={contacts.length}
            filteredCount={filteredContacts.length}
          />
        </div>

        <button
          type="button"
          onClick={handleAddNew}
          aria-label="Add new contact"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 16px",
            background: "rgba(201, 168, 76, 0.1)",
            border: "1px solid rgba(201, 168, 76, 0.35)",
            borderRadius: "2px",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "#C9A84C",
            cursor: "pointer",
            textTransform: "uppercase",
            transition: "background 0.15s ease, border-color 0.15s ease",
            outline: "none",
            flexShrink: 0,
            whiteSpace: "nowrap",
            height: "36px",
            alignSelf: "flex-end",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "rgba(201, 168, 76, 0.18)";
            el.style.borderColor = "rgba(201, 168, 76, 0.6)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = "rgba(201, 168, 76, 0.1)";
            el.style.borderColor = "rgba(201, 168, 76, 0.35)";
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLButtonElement).style.outline =
              "2px solid rgba(201, 168, 76, 0.5)";
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
          ADD CONTACT
        </button>
      </div>

      {/* Contact grid */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }} className="lounge-scroll">
        <ContactGrid
          contacts={filteredContacts}
          onEditContact={handleEditContact}
          groupBy={searchParams.sort === "company" ? "company" : "warmth"}
        />
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Full-screen Rolodex Lounge scene */}
      <RolodexLoungeScene
        stats={tickerStats}
        characterSlot={characterSlot}
        tableSlot={tableSlot}
      />

      {/* CNO Dialogue Panel — slides in from right */}
      {dialogueOpen && (
        <div
          role="complementary"
          aria-label="CNO networking conversation panel"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(420px, 90vw)",
            zIndex: 50,
            animation: "cno-panel-slide-in 0.25s ease-out forwards",
          }}
        >
          <CNODialoguePanel
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
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            zIndex: 49,
            animation: "cno-backdrop-fade-in 0.2s ease-out forwards",
          }}
        />
      )}

      {/* Contact create/edit modal */}
      <ContactModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        onDelete={editingContact ? handleDeleteContact : undefined}
        contact={editingContact}
        companies={companies}
      />
    </>
  );
}
