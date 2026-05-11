/**
 * Rolling-invite email body — composed by /api/cron/rolling-invites when the
 * waitlist daemon pulls the next N rows off the queue.
 *
 * Voice: concierge / doorman. The whole point of the building metaphor is
 * that a Tower invite reads like an arrival summons, not a SaaS activation
 * email. Four sentences max, sign-off "— The Tower". Keep it stable — copy
 * here cascades into every invited user's first impression and there is no
 * versioned A/B harness yet to safely churn it.
 *
 * Two render paths: `buildText` (always safe) and `buildHtml` (richer
 * presentation for inbox clients that prefer multipart). Resend accepts both
 * `text` and `html` on the same payload; the cron passes both so every
 * client has the format it prefers.
 */
import { GATE_CONFIG } from "@/lib/config/gate-config";

export interface InviteTemplateParams {
  /** Recipient email — surfaced only for debug; never inlined into copy. */
  email: string;
  /** Concierge URL with the invite token query param. Already absolute. */
  inviteUrl: string;
}

/**
 * Subject line is shared across both render paths so a single regression test
 * can pin it. Read-only on purpose — the cron route passes this verbatim into
 * Resend so any change here is observable in the test suite first.
 */
export const INVITE_SUBJECT = "You're in: The Tower is open for you";

/** Sign-off mirrors the Lighthouse Watchdog convention. Em dash deliberate. */
const SIGN_OFF = "— The Tower";

/**
 * Plain-text body. Four sentences, doorman cadence, ends with the URL on its
 * own line because some text-only clients (terminal mail, plain Gmail
 * fallback) don't auto-link inline. The "no action needed" beat is a soft
 * out for invitees who signed up months ago and have moved on — the worst
 * outcome we want is silence, not a forced click.
 */
export function buildText(params: InviteTemplateParams): string {
  return [
    "Your name has come up at the desk.",
    "The Tower is open for you — your floor pass is ready whenever you'd like to step inside.",
    `Take the elevator from the lobby: ${params.inviteUrl}`,
    "If you'd rather wait, no action needed; the door will stay propped for you.",
    "",
    SIGN_OFF,
  ].join("\n");
}

/**
 * HTML body. Single-column, brand colors pulled from the Tower design system
 * tokens, button styled as a doorman badge. Inline styles only — every major
 * mail client (Gmail, Outlook, Apple Mail, Yahoo) strips `<style>` blocks and
 * external CSS. The wrapper table is the legacy bulletproof container most
 * inboxes still render predictably.
 *
 * Token interpolation: `inviteUrl` is the only dynamic surface and is
 * HTML-escaped at the boundary. Email recipients are never echoed back into
 * the body to avoid a trivial reflected-injection vector if the address ever
 * carried HTML.
 */
export function buildHtml(params: InviteTemplateParams): string {
  const url = escapeHtml(params.inviteUrl);
  const brand = GATE_CONFIG.brand.name;
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(INVITE_SUBJECT)}</title>`,
    "</head>",
    '<body style="margin:0;padding:0;background-color:#0F0F1A;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;color:#F4F1E8;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0F0F1A;padding:48px 16px;">',
    "<tr><td align=\"center\">",
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="background-color:#1A1A2E;border:1px solid rgba(201,168,76,0.18);border-radius:6px;padding:48px 40px;">',
    "<tr><td>",
    `<div style="font-family:'Courier New',monospace;font-size:10px;color:rgba(201,168,76,0.6);letter-spacing:0.24em;text-transform:uppercase;margin-bottom:32px;">${escapeHtml(brand)} — Concierge</div>`,
    '<p style="margin:0 0 18px 0;font-size:18px;line-height:1.55;color:#F4F1E8;">Your name has come up at the desk.</p>',
    '<p style="margin:0 0 18px 0;font-size:16px;line-height:1.55;color:#D6D2C4;">The Tower is open for you — your floor pass is ready whenever you\'d like to step inside.</p>',
    '<p style="margin:32px 0;text-align:center;">',
    `<a href="${url}" style="display:inline-block;padding:14px 28px;background-color:#C9A84C;color:#0F0F1A;font-size:14px;font-weight:600;text-decoration:none;border-radius:4px;letter-spacing:0.04em;">Take the elevator up</a>`,
    "</p>",
    '<p style="margin:0 0 18px 0;font-size:14px;line-height:1.55;color:#A8A498;">If your client hides the button, the door is at:</p>',
    `<p style="margin:0 0 24px 0;font-size:13px;line-height:1.55;word-break:break-all;"><a href="${url}" style="color:#C9A84C;text-decoration:underline;">${url}</a></p>`,
    '<p style="margin:0 0 32px 0;font-size:14px;line-height:1.55;color:#A8A498;">If you\'d rather wait, no action needed; the door will stay propped for you.</p>',
    `<p style="margin:0;font-size:14px;line-height:1.55;color:#C9A84C;letter-spacing:0.02em;">${escapeHtml(SIGN_OFF)}</p>`,
    "</td></tr>",
    "</table>",
    "</td></tr>",
    "</table>",
    "</body>",
    "</html>",
  ].join("");
}

/**
 * Minimal HTML entity escape. Sufficient for attribute + text contexts the
 * template uses; the only interpolated surface is the invite URL (an
 * application-generated absolute URL) and the brand name (a const string).
 * Kept private — `@/lib/audit/pii-redact` is the project's broader sanitizer,
 * but pulling it in for two known-safe substitutions would be overkill.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
