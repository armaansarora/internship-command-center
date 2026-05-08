import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { LobbyClient } from "../lobby-client";
import { ConciergeFlow } from "./ConciergeFlow";
import { getConciergeState } from "@/lib/db/queries/user-profiles-rest";

export const metadata: Metadata = {
  title: "Lobby Intake",
};

export default async function LobbyOnboardingPage() {
  const user = await getUser();

  if (!user) {
    return <LobbyClient isAuthenticated={false} initialError={null} />;
  }

  const state = await getConciergeState(user.id);
  const guestName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "";

  return (
    <>
      <LobbyClient isAuthenticated initialError={null} />
      <ConciergeFlow
        arrivalAlreadyPlayed
        floorsUnlocked={state?.floorsUnlocked ?? ["L", "PH"]}
        guestName={guestName}
        mode="update"
      />
    </>
  );
}
