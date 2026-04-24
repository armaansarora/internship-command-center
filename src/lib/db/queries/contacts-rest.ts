/**
 * Contacts queries using Supabase REST client.
 * Vercel-compatible — Drizzle direct postgres fails on serverless.
 * All CNO agent tools and Rolodex Lounge server components use these.
 */

import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContactStats {
  total: number;
  warm: number; // contacted within 7 days
  cooling: number; // 7-14 days since last contact
  cold: number; // 14+ days since last contact
  companiesRepresented: number;
  recentActivity: number; // contacts touched this week
}

export interface ContactRow {
  id: string;
  user_id: string;
  company_id: string | null;
  name: string;
  email: string | null;
  title: string | null;
  linkedin_url: string | null;
  relationship: string | null;
  phone: string | null;
  introduced_by: string | null;
  warmth: number | null;
  last_contact_at: string | null;
  notes: string | null;
  /**
   * R8 — private sticky-note, visible only to the owning user.  NEVER
   * included in AI-prompt composition, exports, or cross-user surfaces.
   * The P5 grep invariant keeps this column off every outbound path.
   */
  private_note: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactForAgent {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  companyId: string | null;
  companyName: string | null;
  relationship: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  introducedBy: string | null;
  notes: string | null;
  /**
   * R8 private sticky-note — user-only.  See ContactRow.private_note.
   * Allowlisted surfaces ONLY: this file, RolodexCard.tsx, ContactModal.tsx,
   * schema.ts.  P5 enforces this mechanically.
   */
  privateNote: string | null;
  source: string | null;
  lastContactAt: string | null;
  warmthLevel: "warm" | "cooling" | "cold";
  warmthScore: number;
  daysSinceContact: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WARM_DAYS = 7;
const COOLING_DAYS = 14;

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
}

function calcWarmthLevel(days: number): "warm" | "cooling" | "cold" {
  if (days < WARM_DAYS) return "warm";
  if (days < COOLING_DAYS) return "cooling";
  return "cold";
}

function calcWarmthScore(days: number): number {
  if (days < WARM_DAYS) return Math.max(70, 100 - days * 4);
  if (days < COOLING_DAYS) return Math.max(40, 70 - (days - WARM_DAYS) * 5);
  return Math.max(0, 40 - (days - COOLING_DAYS) * 2);
}

function rowToAgentFormat(row: ContactRow, companyName?: string | null): ContactForAgent {
  const days = daysSince(row.last_contact_at);
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    title: row.title,
    companyId: row.company_id,
    companyName: companyName ?? null,
    relationship: row.relationship,
    linkedinUrl: row.linkedin_url,
    phone: row.phone,
    introducedBy: row.introduced_by,
    notes: row.notes,
    // R8 private note — only surfaced to the owning user via the same
    // RLS-guarded fetch; never crosses into exports / AI / cross-user.
    privateNote: row.private_note,
    source: row.source,
    lastContactAt: row.last_contact_at,
    warmthLevel: calcWarmthLevel(days),
    warmthScore: calcWarmthScore(days),
    daysSinceContact: days,
  };
}

// ---------------------------------------------------------------------------
// Query 1: getContactsByUser
// ---------------------------------------------------------------------------

/**
 * Fetch all contacts for a user with warmth calculated from lastContactAt.
 * Joins company name from companies table.
 */
export async function getContactsByUser(userId: string): Promise<ContactForAgent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*, companies(name)")
    .eq("user_id", userId)
    .order("last_contact_at", { ascending: true, nullsFirst: true });

  if (error || !data) {
    if (error) {
      log.error("contacts.get_by_user_failed", undefined, {
        userId,
        error: error.message,
      });
    }
    return [];
  }

  return (data as Array<ContactRow & { companies: { name: string } | null }>).map(
    (row) => rowToAgentFormat(row, row.companies?.name ?? null)
  );
}

// ---------------------------------------------------------------------------
// Query 2: getContactStats
// ---------------------------------------------------------------------------

/**
 * Aggregate contact stats for the CNO system prompt.
 * Warmth is computed from last_contact_at, not stored warmth field.
 */
export async function getContactStats(userId: string): Promise<ContactStats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("last_contact_at, company_id")
    .eq("user_id", userId);

  if (error || !data) {
    if (error) {
      log.error("contacts.get_stats_failed", undefined, {
        userId,
        error: error.message,
      });
    }
    return emptyContactStats();
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let warm = 0;
  let cooling = 0;
  let cold = 0;
  let recentActivity = 0;
  const companies = new Set<string>();

  for (const row of data) {
    const days = daysSince(row.last_contact_at as string | null);
    const level = calcWarmthLevel(days);

    if (level === "warm") warm++;
    else if (level === "cooling") cooling++;
    else cold++;

    if (row.last_contact_at && new Date(row.last_contact_at as string) >= weekAgo) {
      recentActivity++;
    }

    if (row.company_id) companies.add(row.company_id as string);
  }

  return {
    total: data.length,
    warm,
    cooling,
    cold,
    companiesRepresented: companies.size,
    recentActivity,
  };
}

