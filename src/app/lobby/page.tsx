import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUser } from "@/lib/supabase/server";
import { LobbyClient } from "./lobby-client";
import { ConciergeFlow } from "./onboarding/ConciergeFlow";
import { getConciergeState } from "@/lib/db/queries/user-profiles-rest";
import { GATE_CONFIG } from "@/lib/config/gate-config";

export const metadata: Metadata = {
  title: "The Lobby",
  description: "Reception, sign-in, and first-run intake for The Tower.",
  alternates: { canonical: `${GATE_CONFIG.brand.url()}/lobby` },
  robots: { index: true, follow: true },
};

interface LobbyPageProps {
  searchParams: Promise<{ error?: string; intent?: string }>;
}

// httpOnly cookie that stashes a post-auth intent so the user resumes the
// flow they came from (e.g. Season Pass checkout) after Google sign-in.
// Short max-age so a stale intent can't hijack a later session.
const POST_AUTH_INTENT_COOKIE = "tower_post_auth_intent";
const POST_AUTH_INTENT_MAX_AGE = 600; // 10 minutes

const VALID_POST_AUTH_INTENTS = new Set<string>(["season-pass"]);

function getLobbyErrorMessage(error: string | undefined): string | null {
  if (!error) return null;
  switch (error) {
    case "auth_unavailable":
      return "The Tower sign-in desk is temporarily unavailable. Try again in a minute.";
    case "auth_restart_required":
      return "That sign-in session expired. Start again from the Lobby.";
    case "auth_failed":
      return "The front desk could not verify that sign-in. Try again.";
    case "beta_not_invited":
      return "This email does not have a Tower access key yet. Join the waitlist or use an invited account.";
    default:
      return decodeURIComponent(error);
  }
}

/**
 * The Lobby — ground floor of The Tower.
 *
 * For unauthenticated users: login page with Google OAuth.
 * For first-time authenticated users (arrival or concierge incomplete):
 * the R4 onboarding flow (cinematic + Otis + directory) overlays the lobby.
 * Fully-onboarded returning users never land here — the R4.9 fast-lane
 * middleware redirects them to their last-visited floor before this page
 * renders.
 */
export default async function LobbyPage({ searchParams }: LobbyPageProps) {
  const user = await getUser();
  const params = await searchParams;
  const initialError = getLobbyErrorMessage(params.error);

  // Post-auth intent: when /season-pass (and similar marketing CTAs) hit
  // an unauthenticated user we redirect them here with `?intent=…`. Stash
  // the intent in a short-lived httpOnly cookie BEFORE Google OAuth begins
  // so the post-auth handoff knows where to send the user. After OAuth
  // returns, this same page renders with `user` non-null and the cookie
  // still set; we replay the intent and clear the cookie. Unknown intents
  // are dropped silently — fail-closed.
  const cookieStore = await cookies();
  const queryIntent =
    params.intent && VALID_POST_AUTH_INTENTS.has(params.intent)
      ? params.intent
      : null;
  const stashedIntent = cookieStore.get(POST_AUTH_INTENT_COOKIE)?.value ?? null;
  const validStashedIntent =
    stashedIntent && VALID_POST_AUTH_INTENTS.has(stashedIntent)
      ? stashedIntent
      : null;

  if (user && (queryIntent || validStashedIntent)) {
    const intent = queryIntent ?? validStashedIntent;
    cookieStore.delete(POST_AUTH_INTENT_COOKIE);
    if (intent === "season-pass") {
      // Authenticated — bounce to the Season Pass surface which has its
      // own POST-to-checkout button. We don't auto-POST here because that
      // would consume a Stripe session even if the user wandered in via
      // back-button + refresh.
      redirect("/season-pass?resume=1");
    }
  }

  if (!user && queryIntent) {
    cookieStore.set(POST_AUTH_INTENT_COOKIE, queryIntent, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: POST_AUTH_INTENT_MAX_AGE,
    });
  }

  const conciergeState = user ? await getConciergeState(user.id) : null;
  const needsOnboarding =
    !!user &&
    !!conciergeState &&
    (conciergeState.arrivalPlayedAt === null ||
      conciergeState.conciergeCompletedAt === null);

  const guestName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "";

  return (
    <>
      <LobbyClient isAuthenticated={!!user} initialError={initialError} />
      {needsOnboarding && conciergeState && (
        <ConciergeFlow
          arrivalAlreadyPlayed={conciergeState.arrivalPlayedAt !== null}
          floorsUnlocked={conciergeState.floorsUnlocked}
          guestName={guestName}
        />
      )}
    </>
  );
}
