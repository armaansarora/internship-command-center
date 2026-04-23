/**
 * First-run Job Discovery bootstrap — the Tower's autonomy proof.
 *
 * Called the moment Otis completes his conversation with a new guest.
 * The target profile has just been written (via the Concierge extract
 * route). This function fires the SAME pipeline the 4-hour cron job
 * uses (`runJobDiscoveryForUser`), then returns a summary of what was
 * discovered. The client uses the returned `newApplications` + `topScore`
 * as a signal to the first-run Morning Briefing override (R4.6).
 *
 * This is the Tower's "Inngest-equivalent" trigger. We invoke the
 * discovery runner directly — no mocked candidates, no stubbed scores,
 * no fake applications. The applications this inserts are the same
 * rows the War Room reads for the rest of the account's lifetime.
 *
 * Timing: the runner can take 15–45 s end-to-end depending on source
 * responsiveness. It sits inside the `maxDuration = 300` envelope of
 * the route that calls it.
 */
import {
  runJobDiscoveryForUser,
  type DiscoveryRunResult,
} from "@/lib/jobs/discovery";
import { log } from "@/lib/logger";

export interface BootstrapDiscoveryResult {
  ok: boolean;
  newApplications: number;
  candidatesSeen: number;
  topScore: number | null;
  durationMs: number;
  error?: string;
}

export async function runBootstrapDiscovery(
  userId: string,
): Promise<BootstrapDiscoveryResult> {
  const startedAt = Date.now();
  try {
    const result: DiscoveryRunResult = await runJobDiscoveryForUser(userId);
    const durationMs = Date.now() - startedAt;
    log.info("onboarding.bootstrap.complete", {
      userId,
      newApplications: result.newApplications,
      candidatesSeen: result.candidatesSeen,
      topScore: result.topScore,
      durationMs,
    });
    return {
      ok: true,
      newApplications: result.newApplications,
      candidatesSeen: result.candidatesSeen,
      topScore: result.topScore,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    log.error("onboarding.bootstrap.failed", err, { userId, durationMs });
    return {
      ok: false,
      newApplications: 0,
      candidatesSeen: 0,
      topScore: null,
      durationMs,
      error: message,
    };
  }
}
