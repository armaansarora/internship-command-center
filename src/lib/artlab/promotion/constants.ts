/**
 * The exact phrase a human must reply to promote a run to `public/art/`.
 *
 * This literal is the linchpin of the promotion firewall — every gate, parser,
 * receipt, template, and ledger entry that mentions promotion checks against
 * it. Drift between any two sites would let a near-miss reply pass one check
 * and fail another, leaving runs stuck or, worse, promoting silently.
 *
 * Import this constant everywhere instead of repeating the string literal.
 *
 * Cross-cutting copy (Telegram message bodies, smoke step labels, help text)
 * that needs to *display* the phrase to a human MUST also use this constant
 * so a future rename propagates everywhere atomically.
 *
 * Type is `"approved for app"` — the literal type — so any contract field that
 * declares `requiresExactApprovalPhrase: "approved for app"` still matches
 * structurally when assigned `REQUIRED_PROMOTION_PHRASE`.
 *
 * See: docs/artlab/CHARACTER-PIPELINE.md (Two human gates), Unit 8
 * of docs/superpowers/plans/2026-05-27-artlab-system-fixes.md.
 */
export const REQUIRED_PROMOTION_PHRASE = "approved for app" as const;

export type RequiredPromotionPhrase = typeof REQUIRED_PROMOTION_PHRASE;
