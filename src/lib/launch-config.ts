/**
 * Launch configuration — the single tweak knob.
 *
 * Every business decision the partner-brief flagged as "user must answer" lives
 * here. Defaults are the launch-ready document's recommendations. Change a
 * value here and the rest of the app picks it up: pricing pages, legal copy,
 * rate limits, feature flags, footer copy, and metadata.
 *
 * If you find yourself wanting to hardcode a launch-related string somewhere
 * in src/, look here first. If it's not here, add it here.
 *
 * --
 *
 * Changes here propagate at request time (server pages) and at build time
 * (metadata, sitemap). No restart needed for dev. For production, redeploy.
 */
export const LAUNCH_CONFIG = {
  /* ─── Brand ──────────────────────────────────────────────────────── */
  brand: {
    name: "The Tower",
    tagline: "An immersive command center for the internship search.",
    domain: "thetower.app",
    /** Used for canonical URLs, OG tags, sitemap. Override per-env via NEXT_PUBLIC_APP_URL. */
    url: () => process.env.NEXT_PUBLIC_APP_URL ?? "https://thetower.app",
    /** Single channel users can reach you. */
    supportEmail: "hello@thetower.app",
    /** Sender for transactional Resend emails. */
    senderEmail: "concierge@thetower.app",
    /** Legal entity name for ToS / Privacy. Update once incorporated. */
    legalEntity: "The Tower (Armaan Arora, sole proprietor)",
    /** Jurisdiction governing ToS. Update if you incorporate elsewhere. */
    governingLaw: "the State of California, United States",
    /** Last revision date for legal docs. Bump whenever copy changes. */
    legalRevisedOn: "2026-04-25",
  },

  /* ─── Beta gate ──────────────────────────────────────────────────── */
  beta: {
    /**
     * "open"     — anyone with a Google account signs up immediately
     * "waitlist" — signups go to waitlist_signups; admin invites manually
     * "rolling"  — waitlist_signups; cron invites N/day automatically
     */
    mode: "waitlist" as "open" | "waitlist" | "rolling",
    /** Used when mode === "rolling". Cron consumes this many invites/day. */
    rollingInvitesPerDay: 25,
  },

  /* ─── Pricing ────────────────────────────────────────────────────── */
  pricing: {
    /** USD/month. Source for pricing page copy. Stripe priceIds are in src/lib/stripe/config.ts and must match. */
    free: { price: 0, name: "Free" },
    pro: { price: 29, name: "Pro" },
    team: { price: 79, name: "Team" },

    /** Free tier hard-caps. Surfaced on /pricing. */
    freeAppCap: 10,
    freeAiCallsPerDay: 50,

    /** Trial: "none" means free tier IS the trial. */
    trial: "none" as "none" | "14-card" | "7-no-card",

    /** Annual discount (0 disables the annual toggle). */
    annualDiscountPct: 0,

    /** Refund headline + body for /terms. */
    refundHeadline: "Cancel anytime through Settings → Billing.",
    refundBody:
      "Subscriptions are billed monthly and renew automatically until canceled. Canceling stops the next renewal; we do not refund partial months. If Pro hasn't helped you land an interview within 30 days of your first paid month, email " +
      "hello@thetower.app — we will refund that first month, no friction.",
  },

  /* ─── Eligibility ────────────────────────────────────────────────── */
  eligibility: {
    /** Minimum age. Single-checkbox at signup. */
    minimumAge: 16,
    /** Excluded jurisdictions if any (e.g., sanctioned countries). Empty by default. */
    blockedCountries: [] as string[],
  },

  /* ─── Cost caps (defense against runaway AI bills) ──────────────── */
  costCaps: {
    /** Hard cap per Free-tier user per UTC day. Surfaced as a quota. */
    freeAiCallsPerDay: 50,
    /** Pro/Team are de-facto unlimited; we still cap to defend against abuse. */
    paidAiCallsPerDay: 1000,
    /** When Firecrawl runs out, /api/comp-bands/lookup returns graceful-empty (no crash). */
    firecrawlMonthlyCredits: 500,
  },

  /* ─── Data retention ─────────────────────────────────────────────── */
  retention: {
    /** Soft-delete window before hard purge. Surfaced in /privacy. */
    softDeleteDays: 30,
    /** GDPR/CCPA SLA for export + delete fulfillment. */
    rightsRequestSlaDays: 30,
  },

  /* ─── Sub-processors (rendered on /privacy) ──────────────────────── */
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

  /* ─── Feature flags for launch ───────────────────────────────────── */
  flags: {
    /** Surface pricing page publicly. False until Stripe live mode is confirmed. */
    pricingPublic: true,
    /** Surface waitlist form. */
    waitlistPublic: true,
    /** Plausible analytics. Off if NEXT_PUBLIC_PLAUSIBLE_DOMAIN unset. */
    plausibleEnabled: () => !!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
  },
} as const;

export type LaunchConfig = typeof LAUNCH_CONFIG;
export type BetaMode = LaunchConfig["beta"]["mode"];
export type TrialMode = LaunchConfig["pricing"]["trial"];
