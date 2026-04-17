import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafePostAuthPath } from "@/lib/auth/safe-next-path";
import { log } from "@/lib/logger";

/**
 * Supabase OAuth redirect handler. Exchanges the provider code for a
 * session and redirects to a safe in-app path. Falls back to the lobby
 * with an `auth_failed` marker on any failure.
 *
 * Security: `getSafePostAuthPath` rejects protocol-relative `//evil.com`,
 * backslash tricks, and absolute URLs (audit M-1).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafePostAuthPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin).toString());
    }
    log.warn("auth.callback.exchange_failed", { error: error.message });
  }

  return NextResponse.redirect(`${origin}/lobby?error=auth_failed`);
}
