import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 * Use ONLY in cron jobs and background tasks — never in user-facing code.
 *
 * Lazily initialized to avoid build-time errors when env vars aren't set.
 */
let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin client",
      );
    }

    _admin = createClient(url, key);
  }
  return _admin;
}
