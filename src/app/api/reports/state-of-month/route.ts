/**
 * R9.8 — GET /api/reports/state-of-month?month=YYYY-MM
 *
 * Generates the monthly State of the Month PDF for the authenticated user.
 * Reuses @react-pdf/renderer (R5.7) for rendering; the data layer composes
 * deterministic stats + a template-driven CFO note (no LLM at render time).
 *
 * The route is the entry surface. The PDF rendering lives in
 * `@/lib/pdf/state-of-month-pdf`. The data shape (`StateOfMonthData`) is
 * the contract between the two — see that module for the type docs.
 *
 * NOTE: data access is Supabase REST only — Drizzle `db` access is broken
 * on Vercel for this project (see CLAUDE.md gotcha #1).
 */
import { NextResponse } from "next/server";
import { getUser, createClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";
import {
  generateStateOfMonthPdf,
  type PlanetSnapshot,
  type StateOfMonthData,
  type StateOfMonthStats,
  type StageKey,
} from "@/lib/pdf/state-of-month-pdf";

export const maxDuration = 60;

const MONTH_RE = /^(\d{4})-(\d{2})$/;

interface ApplicationMonthRow {
  id: string;
  status: string | null;
  tier: number | null;
  applied_at: string | null;
  last_activity_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers — pure, testable
// ---------------------------------------------------------------------------

interface MonthRange {
  start: string; // ISO timestamp at YYYY-MM-01T00:00:00.000Z
  endExclusive: string; // ISO timestamp at next month YYYY-MM-01T00:00:00.000Z
}

function parseMonth(input: string | null): {
  ok: true;
  month: string;
  range: MonthRange;
} | { ok: false } {
  const month = input && input.length > 0 ? input : new Date().toISOString().slice(0, 7);
  const m = MONTH_RE.exec(month);
  if (!m) return { ok: false };
  const year = Number(m[1]);
  const monthIdx = Number(m[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return { ok: false };
  const start = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(year, monthIdx + 1, 1, 0, 0, 0, 0));
  return {
    ok: true,
    month,
    range: {
      start: start.toISOString(),
      endExclusive: endExclusive.toISOString(),
    },
  };
}

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** Mirrors R9.1's hash-stable angle so the PDF snapshot agrees with the live orrery. */
function hashIdToAngleDeg(id: string): number {
  let h = FNV_OFFSET_BASIS;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return ((h >>> 0) % 36000) / 100;
}

function clampTier(raw: number | null): number {
  if (raw === 1 || raw === 2 || raw === 3 || raw === 4) return raw;
  return 4;
}

function isInterviewStatus(status: string | null): boolean {
  return status === "interview_scheduled" || status === "interviewing";
}

function inRange(ts: string | null, range: MonthRange): boolean {
  if (!ts) return false;
  return ts >= range.start && ts < range.endExclusive;
}

type ComputedStats = StateOfMonthStats;

const MIN_TRANSITIONS_FOR_RATE = 3;

function buildStats(rows: ApplicationMonthRow[], range: MonthRange): ComputedStats {
  const total = rows.length;

  // Activity-in-range (created in month or last_activity_at in month). For
  // categorical counts we just look at the status snapshot — the row only
  // ends up in our query if it was created in the month.
  let interviewsBooked = 0;
  let offers = 0;
  let rejections = 0;

  // Stage-transition denominators: who has reached each stage.
  let appliedReached = 0;
  let screeningReached = 0;
  let interviewReached = 0;
  let offerReached = 0;
  let rejectedAfterInterview = 0;

  for (const row of rows) {
    const status = row.status ?? "discovered";
    if (isInterviewStatus(status) && inRange(row.last_activity_at, range)) {
      interviewsBooked += 1;
    }
    if ((status === "offer" || status === "accepted") && inRange(row.last_activity_at, range)) {
      offers += 1;
    }
    if (status === "rejected" && inRange(row.last_activity_at, range)) {
      rejections += 1;
    }

    // Funnel "reached" — a row that's in `screening` has been through `applied`.
    // We treat the order as discovered → applied → screening → interview*/under_review → offer → accepted/rejected/withdrawn.
    if (
      status === "applied" ||
      status === "screening" ||
      status === "interview_scheduled" ||
      status === "interviewing" ||
      status === "under_review" ||
      status === "offer" ||
      status === "accepted" ||
      status === "rejected" ||
      status === "withdrawn"
    ) {
      appliedReached += 1;
    }
    if (
      status === "screening" ||
      status === "interview_scheduled" ||
      status === "interviewing" ||
      status === "under_review" ||
      status === "offer" ||
      status === "accepted"
    ) {
      screeningReached += 1;
    }
    if (
      status === "interview_scheduled" ||
      status === "interviewing" ||
      status === "under_review" ||
      status === "offer" ||
      status === "accepted"
    ) {
      interviewReached += 1;
    }
    if (status === "offer" || status === "accepted") {
      offerReached += 1;
    }
    if (status === "rejected" && interviewReached > offerReached) {
      // not a primary signal — kept for future tightening; intentionally unused.
      rejectedAfterInterview += 1;
    }
  }
  // Touch the variable so the linter is honest about the intermediate accumulator.
  void rejectedAfterInterview;

  const appliedToScreeningRate = appliedReached > 0 ? screeningReached / appliedReached : 0;
  const screeningToInterviewRate = screeningReached > 0 ? interviewReached / screeningReached : 0;
  const interviewToOfferRate = interviewReached > 0 ? offerReached / interviewReached : 0;

  // Strongest / weakest among stages with enough denominator data to be honest.
  interface StageEntry {
    key: StageKey;
    rate: number;
    denom: number;
  }
  const allStages: StageEntry[] = [
    { key: "applied→screening", rate: appliedToScreeningRate, denom: appliedReached },
    { key: "screening→interview", rate: screeningToInterviewRate, denom: screeningReached },
    { key: "interview→offer", rate: interviewToOfferRate, denom: interviewReached },
  ];
  const candidates: StageEntry[] = allStages.filter(
    (s) => s.denom >= MIN_TRANSITIONS_FOR_RATE,
  );

  let strongestStage: StageKey | null = null;
  let weakestStage: StageKey | null = null;
  if (candidates.length > 0) {
    const sorted = [...candidates].sort((a, b) => a.rate - b.rate);
    weakestStage = sorted[0]!.key;
    strongestStage = sorted[sorted.length - 1]!.key;
    if (weakestStage === strongestStage && candidates.length > 1) {
      // Tie / single candidate — leave both set so the report still has signal.
      weakestStage = sorted[0]!.key;
      strongestStage = sorted[sorted.length - 1]!.key;
    }
  }

  return {
    total,
    interviewsBooked,
    offers,
    rejections,
    appliedToScreeningRate,
    screeningToInterviewRate,
    interviewToOfferRate,
    weakestStage,
    strongestStage,
  };
}

function buildPlanetSnapshot(rows: ApplicationMonthRow[]): PlanetSnapshot[] {
  return rows.map((row) => ({
    tier: clampTier(row.tier),
    status: row.status ?? "discovered",
    angleDeg: hashIdToAngleDeg(row.id),
  }));
}

const STAGE_HUMAN: Record<StageKey, string> = {
  "applied→screening": "applied → screening",
  "screening→interview": "screening → interview",
  "interview→offer": "interview → offer",
};

/**
 * Deterministic, template-driven CFO commentary. Numbers come from the user's
 * pipeline; copy varies on offer count and on whether there's a watch-list
 * stage. Anti-pattern guard: never call an LLM here — the partner brief is
 * explicit that this needs to be reproducible from the same inputs.
 */
function buildCfoNote(userName: string, stats: StateOfMonthStats): string {
  const parts: string[] = [];

  if (stats.total === 0) {
    return `${userName}, the month was quiet — no new applications recorded. The cleanest reset is a single deliberate add tomorrow.`;
  }

  parts.push(
    `${userName}, ${stats.total} new application${stats.total === 1 ? "" : "s"} this month, with ${stats.interviewsBooked} interview${stats.interviewsBooked === 1 ? "" : "s"} booked.`,
  );

  if (stats.weakestStage) {
    parts.push(
      `Conversion at the ${STAGE_HUMAN[stats.weakestStage]} stage is the one to watch.`,
    );
  }

  if (stats.offers > 0) {
    parts.push(
      `${stats.offers} offer${stats.offers === 1 ? "" : "s"} landed — well done.`,
    );
  } else {
    parts.push("Keep showing up.");
  }

  return parts.join(" ");
}

function resolveUserName(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string {
  const meta = user.user_metadata ?? {};
  const fullName = (meta.full_name as string | undefined) ?? (meta.name as string | undefined);
  if (fullName && fullName.trim().length > 0) return fullName.trim();
  const email = user.email ?? "";
  if (email.length > 0) {
    const local = email.split("@")[0];
    if (local && local.length > 0) return local;
  }
  return "Operator";
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(req: Request): Promise<Response> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const monthParam = url.searchParams.get("month");
  const parsed = parseMonth(monthParam);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "invalid_month", message: "month must be YYYY-MM with month in 01..12" },
      { status: 400 },
    );
  }
  const { month, range } = parsed;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("id, status, tier, applied_at, last_activity_at, created_at")
    .eq("user_id", user.id)
    .gte("created_at", range.start)
    .lt("created_at", range.endExclusive);

  if (error) {
    log.error("[reports/state-of-month] query failed", error, {
      userId: user.id,
      month,
    });
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const rows = (data ?? []) as ApplicationMonthRow[];
  const stats = buildStats(rows, range);
  const planetSnapshot = buildPlanetSnapshot(rows);
  const userName = resolveUserName(user);
  const cfoNote = buildCfoNote(userName, stats);

  const payload: StateOfMonthData = {
    month,
    userName,
    stats,
    planetSnapshot,
    cfoNote,
  };

  let buffer: Buffer;
  try {
    buffer = await generateStateOfMonthPdf(payload);
  } catch (err) {
    log.error("[reports/state-of-month] render failed", err, {
      userId: user.id,
      month,
    });
    return NextResponse.json(
      {
        error: "render_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="state-of-month-${month}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
