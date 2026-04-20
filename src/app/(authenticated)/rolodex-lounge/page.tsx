import type { Metadata } from "next";
import { Suspense } from "react";
import type { JSX } from "react";
import { requireUser, createClient } from "@/lib/supabase/server";
import { FloorShell } from "@/components/world/FloorShell";
import { RolodexLoungeClient } from "@/components/floor-6/RolodexLoungeClient";
import { getContactsByUser, getContactStats } from "@/lib/db/queries/contacts-rest";
import {
  createContactAction,
  deleteContactAction,
  linkContactToApplicationAction,
  updateContactAction,
} from "@/lib/actions/contacts";

export const metadata: Metadata = { title: "The Rolodex Lounge | The Tower" };

/** Floor 6 — Contacts Network + CNO Agent + CIO Agent.
 *
 * Skyline + chrome paint immediately; the contact grid + CIO research stats
 * stream into the Suspense boundary so the floor's atmosphere appears first.
 */
export default async function RolodexLoungePage(): Promise<JSX.Element> {
  const user = await requireUser();

  return (
    <FloorShell floorId="6">
      <Suspense fallback={null}>
        <RolodexLoungeData userId={user.id} />
      </Suspense>
    </FloorShell>
  );
}

async function RolodexLoungeData({
  userId,
}: {
  userId: string;
}): Promise<JSX.Element> {
  const supabase = await createClient();

  // Fetch contacts (with warmth computed) and companies in parallel.
  // We pull the full company shape because the CIO whiteboard derives
  // research-freshness stats from it.
  const [contacts, contactStats, companiesResult] = await Promise.all([
    getContactsByUser(userId),
    getContactStats(userId),
    supabase
      .from("companies")
      .select("id, name, sector, research_freshness, internship_intel, website, updated_at")
      .eq("user_id", userId)
      .order("name", { ascending: true }),
  ]);

  type CompanyRow = {
    id: string;
    name: string;
    sector: string | null;
    research_freshness: string | null;
    internship_intel: string | null;
    website: string | null;
    updated_at: string | null;
  };

  const companyRows = (companiesResult.data ?? []) as CompanyRow[];

  const companies = companyRows.map((row) => ({
    id: row.id,
    name: row.name,
  }));

  // ── CIO research stats — shape consumed by CIOWhiteboard ────────────────
  const FRESH_DAYS = 7;
  const STALE_DAYS = 30;
  const now = Date.now();

  const researchedCompanies = companyRows.map((row) => ({
    id: row.id,
    name: row.name,
    sector: row.sector,
    lastResearchedAt: row.research_freshness ? new Date(row.research_freshness) : null,
    hasNotes: Boolean(row.internship_intel),
    domain: row.website,
  }));

  let freshCount = 0;
  let staleCount = 0;
  let researchedCount = 0;
  for (const c of researchedCompanies) {
    if (!c.lastResearchedAt) continue;
    researchedCount++;
    const ageDays = (now - c.lastResearchedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < FRESH_DAYS) freshCount++;
    else if (ageDays > STALE_DAYS) staleCount++;
  }

  const recentActivity = researchedCompanies
    .filter((c) => c.lastResearchedAt !== null)
    .sort(
      (a, b) =>
        (b.lastResearchedAt?.getTime() ?? 0) - (a.lastResearchedAt?.getTime() ?? 0),
    )
    .slice(0, 4)
    .map((c) => ({
      companyName: c.name,
      action: "researched",
      at: c.lastResearchedAt as Date,
    }));

  const researchStats = {
    totalCompanies: researchedCompanies.length,
    researchedCount,
    staleCount,
    freshCount,
    recentActivity,
    companies: researchedCompanies,
  };

  return (
    <RolodexLoungeClient
      contacts={contacts}
      contactStats={contactStats}
      companies={companies}
      researchStats={researchStats}
      onCreateContact={createContactAction}
      onUpdateContact={updateContactAction}
      onDeleteContact={deleteContactAction}
      onLinkContactToApplication={linkContactToApplicationAction}
    />
  );
}

