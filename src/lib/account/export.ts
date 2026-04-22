import JSZip from "jszip";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Schema version of the export archive format. Bump if the layout (directory
 * structure, manifest shape, file encoding) changes so downstream importers
 * can branch on it.
 */
const EXPORT_SCHEMA_VERSION = 1;

/**
 * Tables included in a full user-data export (R0.6). Every table here is RLS-
 * isolated by `user_id`, except `user_profiles` which is scoped by its primary
 * key `id`. Add a new table here when introducing one — missing tables mean
 * the archive is silently incomplete.
 *
 * Order mirrors the schema file for human-friendly diffing.
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
  "notifications",
  "outreach_queue",
  "daily_snapshots",
  "agent_logs",
  "audit_logs",
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
