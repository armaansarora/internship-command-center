import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { LobbyClient } from "./lobby-client";

export const metadata: Metadata = {
  title: "The Lobby",
};

/**
 * The Lobby — ground floor of The Tower.
 *
 * For unauthenticated users: login page with Google OAuth.
 * For authenticated users: still accessible as a building floor.
 * The lobby should feel like walking into the building — you can always
 * come back to the ground floor.
 */
export default async function LobbyPage() {
  const user = await getUser();

  return <LobbyClient isAuthenticated={!!user} />;
}
