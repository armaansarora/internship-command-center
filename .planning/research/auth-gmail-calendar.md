# Research: Auth.js v5 + Google OAuth + Gmail API + Calendar API

**Domain:** Authentication & Google API Integration for Internship Command Center
**Researched:** 2026-03-09
**Overall confidence:** HIGH (official docs verified)

---

## Table of Contents

1. [Auth.js v5 Setup in Next.js App Router](#1-authjs-v5-setup-in-nextjs-app-router)
2. [Google OAuth Provider with Custom Scopes](#2-google-oauth-provider-with-custom-scopes)
3. [Token Storage & Refresh (JWT Strategy)](#3-token-storage--refresh-jwt-strategy)
4. [Accessing Tokens in Server Actions](#4-accessing-tokens-in-server-actions)
5. [Google Cloud Console Setup](#5-google-cloud-console-setup)
6. [Gmail API: Reading & Sending](#6-gmail-api-reading--sending)
7. [Google Calendar API: Events](#7-google-calendar-api-events)
8. [Rate Limits & Quotas](#8-rate-limits--quotas)
9. [Token Expiration & Re-Auth](#9-token-expiration--re-auth)
10. [Whitelist: Restricting to 2 Accounts](#10-whitelist-restricting-to-2-accounts)
11. [Scope Verification Requirements](#11-scope-verification-requirements)
12. [Complete Implementation Reference](#12-complete-implementation-reference)

---

## 1. Auth.js v5 Setup in Next.js App Router

**Confidence: HIGH** (verified via authjs.dev official docs)

### Installation

```bash
npm install next-auth@beta
npx auth secret  # generates AUTH_SECRET in .env.local
```

### File Structure

```
project-root/
  auth.ts                              # Main config (exports auth, handlers, signIn, signOut)
  app/api/auth/[...nextauth]/route.ts  # Route handler
  middleware.ts                         # Route protection (Next.js <16)
  proxy.ts                             # Route protection (Next.js 16+)
  .env.local                           # Secrets
```

### auth.ts (project root)

```typescript
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      // Custom config goes here (see Section 2)
    }),
  ],
  callbacks: {
    // JWT and session callbacks (see Section 3)
  },
})
```

### Route Handler: `app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

### Middleware (Next.js 15 and below): `middleware.ts`

```typescript
export { auth as middleware } from "@/auth"

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
```

### Proxy (Next.js 16+): `proxy.ts`

```typescript
export { auth as proxy } from "@/auth"
```

**Note:** Next.js 16 renames middleware.ts to proxy.ts. Verify which version you are on. If using Next.js 15.x, use middleware.ts.

### Environment Variables

```env
AUTH_SECRET=<generated-by-npx-auth-secret>
AUTH_GOOGLE_ID=<google-oauth-client-id>
AUTH_GOOGLE_SECRET=<google-oauth-client-secret>
```

Auth.js v5 auto-reads `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` by convention when using the Google provider. No need to pass `clientId`/`clientSecret` explicitly.

### Using auth() Across Contexts

```typescript
// Server Component
import { auth } from "@/auth"
export default async function Page() {
  const session = await auth()
  if (!session) redirect("/api/auth/signin")
  return <p>Hello {session.user?.name}</p>
}

// Server Action
"use server"
import { auth } from "@/auth"
export async function myAction() {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")
  // do stuff
}

// Route Handler
import { auth } from "@/auth"
export const GET = auth((req) => {
  if (!req.auth) return Response.json({ error: "Unauthorized" }, { status: 401 })
  return Response.json({ data: "protected" })
})
```

**Source:** https://authjs.dev/getting-started/installation, https://authjs.dev/reference/nextjs

---

## 2. Google OAuth Provider with Custom Scopes

**Confidence: HIGH** (verified via authjs.dev and Google OAuth docs)

### Configuration with Gmail + Calendar Scopes

```typescript
import Google from "next-auth/providers/google"

Google({
  authorization: {
    params: {
      prompt: "consent",           // REQUIRED: forces consent every sign-in to get refresh_token
      access_type: "offline",      // REQUIRED: tells Google to return a refresh_token
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
})
```

### Why These Specific Scopes

| Scope | Purpose | Classification |
|-------|---------|---------------|
| `openid email profile` | Basic identity for Auth.js | Non-sensitive |
| `gmail.readonly` | Read inbox for follow-up tracking | **Restricted** |
| `gmail.send` | Send follow-up emails from app | **Sensitive** |
| `calendar.events` | Create interview reminders | Sensitive |
| `calendar.readonly` | List upcoming interviews | Sensitive |

### Critical: prompt: "consent" and access_type: "offline"

Google only returns a `refresh_token` on the **first** authorization. Setting `prompt: "consent"` forces the consent screen every login, ensuring a fresh `refresh_token` is always returned. For a personal tool with 2 users, the UX cost is negligible (one extra click).

Without `access_type: "offline"`, Google will NOT return a refresh_token at all.

**Source:** https://authjs.dev/getting-started/providers/google

---

## 3. Token Storage & Refresh (JWT Strategy)

**Confidence: HIGH** (official Auth.js refresh token rotation guide, verified code)

Use the JWT strategy (not database sessions) since this is a single-user tool on SQLite. Tokens live in an encrypted cookie.

### Complete auth.ts with Token Refresh

```typescript
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

const ALLOWED_EMAILS = [
  "armaan.email1@gmail.com",
  "armaan.email2@gmail.com",
]

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
  callbacks: {
    // 1. Whitelist check
    async signIn({ profile }) {
      return ALLOWED_EMAILS.includes(profile?.email ?? "")
    },

    // 2. Persist tokens in JWT
    async jwt({ token, account }) {
      // First sign-in: store all tokens from Google
      if (account) {
        return {
          ...token,
          access_token: account.access_token as string,
          expires_at: account.expires_at as number,
          refresh_token: account.refresh_token as string,
        }
      }

      // Token still valid: return as-is
      if (Date.now() < token.expires_at * 1000) {
        return token
      }

      // Token expired: refresh it
      if (!token.refresh_token) {
        throw new TypeError("Missing refresh_token")
      }

      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          body: new URLSearchParams({
            client_id: process.env.AUTH_GOOGLE_ID!,
            client_secret: process.env.AUTH_GOOGLE_SECRET!,
            grant_type: "refresh_token",
            refresh_token: token.refresh_token!,
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
          // Google may or may not return a new refresh_token; keep the old one if not
          refresh_token: newTokens.refresh_token ?? token.refresh_token,
        }
      } catch (error) {
        console.error("Error refreshing access_token", error)
        return { ...token, error: "RefreshTokenError" as const }
      }
    },

    // 3. Expose access_token to server-side session
    async session({ session, token }) {
      session.accessToken = token.access_token
      session.error = token.error
      return session
    },
  },
})

// Type augmentations
declare module "next-auth" {
  interface Session {
    accessToken?: string
    error?: "RefreshTokenError"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token: string
    expires_at: number
    refresh_token: string
    error?: "RefreshTokenError"
  }
}
```

### How It Works

1. **First sign-in:** The `account` object contains `access_token`, `expires_at`, and `refresh_token` from Google. These get stored in the encrypted JWT cookie.
2. **Subsequent requests:** The `jwt` callback fires on every `auth()` call. If the token hasn't expired, it returns as-is. If expired, it hits Google's token endpoint to refresh.
3. **Session callback:** Copies `access_token` from the JWT into the session so server components/actions can access it via `session.accessToken`.

**Source:** https://authjs.dev/guides/refresh-token-rotation (code verified directly from official docs)

---

## 4. Accessing Tokens in Server Actions

**Confidence: HIGH**

### Pattern: Get token, create Google API client, make calls

```typescript
"use server"

import { auth } from "@/auth"
import { google } from "googleapis"

export async function listRecentEmails() {
  const session = await auth()
  if (!session?.accessToken) throw new Error("Not authenticated")

  // Create an OAuth2 client with the access token
  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: session.accessToken })

  const gmail = google.gmail({ version: "v1", auth: oauth2Client })

  const res = await gmail.users.messages.list({
    userId: "me",
    q: "is:unread",
    maxResults: 10,
  })

  return res.data.messages ?? []
}
```

### Helper: Reusable Google API Client Factory

```typescript
// lib/google.ts
import { auth } from "@/auth"
import { google } from "googleapis"

export async function getGoogleClient() {
  const session = await auth()
  if (!session?.accessToken) {
    throw new Error("No access token available. User must re-authenticate.")
  }
  if (session.error === "RefreshTokenError") {
    throw new Error("Token refresh failed. User must re-authenticate.")
  }

  const oauth2Client = new google.auth.OAuth2()
  oauth2Client.setCredentials({ access_token: session.accessToken })

  return {
    gmail: google.gmail({ version: "v1", auth: oauth2Client }),
    calendar: google.calendar({ version: "v3", auth: oauth2Client }),
  }
}
```

Then in any server action:

```typescript
"use server"
import { getGoogleClient } from "@/lib/google"

export async function getUpcomingInterviews() {
  const { calendar } = await getGoogleClient()

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime",
  })

  return res.data.items ?? []
}
```

**Source:** https://www.npmjs.com/package/googleapis, https://authjs.dev/reference/nextjs

---

## 5. Google Cloud Console Setup

**Confidence: HIGH** (verified via Google's official developer docs)

### Step-by-Step

1. **Create project** at https://console.cloud.google.com/
2. **Enable APIs:**
   - APIs & Services > Library > Search "Gmail API" > Enable
   - APIs & Services > Library > Search "Google Calendar API" > Enable
3. **Configure OAuth consent screen:**
   - APIs & Services > OAuth consent screen
   - User type: **External** (only option for personal Gmail accounts)
   - App name, support email, developer email
   - Add scopes: `gmail.readonly`, `gmail.send`, `calendar.events`, `calendar.readonly`
   - Add test users: your 2 Gmail addresses
4. **Create credentials:**
   - APIs & Services > Credentials > Create Credentials > OAuth client ID
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - (Add production URL later when deploying)
5. **Copy** Client ID and Client Secret to `.env.local`

### Testing vs Production Mode

| Mode | Token Lifetime | Users | Verification |
|------|---------------|-------|-------------|
| **Testing** | Refresh tokens expire after **7 days** | Up to 100 test users | Not required |
| **Production** (unverified) | Refresh tokens do NOT expire* | Any Google user | "Unverified app" warning shown |

*Refresh tokens can still be revoked by Google for inactivity (6 months) or if user revokes access.

### Recommendation: Publish to Production (Unverified)

For a personal tool, **publish the app to Production** immediately. This avoids the 7-day token expiry issue. Users will see a "Google hasn't verified this app" warning, but since only you are using it, click "Advanced" > "Go to [app] (unsafe)" to proceed. This is standard practice for personal projects.

**CRITICAL:** After changing from Testing to Production, **create new OAuth credentials.** Old credentials created in Testing mode will still have the 7-day expiry.

**Source:** https://support.google.com/cloud/answer/15549945, https://developers.google.com/identity/protocols/oauth2

---

## 6. Gmail API: Reading & Sending

**Confidence: HIGH** (verified via official Gmail API docs)

### Install

```bash
npm install googleapis
```

### Reading Messages

```typescript
import { google } from "googleapis"

// List messages with search filters
async function listMessages(gmail: ReturnType<typeof google.gmail>, query: string) {
  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,       // Same syntax as Gmail search box
    maxResults: 20,
  })
  return res.data.messages ?? []  // Returns array of { id, threadId }
}

// Get full message details
async function getMessage(gmail: ReturnType<typeof google.gmail>, messageId: string) {
  const res = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",  // "full" | "metadata" | "minimal" | "raw"
  })
  return res.data
}
```

### Search Query Syntax (q parameter)

The `q` parameter uses the same syntax as the Gmail search box:

| Query | Effect |
|-------|--------|
| `from:hr@company.com` | Messages from a specific sender |
| `subject:interview` | Messages with "interview" in subject |
| `is:unread` | Unread messages only |
| `after:2026/03/01 before:2026/03/10` | Date range |
| `from:hr@jpmorgan.com subject:interview is:unread` | Combined filters |
| `label:inbox` | Inbox only |
| `has:attachment` | Messages with attachments |
| `newer_than:7d` | Messages from last 7 days |

### Getting Useful Data from a Message

```typescript
function parseMessage(message: any) {
  const headers = message.payload?.headers ?? []
  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value

  return {
    id: message.id,
    threadId: message.threadId,
    from: getHeader("From"),
    to: getHeader("To"),
    subject: getHeader("Subject"),
    date: getHeader("Date"),
    snippet: message.snippet,  // Short text preview
    labelIds: message.labelIds,
  }
}
```

### Sending Emails

```typescript
async function sendEmail(
  gmail: ReturnType<typeof google.gmail>,
  to: string,
  subject: string,
  body: string
) {
  // Construct RFC 2822 message
  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    "",
    body,
  ]
  const message = messageParts.join("\n")

  // Encode as base64url
  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  })

  return res.data
}
```

### Sending Replies (threading)

```typescript
async function sendReply(
  gmail: ReturnType<typeof google.gmail>,
  threadId: string,
  to: string,
  subject: string,
  body: string,
  inReplyTo: string,    // Message-ID header of the message being replied to
  references: string     // References header chain
) {
  const messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${inReplyTo}`,
    `References: ${references}`,
    `Content-Type: text/html; charset=utf-8`,
    "",
    body,
  ]
  const message = messageParts.join("\n")

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
      threadId: threadId,  // Associates reply with the correct thread
    },
  })

  return res.data
}
```

**Source:** https://developers.google.com/workspace/gmail/api/guides/sending, https://developers.google.com/workspace/gmail/api/guides/filtering

---

## 7. Google Calendar API: Events

**Confidence: HIGH** (verified via official Calendar API docs)

### Listing Upcoming Events

```typescript
async function listUpcomingEvents(
  calendar: ReturnType<typeof google.calendar>,
  maxResults = 10
) {
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  })

  return (res.data.items ?? []).map((event) => ({
    id: event.id,
    summary: event.summary,
    description: event.description,
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    location: event.location,
    htmlLink: event.htmlLink,
    attendees: event.attendees,
  }))
}
```

### Creating an Event (Interview Reminder)

```typescript
async function createInterviewEvent(
  calendar: ReturnType<typeof google.calendar>,
  opts: {
    summary: string       // e.g., "JPMorgan HireVue Interview"
    description?: string
    location?: string
    startDateTime: string  // ISO 8601: "2026-03-15T14:00:00-05:00"
    endDateTime: string
    timeZone?: string      // e.g., "America/New_York"
  }
) {
  const event = {
    summary: opts.summary,
    description: opts.description,
    location: opts.location,
    start: {
      dateTime: opts.startDateTime,
      timeZone: opts.timeZone ?? "America/New_York",
    },
    end: {
      dateTime: opts.endDateTime,
      timeZone: opts.timeZone ?? "America/New_York",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 30 },
        { method: "email", minutes: 60 },
      ],
    },
  }

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  })

  return res.data
}
```

### Updating an Event

```typescript
async function updateEvent(
  calendar: ReturnType<typeof google.calendar>,
  eventId: string,
  updates: Partial<{
    summary: string
    description: string
    start: { dateTime: string; timeZone: string }
    end: { dateTime: string; timeZone: string }
  }>
) {
  const res = await calendar.events.patch({
    calendarId: "primary",
    eventId,
    requestBody: updates,
  })
  return res.data
}
```

### Deleting an Event

```typescript
async function deleteEvent(
  calendar: ReturnType<typeof google.calendar>,
  eventId: string
) {
  await calendar.events.delete({
    calendarId: "primary",
    eventId,
  })
}
```

**Source:** https://developers.google.com/workspace/calendar/api/guides/create-events, https://developers.google.com/workspace/calendar/api/quickstart/nodejs

---

## 8. Rate Limits & Quotas

**Confidence: HIGH** (verified via official quota docs)

### Gmail API Quotas

| Metric | Limit |
|--------|-------|
| Per-project rate | 1,200,000 quota units per minute |
| Per-user rate | 15,000 quota units per user per minute |

**Per-method quota costs:**

| Operation | Quota Units |
|-----------|-------------|
| `messages.list` | 5 |
| `messages.get` | 5 |
| `messages.send` | 100 |
| `messages.modify` | 5 |
| `messages.delete` | 10 |
| `messages.attachments.get` | 5 |

**Practical impact for a personal tool:** At 15,000 units/user/min, you can:
- List messages: 3,000 calls/min
- Get full messages: 3,000 calls/min
- Send emails: 150 calls/min

This is absurdly generous for a single-user app. Rate limiting will never be an issue.

### Google Calendar API Quotas

| Metric | Limit |
|--------|-------|
| Per-project daily | 1,000,000 queries per day |
| Per-user rate | ~25,000 requests per 100 seconds |

**Practical impact:** Even aggressive polling (every 5 minutes) uses ~288 requests/day. You will never hit these limits.

### Error Handling for Rate Limits

If you somehow hit limits, you get HTTP 403 (`usageLimits`) or 429 (`rateLimitExceeded`). Implement exponential backoff:

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      if (error?.code === 429 || error?.code === 403) {
        const delay = Math.pow(2, i) * 1000  // 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw error
    }
  }
  throw new Error("Max retries exceeded")
}
```

**Source:** https://developers.google.com/workspace/gmail/api/reference/quota, https://developers.google.com/workspace/calendar/api/guides/quota

---

## 9. Token Expiration & Re-Auth Flows

**Confidence: HIGH**

### Token Lifetimes

| Token | Lifetime | Notes |
|-------|----------|-------|
| Access token | **1 hour** (3600 seconds) | Auto-refreshed by JWT callback |
| Refresh token (Testing mode) | **7 days** | Avoid by publishing to Production |
| Refresh token (Production mode) | **Does not expire** | Can be revoked by user or 6mo inactivity |

### Auto-Refresh Flow (handled in auth.ts JWT callback)

1. User makes request -> `auth()` called -> JWT callback fires
2. JWT callback checks `Date.now() < token.expires_at * 1000`
3. If valid: return token as-is (fast path)
4. If expired: POST to `https://oauth2.googleapis.com/token` with refresh_token
5. Google returns new access_token + new expires_at
6. Updated token stored in JWT cookie automatically
7. User's request proceeds with fresh token

The user never notices. Refresh happens server-side, invisibly.

### Handling Refresh Failure

When refresh fails (revoked token, network issue), the JWT callback sets `error: "RefreshTokenError"` on the token. Handle this in the UI:

```typescript
// Client component
"use client"
import { useSession, signIn } from "next-auth/react"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()

  if (session?.error === "RefreshTokenError") {
    // Force re-authentication
    signIn("google")
    return null
  }

  return <>{children}</>
}
```

Or in a server component:

```typescript
import { auth, signIn } from "@/auth"
import { redirect } from "next/navigation"

export default async function ProtectedPage() {
  const session = await auth()

  if (!session) redirect("/api/auth/signin")
  if (session.error === "RefreshTokenError") {
    // Redirect to sign-in to re-authenticate
    redirect("/api/auth/signin?error=RefreshTokenError")
  }

  // ... render page with valid session.accessToken
}
```

### Revocation Scenarios

A refresh token becomes invalid when:
- User revokes access at https://myaccount.google.com/permissions
- App published in Testing mode and 7 days pass
- Google detects suspicious activity
- Refresh token unused for 6 months
- User changes their Google password (sometimes)

**Source:** https://authjs.dev/guides/refresh-token-rotation, https://developers.google.com/identity/protocols/oauth2

---

## 10. Whitelist: Restricting to 2 Accounts

**Confidence: HIGH** (verified via Auth.js docs)

### Implementation via signIn Callback

```typescript
const ALLOWED_EMAILS = [
  "email1@gmail.com",
  "email2@gmail.com",
]

// In NextAuth config:
callbacks: {
  async signIn({ profile }) {
    // Only allow whitelisted emails
    if (!profile?.email) return false
    return ALLOWED_EMAILS.includes(profile.email)
  },
  // ... jwt and session callbacks
}
```

### How It Works

- The `signIn` callback runs **before** the user is signed in.
- Returning `false` stops the flow and redirects to an error page.
- Returning `true` allows the sign-in to proceed.
- The `profile` object contains the Google profile with `email` and `email_verified`.

### Consider also: Environment Variable

```env
ALLOWED_EMAILS=email1@gmail.com,email2@gmail.com
```

```typescript
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "").split(",").map(e => e.trim())
```

This avoids hardcoding emails in source code.

**Source:** https://authjs.dev/guides/restricting-user-access

---

## 11. Scope Verification Requirements

**Confidence: HIGH** (verified via Google's official scope documentation)

### Your Scopes and Their Classifications

| Scope | Classification | Verification Required? |
|-------|---------------|----------------------|
| `gmail.readonly` | **Restricted** | Yes (CASA security assessment if storing data on servers) |
| `gmail.send` | **Sensitive** | Yes (OAuth app verification) |
| `calendar.events` | Sensitive | Yes (OAuth app verification) |
| `calendar.readonly` | Sensitive | Yes (OAuth app verification) |

### What This Means for a Personal Tool

**You do NOT need to complete verification.** Here's why:

1. **Testing mode:** Works fine with up to 100 test users. Add your 2 emails as test users. Tokens expire after 7 days (workable but annoying).

2. **Production mode (unverified):** Publish the app without verification. Users see "Google hasn't verified this app" warning. Since only you use it, click through the warning. No verification needed.

3. **Verification is only required** if you want to remove the warning and allow arbitrary users. Since this is a 2-user personal tool, skip verification entirely.

### Recommendation

1. Start in **Testing mode** during development
2. Once stable, publish to **Production (unverified)**
3. **Generate new OAuth credentials** after publishing
4. Never bother with Google's verification process

### Important: gmail.readonly is Restricted

The `gmail.readonly` scope is classified as **restricted**, which normally requires a CASA security assessment. However, this only applies to apps that go through verification for public use. For personal/internal apps that stay unverified, this is not enforced.

If you want to avoid the "restricted" classification entirely, consider whether `gmail.metadata` (restricted, but narrower) meets your needs. For reading actual email content (subjects, bodies, senders), `gmail.readonly` is necessary.

**Source:** https://developers.google.com/workspace/gmail/api/auth/scopes, https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification

---

## 12. Complete Implementation Reference

### Dependencies

```bash
npm install next-auth@beta googleapis
```

### Full File: `auth.ts`

See Section 3 for the complete implementation with:
- Google provider with custom scopes
- JWT callback with auto-refresh
- Session callback exposing access_token
- signIn callback with email whitelist
- TypeScript declarations

### Full File: `lib/google.ts`

See Section 4 for the reusable Google API client factory.

### Full File: `app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

### Environment Variables (.env.local)

```env
AUTH_SECRET=<run: npx auth secret>
AUTH_GOOGLE_ID=<from Google Cloud Console>
AUTH_GOOGLE_SECRET=<from Google Cloud Console>
ALLOWED_EMAILS=email1@gmail.com,email2@gmail.com
```

### Google Cloud Console Callback URL

```
http://localhost:3000/api/auth/callback/google
```

---

## Key Decisions & Recommendations

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Auth library | Auth.js v5 (next-auth@beta) | Standard for Next.js, great Google OAuth support, official refresh token docs |
| Session strategy | JWT (not database) | Single-user tool, no need for server-side sessions, tokens in encrypted cookie |
| Token refresh | Auto-refresh in JWT callback | Invisible to user, no manual re-auth needed unless refresh token is revoked |
| Google API client | `googleapis` npm package | Official Google client, well-maintained, typed |
| OAuth consent mode | Production (unverified) | Avoids 7-day token expiry, "unverified" warning is fine for personal use |
| Scope selection | Narrowest possible (readonly + send + events) | Avoids `mail.google.com` full access scope, reduces risk |
| Email whitelist | signIn callback | Simple, effective, no database needed |

## Pitfalls to Watch

1. **7-day token expiry in Testing mode** -- publish to Production and regenerate credentials
2. **Missing `prompt: "consent"` or `access_type: "offline"`** -- no refresh token returned
3. **Old credentials after switching to Production** -- must create new OAuth client ID
4. **gmail.readonly is Restricted** -- fine for personal use, but would need CASA assessment for public apps
5. **Base64 vs Base64url for Gmail** -- Gmail API requires base64url (replace +, /, and trailing =)
6. **Token race conditions** -- if multiple tabs refresh simultaneously, only one refresh can succeed. Auth.js handles this via cookie locking, but be aware
7. **Next.js 16 middleware.ts -> proxy.ts rename** -- check your Next.js version
8. **Session callback must explicitly expose access_token** -- Auth.js does NOT include it by default for security

## Open Questions

- **Next.js version:** Confirm whether the project uses Next.js 15 or 16 to determine middleware.ts vs proxy.ts
- **Email body parsing:** Gmail returns message bodies as base64-encoded parts in a nested MIME structure. Parsing multipart emails (text/plain + text/html) may need a helper library or manual traversal of `message.payload.parts`
- **Calendar sync direction:** Currently scoped for one-way (app creates events in Google Calendar). Two-way sync (watch for changes via push notifications) would need `calendar.events.watch()` and a webhook endpoint -- significantly more complex, defer unless needed

---

*Sources:*
- *https://authjs.dev/getting-started/installation*
- *https://authjs.dev/getting-started/providers/google*
- *https://authjs.dev/guides/refresh-token-rotation*
- *https://authjs.dev/guides/restricting-user-access*
- *https://authjs.dev/reference/nextjs*
- *https://developers.google.com/workspace/gmail/api/reference/quota*
- *https://developers.google.com/workspace/gmail/api/guides/sending*
- *https://developers.google.com/workspace/gmail/api/guides/filtering*
- *https://developers.google.com/workspace/gmail/api/auth/scopes*
- *https://developers.google.com/workspace/calendar/api/guides/create-events*
- *https://developers.google.com/workspace/calendar/api/guides/quota*
- *https://developers.google.com/workspace/calendar/api/auth*
- *https://developers.google.com/identity/protocols/oauth2*
- *https://www.npmjs.com/package/googleapis*
