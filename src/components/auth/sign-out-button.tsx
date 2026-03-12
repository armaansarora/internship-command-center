import { signOut } from "@/auth"

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server"
        await signOut({ redirectTo: "/sign-in" })
      }}
    >
      <button
        type="submit"
        className="w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-muted"
      >
        Sign out
      </button>
    </form>
  )
}
