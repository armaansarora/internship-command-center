import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { LobbyClient } from "./lobby-client";
import { ConciergeFlow } from "./onboarding/ConciergeFlow";
import { getConciergeState } from "@/lib/db/queries/user-profiles-rest";

export const metadata: Metadata = {
  title: "The Lobby",
};

interface LobbyPageProps {
  searchParams: Promise<{ error?: string }>;
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
  const initialError = params.error ? decodeURIComponent(params.error) : null;

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
