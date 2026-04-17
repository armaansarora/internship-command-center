import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Public keys only — safe to ship.
 * These env vars are inlined by Next.js at build time via NEXT_PUBLIC_*,
 * so we read `process.env` directly here (the `env()` helper is server-side).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