// ---------------------------------------------------------------------------
// Query 3: getContactsForAgent
// ---------------------------------------------------------------------------

/**
 * Filtered query for CNO agent tools.
 * Supports filtering by warmth level, company, and relationship type.
 */
export async function getContactsForAgent(
  userId: string,
  opts: {
    warmth?: "warm" | "cooling" | "cold";
    companyId?: string;
    relationship?: string;
    limit?: number;
    sortBy?: "coldness_desc" | "name_asc" | "recent_desc";
  }
): Promise<{ contacts: ContactForAgent[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("contacts")
    .select("*, companies(name)")
    .eq("user_id", userId);

  if (opts.companyId) {
    query = query.eq("company_id", opts.companyId);
  }

  if (opts.relationship) {
    query = query.eq("relationship", opts.relationship);
  }

  if (opts.sortBy === "name_asc") {
    query = query.order("name", { ascending: true });
  } else if (opts.sortBy === "recent_desc") {
    query = query.order("last_contact_at", { ascending: false, nullsFirst: false });
  } else {
    // coldness_desc — oldest last_contact_at first (most cold first)
    query = query.order("last_contact_at", { ascending: true, nullsFirst: true });
  }

  query = query.limit(opts.limit ?? 50);

  const { data, error } = await query;

  if (error || !data) {
    if (error) {
      log.error("contacts.get_for_agent_failed", undefined, {
        userId,
        opts,
        error: error.message,
      });
    }
    return { contacts: [], total: 0 };
  }

  let results = (data as Array<ContactRow & { companies: { name: string } | null }>).map(
    (row) => rowToAgentFormat(row, row.companies?.name ?? null)
  );

  // Post-filter by warmth level if requested
  if (opts.warmth) {
    results = results.filter((c) => c.warmthLevel === opts.warmth);
  }

  return { contacts: results, total: results.length };
}

// ---------------------------------------------------------------------------
// Query 4: createContactRest
// ---------------------------------------------------------------------------

/**
 * Insert a new contact record for the user.
 */
export async function createContactRest(
  userId: string,
  data: {
    name: string;
    email?: string;
    title?: string;
    companyId?: string;
    relationship?: string;
    linkedinUrl?: string;
    phone?: string;
    introducedBy?: string;
    notes?: string;
    source?: string;
  }
): Promise<{ success: boolean; contactId: string | null; message: string }> {
  const supabase = await createClient();

  const { data: inserted, error } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      name: data.name,
      email: data.email ?? null,
      title: data.title ?? null,
      company_id: data.companyId ?? null,
      relationship: data.relationship ?? null,
      linkedin_url: data.linkedinUrl ?? null,
      phone: data.phone ?? null,
      introduced_by: data.introducedBy ?? null,
      notes: data.notes ?? null,
      source: data.source ?? "manual",
      last_contact_at: new Date().toISOString(),
      warmth: 100,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return {
      success: false,
      contactId: null,
      message: `Failed to create contact: ${error?.message ?? "unknown error"}`,
    };
  }

  // R11.4 — fire-and-forget match-index rescan (5-min debounced).
  void import("@/lib/networking/match-delta")
    .then((m) => m.enqueueMatchRescan(userId))
    .catch(() => {});

  return {
    success: true,
    contactId: (inserted as { id: string }).id,
    message: `Contact "${data.name}" added to your network.`,
  };
}

// ---------------------------------------------------------------------------
// Query 5: updateContactActivity
// ---------------------------------------------------------------------------

/**
 * Log an interaction with a contact — updates lastContactAt and appends a note.
 * Warmth is recalculated on read from the updated lastContactAt.
 */
