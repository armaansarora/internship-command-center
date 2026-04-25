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

  // ── Owner override ───────────────────────────────────────────────────────
  // Single Supabase user UUID granted unconditional bypass on every
  // entitlement gate (agents, rate limits, application caps). Server-only,
  // never bundled to the client. Leave unset in dev/preview unless you want
  // god-tier locally too. Set in production only on your own account.
  OWNER_USER_ID: z.string().uuid().optional(),

  // ── Google OAuth (Gmail + Calendar) ──────────────────────────────────────
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GMAIL_REDIRECT_URI: z.string().url().optional(),

  // Must be 32 bytes (hex 64 chars OR base64 of 32 bytes)
  ENCRYPTION_KEY: z.string().min(1).optional(),

  // Signs CSRF state for OAuth flows. 32+ bytes base64 or hex.
  OAUTH_STATE_SECRET: z.string().min(32).optional(),

  // ── AI ───────────────────────────────────────────────────────────────────
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),

  // ── Cron ─────────────────────────────────────────────────────────────────
  CRON_SECRET: z.string().min(16).optional(),

  // ── Email delivery (outreach) ────────────────────────────────────────────
  RESEND_API_KEY: z.string().min(1).optional(),

  // ── Stripe ───────────────────────────────────────────────────────────────
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),

  // ── Upstash Redis (rate limiting) ────────────────────────────────────────
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // ── Third-party ──────────────────────────────────────────────────────────
  OPENWEATHER_API_KEY: z.string().min(1).optional(),

  // ── Sentry ───────────────────────────────────────────────────────────────
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
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
