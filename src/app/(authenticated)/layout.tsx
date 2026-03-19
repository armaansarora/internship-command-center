import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { WorldShell } from "./world-shell";

/**
 * Authenticated layout — wraps all floors that require sign-in.
 * Provides the world shell: day/night cycle, custom cursor, and
 * the spatial container for floor content.
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

  return <WorldShell>{children}</WorldShell>;
}
