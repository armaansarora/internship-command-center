import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/db/queries/notifications-rest";
import {
  findWarmIntros,
  type ContactShape,
  type CompanyEmbeddingShape,
  type ActiveApplication,
} from "@/lib/networking/warm-intro-finder";
import { log } from "@/lib/logger";
import { withCronHealth } from "@/lib/cron/health";

/**
 * GET /api/cron/warm-intro-scan
 *
 * Daily at 06:00 UTC.  Per user, finds the top-2 warm-intro proposals:
 * contacts whose current company is semantically close (cosine ≥ 0.80)
 * to the target company of an active application, and who aren't
 * already linked to that application.
 *
 * All work is intra-user. No cross-user data is accessed.
 *
 * Idempotency: `source_entity_id = warm-intro-<contactId>-<applicationId>`.
 * A re-run won't double-fire for the same (contact, app) pair.
 */
export const maxDuration = 300;

const THRESHOLD = 0.8;
const PER_USER_CAP = 2;

const ACTIVE_APP_STATUSES = [
  "applied",
  "screening",
  "interview_scheduled",
  "interviewing",
  "under_review",
];

async function handle(req: NextRequest): Promise<NextResponse> {
  const guard = verifyCronRequest(req);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error ?? "unauthorized" },
      { status: 401 },
    );
  }

  const admin = getSupabaseAdmin();

  // All active applications — scoped by user later.
  const { data: apps, error: appsErr } = await admin
    .from("applications")
    .select("id, user_id, company_id")
    .in("status", ACTIVE_APP_STATUSES)
    .not("company_id", "is", null);

  if (appsErr) {
    log.error("warm_intro_scan.read_apps_failed", appsErr, { error: appsErr.message });
    return NextResponse.json(
      { error: `read apps failed: ${appsErr.message}` },
      { status: 500 },
    );
  }

  // Group by user.
  const appsByUser = new Map<string, ActiveApplication[]>();
  for (const a of apps ?? []) {
    const arr = appsByUser.get(a.user_id as string) ?? [];
    arr.push({ id: a.id as string, companyId: (a.company_id as string) ?? null });
    appsByUser.set(a.user_id as string, arr);
  }

  let total = 0;

  for (const [userId, userApps] of appsByUser) {
    // Fetch this user's contacts + their linked application ids.
    const { data: contactsData, error: contactsErr } = await admin
      .from("contacts")
      .select("id, name, company_id")
      .eq("user_id", userId);

    if (contactsErr) {
      log.warn("warm_intro_scan.read_contacts_failed", {
        userId,
        error: contactsErr.message,
      });
      continue;
    }

    const contacts: ContactShape[] = (contactsData ?? []).map((c) => ({
      id: c.id as string,
      name: (c.name as string) ?? "a contact",
      companyId: (c.company_id as string) ?? null,
      applicationId: null,
    }));

    // Fetch this user's company embeddings.
    const { data: embeds, error: embedsErr } = await admin
      .from("company_embeddings")
      .select("company_id, embedding")
      .eq("user_id", userId);

    if (embedsErr || !embeds || embeds.length === 0) continue;

    const companies: CompanyEmbeddingShape[] = embeds.map((e) => ({
      id: e.company_id as string,
      embedding: toVector(e.embedding),
    }));

    const proposals = findWarmIntros({
      contacts,
      companies,
      activeApps: userApps,
      threshold: THRESHOLD,
      perUserCap: PER_USER_CAP,
    });

    for (const p of proposals) {
      // Look up the target company name for the body copy.
      const { data: target } = await admin
        .from("companies")
        .select("name")
        .eq("id", p.toCompanyId)
        .maybeSingle();
      const targetName = (target?.name as string) ?? "your target";

      await createNotification({
        userId,
        type: "warm-intro",
        priority: "low",
        title: "CNO: a warm intro idea",
        body:
          `${p.contactName} might know someone at ${targetName}. ` +
          "Their company and yours are in similar territory — worth asking.",
        sourceAgent: "cno",
        sourceEntityId: `warm-intro-${p.contactId}-${p.applicationId}`,
        sourceEntityType: "contact",
        channels: ["pneumatic_tube"],
      });
      total += 1;
    }
  }

  return NextResponse.json({ ok: true, proposals: total });
}

/** Supabase returns pgvector as an array of numbers or a string; normalize. */
function toVector(raw: unknown): number[] | null {
  if (Array.isArray(raw)) return raw.map((n) => Number(n));
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map((n: unknown) => Number(n)) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export const GET = withCronHealth("warm-intro-scan", handle);