export async function updateContactActivity(
  userId: string,
  contactId: string,
  note: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();

  // Fetch existing notes to append
  const { data: existing } = await supabase
    .from("contacts")
    .select("notes")
    .eq("id", contactId)
    .eq("user_id", userId)
    .single();

  const existingNotes = (existing as { notes: string | null } | null)?.notes ?? "";
  const timestamp = new Date().toISOString().split("T")[0];
  const updatedNotes = existingNotes
    ? `${existingNotes}\n\n[${timestamp}] ${note}`
    : `[${timestamp}] ${note}`;

  const { error } = await supabase
    .from("contacts")
    .update({
      last_contact_at: new Date().toISOString(),
      notes: updatedNotes,
      warmth: 100, // reset to warm on interaction
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId)
    .eq("user_id", userId);

  if (error) {
    return {
      success: false,
      message: `Failed to update contact: ${error.message}`,
    };
  }

  // R11.4 — fire-and-forget match-index rescan (5-min debounced).
  void import("@/lib/networking/match-delta")
    .then((m) => m.enqueueMatchRescan(userId))
    .catch(() => {});

  return {
    success: true,
    message: `Interaction logged for contact. Warmth reset to warm.`,
  };
}

// ---------------------------------------------------------------------------
// Query 6: linkContactToApplication
// ---------------------------------------------------------------------------

/**
 * Link a contact to an application by setting contact_id on the applications table.
 */
export async function linkContactToApplication(
  userId: string,
  contactId: string,
  applicationId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("applications")
    .update({
      contact_id: contactId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .eq("user_id", userId);

  if (error) {
    return {
      success: false,
      message: `Failed to link contact to application: ${error.message}`,
    };
  }

  // R11.4 — fire-and-forget match-index rescan (5-min debounced).
  void import("@/lib/networking/match-delta")
    .then((m) => m.enqueueMatchRescan(userId))
    .catch(() => {});

  return {
    success: true,
    message: `Contact linked to application.`,
  };
}

// ---------------------------------------------------------------------------
// Query 7: getCoolingContacts
// ---------------------------------------------------------------------------

/**
 * Get contacts with 7-14 days since last contact — the "cooling off" zone.
 * Sorted by most-days-since-contact descending (most at-risk first).
 */
export async function getCoolingContacts(userId: string): Promise<ContactForAgent[]> {
  const supabase = await createClient();
  const now = new Date();
  const coolingThreshold = new Date(
    now.getTime() - WARM_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const coldThreshold = new Date(
    now.getTime() - COOLING_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("contacts")
    .select("*, companies(name)")
    .eq("user_id", userId)
    .lt("last_contact_at", coolingThreshold)
    .gte("last_contact_at", coldThreshold)
    .order("last_contact_at", { ascending: true });

  if (error || !data) {
    if (error) {
      log.error("contacts.get_cooling_failed", undefined, {
        userId,
        error: error.message,
      });
    }
    return [];
  }
  return (data as Array<ContactRow & { companies: { name: string } | null }>).map(
    (row) => rowToAgentFormat(row, row.companies?.name ?? null)
  );
}

// ---------------------------------------------------------------------------
// Query 8: getColdContacts
// ---------------------------------------------------------------------------

/**
 * Get contacts with 14+ days since last contact — fully cold.
 * Sorted by days-since-contact descending (coldest first).
 */
export async function getColdContacts(userId: string): Promise<ContactForAgent[]> {
  const supabase = await createClient();
  const coldThreshold = new Date(
    Date.now() - COOLING_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from("contacts")
    .select("*, companies(name)")
    .eq("user_id", userId)
    .lt("last_contact_at", coldThreshold)
    .order("last_contact_at", { ascending: true, nullsFirst: true });

  if (error || !data) {
    if (error) {
      log.error("contacts.get_cold_failed", undefined, {
        userId,
        error: error.message,
      });
    }
    return [];
  }
  return (data as Array<ContactRow & { companies: { name: string } | null }>)
    .map((row) => rowToAgentFormat(row, row.companies?.name ?? null))
    .sort((a, b) => b.daysSinceContact - a.daysSinceContact);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyContactStats(): ContactStats {
  return {
    total: 0,
    warm: 0,
    cooling: 0,
    cold: 0,
    companiesRepresented: 0,
    recentActivity: 0,
  };
}

// ---------------------------------------------------------------------------
// Query: getContactById (R10.14 — reference-request route uses this)
// ---------------------------------------------------------------------------

/**
 * Fetch a single contact by id under the caller's user_id.
 * Returns null when the row doesn't exist or RLS filters it out.
 *
 * R8/P5 note: the returned ContactForAgent carries `privateNote`. Callers
 * that pass this into AI prompts MUST strip it before serialization (see
 * src/lib/ai/structured/reference-request.ts for the pattern).
 */
export async function getContactById(
  userId: string,
  contactId: string,
): Promise<ContactForAgent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*, companies(name)")
    .eq("user_id", userId)
    .eq("id", contactId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as ContactRow & { companies: { name: string } | null };
  return rowToAgentFormat(row, row.companies?.name ?? null);
}
