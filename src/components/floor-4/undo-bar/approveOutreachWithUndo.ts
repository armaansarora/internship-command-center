"use client";

export interface ApproveResult {
  id: string;
  sendAfterIso: string;
}

/**
 * Client-side approval with REAL undo.
 *
 * POSTs to /api/outreach/approve, which stamps send_after = now + 30s on
 * the outreach_queue row. The cron sender's predicate (`send_after <= now`)
 * means the row cannot be dispatched until the window closes. The returned
 * sendAfterIso drives the Situation Room's UndoBar countdown.
 *
 * Throws on non-OK — callers show an in-world error (no toast) or let the
 * UndoBar's too_late phase pick up a downstream undo failure.
 */
export async function approveOutreachWithUndo(
  outreachId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ApproveResult> {
  const response = await fetchImpl("/api/outreach/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: outreachId }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `approve_failed_${response.status}`);
  }
  const body = (await response.json()) as { id: string; sendAfter: string };
  return { id: body.id, sendAfterIso: body.sendAfter };
}
