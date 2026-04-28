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

/**
 * Public-path table. Each entry intentionally bypasses the Supabase session
 * check so that unauthenticated callers receive the route's own response
 * instead of being 307-redirected to /lobby.
 *
 * `prefix: true` means the path itself AND any nested path under it are
 * public (e.g. `/lobby` matches `/lobby/onboarding` but NOT `/lobbyhack`).
 *
 * Default (no `prefix` flag) is exact match — required for paths that
 * have no real sub-routes, so we don't accidentally auth-bypass a future
 * `/termsfake` style route.
 *
 *   /lobby               — prefix: entry point + onboarding sub-routes.
 *   /terms               — exact: marketing page only.
 *   /privacy             — exact: marketing page only.
 *   /pricing             — exact: marketing page only.
 *   /waitlist            — exact: marketing page only.
 *   /api/auth/callback   — exact: Supabase OAuth callback runs pre-session.
 *   /api/stripe/webhook  — exact: Stripe POSTs unauthenticated;
 *                                redirect would break billing (audit M-9 / P2-1).
 *   /api/cron            — prefix: Vercel Cron POSTs sans session;
 *                                cron routes self-auth via verifyCronAuth().
 */
const PUBLIC_PATHS: ReadonlyArray<{ path: string; prefix?: boolean }> = [
  { path: "/lobby", prefix: true },
  { path: "/terms" },
  { path: "/privacy" },
  { path: "/pricing" },
  { path: "/waitlist" },
  { path: "/api/auth/callback" },
  { path: "/api/stripe/webhook" },
  { path: "/api/cron", prefix: true },
];

/**
 * Decide whether `pathname` is reachable without a Supabase session.
 *
 * Exact entries match only the literal path. Prefix entries match the path
 * itself and any nested sub-path under a `/` boundary — so `/lobby` and
 * `/lobby/onboarding` are public, but `/lobbyhack` is NOT.
 *
 * Exported for unit testing.
 */
export function isPathPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(({ path, prefix }) =>
    prefix
      ? pathname === path || pathname.startsWith(path + "/")
      : pathname === path,
  );
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

  if (!user && !isPathPublic(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/lobby";
    return NextResponse.redirect(url);
  }

  // Returning-user fast lane. If the guest is authenticated AND has
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
