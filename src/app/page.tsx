import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

/**
 * Root page — redirects based on auth state.
 * Authenticated users → /penthouse (dashboard)
 * Unauthenticated users → /lobby (login)
 */
export default async function RootPage() {
  const user = await getUser();

  if (user) {
    redirect("/penthouse");
  } else {
    redirect("/lobby");
  }
}
