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
  },
} as const;

export type GateConfig = typeof GATE_CONFIG;
