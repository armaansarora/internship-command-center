"use client";

import type { JSX } from "react";
import type { ContactForAgent } from "@/lib/db/queries/contacts-rest";
import { ContactCard } from "./ContactCard";

interface ContactGridProps {
  contacts: ContactForAgent[];
  onEditContact: (contact: ContactForAgent) => void;
  groupBy?: "warmth" | "company" | "none";
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------
function SectionHeader({
  title,
  count,
  color,
}: {
  title: string;
  count: number;
  color: string;
}): JSX.Element {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span
        style={{
          fontSize: "10px",
          fontFamily: "IBM Plex Mono, monospace",
          color: "#7A5B35",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontSize: "10px",
          fontFamily: "IBM Plex Mono, monospace",
          color,
          fontWeight: 700,
        }}
        aria-label={`${count} contacts`}
      >
        {count}
      </span>
      <div
        aria-hidden="true"
        style={{
          flex: 1,
          height: "1px",
          background: `linear-gradient(to right, ${color}44, transparent)`,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState(): JSX.Element {
  return (
    <div
      role="status"
      aria-label="No contacts found"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: "200px",
        gap: "8px",
        opacity: 0.5,
      }}
    >
      <span
        style={{
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: "11px",
          color: "#7A5B35",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        No contacts yet — start building your network
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid layout helper
// ---------------------------------------------------------------------------
const GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "10px",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ContactGrid({
  contacts,
  onEditContact,
  groupBy = "warmth",
}: ContactGridProps): JSX.Element {
  if (contacts.length === 0) {
    return <EmptyState />;
  }

  if (groupBy === "none") {
    return (
      <div style={GRID_STYLE} role="list" aria-label="All contacts">
        {contacts.map((c) => (
          <div key={c.id} role="listitem">
            <ContactCard contact={c} onEdit={onEditContact} />
          </div>
        ))}
      </div>
    );
  }

  if (groupBy === "company") {
    // Group by company name
    const companyMap = new Map<string, ContactForAgent[]>();
    for (const c of contacts) {
      const key = c.companyName ?? "No Company";
      const existing = companyMap.get(key) ?? [];
      companyMap.set(key, [...existing, c]);
    }
    const sortedCompanies = Array.from(companyMap.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    return (
      <div className="flex flex-col gap-6">
        {sortedCompanies.map(([company, companyContacts]) => (
          <section key={company} aria-label={`${company} contacts`}>
            <SectionHeader
              title={company}
              count={companyContacts.length}
              color="#C9A84C"
            />
            <div style={GRID_STYLE}>
              {companyContacts.map((c) => (
                <ContactCard key={c.id} contact={c} onEdit={onEditContact} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // Default: group by warmth level
  const warm = contacts.filter((c) => c.warmthLevel === "warm");
  const cooling = contacts.filter((c) => c.warmthLevel === "cooling");
  const cold = contacts.filter((c) => c.warmthLevel === "cold");

  return (
    <div className="flex flex-col gap-6">
      {warm.length > 0 && (
        <section aria-label="Warm contacts">
          <SectionHeader title="Warm" count={warm.length} color="#C9A84C" />
          <div style={GRID_STYLE}>
            {warm.map((c) => (
              <ContactCard key={c.id} contact={c} onEdit={onEditContact} />
            ))}
          </div>
        </section>
      )}

      {cooling.length > 0 && (
        <section aria-label="Cooling contacts">
          <SectionHeader title="Cooling" count={cooling.length} color="#8892A0" />
          <div style={GRID_STYLE}>
            {cooling.map((c) => (
              <ContactCard key={c.id} contact={c} onEdit={onEditContact} />
            ))}
          </div>
        </section>
      )}

      {cold.length > 0 && (
        <section aria-label="Cold contacts">
          <SectionHeader title="Cold" count={cold.length} color="#6E7E8F" />
          <div style={GRID_STYLE}>
            {cold.map((c) => (
              <ContactCard key={c.id} contact={c} onEdit={onEditContact} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
