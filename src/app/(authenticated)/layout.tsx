import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  FOCUS_MODE_COOKIE_NAME,
  parseFocusModeCookie,
} from "@/lib/focus-mode/config";
import { countOffersForUser } from "@/lib/db/queries/offers-rest";
import { getApplicationGauntletStats } from "@/lib/db/queries/applications-rest";
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
 *
 * The layout also computes the small "gauntlet" stats the Elevator panel
 * needs to hide floors a beta-stage user can't yet use:
 *   - `offerCount` → hides the Parlor annex button when 0.
 *   - `appCount` + `firstAppliedAt` → hides the Observatory floor until
 *     the user has ≥5 applications AND ≥7 days of pipeline history.
 * Both queries are wrapped in try/catch so a transient REST failure
 * degrades to "show nothing extra" instead of taking down the layout.
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

  const supabase = await createClient();
  const [offerCount, appStats] = await Promise.all([
    countOffersForUser(supabase, user.id).catch(() => 0),
    getApplicationGauntletStats(supabase, user.id).catch(() => ({
      count: 0,
      firstAppliedAt: null as string | null,
    })),
  ]);

  return (
    <WorldShell
      userName={user.user_metadata?.full_name ?? user.user_metadata?.name ?? null}
      userEmail={user.email ?? ""}
      avatarUrl={user.user_metadata?.avatar_url ?? null}
      focusMode={focusMode}
      offerCount={offerCount}
      appCount={appStats.count}
      firstAppliedAt={appStats.firstAppliedAt}
    >
      {children}
    </WorldShell>
  );
}
