/**
 * Stripe sends the same webhook event id on retries. We insert a row first,
 * then process. If processing fails, status becomes "failed" and Stripe
 * retries — the insert hits a unique constraint, so we must still run the
 * handler again. If another invocation is mid-flight ("received"), we ack
 * without re-running unless the row looks stale (crashed worker).
 */

export const STALE_RECEIVED_MS = 120_000;

export type StripeWebhookEventRow = {
  status: string;
  /** Prefer updated_at, else created_at — ISO timestamp from Postgres */
  receivedAt: string | null | undefined;
};

export type StripeWebhookDuplicateDecision =
  | "ack_duplicate"
  | "ack_in_flight"
  | "retry_processing";

export function stripeWebhookDuplicateDecision(
  row: StripeWebhookEventRow,
  nowMs: number,
): StripeWebhookDuplicateDecision {
  if (row.status === "processed") return "ack_duplicate";
  if (row.status === "failed") return "retry_processing";
  if (row.status === "received") {
    const t = row.receivedAt ? Date.parse(row.receivedAt) : NaN;
    if (!Number.isFinite(t)) return "retry_processing";
    if (nowMs - t > STALE_RECEIVED_MS) return "retry_processing";
    return "ack_in_flight";
  }
  return "ack_in_flight";
}
