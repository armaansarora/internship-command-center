import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generateStructuredPrepPacket } from "@/lib/ai/structured/prep-packet";
import { log } from "@/lib/logger";
import { withCronHealth } from "@/lib/cron/health";

/**
 * GET /api/cron/packet-regenerate
 *
 * Hourly sweep for upcoming interviews (within HORIZON_HOURS) whose prep
 * packet is either missing entirely or older than STALE_DAYS. For each
 * candidate we:
 *   1. Generate a fresh packet via generateStructuredPrepPacket.
 *   2. Insert a new documents row (prep_packet, generated_by='cpo').
 *   3. Point the interview row's prep_packet_id at the new document.
 *   4. Drop a pneumatic-tube notification so the Penthouse can surface
 *      "CPO: fresh packet on your desk for {company}".
 *
 * Batch-capped at BATCH_LIMIT per tick so a cold-start spike doesn't fan
 * out into the LLM provider. The cron runs at :15 past each hour (offset
 * from our other hourly-ish jobs).
 *
 * Auth: verifyCronRequest (Bearer CRON_SECRET OR x-vercel-cron: 1).
 */
export const maxDuration = 300;

const BATCH_LIMIT = 10;
const HORIZON_HOURS = 72;
const STALE_DAYS = 7;

type InterviewFormat =
  | "phone_screen"
  | "video"
  | "on_site"
  | "case"
  | "technical"
  | "behavioral"
  | "general";

const VALID_FORMATS: ReadonlySet<InterviewFormat> = new Set([
  "phone_screen",
  "video",
  "on_site",
  "case",
  "technical",
  "behavioral",
  "general",
]);

interface Candidate {
  interview_id: string;
  user_id: string;
  application_id: string;
  prep_packet_id: string | null;
  round: string | null;
  format: string | null;
  scheduled_at: string;
  company_name: string | null;
  role: string | null;
}

