import { z } from "zod/v4";

/**
 * LEGAL cadence — counsel-gated yearly review.
 *
 * THIS FILE OWNS: jurisdiction, legal-entity name, refund language,
 * eligibility minimums, retention SLAs, sub-processor list.
 *
 * Touch this file only when:
 *   • the legal entity changes (e.g., sole prop → DE C-corp),
 *   • governing law / jurisdiction changes,
 *   • a sub-processor is added/removed,
 *   • a retention window or rights-request SLA shifts,
 *   • refund policy language is reworded.
 *
 * NEVER add brand strings, beta-gate state, pricing numbers, or feature
 * flags here. Those belong in gate-config.ts (operational) or
 * pricing-config.ts (revenue).
 *
 * CODEOWNERS protects this file. PRs require @armaansarora review.
 */
const SubProcessorSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
  privacyUrl: z.string().url(),
}).strict();

export const LegalConfigSchema = z.object({
  entity: z.object({
    legalEntity: z.string().min(1),
    governingLaw: z.string().min(1),
    supportEmail: z.string().email(),
    legalRevisedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date required"),
  }).strict(),
  refund: z.object({
    headline: z.string().min(1),
    body: z.string().min(20),
  }).strict(),
  eligibility: z.object({
    minimumAge: z.number().int().min(13).max(18),
  }).strict(),
  retention: z.object({
    softDeleteDays: z.number().int().positive(),
    rightsRequestSlaDays: z.number().int().positive(),
  }).strict(),
  subProcessors: z.array(SubProcessorSchema).min(1),
}).strict();

export const LEGAL_CONFIG = {
  entity: {
    legalEntity: "The Tower (Armaan Arora, sole proprietor)",
    /**
     * Jurisdiction governing ToS. Currently New York while sole-proprietor.
     * NOTE: switch to "the State of Delaware, United States" once
     * incorporated as a Delaware C-corp.
     */
    governingLaw: "the State of New York, United States",
    supportEmail: "hello@interntower.com",
    /** Last revision date for legal docs. Bump whenever copy changes. */
    legalRevisedOn: "2026-04-25",
  },
  refund: {
    headline: "Cancel anytime through Settings → Billing.",
    body: "Subscriptions are billed monthly or annually and renew automatically until canceled. Cancel anytime through Settings → Billing — your access continues through the end of the current paid period, then stops. We do not refund partial periods.",
  },
  eligibility: {
    /**
     * Minimum age. Single-checkbox at signup.
     * 13 = COPPA threshold (US). EU GDPR-K sets 16 in some countries —
     * flagged in privacy.ts as a [REVIEW] item if you target the EU heavily.
     */
    minimumAge: 13,
  },
  retention: {
    softDeleteDays: 30,
    rightsRequestSlaDays: 30,
  },
  subProcessors: [
    { name: "Supabase", purpose: "Database, authentication, file storage", privacyUrl: "https://supabase.com/privacy" },
    { name: "Vercel", purpose: "Application hosting, serverless functions, edge", privacyUrl: "https://vercel.com/legal/privacy-policy" },
    { name: "Anthropic", purpose: "AI agents (Claude)", privacyUrl: "https://www.anthropic.com/legal/privacy" },
    { name: "OpenAI", purpose: "Embeddings, voice transcription (Whisper)", privacyUrl: "https://openai.com/policies/privacy-policy" },
    { name: "Firecrawl", purpose: "Compensation data scraping (Levels.fyi)", privacyUrl: "https://www.firecrawl.dev/privacy" },
    { name: "Resend", purpose: "Transactional and outreach email", privacyUrl: "https://resend.com/legal/privacy-policy" },
    { name: "Sentry", purpose: "Error tracking and observability", privacyUrl: "https://sentry.io/privacy/" },
    { name: "Stripe", purpose: "Subscription billing", privacyUrl: "https://stripe.com/privacy" },
    { name: "Plausible", purpose: "Privacy-first traffic analytics (no cookies, no PII)", privacyUrl: "https://plausible.io/privacy" },
  ],
} as const;

export type LegalConfig = typeof LEGAL_CONFIG;
