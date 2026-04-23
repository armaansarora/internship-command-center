/**
 * Outreach email delivery via Resend.
 *
 * Called by /api/cron/outreach-sender after the user has approved a draft
 * in the outreach_queue. Separated from the queue state machine so sends
 * can retry safely without risking duplicate deliveries — the cron marks
 * status='sent' only after Resend confirms an id.
 *
 * The "from" address is a Tower-owned sender; the user's own email address
 * is set as reply-to so the recipient's reply lands in the user's inbox.
 * Per-user verified domains are future work — for MVP the tradeoff is an
 * outbound identity that reads "via The Tower" but keeps the conversation
 * going through the user.
 */
import { Resend } from "resend";
import { requireEnv } from "@/lib/env";

const DEFAULT_FROM = "The Tower <outreach@tower.example.com>";

export interface SendOutreachParams {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}

export interface SendOutreachResult {
  messageId: string | null;
}

export async function sendOutreachEmail(
  params: SendOutreachParams
): Promise<SendOutreachResult> {
  const { RESEND_API_KEY } = requireEnv(["RESEND_API_KEY"] as const);
  const from = process.env.OUTREACH_EMAIL_FROM ?? DEFAULT_FROM;

  const resend = new Resend(RESEND_API_KEY);
  const result = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    text: params.body,
    replyTo: params.replyTo ?? undefined,
  });

  if (result.error) {
    throw new Error(`resend: ${result.error.message}`);
  }

  return { messageId: result.data?.id ?? null };
}
