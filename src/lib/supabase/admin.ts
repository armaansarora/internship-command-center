import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS entirely.
 * Use ONLY in Inngest functions and background jobs — never in user-facing code.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
