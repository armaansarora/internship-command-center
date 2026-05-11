/**
 * Owner Watchdog digest — Lighthouse alert delivery via Resend.
 *
 * Called by /api/cron/owner-watchdog once per tick when one or more
 * incidents have opened, recovered, or hit their 6-hour reminder.
 *
 * Fails OPEN on a missing RESEND_API_KEY: rather than crash the watchdog
 * tick on a bare bootstrap (RESEND not yet provisioned in a fresh env),
 * the helper short-circuits with `{ skipped: true }` so the caller can
 * proceed without an outbound email. The route owns the "log a warning"
 * decision; this helper only refuses to send.
 *
 * On hard delivery failure (transport error from Resend) the helper
 * returns `{ skipped: false, messageId: null, error }`. The route logs
 * the failure but treats it as recoverable — the next 30-minute tick
 * will retry.
 */
import { Resend } from "resend";
import { env } from "@/lib/env";

/**
 * One incident formatted for the digest body. Mirrors the columns the
 * watchdog cares about (job_name + opened_at + last seen value); other
 * fields stay private to the watchdog state machine.
 */
export interface OwnerDigestIncident {
  jobName: string;
  openedAt: string;
  lastSeenValue: string | null;
}

export type OwnerDigestKind = "detected" | "recovered" | "reminder";

export interface OwnerDigestParams {
  to: string;
  from: string;
  kind: OwnerDigestKind;
  incidents: OwnerDigestIncident[];
}

export interface OwnerDigestResult {
  /** True when the helper deliberately did NOT call Resend (missing key). */
  skipped: boolean;
  /** Populated when Resend accepted the email. */
  messageId: string | null;
  /** Populated when Resend rejected the email. */
  error: string | null;
}

/**
 * Compose the Subject line. Format mirrors the watchdog brief:
 *   - "[Tower watchdog] N incident(s) detected"
 *   - "[Tower watchdog] N incident(s) recovered"
 *   - "[Tower watchdog] N incident(s) still open — reminder"
 */
export function buildSubject(kind: OwnerDigestKind, count: number): string {
  const noun = count === 1 ? "incident" : "incidents";
  switch (kind) {
    case "detected":
      return `[Tower watchdog] ${count} ${noun} detected`;
    case "recovered":
      return `[Tower watchdog] ${count} ${noun} recovered`;
    case "reminder":
      return `[Tower watchdog] ${count} ${noun} still open — reminder`;
  }
}

/**
 * Compose the plain-text body. One line per incident — `job_name`,
 * opened_at ISO timestamp, and (when available) the last-seen value.
 */
export function buildBody(
  kind: OwnerDigestKind,
  incidents: OwnerDigestIncident[],
): string {
  const header =
    kind === "recovered"
      ? "The following incidents have recovered:"
      : kind === "reminder"
      ? "The following incidents are still open (6h reminder):"
      : "The following incidents have been detected:";

  const lines = incidents.map((inc) => {
    const tail = inc.lastSeenValue ? ` — last seen: ${inc.lastSeenValue}` : "";
    return `• ${inc.jobName} (opened ${inc.openedAt})${tail}`;
  });

  return [
    header,
    "",
    ...lines,
    "",
    "— The Tower Watchdog",
  ].join("\n");
}

/**
 * Send the digest. Returns `{ skipped: true }` when RESEND_API_KEY is
 * unset; otherwise relays Resend's outcome. Never throws — the caller's
 * cron tick is required to return 200 + counters regardless of email
 * outcome.
 */
export async function sendOwnerDigest(
  params: OwnerDigestParams,
): Promise<OwnerDigestResult> {
  if (params.incidents.length === 0) {
    return { skipped: true, messageId: null, error: null };
  }

  const apiKey = env().RESEND_API_KEY;
  if (!apiKey) {
    return { skipped: true, messageId: null, error: null };
  }

  const subject = buildSubject(params.kind, params.incidents.length);
  const body = buildBody(params.kind, params.incidents);

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: params.from,
      to: params.to,
      subject,
      text: body,
    });

    if (result.error) {
      return {
        skipped: false,
        messageId: null,
        error: result.error.message,
      };
    }

    return {
      skipped: false,
      messageId: result.data?.id ?? null,
      error: null,
    };
  } catch (err) {
    return {
      skipped: false,
      messageId: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
