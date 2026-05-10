import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import {
  FOCUS_MODE_COOKIE_NAME,
  parseFocusModeCookie,
} from "@/lib/focus-mode/config";
import { WorldShell } from "./world-shell";

/**
 * Authenticated layout — wraps all floors that require sign-in.
 * Provides the world shell: day/night cycle, elevator, user menu.
 *
 * Reads the `tower_focus_mode` cookie (Fix #4) and threads its boolean
 * into `WorldShell` so the immersive chrome can be hidden when the user
 * has toggled Focus Mode on. Reading `cookies()` opts the layout into
 * dynamic rendering on every request — exactly what we want for a
 * preference that flips via the keyboard shortcut and a server action.
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

  const cookieStore = await cookies();
  const focusMode = parseFocusModeCookie(
    cookieStore.get(FOCUS_MODE_COOKIE_NAME)?.value,
  );

  return (
    <WorldShell
      userName={user.user_metadata?.full_name ?? user.user_metadata?.name ?? null}
      userEmail={user.email ?? ""}
      avatarUrl={user.user_metadata?.avatar_url ?? null}
      focusMode={focusMode}
    >
      {children}
    </WorldShell>
  );
}
