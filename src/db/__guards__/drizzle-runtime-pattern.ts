/**
 * Single source of truth for runtime-Drizzle detection — CLAUDE.md gotcha #1.
 *
 * Vercel serverless cannot reach the IPv6-only Supabase DB at
 * db.jzrsrruugcajohvvmevg.supabase.co:5432, so the application RUNTIME must
 * NEVER instantiate or call Drizzle's `db` object — it must use the Supabase
 * REST client (`createClient` from `@/lib/supabase/server`). drizzle.config.ts
 * documents that the runtime does not use Drizzle; Drizzle is schema/migrations
 * only. These patterns are shared by `no-runtime-drizzle.proof.test.ts` and the
 * `.claude` PostToolUse tripwire hook so there is exactly one definition.
 */

/** A — runtime client instantiation: `drizzle(postgres(...))` / `drizzle(pool)`. Repo-wide. */
export const DRIZZLE_INSTANTIATION = /\bdrizzle\s*\(/;

/** B — a *value* import of `db` from a drizzle/pg/db module. `import type` stays green. Repo-wide. */
export const DRIZZLE_VALUE_IMPORT =
  /import\s+(?!type\b)[^;]*\bdb\b[^;]*from\s+['"](?:drizzle-orm|postgres|@\/db|@\/lib\/db\/(?:client|index|drizzle))/;

/** C — a runtime query call shape. Scope to SERVER_SURFACE only (avoids ArtLab `db` delta vars). */
export const DRIZZLE_RUNTIME_CALL = /\bdb\.(?:select|insert|update|delete|query|transaction|execute)\s*\(/;

/**
 * Server surfaces where regex C applies. The whole App Router tree (`src/app/`)
 * renders server-side by default — page.tsx / layout.tsx server components hit
 * the IPv6 prod-breaker exactly like api routes do — so it is in scope alongside
 * route handlers and server-flavoured lib (actions/server). `src/lib` ArtLab
 * pixel-delta `db` vars stay out because they are not under src/app and don't
 * match actions|server.
 */
export const SERVER_SURFACE = /(?:^|\/)src\/app\/|\/route\.ts$|(?:^|\/)src\/lib\/[^]*(?:actions|server)/;
