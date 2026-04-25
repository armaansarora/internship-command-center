import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { log } from "@/lib/logger";
import { FLOORS } from "@/types/ui";

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
    "/terms",
    "/privacy",
    "/pricing",
    "/waitlist",
    "/api/auth/callback",
    "/api/webhooks",
    "/api/stripe/webhook",
    "/api/cron",
    "/api/waitlist",
  ];
  const isPublicPath = publicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/lobby";
    return NextResponse.redirect(url);
  }

  // R4.9 — Returning-user fast lane. If the guest is authenticated AND has
  // already watched the first-visit cinematic (arrival_played_at is stamped),
  // /lobby is not their destination anymore; the building sends them up to
  // the floor they were last on. One extra DB read, but only on the /lobby
  // path — a small fraction of requests.
  if (user && isLobbyRoot(request.nextUrl.pathname)) {
    const target = await resolveFastLaneTarget(supabase, user.id);
    if (target) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

/** Match `/lobby` and `/lobby/` — not nested sub-paths. */
function isLobbyRoot(pathname: string): boolean {
  return pathname === "/lobby" || pathname === "/lobby/";
}

/**
 * Derive the fast-lane redirect target for a returning authenticated user.
 *
 * Returns `null` when the user has NOT yet played the cinematic — the
 * middleware lets them continue into /lobby so the arrival can play.
 * Returns a path like "/penthouse" / "/war-room" when they have.
 *
 * Treats any DB error as "no fast lane" so a transient Supabase hiccup
 * never blocks a guest from reaching the lobby.
 */
async function resolveFastLaneTarget(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("arrival_played_at, last_floor_visited")
      .eq("id", userId)
      .single();
    if (error || !data) return null;
    const arrivalPlayedAt = (data as { arrival_played_at?: string | null })
      .arrival_played_at ?? null;
    if (!arrivalPlayedAt) return null;
    const lastFloor =
      (data as { last_floor_visited?: string | null }).last_floor_visited ??
      "PH";
    return floorIdToRoute(lastFloor);
  } catch {
    return null;
  }
}

/**
 * Map a FloorId to the corresponding authenticated route using the
 * canonical FLOORS registry so the middleware stays in sync if routes
 * are renamed. Defaults to /penthouse on any unknown id.
 */
function floorIdToRoute(floorId: string): string {
  const match = FLOORS.find((f) => f.id === floorId);
  return match?.route ?? "/penthouse";
}
