import type { Config } from "drizzle-kit";

/**
 * Drizzle Kit is used here ONLY for schema-aware migration generation:
 *   npm run db:generate   — diff schema.ts → src/db/migrations/*.sql
 *
 * The application runtime does NOT use Drizzle; all database access is via
 * the Supabase REST client (see `src/lib/db/queries/*-rest.ts`). Generated
 * migrations must be applied through Supabase (SQL editor or CLI).
 */
export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.SUPABASE_DB_URL ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;
