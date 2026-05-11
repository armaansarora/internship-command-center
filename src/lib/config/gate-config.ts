import { z } from "zod/v4";

/**
 * OPERATIONAL cadence — weekly knobs the founder turns alone.
 *
 * THIS FILE OWNS: brand strings (name, tagline, domain, URL, sender),
 * beta-gate mode, blocked countries, operational feature flags.
 *
 * Touch this file when:
 *   • you flip beta mode (waitlist → rolling → open),
 *   • you change brand copy (rare; cascades into OG cards + emails),
 *   • you toggle a launch-day feature flag,
 *   • you adjust the rolling-invite cron throughput.
 *
 * NEVER put legal entity, refund text, or pricing numbers here.
 *
 * Function-valued fields (`url`, `plausibleEnabled`) read process.env on
 * each call so server-render picks up env changes without redeploy of this
 * file. Do not convert them to constants.
 */
export type BetaMode = "open" | "waitlist" | "rolling";

export const GateConfigSchema = z.object({
  brand: z.object({
    name: z.string().min(1),
    tagline: z.string().min(1),
    domain: z.string().min(1),
    url: z.function(),
    senderEmail: z.string().email(),
  }).strict(),
  beta: z.object({
    mode: z.enum(["open", "waitlist", "rolling"]),
    rollingInvitesPerDay: z.number().int().positive(),
  }).strict(),
  eligibility: z.object({
    blockedCountries: z.array(z.string()),
  }).strict(),
  flags: z.object({
    waitlistPublic: z.boolean(),
    plausibleEnabled: z.function(),
    activationV1: z.function(),
    focusModeEnabled: z.boolean(),
    operationsDashboardEnabled: z.function(),
    councilTableEnabled: z.function(),
    trustConsoleEnabled: z.function(),
    seasonPassEnabled: z.function(),
  }).strict(),
}).strict();

export const GATE_CONFIG = {
  brand: {
    name: "The Tower",
    tagline: "An immersive command center for the internship search.",
    domain: "interntower.com",
    /** Used for canonical URLs, OG tags, sitemap. Override per-env via NEXT_PUBLIC_APP_URL. */
    url: () => process.env.NEXT_PUBLIC_APP_URL ?? "https://www.interntower.com",
    /** Sender for transactional Resend emails. */
    senderEmail: "concierge@interntower.com",
  },
  beta: {
    /**
     * "open"     — anyone with a Google account signs up immediately
     * "waitlist" — signups go to waitlist_signups; admin invites manually
     * "rolling"  — waitlist_signups; cron invites N/day automatically
     */
    mode: "waitlist" as BetaMode,
    /** Used when mode === "rolling". Cron consumes this many invites/day. */
    rollingInvitesPerDay: 25,
  },
  eligibility: {
    /** Excluded jurisdictions if any (e.g., sanctioned countries). Empty by default. */
    blockedCountries: [] as string[],
  },
  flags: {
    waitlistPublic: true,
    /** Plausible analytics. Off if NEXT_PUBLIC_PLAUSIBLE_DOMAIN unset. */
    plausibleEnabled: () => !!process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
    /** New /activate route. Old /lobby/onboarding redirects here when on. */
    activationV1: () => process.env.TOWER_ACTIVATION_V1 === "1",
    /** Focus Mode UI affordances. Defer until D14+. */
    focusModeEnabled: false,
    /** PR 2 — Activation Funnel Dashboard at /operations. Owner-only path
     *  even when on; the flag controls the visible UI affordance only. */
    operationsDashboardEnabled: () =>
      process.env.TOWER_OPERATIONS_DASHBOARD === "1",
    /** PR 3 — Council Table on the C-Suite floor. Renders handoff dossier
     *  packets emitted by the CEO orchestrator. */
    councilTableEnabled: () => process.env.TOWER_COUNCIL_TABLE === "1",
    /** PR 4 — Trust Console at /settings/privacy. Public-facing consent +
     *  audit surface. Gated until copy is reviewed. */
    trustConsoleEnabled: () => process.env.TOWER_TRUST_CONSOLE === "1",
    /** PR 5 — Internship Season Pass tier visible on /pricing. Set after
     *  Stripe price IDs are bootstrapped in production. */
    seasonPassEnabled: () => process.env.TOWER_SEASON_PASS === "1",
  },
} as const;

export type GateConfig = typeof GATE_CONFIG;
