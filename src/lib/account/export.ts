import JSZip from "jszip";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Schema version of the export archive format. Bump if the layout (directory
 * structure, manifest shape, file encoding) changes so downstream importers
 * can branch on it.
 */
const EXPORT_SCHEMA_VERSION = 1;

/**
 * Tables included in a full user-data export (R0.6 + R13 expansion).
 * Every table here is RLS-isolated by `user_id`, except `user_profiles`
 * which is scoped by its primary key `id`. Add a new table here when
 * introducing one — missing tables mean the archive is silently
 * incomplete.
 *
 * R13 audit (Differentiate council, 2026-05-11)
 * ---------------------------------------------
 * The pre-R13 list shipped 13 tables — missing ~10 user-scoped tables
 * the schema gained between R6 and R11. Users who exported their data
 * received an incomplete archive (missing dispatches, dossiers, memory,
 * embeddings, networking metadata, base resumes, milestones, reflections,
 * offers). This expansion brings the export back in sync with the live
 * schema's `user_id`-keyed surface.
 *
 * Order mirrors the schema file for human-friendly diffing. The
 * `r13-export-completeness.proof.test.ts` proof test asserts every
 * `user_id`-FK table in src/db/schema.ts appears in this list OR is
 * explicitly documented as exempt.
 */
const EXPORT_TABLES = [
  "user_profiles",
  "companies",
  "applications",
  "contacts",
  "emails",
  "documents",
  "interviews",
  "calendar_events",
  "outreach_queue",
  "notifications",
  "agent_logs",
  "agent_dispatches",
  "handoff_dossiers",
  "audit_logs",
  "agent_memory",
  "daily_snapshots",
  "company_embeddings",
  "job_embeddings",
  "progression_milestones",
  "base_resumes",
  "contact_embeddings",
  "networking_match_index",
  "match_candidate_index",
  "match_events",
  "match_rate_limits",
  "rejection_reflections",
  "offers",
] as const;

type ExportTable = (typeof EXPORT_TABLES)[number];

interface ExportManifest {
  exportedAt: string;
  userId: string;
  counts: Record<ExportTable, number>;
  schemaVersion: number;
}

/**
 * Assemble a zip archive containing every row in every user-owned table for
 * the given userId. Pure — does no network work beyond the Supabase REST
 * queries and performs no side effects (no storage upload, no email).
 *
 * Throws if any table read fails. Callers (the cron worker) translate the
 * throw into a `data_export_status = 'failed'` transition — we never want to
 * ship the user a partial archive.
 */
export async function buildUserExport(userId: string): Promise<Buffer> {
  const admin = getSupabaseAdmin();
  const zip = new JSZip();

  const counts = {} as Record<ExportTable, number>;

  for (const table of EXPORT_TABLES) {
    // `user_profiles.id` is the primary key AND the user foreign key for
    // every other table. Every other table filters by `user_id`.
    const column = table === "user_profiles" ? "id" : "user_id";

    const { data, error } = await admin.from(table).select("*").eq(column, userId);
    if (error) {
      throw new Error(`export: ${table}: ${error.message}`);
    }

    const rows = data ?? [];
    zip.file(`data/${table}.json`, JSON.stringify(rows, null, 2));
    counts[table] = rows.length;
  }

  const manifest: ExportManifest = {
    exportedAt: new Date().toISOString(),
    userId,
    counts,
    schemaVersion: EXPORT_SCHEMA_VERSION,
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  zip.file(
    "README.txt",
    [
      `Tower Archive — ${manifest.exportedAt}`,
      "",
      "This is your Tower data as of the export timestamp.",
      "Row counts per table are in manifest.json.",
      "Each file under data/ is a JSON array.",
      "",
      "— The Concierge",
      "",
    ].join("\n"),
  );

  return zip.generateAsync({ type: "nodebuffer" });
}
