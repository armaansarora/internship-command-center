import { NextResponse, type NextRequest } from "next/server";
import { verifyCronRequest } from "@/lib/auth/cron";
import { listUserIdsWithTargetProfile } from "@/lib/db/queries/job-discovery-rest";
import { runJobDiscoveryForUser } from "@/lib/jobs/discovery";
import { log } from "@/lib/logger";

/**
 * GET /api/cron/job-discovery
 *
 * Runs Job Discovery for every user whose CRO has a target profile on
 * record. Scheduled by Vercel Cron (see vercel.json — every 4 hours).
 *
 * Non-fatal on per-user failure: one user blowing up does not stop the
 * batch. Each user run is bounded by DISCOVERY_MAX_NEW_PER_RUN so a cold
 * profile never floods the war-table on first hit.
 *
 * Auth: `verifyCronRequest` enforces Bearer CRON_SECRET OR x-vercel-cron: 1.
 */
export const maxDuration = 300;

export async function GET(
  req: NextRequest
): Promise<NextResponse> {
  const guard = verifyCronRequest(req);
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.error ?? "unauthorized" },
      { status: 401 }
    );
  }

  const startedAt = Date.now();
  const userIds = await listUserIdsWithTargetProfile();

  const results: Array<{
    userId: string;
    newApplications: number;
    candidatesSeen: number;
    topScore: number | null;
    error?: string;
  }> = [];

  for (const userId of userIds) {
    try {
      const r = await runJobDiscoveryForUser(userId);
      results.push({
        userId,
        newApplications: r.newApplications,
        candidatesSeen: r.candidatesSeen,
        topScore: r.topScore,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error("job_discovery.cron_user_failed", err, { userId });
      results.push({
        userId,
        newApplications: 0,
        candidatesSeen: 0,
        topScore: null,
        error: msg,
      });
    }
  }

  const totalNew = results.reduce((acc, r) => acc + r.newApplications, 0);
  const durationMs = Date.now() - startedAt;
  log.info("job_discovery.cron_complete", {
    users: userIds.length,
    totalNew,
    durationMs,
  });

  return NextResponse.json({
    ok: true,
    users: userIds.length,
    totalNew,
    durationMs,
    results,
  });
}
