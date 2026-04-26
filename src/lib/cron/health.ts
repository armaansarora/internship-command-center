import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { log } from "@/lib/logger";

/**
 * Cron health monitoring — every Vercel Cron invocation logs a row into
 * `public.cron_runs` so the owner can spot a silently-failing job before a
 * user notices.
 *
 * Wrap an existing cron route handler:
 *
 * ```ts
 * import { withCronHealth } from "@/lib/cron/health";
 *
 * export const GET = withCronHealth("warmth-decay", async (req) => {
 *   // existing handler body
 *   return NextResponse.json({ ok: true });
 * });
 * ```
 *
 * The wrapper runs your handler verbatim. It catches anything thrown,
 * records success/failure + duration + first 500 chars of the error, and
 * re-throws so Vercel still sees the failure (which keeps Vercel's own
 * cron retry/alert behavior intact).
 *
 * `metadata` is an optional structured field if your handler wants to
 * leave breadcrumbs (e.g., rows-processed). Pass it via `setCronMeta`
 * inside the handler scope.
 */
type CronHandler<Req extends Request = Request, Res extends Response = Response> = (
  req: Req,
) => Promise<Res> | Res;

const CRON_META_REGISTRY = new WeakMap<Request, Record<string, unknown>>();

export function setCronMeta(req: Request, meta: Record<string, unknown>): void {
  const existing = CRON_META_REGISTRY.get(req) ?? {};
  CRON_META_REGISTRY.set(req, { ...existing, ...meta });
}

export function withCronHealth<Req extends Request, Res extends Response>(
  jobName: string,
  handler: CronHandler<Req, Res>,
): CronHandler<Req, Res> {
  return async (req) => {
    const startedAt = new Date();
    const t0 = performance.now();
    let success = false;
    let errorMessage: string | null = null;

    try {
      const response = await handler(req);
      success = response.ok || (response.status >= 200 && response.status < 400);
      if (!success) {
        try {
          // Best-effort body capture for non-2xx responses. Clone so we don't
          // consume the body we're about to return.
          const cloned = response.clone();
          const text = await cloned.text();
          errorMessage = text.slice(0, 500);
        } catch {
          // Ignore — body unavailable doesn't matter.
        }
      }
      return response;
    } catch (err) {
      success = false;
      errorMessage = err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500);
      throw err;
    } finally {
      const durationMs = Math.round(performance.now() - t0);
      const meta = CRON_META_REGISTRY.get(req) ?? null;
      // Fire-and-forget — never block the cron response on telemetry.
      void recordCronRun({
        jobName,
        startedAt,
        success,
        errorMessage,
        durationMs,
        metadata: meta,
      });
    }
  };
}

interface CronRunRecord {
  jobName: string;
  startedAt: Date;
  success: boolean;
  errorMessage: string | null;
  durationMs: number;
  metadata: Record<string, unknown> | null;
}

async function recordCronRun(record: CronRunRecord): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("cron_runs").insert({
      job_name: record.jobName,
      started_at: record.startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      success: record.success,
      error_message: record.errorMessage,
      duration_ms: record.durationMs,
      metadata: record.metadata,
    });
  } catch (err) {
    // The point of this table is observability. If logging itself fails,
    // log to the regular logger and move on — never crash the cron because
    // we couldn't write its breadcrumb.
    log.error("cron_health.insert_failed", {
      jobName: record.jobName,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
