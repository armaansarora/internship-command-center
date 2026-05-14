import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { GATE_CONFIG } from "@/lib/config/gate-config";
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

  // Activation V1 kill-switch: when the flag is flipped on, every
  // authenticated arrival is rerouted into the new gauntlet so the legacy
  // concierge flow doesn't fight it for first-run real estate.
  if (GATE_CONFIG.flags.activationV1()) {
    redirect("/activate");
  }

  const state = await getConciergeState(user.id);
  const guestName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "";

  return (
    <>
      <LobbyClient
        isAuthenticated
        initialError={null}
        showReceptionOtis={false}
        showForeground={false}
      />
      <ConciergeFlow
        arrivalAlreadyPlayed
        floorsUnlocked={state?.floorsUnlocked ?? ["L", "PH"]}
        guestName={guestName}
        mode="update"
      />
    </>
  );
}
