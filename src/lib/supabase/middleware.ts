import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { log } from "@/lib/logger";

/**
 * Read a required env var with a readable error if it's missing. Replaces the
 * old `process.env.X!` non-null assertions which crashed with a cryptic
 * `TypeError: Cannot read properties of undefined`. Once Agent 3 lands the
 * full Zod-parsed `@/lib/env` module that covers PUBLISHABLE_KEY, swap these
 * reads for `env.X`.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Visibility: prove the middleware runs on each request in Vercel logs.
  // Path only — never log the full request (privacy + log volume).
  log.debug("middleware.updateSession", { path: request.nextUrl.pathname });

  const supabase = createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — this is critical for token refresh to work
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that don't require auth.
  //
  // Each path here intentionally bypasses the Supabase session check so that
  // unauthenticated callers receive the route's own response instead of being
  // 307-redirected to /lobby.
  //
  //   /lobby                — entry point; redirect target itself, must be public.
  //   /api/auth/callback    — Supabase OAuth callback runs before a session exists.
  //   /api/webhooks         — generic webhook prefix (kept for forward compat).
  //   /api/stripe/webhook   — Stripe POSTs unauthenticated; redirect would break
  //                           billing (audit M-9 / P2-1).
  //   /api/cron             — Vercel Cron POSTs without a session; the cron
  //                           routes self-authenticate via verifyCronAuth().
  const publicPaths = [
    "/lobby",
    "/api/auth/callback",
    "/api/webhooks",
    "/api/stripe/webhook",
    "/api/cron",
  ];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/lobby";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
