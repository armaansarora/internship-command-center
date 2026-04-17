import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { LobbyClient } from "./lobby-client";

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
 * For authenticated users: still accessible as a building floor.
 * The lobby should feel like walking into the building — you can always
 * come back to the ground floor.
 */
export default async function LobbyPage({ searchParams }: LobbyPageProps) {
  const user = await getUser();
  const params = await searchParams;
  const initialError = params.error ? decodeURIComponent(params.error) : null;

  return <LobbyClient isAuthenticated={!!user} initialError={initialError} />;
}
