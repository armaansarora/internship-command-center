import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafePostAuthPath } from "@/lib/auth/safe-next-path";
import {
  isRestartableSupabaseAuthError,
  isTransientSupabaseAuthError,
  withSupabaseAuthTimeout,
} from "@/lib/auth/supabase-auth-errors";
import { isEmailAllowedForBeta } from "@/lib/auth/beta-gate";
import { needsLobbyOnboardingAfterAuth } from "@/lib/auth/post-auth-profile";
import { log } from "@/lib/logger";

/**
 * Supabase OAuth redirect handler. Exchanges the provider code for a
 * session and redirects to a safe in-app path. Falls back to the lobby
 * with `auth_failed` or `auth_unavailable` on failure.
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
    const { data, error } = await exchangeCodeForSession(supabase, code);
    if (!error) {
      const user = data.user ?? data.session?.user ?? null;
      const email = user?.email ?? null;
      if (!(await isEmailAllowedForBeta(email, { userId: user?.id }))) {
        await supabase.auth.signOut();
        log.warn("auth.callback.beta_gate_denied", {
          domain: email?.split("@")[1] ?? "unknown",
        });
        return NextResponse.redirect(`${origin}/lobby?error=beta_not_invited`);
      }
      if (await needsLobbyOnboardingAfterAuth(supabase, user)) {
        return NextResponse.redirect(new URL("/lobby", origin).toString());
      }
      return NextResponse.redirect(new URL(next, origin).toString());
    }
    const errorCode = isRestartableSupabaseAuthError(error.message)
      ? "auth_restart_required"
      : isTransientSupabaseAuthError(error.message)
      ? "auth_unavailable"
      : "auth_failed";
    log.warn("auth.callback.exchange_failed", {
      alert: true,
      errorCode,
      reason: error.message,
    });
    return NextResponse.redirect(`${origin}/lobby?error=${errorCode}`);
  }

  log.warn("auth.callback.missing_code", { alert: true });
  return NextResponse.redirect(`${origin}/lobby?error=auth_failed`);
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type CodeExchangeResult = Awaited<
  ReturnType<SupabaseServerClient["auth"]["exchangeCodeForSession"]>
>;

async function exchangeCodeForSession(
  supabase: SupabaseServerClient,
  code: string,
): Promise<CodeExchangeResult> {
  try {
    return await withSupabaseAuthTimeout(
      supabase.auth.exchangeCodeForSession(code),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      data: { user: null, session: null },
      error: { message },
    } as CodeExchangeResult;
  }
}