function coerceFormat(raw: string | null): InterviewFormat {
  if (raw && VALID_FORMATS.has(raw as InterviewFormat)) {
    return raw as InterviewFormat;
  }
  return "general";
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const guard = verifyCronRequest(req);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error ?? "unauthorized" },
      { status: 401 },
    );
  }

  const startedAt = Date.now();
  const admin = getSupabaseAdmin();
  const now = new Date();
  const horizon = new Date(
    now.getTime() + HORIZON_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const stale = new Date(
    now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Pull upcoming interviews. We over-fetch so we have room to filter out
  // rows whose packet is fresh without having to iterate past BATCH_LIMIT.
  const { data: interviewRows, error: fetchErr } = await admin
    .from("interviews")
    .select(
      "id, user_id, application_id, prep_packet_id, round, format, scheduled_at",
    )
    .in("status", ["scheduled", "rescheduled"])
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", horizon)
    .order("scheduled_at", { ascending: true })
    .limit(BATCH_LIMIT * 3);

  if (fetchErr) {
    log.error("packet_regenerate.fetch_failed", fetchErr, {
      error: fetchErr.message,
    });
    return NextResponse.json(
      { error: `fetch failed: ${fetchErr.message}` },
      { status: 500 },
    );
  }

  const upcoming = (interviewRows ?? []) as Array<{
    id: string;
    user_id: string;
    application_id: string;
    prep_packet_id: string | null;
    round: string | null;
    format: string | null;
    scheduled_at: string;
  }>;

  // Resolve company + role for every candidate in a single round-trip.
  const appIds = Array.from(new Set(upcoming.map((r) => r.application_id)));
  const { data: apps } = appIds.length
    ? await admin
        .from("applications")
        .select("id, company_name, role")
        .in("id", appIds)
    : { data: [] as Array<{ id: string; company_name: string | null; role: string | null }> };

  const appById = new Map(
    ((apps ?? []) as Array<{
      id: string;
      company_name: string | null;
      role: string | null;
    }>).map((a) => [a.id, a]),
  );

  // Filter down to candidates — no packet, or packet older than stale threshold.
  const candidates: Candidate[] = [];
  for (const row of upcoming) {
    const app = appById.get(row.application_id);
    if (!app) continue;

    if (!row.prep_packet_id) {
      candidates.push({
        interview_id: row.id,
        user_id: row.user_id,
        application_id: row.application_id,
        prep_packet_id: null,
        round: row.round,
        format: row.format,
        scheduled_at: row.scheduled_at,
        company_name: app.company_name ?? null,
        role: app.role ?? null,
      });
      if (candidates.length >= BATCH_LIMIT) break;
      continue;
    }

    const { data: pkt } = await admin
      .from("documents")
      .select("updated_at")
      .eq("id", row.prep_packet_id)
      .single();

    if (pkt && typeof (pkt as { updated_at: string }).updated_at === "string") {
      const updatedAt = (pkt as { updated_at: string }).updated_at;
      if (updatedAt < stale) {
        candidates.push({
          interview_id: row.id,
          user_id: row.user_id,
          application_id: row.application_id,
          prep_packet_id: row.prep_packet_id,
          round: row.round,
          format: row.format,
          scheduled_at: row.scheduled_at,
          company_name: app.company_name ?? null,
          role: app.role ?? null,
        });
      }
    }

    if (candidates.length >= BATCH_LIMIT) break;
  }

  let regenerated = 0;
  let notified = 0;
  const errors: string[] = [];

  for (const c of candidates) {
    try {
      const structured = await generateStructuredPrepPacket({
        userId: c.user_id,
        companyName: c.company_name ?? "Unknown",
        role: c.role ?? "Unknown",
        interviewFormat: coerceFormat(c.format),
        interviewRound: c.round ?? undefined,
        companyResearch: undefined,
      });

      if (!structured) {
        errors.push(`${c.interview_id}: structured generator returned null`);
        continue;
      }

      const { data: newDoc, error: insertErr } = await admin
        .from("documents")
        .insert({
          user_id: c.user_id,
          application_id: c.application_id,
          type: "prep_packet",
          title: `Prep Packet — ${c.company_name ?? "Unknown"} (${c.role ?? "Unknown"})`,
          content: structured.markdown,
          version: 1,
          is_active: true,
          generated_by: "cpo",
        })
        .select("id")
        .single();

      if (insertErr || !newDoc) {
        errors.push(
          `${c.interview_id}: insert failed ${insertErr?.message ?? ""}`,
        );
        continue;
      }

      const { error: updateErr } = await admin
        .from("interviews")
        .update({ prep_packet_id: (newDoc as { id: string }).id })
        .eq("id", c.interview_id);

      if (updateErr) {
        errors.push(
          `${c.interview_id}: interview update failed ${updateErr.message}`,
        );
        // Still counted as regenerated — the document itself exists.
      }

      regenerated++;

      const { error: notifErr } = await admin.from("notifications").insert({
        user_id: c.user_id,
        type: "prep_packet_refreshed",
        priority: "medium",
        title: "Fresh packet on your desk",
        body: `CPO: I refreshed your prep packet for ${c.company_name ?? "the upcoming interview"}.`,
        source_agent: "cpo",
        source_entity_id: c.interview_id,
        source_entity_type: "interview",
        channels: ["pneumatic_tube"],
        actions: [{ label: "Open packet", href: "/briefing-room" }],
        is_read: false,
        is_dismissed: false,
      });

      if (notifErr) {
        errors.push(
          `${c.interview_id}: notif insert failed ${notifErr.message}`,
        );
      } else {
        notified++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${c.interview_id}: ${msg}`);
    }
  }

  const durationMs = Date.now() - startedAt;
  log.info("packet_regenerate.batch_complete", {
    scanned: upcoming.length,
    candidates: candidates.length,
    regenerated,
    notified,
    errorCount: errors.length,
    durationMs,
  });

  return NextResponse.json({
    scanned: upcoming.length,
    candidates: candidates.length,
    regenerated,
    notified,
    errors,
    durationMs,
  });
}

export const GET = withCronHealth("packet-regenerate", handle);
