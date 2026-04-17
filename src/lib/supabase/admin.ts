import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 * Use ONLY in cron jobs, webhooks, and OAuth callbacks — never inside user-
 * facing request handlers that should respect the calling user's permissions.
 *
 * Lazily initialized to avoid build-time errors when env vars aren't set.
 */
let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = requireEnv([
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ] as const);
    _admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}
