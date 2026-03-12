import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import type { Session } from "next-auth"
import type { JWT } from "@auth/core/jwt"

const ALLOWED_EMAILS =
  process.env.ALLOWED_EMAILS?.split(",").map((e) => e.trim()) ?? []

declare module "next-auth" {
  interface Session {
    accessToken?: string
    error?: "RefreshTokenError"
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    access_token: string
    expires_at: number
    refresh_token: string
    error?: "RefreshTokenError"
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/calendar.readonly",
          ].join(" "),
        },
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async signIn({ profile }) {
      return ALLOWED_EMAILS.includes(profile?.email ?? "")
    },
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          access_token: account.access_token as string,
          expires_at: account.expires_at as number,
          refresh_token: account.refresh_token as string,
        }
      }
      if (Date.now() < (token as JWT).expires_at * 1000) return token
      if (!(token as JWT).refresh_token)
        throw new TypeError("Missing refresh_token")
      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          body: new URLSearchParams({
            client_id: process.env.AUTH_GOOGLE_ID!,
            client_secret: process.env.AUTH_GOOGLE_SECRET!,
            grant_type: "refresh_token",
            refresh_token: (token as JWT).refresh_token,
          }),
        })
        const tokensOrError = await response.json()
        if (!response.ok) throw tokensOrError
        const newTokens = tokensOrError as {
          access_token: string
          expires_in: number
          refresh_token?: string
        }
        return {
          ...token,
          access_token: newTokens.access_token,
          expires_at: Math.floor(Date.now() / 1000 + newTokens.expires_in),
          refresh_token:
            newTokens.refresh_token ?? (token as JWT).refresh_token,
        }
      } catch (error) {
        console.error("Error refreshing access_token", error)
        return { ...token, error: "RefreshTokenError" as const }
      }
    },
    async session({ session, token }) {
      session.accessToken = (token as JWT).access_token
      session.error = (token as JWT).error
      return session
    },
  },
})
