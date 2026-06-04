import { z } from "zod/v4";

/**
 * Environment configuration — single source of truth.
 *
 * Validated lazily on first access so that build-time static generation
 * does not crash when optional vars are missing. Access via `env()`.
 *
 * Add a new variable in ONE place: the schema below. Never reach for
 * `process.env.*` elsewhere in the codebase.
 */

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // ── Supabase ─────────────────────────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Used by drizzle-kit CLI only (migration generation). Runtime uses REST.
  SUPABASE_DB_URL: z.string().min(1).optional(),

  // ── App ──────────────────────────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z.string().url().default("https://www.interntower.com"),
  ALLOWED_EMAILS: z.string().optional(),

  // ── Owner override ───────────────────────────────────────────────────────
  // Single Supabase user UUID granted unconditional bypass on every
  // entitlement gate (agents, rate limits, application caps). Server-only,
  // never bundled to the client. Leave unset in dev/preview unless you want
  // god-tier locally too. Set in production only on your own account.
  OWNER_USER_ID: z.string().uuid().optional(),
  // Optional comma/space/semicolon-separated owner UUID list. Useful when
  // Google OAuth creates a second auth identity for the same real owner during
  // launch migration; keep this server-only.
  OWNER_USER_IDS: z.string().optional(),

  // ── Google OAuth (Gmail + Calendar) ──────────────────────────────────────
  GOOGLE_CLIENT_ID: z
    .string()
    .regex(
      /^\d+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/,
      "must be a Google OAuth web client id like 123-abc.apps.googleusercontent.com",
    )
    .optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GMAIL_REDIRECT_URI: z.string().url().optional(),

  // Must be 32 bytes (hex 64 chars OR base64 of 32 bytes)
  ENCRYPTION_KEY: z.string().min(1).optional(),

  // Signs CSRF state for OAuth flows. 32+ bytes base64 or hex.
  OAUTH_STATE_SECRET: z.string().min(32).optional(),

  // HMAC secret for the warm-intro `counterparty_anon_key` in
  // match_candidate_index / match_events. NEVER share with a third
  // party — leaking it lets an attacker correlate cross-user anon keys
  // back to the contacts that produced them. Fail-closed: the helper
  // in src/lib/networking/match-anon.ts throws when this is unset so
  // raw contact IDs cannot leak via the match cache.
  MATCH_ANON_SECRET: z.string().min(32).optional(),

  // ── AI ───────────────────────────────────────────────────────────────────
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  AI_GATEWAY_API_KEY: z.string().min(1).optional(),
  VERCEL_AI_GATEWAY_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),

  // ── Global AI spend brake (Lighthouse SpendBrake) ────────────────────────
  // Hard ceiling on the day's Anthropic+OpenAI bill in USD. When the rollup
  // in `v_daily_ai_spend_cents` crosses this cap, `consumeAiQuota` flips to
  // fail-CLOSED for every non-owner caller until UTC midnight resets the
  // rollup. Default 50 — a sane single-day kill-switch for the free tier.
  // Read as a coerced number (z.coerce.number()) so the operator can paste
  // a plain integer in Vercel env without quoting it as a string.
  KILL_AI_SPEND_USD: z.coerce.number().positive().default(50),
  // Comma-separated UUID list (whitespace tolerant). Each id bypasses the
  // global spend brake — the founder can keep working while the brake is
  // engaged. Per-user quota still applies. Server-only; never bundled to
  // the client. Distinct from OWNER_USER_ID(S) so the spend-brake bypass
  // can be granted to ops/oncall without inheriting the rest of god-mode.
  OWNER_SPEND_OVERRIDE_USER_IDS: z.string().optional(),

  // Server-side engagement events (Fix #3) kill-switch. Set to "1" to enable
  // middleware-emitted writes to the engagement_events table. Anything else
  // (or unset) keeps the writer dormant — the service-role admin module is
  // never even dynamically imported.
  TOWER_SERVER_ANALYTICS_ENABLED: z.string().optional(),

  // Activation V1 route kill-switch. Set to "1" to route new users through
  // /activate (5-minute activation gauntlet). When unset/empty, the legacy
  // /lobby/onboarding concierge flow is used. Read via GATE_CONFIG.flags
  // .activationV1() so the value is re-evaluated on every server render.
  TOWER_ACTIVATION_V1: z.string().optional(),

  // PR 2-5 feature flags. Set each to "1" to enable the corresponding
  // surface. All consumed via GATE_CONFIG.flags thunks (see gate-config.ts)
  // so server-render picks up env changes without a redeploy.
  TOWER_OPERATIONS_DASHBOARD: z.string().optional(),
  TOWER_COUNCIL_TABLE: z.string().optional(),
  TOWER_TRUST_CONSOLE: z.string().optional(),
  TOWER_SEASON_PASS: z.string().optional(),

  // Prompt-cache layout selector (src/lib/ai/prompt-cache.ts). "legacy" pins
  // the pre-consolidation cache-block layout; unset uses the current layout.
  // Declared here so the flag is part of the single-source-of-truth schema.
  TOWER_PROMPT_CACHE_LAYOUT: z.string().optional(),

  // Dev/preview-only auth bypass (src/lib/dev-preview-auth.ts). Triple-gated to
  // non-production + an explicit local stub URL; never honored in production.
  // Declared here so the auth-bypass flag is documented + visible in the schema.
  TOWER_DEV_PREVIEW_AUTH: z.string().optional(),

  // ── Cron ─────────────────────────────────────────────────────────────────
  CRON_SECRET: z.string().min(16).optional(),

  // ── Email delivery (outreach) ────────────────────────────────────────────
  RESEND_API_KEY: z.string().min(1).optional(),

  // ── Lighthouse Watchdog ──────────────────────────────────────────────────
  // Owner-only operational watchdog (every 30 minutes). Hourly AI cost
  // ceiling, in integer cents. When the rolling 1h `agent_logs.cost_cents`
  // sum exceeds this value the watchdog opens an `ai-cost-hourly`
  // incident. Default ($5/hr) is enforced in the route when unset.
  WATCHDOG_HOURLY_COST_CAP_CENTS: z.coerce.number().int().positive().optional(),
  // Optional override for the digest recipient. When unset the watchdog
  // falls back to `gateConfig.brand.senderEmail` so the platform never
  // has to dial in a second contact just to land alerts.
  OWNER_ALERT_EMAIL: z.string().email().optional(),

  // ── Outreach blast-brake ─────────────────────────────────────────────────
  // Two-layer ceiling + circuit breaker on /api/cron/outreach-sender. A
  // corrupted approval batch must not be able to blast 10,000 emails before
  // anyone notices. All four values are read at request time so a Vercel env
  // tweak takes effect on the next cron tick — no redeploy required, except
  // for OUTREACH_FREEZE_OVERRIDE which intentionally requires a redeploy as
  // the human-in-the-loop unfreeze gesture.
  OUTREACH_MAX_PER_TICK_GLOBAL: z.coerce.number().int().positive().default(100),
  OUTREACH_MAX_PER_USER_DAILY: z.coerce.number().int().positive().default(25),
  OUTREACH_PENDING_FREEZE_AT: z.coerce.number().int().positive().default(500),
  // Deliberate human gate: when the circuit breaker freezes the queue, the
  // owner must set this to "1" (re-deploy required) to thaw it. Any other
  // value, including unset, leaves the freeze armed.
  OUTREACH_FREEZE_OVERRIDE: z.string().optional(),

  // ── Stripe ───────────────────────────────────────────────────────────────
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  /**
   * Internship Season Pass — one-time $149 SKU. Populated by
   * `scripts/stripe-bootstrap.sh` (re-run when rotating Stripe products) and
   * pasted into Vercel env. The checkout route fails closed with a clear
   * "Invalid env" message when this branch fires without the id set, so a
   * misconfigured deploy never silently lands a $0 charge on the wrong SKU.
   */
  STRIPE_SEASON_PASS_PRICE_ID: z.string().min(1).optional(),

  // ── Upstash Redis (rate limiting) ────────────────────────────────────────
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // ── Third-party ──────────────────────────────────────────────────────────
  OPENWEATHER_API_KEY: z.string().min(1).optional(),
  FIRECRAWL_API_KEY: z.string().min(1).optional(),

  // ── Sentry ───────────────────────────────────────────────────────────────
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),

  // ── Analytics ────────────────────────────────────────────────────────────
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN: z.string().min(1).optional(),
  NEXT_PUBLIC_PLAUSIBLE_SRC: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let _cache: Env | null = null;

/**
 * Returns validated environment. Throws a formatted error on first
 * access if required variables are missing or malformed.
 */
export function env(): Env {
  if (_cache) return _cache;

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid or missing environment variables:\n${issues}\n` +
        `Copy .env.example → .env.local and populate values.`
    );
  }
  _cache = parsed.data;
  return _cache;
}

/**
 * Strict variant: asserts that a set of optional vars is actually present.
 * Use in feature boundaries (Stripe, Anthropic, etc.) so failure mode is
 * "feature disabled" instead of "runtime null deref deep in a handler".
 */
export function requireEnv<K extends keyof Env>(
  keys: readonly K[]
): { [P in K]: NonNullable<Env[P]> } {
  const e = env();
  const missing: string[] = [];
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    const val = e[key];
    if (val === undefined || val === null || val === "") {
      missing.push(String(key));
    } else {
      result[key as string] = val;
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
  return result as { [P in K]: NonNullable<Env[P]> };
}

/** True in production (Vercel, etc.). */
export function isProd(): boolean {
  return env().NODE_ENV === "production";
}

/**
 * Reset the cached env — tests only. Call from `afterEach` if your test
 * mutates `process.env`.
 */
export function _resetEnvCacheForTests(): void {
  _cache = null;
}
