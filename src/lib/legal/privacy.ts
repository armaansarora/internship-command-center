import { LAUNCH_CONFIG } from "@/lib/launch-config";

/**
 * Privacy Policy — source of truth. Renders into /privacy.
 *
 * Sections marked [REVIEW] are the ones an attorney should look at before
 * launch. The rest is a Termly-style skeleton tightened to The Tower's
 * actual data flows (R8 Rolodex, R11 cross-user matching, encrypted OAuth
 * tokens, pgvector embeddings).
 *
 * Update LAUNCH_CONFIG values rather than hand-editing strings here when the
 * change is a parameter (entity name, retention days, sub-processor list).
 * Hand-edit only when the legal substance itself changes.
 */
export const PRIVACY_POLICY = {
  revisedOn: LAUNCH_CONFIG.brand.legalRevisedOn,
  sections: [
    {
      heading: "Who we are",
      body: [
        `${LAUNCH_CONFIG.brand.legalEntity} ("we," "us," "${LAUNCH_CONFIG.brand.name}") operates ${LAUNCH_CONFIG.brand.url()} and the application accessible there. This policy explains what we collect, why, who we share it with, and the rights you have over it.`,
        `Questions: ${LAUNCH_CONFIG.brand.supportEmail}.`,
      ],
    },
    {
      heading: "What we collect",
      body: [
        "Account data: your email address and any profile details you supply (name, target role, location).",
        "Authentication tokens: when you connect Google, LinkedIn, Gmail, or Calendar, we store the OAuth access and refresh tokens issued to us by those providers. Tokens are encrypted at rest with AES-256-GCM using a key held in our serverless environment, never in the database itself.",
        "Application data: every job application, contact, conversation, interview, offer, and document you create or upload while using the product.",
        "Resumes and cover letters: PDF and DOCX files you upload, plus any content the writing tools generate from them.",
        "Derived embeddings: we generate vector embeddings (numeric fingerprints) of resumes, job descriptions, and company profiles to power similarity search. Embeddings are derived data, not raw text, but they can carry information about the source.",
        "Voice recordings (only if you opt in): when you enable voice mode in the Briefing Room, we accept audio uploads and send them to a transcription provider. Audio is stored only long enough to transcribe.",
        "Operational metadata: timestamps, error events, request paths. We do not retain full request bodies and we do not log personally identifying information beyond what the route needs.",
      ],
    },
    {
      heading: "How we use it",
      body: [
        "To run the product: persist your data, generate AI agent responses, send transactional email, present pages back to you.",
        "To run scheduled work: sync inboxes, generate briefs, decay contact warmth, and other background jobs that you can review and pause in Settings.",
        "To improve reliability: capture errors via Sentry so we can fix bugs.",
        "To bill you: pass your customer ID and subscription state to Stripe.",
        "We do not sell your data. We do not use your application content to train AI models. Anthropic, OpenAI, and other providers process your inputs under their own no-training commitments to us.",
      ],
    },
    {
      heading: "Cross-user warm-intro matching (R11)",
      body: [
        "If you opt in to cross-user warm-intro matching, the product will look across all consenting users for second-degree connections that could warm-introduce you to a target company.",
        "The matching is anonymized: we hash each contact identifier client-side using a per-user salt before any cross-user comparison. The other party never sees your raw contact list, and you never see theirs. The system surfaces only that a match exists, the warmth signal strength, and the company in common.",
        "You can revoke cross-user matching consent at any time in Settings → Networking. On revocation, your contacts are purged from the matching index, and any cached match candidates derived from your contacts are deleted from other users' caches as well.",
        "We require explicit re-consent (current consent version: 2) when material changes are made to how matching works.",
      ],
    },
    {
      heading: "Rolodex contact sharing (R8)",
      body: [
        "The Rolodex Lounge stores the contacts you add. By default, contacts are private to you.",
        "Notes you mark as private (the sticky-note field) are doubly scoped: only you, the owning user, can read them. We have written grep-level guards into our codebase to prevent any future feature from inadvertently reading or shipping private notes.",
        "Sharing a contact for cross-user matching purposes is a separate, opt-in toggle and is governed by the matching section above.",
      ],
    },
    {
      heading: "Sharing with sub-processors",
      body: [
        "We use the following sub-processors to operate the product. Each is contractually bound to handle your data only for the purpose listed.",
        ...LAUNCH_CONFIG.subProcessors.map(
          (sp) => `${sp.name} — ${sp.purpose}. Privacy policy: ${sp.privacyUrl}`,
        ),
        "[REVIEW] Update this list whenever a new provider is added.",
      ],
    },
    {
      heading: "Cookies and storage",
      body: [
        "We use first-party cookies issued by Supabase Auth to maintain your session. These cookies are essential for the product to function and are not used for advertising or cross-site tracking.",
        "We use sessionStorage to remember whether you have already watched the lobby entrance animation in the current tab. This is a single boolean and is cleared when the tab closes.",
        "We do not use third-party tracking cookies. Our analytics provider, Plausible, is cookie-less.",
      ],
    },
    {
      heading: "Data retention",
      body: [
        `When you delete your account, we soft-delete your data immediately (you stop being able to read or write to it). We hard-purge soft-deleted data after ${LAUNCH_CONFIG.retention.softDeleteDays} days.`,
        "Some operational logs (Sentry error events, Vercel platform logs) are retained on our providers' default schedules — typically 30-90 days — outside our direct control.",
        "Encrypted OAuth tokens are deleted from our database within minutes of disconnecting an integration in Settings.",
      ],
    },
    {
      heading: "Your rights",
      body: [
        `You can export your data at any time from Settings → Account → Export. The export is a zip of your account in machine-readable format and is delivered immediately for small accounts; larger accounts arrive via email within ${LAUNCH_CONFIG.retention.rightsRequestSlaDays} days.`,
        `You can delete your account from Settings → Account → Delete. We honor this within ${LAUNCH_CONFIG.retention.rightsRequestSlaDays} days; in practice the soft-delete is immediate.`,
        `California residents (CCPA), EU/UK residents (GDPR), and other jurisdictions with equivalent rights have the additional rights to access, correct, and restrict processing of your data. To exercise these, email ${LAUNCH_CONFIG.brand.supportEmail}.`,
        "We do not respond differently to Do-Not-Track signals because we do not engage in tracking that the signal is intended to address.",
      ],
    },
    {
      heading: "Security",
      body: [
        "OAuth tokens are encrypted at rest with AES-256-GCM. The encryption key is held in our serverless environment as a secret and never written to the database.",
        "All traffic is HTTPS. We enforce HTTP Strict Transport Security with a two-year max-age and the preload directive.",
        "We enforce row-level security at the database layer: every row in every user-owned table is gated by the authenticated user's identifier. A query without a session cannot return another user's row, by construction.",
        "We have shipped a hardening pass (R12) that includes 36+ adversarial end-to-end scenarios across security, abuse, concurrency, scale, and failure modes. We continue to add to it.",
        "[REVIEW] Add an incident-disclosure timeline once you have a recommended one (typically 'we will notify you within 72 hours of confirming a material breach affecting your data').",
      ],
    },
    {
      heading: "Children",
      body: [
        `${LAUNCH_CONFIG.brand.name} is not directed at children under ${LAUNCH_CONFIG.eligibility.minimumAge}. If you are under ${LAUNCH_CONFIG.eligibility.minimumAge}, do not create an account. If we learn we have collected personal information from a person under ${LAUNCH_CONFIG.eligibility.minimumAge}, we will delete it.`,
      ],
    },
    {
      heading: "International transfers",
      body: [
        "Our infrastructure is hosted primarily in the United States (Supabase, Vercel default regions). If you access the product from outside the United States, your data will be transferred to and processed in the United States.",
        "[REVIEW] If you target EU users heavily, you'll want a Standard Contractual Clauses (SCC) addendum here. Skippable until you do.",
      ],
    },
    {
      heading: "Changes to this policy",
      body: [
        "When we change this policy, we'll update the date at the top and post a notice in the product. Material changes (new categories of collection, new sub-processors with sensitive scope) will require re-consent before they take effect for you.",
      ],
    },
    {
      heading: "Contact",
      body: [
        `Questions about this policy or your data: ${LAUNCH_CONFIG.brand.supportEmail}.`,
        `Last revised: ${LAUNCH_CONFIG.brand.legalRevisedOn}.`,
      ],
    },
  ],
} as const;

export type PrivacyPolicy = typeof PRIVACY_POLICY;
