import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { LobbyClient } from "./lobby-client";

export const metadata: Metadata = {
  title: "The Lobby",
};

/**
 * The Lobby — ground floor login page.
 * Server component handles auth check; if already signed in, redirect to penthouse.
 */
export default async function LobbyPage() {
  const user = await getUser();

  if (user) {
    redirect("/penthouse");
  }

  return <LobbyClient />;
}
