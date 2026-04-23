/**
 * R6.7 — Debrief (Briefing Room binder) REST queries.
 *
 * Debriefs live in the `documents` table with `type = "debrief"`. The
 * Briefing Room uses them as "binders" — historic drill transcripts the
 * user can revisit. These helpers hide the JSON encoding + filtering so
 * callers get typed objects back.
 *
 * `listBindersForUser` returns a summary row per binder (fast list view).
 * `readBinder` returns the fully-parsed `DebriefContent` for a single id.
 *
 * Any row whose content fails `parseDebriefContent` (malformed JSON or
 * schema drift) is silently skipped in the list — the Briefing Room UI
 * doesn't need to surface those.
 */

import { createClient } from "@/lib/supabase/server";
import { parseDebriefContent, type DebriefContent } from "@/types/debrief";

export interface BinderSummary {
  id: string;
  title: string;
  company: string;
  round: string;
  totalScore: number;
  createdAt: string;
}

/**
 * List every active debrief binder for the given user, newest-first.
 * Malformed rows are skipped without throwing.
 */
export async function listBindersForUser(userId: string): Promise<BinderSummary[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("documents")
    .select("id, title, content, created_at")
    .eq("user_id", userId)
    .eq("type", "debrief")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (!data) return [];
  const out: BinderSummary[] = [];
  for (const row of data) {
    try {
      const c: DebriefContent = parseDebriefContent(row.content);
      out.push({
        id: row.id,
        title: row.title ?? `Debrief — ${c.company} (${c.round})`,
        company: c.company,
        round: c.round,
        totalScore: c.totalScore,
        createdAt: row.created_at,
      });
    } catch {
      /* skip malformed rows — not surfaced to the UI */
    }
  }
  return out;
}

/**
 * Read a single binder by id, scoped to the owning user. Returns the
 * fully-parsed DebriefContent or null if the row doesn't exist / isn't
 * a debrief / doesn't belong to the user.
 */
export async function readBinder(
  userId: string,
  binderId: string,
): Promise<DebriefContent | null> {
  const sb = await createClient();
  const { data } = await sb
    .from("documents")
    .select("content")
    .eq("id", binderId)
    .eq("user_id", userId)
    .eq("type", "debrief")
    .single();
  if (!data?.content) return null;
  return parseDebriefContent(data.content);
}
