import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { WorldShell } from "./world-shell";

/**
 * Authenticated layout — wraps all floors that require sign-in.
 * Provides the world shell: day/night cycle, elevator, user menu.
 *
 * Passes user metadata to WorldShell for the account dropdown (BUG-005).
 */
export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/lobby");
  }

  return (
    <WorldShell
      userName={user.user_metadata?.full_name ?? user.user_metadata?.name ?? null}
      userEmail={user.email ?? ""}
      avatarUrl={user.user_metadata?.avatar_url ?? null}
    >
      {children}
    </WorldShell>
  );
}
