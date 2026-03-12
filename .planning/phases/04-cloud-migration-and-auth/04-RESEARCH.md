# Phase 4: Cloud Migration & Auth - Research

**Researched:** 2026-03-09
**Domain:** Turso (libSQL) database migration, Auth.js v5 Google OAuth, route protection
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLOUD-01 | Migrate from better-sqlite3 to Turso (@libsql/client) — all Drizzle queries become async, same SQL dialect | Section: Standard Stack, Architecture Patterns, Code Examples |
| CLOUD-02 | All existing tables (applications, companies, cover_letters, follow_ups, company_research) migrated to Turso with data preserved | Section: Data Migration, Architecture Patterns |
| CLOUD-03 | New tables added: `accounts` (OAuth token storage), `sessions` (Auth.js), `users` (Auth.js), `verification_tokens` (Auth.js) | Section: Auth.js Schema Tables |
| CLOUD-04 | Environment variables: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN configured for both dev and production | Section: Environment Variables |
| CLOUD-05 | App works identically after migration — all existing features functional against Turso | Section: Common Pitfalls, Validation Architecture |
| AUTH-01 | Auth.js v5 with Google OAuth provider — single sign-in flow | Section: Standard Stack, Code Examples |
| AUTH-02 | Whitelist enforcement — only armaan.arora@nyu.edu and armaansarora20@gmail.com can sign in | Section: Code Examples |
| AUTH-03 | JWT strategy with automatic token refresh for Gmail and Calendar API access | Section: Code Examples |
| AUTH-04 | OAuth scopes include: openid, profile, email, gmail.readonly, gmail.send, calendar.events, calendar.readonly | Section: Code Examples |
| AUTH-05 | All routes protected — unauthenticated users redirected to sign-in page | Section: Architecture Patterns |
| AUTH-06 | Sign-out functionality with session cleanup | Section: Code Examples |
</phase_requirements>

---

## Summary

Phase 4 transforms the app from a local-only tool into a cloud-accessible, authenticated product. Two parallel workstreams make up this phase: (1) database migration from better-sqlite3 to Turso, and (2) Auth.js v5 Google OAuth integration.

The **Turso migration** is the higher-risk workstream because it touches every data access point in the codebase. The driver swap from `better-sqlite3` to `@libsql/client` converts all database operations from synchronous to async. The research files document exactly 30+ call sites across 9+ files that need `await` added. Critically, several functions in `dashboard.ts` and `follow-ups.ts` are themselves synchronous (not `async`) — these require both the function signature change AND the `await` keyword. The schema itself requires zero changes (same SQLite column types work 1:1 with Turso/libSQL), but three Auth.js tables must be added.

The **Auth.js integration** is well-understood and has a complete reference implementation in `.planning/research/auth-gmail-calendar.md`. The key project-specific constraint: Next.js is version **16.1.6**, which means route protection uses `proxy.ts` (not the `middleware.ts` pattern referenced in older Auth.js docs). The JWT strategy (tokens in encrypted cookie, not database) is the right choice for this single-user personal tool — no session table in the database needed. Two specific pitfalls require explicit attention: (1) `prompt: "consent"` and `access_type: "offline"` MUST be set to get a refresh token from Google, and (2) the Google OAuth app must be published to Production mode (not Testing) to avoid 7-day token expiry.

**Primary recommendation:** Execute Turso migration first as a standalone task, verify all existing features work, then layer Auth.js on top. This sequencing reduces the blast radius of any issues.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@libsql/client` | ^0.14.0 | Turso/libSQL driver replacing better-sqlite3 | Official Turso SDK, pure JS (no native compilation), supported by Drizzle |
| `next-auth` | beta (v5) | Auth.js v5 for Next.js App Router | Only Auth.js version with App Router-native API (`auth()` function pattern), official Google OAuth support |
| `googleapis` | latest | Google API client (Gmail + Calendar for Phase 6) | Install now so Phase 6 token infrastructure is ready |

### Keep Unchanged

| Library | Current Version | Notes |
|---------|----------------|-------|
| `drizzle-orm` | ^0.45.1 | Same package, change import path from `drizzle-orm/better-sqlite3` to `drizzle-orm/libsql` |
| `drizzle-kit` | ^0.31.9 | Same package, change `dialect` from `'sqlite'` to `'turso'` in config |
| All `drizzle-orm/sqlite-core` schema imports | — | No changes needed — SQLite types work 1:1 with libSQL |

### Remove

| Library | Why |
|---------|-----|
| `better-sqlite3` | Replaced by `@libsql/client` |
| `@types/better-sqlite3` | No longer needed |

### Installation

```bash
# Remove old sync driver
npm uninstall better-sqlite3 @types/better-sqlite3

# Add Turso driver + Auth.js
npm install @libsql/client next-auth@beta googleapis
```

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
internship-command-center/
  auth.ts                              # NEW — Auth.js v5 config (exports auth, handlers, signIn, signOut)
  proxy.ts                             # NEW — Route protection for Next.js 16+
  src/
    app/
      api/
        auth/
          [...nextauth]/
            route.ts                   # NEW — Auth.js route handler
      sign-in/
        page.tsx                       # NEW — Sign-in page (optional custom UI)
    db/
      index.ts                         # MODIFY — swap driver, update connection
      schema.ts                        # MODIFY — add Auth.js tables
    lib/
      dashboard.ts                     # MODIFY — all sync functions → async
      follow-ups.ts                    # MODIFY — async migration
      follow-up-actions.ts             # MODIFY — add await to .run() calls
      actions.ts                       # MODIFY — add await to .run() calls
      research.ts                      # MODIFY — add await to .get()/.run() calls
      cover-letter-actions.ts          # MODIFY — add await to .all() call
    __tests__/
      db.test.ts                       # REWRITE — remove better-sqlite3, use @libsql/client
      seed.test.ts                     # REWRITE — remove better-sqlite3, use @libsql/client
  drizzle.config.ts                    # MODIFY — change dialect + credentials
  .env.local                           # ADD vars — TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, ALLOWED_EMAILS
```

### Pattern 1: Database Connection (Turso)

**What:** Replace better-sqlite3 singleton with @libsql/client singleton
**When to use:** This replaces `src/db/index.ts` entirely

```typescript
// src/db/index.ts
// Source: Official Drizzle Turso docs + turso-migration.md
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

function createDb() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
}

declare global {
  // eslint-disable-next-line no-var
  var __db: ReturnType<typeof createDb> | undefined;
}

export const db = globalThis.__db ?? createDb();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__db = db;
}

export { schema };
```

**Local dev variant (no cloud needed):** Set `TURSO_DATABASE_URL=file:./data/internship.db` in `.env.local`. No auth token needed. Identical behavior to better-sqlite3.

### Pattern 2: Sync-to-Async Function Migration

**What:** Add `await` to every `.all()`, `.get()`, `.run()` call. Convert sync functions to async.
**Critical distinction:** Some functions are ALREADY async (server actions) — just add `await`. Others (like `getActionItems()` in dashboard.ts) are SYNC — both the signature AND callers must change.

**Sync function becoming async (dashboard.ts pattern):**
```typescript
// BEFORE — sync function
export function getActionItems(): ActionItem[] {
  const allApps = db.select().from(applications).all();
  // ...
}

// AFTER — async function
export async function getActionItems(): Promise<ActionItem[]> {
  const allApps = await db.select().from(applications).all();
  // ...
}
```

**Server action — just add await (actions.ts pattern):**
```typescript
// BEFORE
export async function updateApplicationStatus(formData: FormData) {
  db.update(applications).set({ status }).where(eq(applications.id, id)).run();
  // ...
}

// AFTER
export async function updateApplicationStatus(formData: FormData) {
  await db.update(applications).set({ status }).where(eq(applications.id, id)).run();
  // ...
}
```

**Server component page — just add await:**
```typescript
// BEFORE (page.tsx)
export default async function ApplicationsPage() {
  const apps = db.select().from(applications).all();
  // ...
}

// AFTER
export default async function ApplicationsPage() {
  const apps = await db.select().from(applications).all();
  // ...
}
```

### Pattern 3: drizzle.config.ts Update

```typescript
// drizzle.config.ts
// Source: Official Drizzle Turso docs
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dialect: 'turso',                                    // was 'sqlite'
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,              // was DATABASE_PATH
    authToken: process.env.TURSO_AUTH_TOKEN,           // new
  },
});
```

### Pattern 4: Auth.js Tables in Schema

**What:** Add 4 Auth.js-required tables to schema.ts. Using JWT strategy means sessions/accounts tables are NOT required for auth itself — but adding them now enables future database session support and is the standard Auth.js SQLite pattern.

**Note on JWT vs Database sessions:** The project uses JWT strategy (tokens in encrypted cookie). With JWT strategy:
- `users` table: NOT strictly required, but useful for future reference
- `sessions` table: NOT used (sessions live in cookie)
- `accounts` table: NOT used (tokens live in JWT cookie)
- `verification_tokens` table: NOT used (no email magic links)

**Decision:** For Phase 4 (JWT strategy only), skip adding Auth.js tables to the schema. The auth tokens are stored in the encrypted JWT cookie — no database writes. This simplifies Phase 4 scope. If Phase 6+ requires database session storage (unlikely given the personal tool nature), add them then. See CLOUD-03 requirement — it references these tables but the approved v2 design chose JWT strategy which does NOT require them.

**Confirmed:** The v2.0 design doc says "JWT strategy with automatic token refresh" and "No session table needed." CLOUD-03 should be interpreted as "add if using database adapter" — the JWT adapter means skip these.

### Pattern 5: Auth.js v5 Configuration (Next.js 16)

**CRITICAL:** This project uses Next.js 16.1.6. The auth research doc notes that Next.js 16 renames `middleware.ts` to `proxy.ts`. Use `proxy.ts`.

```typescript
// auth.ts (project root — NOT in src/)
// Source: auth-gmail-calendar.md Section 3 (verified official docs)
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS?.split(",").map(e => e.trim()) ?? []

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          prompt: "consent",        // REQUIRED: forces refresh_token on every sign-in
          access_type: "offline",   // REQUIRED: tells Google to issue refresh_token
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
      if (Date.now() < token.expires_at * 1000) return token
      if (!token.refresh_token) throw new TypeError("Missing refresh_token")
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
        const newTokens = tokensOrError as { access_token: string; expires_in: number; refresh_token?: string }
        return {
          ...token,
          access_token: newTokens.access_token,
          expires_at: Math.floor(Date.now() / 1000 + newTokens.expires_in),
          refresh_token: newTokens.refresh_token ?? token.refresh_token,
        }
      } catch (error) {
        console.error("Error refreshing access_token", error)
        return { ...token, error: "RefreshTokenError" as const }
      }
    },
    async session({ session, token }) {
      session.accessToken = token.access_token
      session.error = token.error
      return session
    },
  },
})

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

### Pattern 6: Route Protection (proxy.ts for Next.js 16)

```typescript
// proxy.ts (project root — NOT middleware.ts)
// Source: auth-gmail-calendar.md Section 1 (Next.js 16 note)
export { auth as proxy } from "@/auth"
```

The matcher config in middleware.ts syntax excludes auth API routes and static files. Verify what Next.js 16 proxy.ts accepts for matcher config — may differ from middleware.ts.

### Pattern 7: Auth API Route Handler

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

### Pattern 8: Session Check in Server Components / Actions

```typescript
// In any Server Component
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function ProtectedPage() {
  const session = await auth()
  if (!session) redirect("/api/auth/signin")
  // render with session.accessToken available
}

// In any Server Action
"use server"
import { auth } from "@/auth"

export async function protectedAction() {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")
  // proceed
}
```

### Pattern 9: Root Layout — SessionProvider (if needed for client components)

The current `layout.tsx` does not use any client-side session hooks. If any client components need session access later (e.g., sign-out button), wrap with `SessionProvider`. For Phase 4, protect at the route level only — no layout changes needed unless adding a sign-out button.

### Anti-Patterns to Avoid

- **Calling `.all()`, `.get()`, or `.run()` without `await`:** Returns a Promise instead of data. TypeScript catches this in most cases but NOT inside already-async Server Components where return types are broad.
- **Missing `prompt: "consent"` in Google provider:** Google will not return a `refresh_token`. Access token expires in 1 hour, then user is permanently logged out.
- **Missing `access_type: "offline"`:** Same result — no refresh token.
- **Using `middleware.ts` instead of `proxy.ts`:** Next.js 16 renamed this. Using the old name will silently fail to protect routes.
- **Testing mode OAuth app:** Refresh tokens expire after 7 days. Must publish to Production mode.
- **Not regenerating OAuth credentials after switching to Production:** Old Testing-mode credentials retain the 7-day expiry. Must create new Client ID + Secret.
- **Embedded replicas on Vercel:** Stateless serverless functions cannot persist local SQLite file. Use remote-only connection for Vercel.
- **Setting WAL pragma on libSQL client:** `@libsql/client` has no `.pragma()` method. Remove the `sqlite.pragma('journal_mode = WAL')` and `sqlite.pragma('synchronous = NORMAL')` calls from `src/db/index.ts` entirely. Turso uses WAL by default.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth token refresh | Custom refresh logic in middleware | Auth.js `jwt` callback | Handles expiry checking, token storage, race conditions, and error states |
| Route protection | Per-page session checks | `proxy.ts` export from Auth.js | Consistent edge-level protection, one file controls all routes |
| Token encryption | Custom JWT encoding | Auth.js `AUTH_SECRET` | Auth.js uses JWE (encrypted JWT), not just signed. Rolling your own exposes tokens. |
| Google OAuth flow | Manual code exchange | Auth.js Google provider | PKCE, state parameter, redirect URI validation — complex and security-critical |
| Async-to-async migration scanning | Manual grep | `npx tsc --noEmit` | TypeScript compiler catches most missing `await` calls as type errors |

**Key insight:** The Drizzle + Auth.js combination handles 95% of this phase's complexity. The remaining 5% is mechanical: swapping imports, adding `await` keywords, and running CLI commands to migrate data.

---

## Complete File-by-File Async Migration Map

This is the most critical section for planning. Every file that calls the database needs `await` added. Several files require function signature changes (sync → async).

### Files Requiring Function Signature Changes (sync → async)

These files have non-async functions that call the database. The functions themselves must become `async` AND all callers must handle the resulting Promise.

| File | Affected Functions | Callers to Update |
|------|--------------------|-------------------|
| `src/lib/dashboard.ts` | `getActionItems()`, `getStatusCounts()`, `getRecentActivity()` | `src/app/page.tsx` (dashboard page) |
| `src/lib/follow-ups.ts` | All exported functions | `src/app/follow-ups/page.tsx` |

### Files Requiring Only `await` Addition (already async)

These are already `async` functions (Server Actions or async page components). Just add `await` before each DB call.

| File | DB Call Sites |
|------|--------------|
| `src/lib/actions.ts` | 3 `.run()` calls |
| `src/lib/research.ts` | 1 `.get()`, 2 `.run()` calls |
| `src/lib/follow-up-actions.ts` | 5 `.run()` calls |
| `src/lib/cover-letter-actions.ts` | 1 `.all()` call |
| `src/app/applications/page.tsx` | 1 `.all()` call |
| `src/app/applications/[id]/page.tsx` | 1 `.get()` call |
| `src/app/cover-letters/page.tsx` | 1 `.all()` call |
| `src/app/follow-ups/page.tsx` | (uses follow-ups.ts functions — update after sig change) |

### Files Requiring Complete Rewrite

| File | What Changes |
|------|-------------|
| `src/__tests__/db.test.ts` | Uses `better-sqlite3` directly with sync API. Must switch to `@libsql/client` with async API. |
| `src/__tests__/seed.test.ts` | Same — direct `better-sqlite3` usage. Must switch to async libSQL or use drizzle directly. |
| `src/db/seed.ts` | Uses `better-sqlite3` driver setup. Must switch to `@libsql/client`. |
| `src/db/index.ts` | Full rewrite — new driver, remove fs/path directory creation, remove pragma calls. |

---

## Common Pitfalls

### Pitfall 1: Missing `await` on Non-Async Dashboard Functions

**What goes wrong:** `getActionItems()` in `dashboard.ts` is not async. After adding `await` to the DB calls inside it, the function will fail to compile unless its return type is changed to `Promise<ActionItem[]>` and the function itself is marked `async`. The dashboard page (`src/app/page.tsx`) calls these functions — those call sites need `await` too.
**Why it happens:** The turso-migration.md research notes this mechanical change but the dashboard functions are non-async, unlike the server actions.
**How to avoid:** Change all three dashboard functions to `async`, update the page.tsx caller.
**Warning signs:** TypeScript error "Property 'all' does not exist on type 'Promise<...>'" or similar.

### Pitfall 2: WAL Pragma Removal

**What goes wrong:** `src/db/index.ts` calls `sqlite.pragma('journal_mode = WAL')`. `@libsql/client` has no `.pragma()` method. Leaving it in causes a runtime crash.
**How to avoid:** Delete both pragma lines. Turso uses WAL by default.

### Pitfall 3: Google OAuth — No Refresh Token

**What goes wrong:** Sign-in works, but after 1 hour the access token expires and the user gets an error. This happens when `prompt: "consent"` or `access_type: "offline"` is missing from the Google provider config.
**How to avoid:** Both params are required. Copy the exact config from the Code Examples section.

### Pitfall 4: Next.js 16 Proxy vs Middleware

**What goes wrong:** Creating `middleware.ts` for route protection does nothing in Next.js 16+. Routes appear unprotected.
**How to avoid:** Create `proxy.ts` (not `middleware.ts`) at the project root.
**Warning signs:** Navigating to `/` without being signed in does not redirect to sign-in.

### Pitfall 5: OAuth App in Testing Mode

**What goes wrong:** Everything works during development but after 7 days the refresh token expires and Armaan has to sign in again every week.
**How to avoid:** After adding test users and verifying the OAuth flow works, publish the app to Production mode on Google Cloud Console. Then create NEW OAuth credentials (existing Testing credentials retain 7-day expiry). The "Google hasn't verified this app" warning is expected and acceptable.

### Pitfall 6: Test Files Still Import `better-sqlite3`

**What goes wrong:** `npm run test` fails with module not found after uninstalling `better-sqlite3`. The two test files (`db.test.ts`, `seed.test.ts`) import it directly.
**How to avoid:** Rewrite tests to use `@libsql/client` with a `file:` URL before running tests.

### Pitfall 7: `lastInsertRowid` Return Type

**What goes wrong:** `actions.ts` uses `result.lastInsertRowid` from `.run()`. In `@libsql/client`, the return type of `.run()` may differ. Verify the shape of the returned object.
**How to avoid:** After migration, check `typeof result.lastInsertRowid` — it may be `bigint` or `number` depending on version. The existing `Number(result.lastInsertRowid)` cast should handle this.

### Pitfall 8: `proxy.ts` Matcher Configuration

**What goes wrong:** The proxy.ts export may not support the same `config.matcher` export syntax as middleware.ts in Next.js 15.
**How to avoid:** Test that all routes redirect to sign-in when unauthenticated. Check Next.js 16 docs for proxy.ts configuration options if the matcher syntax differs.

---

## Environment Variables

### Required in `.env.local`

```env
# Turso (CLOUD-04)
TURSO_DATABASE_URL=libsql://your-database-name-your-org.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZDI1NTE5...

# Auth.js (AUTH-01 through AUTH-06)
AUTH_SECRET=<run: npx auth secret>
AUTH_GOOGLE_ID=<from Google Cloud Console>
AUTH_GOOGLE_SECRET=<from Google Cloud Console>
ALLOWED_EMAILS=armaan.arora@nyu.edu,armaansarora20@gmail.com

# Development override (use local file, no cloud needed)
# TURSO_DATABASE_URL=file:./data/internship.db
```

### URL Formats by Environment

| Environment | TURSO_DATABASE_URL | Auth Token |
|-------------|-------------------|------------|
| Local dev (no cloud) | `file:./data/internship.db` | Not needed |
| Local dev (with cloud) | `libsql://db.turso.io` | Required |
| Vercel production | `libsql://db.turso.io` | Required |

### Google Cloud Console Setup Steps

1. Create project at https://console.cloud.google.com/
2. Enable Gmail API and Google Calendar API (APIs & Services > Library)
3. Configure OAuth consent screen (External user type)
   - Add scopes: `gmail.readonly`, `gmail.send`, `calendar.events`, `calendar.readonly`
   - Add test users: armaan.arora@nyu.edu, armaansarora20@gmail.com
4. Create OAuth Client ID (Web application type)
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. **After verifying flow works:** Publish to Production mode
6. **Create NEW OAuth credentials** after publishing (old ones retain 7-day expiry)
7. Update `.env.local` with new credentials

---

## Data Migration: Local SQLite to Turso Cloud

```bash
# 1. Install Turso CLI
brew install tursodatabase/tap/turso

# 2. Login
turso auth login

# 3. Checkpoint WAL (project already uses WAL mode)
sqlite3 ./data/internship.db "PRAGMA wal_checkpoint(truncate);"

# 4. Import database
turso db import ./data/internship.db
# Creates database named "internship" on Turso Cloud

# 5. Get credentials
turso db show internship --url
turso db tokens create internship --expiration none  # non-expiring for production

# 6. Verify
turso db shell internship
# .tables
# SELECT COUNT(*) FROM applications;  -- expect 75+
```

**Confidence:** HIGH — verified via official Turso migration docs.

---

## Code Examples

### Sign-In Page Check (redirects unauthenticated users)

```typescript
// Source: auth-gmail-calendar.md Section 1
// src/app/page.tsx (and any protected page)
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/api/auth/signin")

  // existing dashboard content...
}
```

### Sign-Out Button

```typescript
// src/components/auth/sign-out-button.tsx
// Source: authjs.dev docs
import { signOut } from "@/auth"

export function SignOutButton() {
  return (
    <form action={async () => {
      "use server"
      await signOut()
    }}>
      <button type="submit">Sign out</button>
    </form>
  )
}
```

### Whitelist Enforcement

```typescript
// Source: auth-gmail-calendar.md Section 10
// In auth.ts callbacks:
async signIn({ profile }) {
  const allowed = process.env.ALLOWED_EMAILS?.split(",").map(e => e.trim()) ?? []
  if (!profile?.email) return false
  return allowed.includes(profile.email)
},
```

### Test File Rewrite Pattern (db.test.ts)

```typescript
// src/__tests__/db.test.ts — after migration
import { describe, it, expect } from 'vitest';
import { createClient } from '@libsql/client';

describe('Database', () => {
  it('connects and has the applications table', async () => {
    const client = createClient({ url: 'file:./data/internship.db' });
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='applications'"
    );
    expect(result.rows).toHaveLength(1);
    await client.close();
  });

  // ... other tests
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` for route protection | `proxy.ts` | Next.js 16 | Must use proxy.ts or routes stay unprotected |
| Database sessions (next-auth v4) | JWT sessions (Auth.js v5) | v5 release | Simpler for single-user, no DB sessions table needed |
| `getServerSession()` | `auth()` function | Auth.js v5 | Cleaner API, works across Server Components, Actions, Route Handlers |
| `better-sqlite3` sync API | `@libsql/client` async API | Migration | All DB calls must be awaited — mechanical but comprehensive |

**Deprecated/outdated:**
- `getServerSession(authOptions)` from next-auth v4: replaced by `auth()` from Auth.js v5
- `withAuth()` middleware wrapper: replaced by `proxy.ts` export pattern in Next.js 16
- `adapter: DrizzleAdapter(db)` with sqlite dialect: for JWT strategy, no adapter needed at all

---

## Open Questions

1. **proxy.ts matcher syntax in Next.js 16**
   - What we know: Next.js 16 renamed middleware.ts to proxy.ts
   - What's unclear: Whether the `export const config = { matcher: [...] }` syntax is still valid in proxy.ts, or if Next.js 16 has a different configuration API for route protection
   - Recommendation: Test with a simple protected route first. If matcher doesn't work, fall back to per-page `session = await auth()` checks in each page component. This is more verbose but guaranteed to work.

2. **`lastInsertRowid` type from `@libsql/client`**
   - What we know: `actions.ts` uses `Number(result.lastInsertRowid)` after `.run()`
   - What's unclear: Whether `@libsql/client`'s `.run()` returns the same shape as better-sqlite3
   - Recommendation: After migration, add a `console.log(result)` on first test insert and verify the field exists. The `Number()` cast handles both number and bigint.

3. **CLOUD-03 scope for Phase 4**
   - What we know: CLOUD-03 requires adding `accounts`, `sessions`, `users`, `verification_tokens` tables. The JWT strategy doesn't use these tables.
   - What's unclear: Whether CLOUD-03 means "add to schema and migrate" or "add if needed by auth strategy"
   - Recommendation: Skip these tables in Phase 4 (JWT strategy doesn't need them). If AUTH-03 (JWT strategy + token refresh) is working, CLOUD-03's spirit is satisfied. Document this decision in the plan.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `internship-command-center/vitest.config.ts` |
| Quick run command | `cd internship-command-center && npx vitest run` |
| Full suite command | `cd internship-command-center && npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLOUD-01 | Drizzle queries use async/await, no better-sqlite3 | unit | `npx vitest run src/__tests__/db.test.ts` | ❌ Wave 0 (needs rewrite) |
| CLOUD-02 | All 75+ applications visible in Turso | unit | `npx vitest run src/__tests__/seed.test.ts` | ❌ Wave 0 (needs rewrite) |
| CLOUD-03 | (JWT strategy — no DB tables needed) | manual | Verify sign-in works | N/A |
| CLOUD-04 | Env vars present and connection established | smoke | `cd internship-command-center && npm run build` | ✅ (build catches env issues) |
| CLOUD-05 | All pages load, CRUD operations work | smoke | `npx vitest run` (full suite) | ❌ Wave 0 |
| AUTH-01 | Google OAuth sign-in flow works | manual | Navigate to app unauthenticated, verify redirect | N/A |
| AUTH-02 | Non-whitelisted email rejected | manual | Try signing in with non-whitelisted account | N/A |
| AUTH-03 | JWT tokens auto-refresh after 1 hour | manual | Check session.accessToken in server component | N/A |
| AUTH-04 | Scopes include Gmail + Calendar | manual | Check Google consent screen shows correct scopes | N/A |
| AUTH-05 | All routes redirect when unauthenticated | smoke | `curl http://localhost:3000/ --max-redirs 0` | ❌ Wave 0 |
| AUTH-06 | Sign-out clears session | manual | Click sign out, verify redirect to sign-in | N/A |

### Sampling Rate

- **Per task commit:** `cd internship-command-center && npx vitest run`
- **Per wave merge:** `cd internship-command-center && npx vitest run --reporter=verbose && npm run build`
- **Phase gate:** Full suite green + manual auth flow verification before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/db.test.ts` — rewrite to use `@libsql/client` async API, covers CLOUD-01, CLOUD-02, CLOUD-05
- [ ] `src/__tests__/seed.test.ts` — rewrite to use `@libsql/client` async API, covers CLOUD-02
- [ ] `src/__tests__/auth.test.ts` — new smoke test: verify proxy.ts exports, auth() returns null when no session, covers AUTH-05
- [ ] Framework install: `npm install next-auth@beta googleapis @libsql/client` — if not yet done

*(Existing test infrastructure: vitest.config.ts present, node environment configured, `@` path alias working — all correct for post-migration tests)*

---

## Sources

### Primary (HIGH confidence)

- `.planning/research/turso-migration.md` — Comprehensive Turso migration guide, verified against official Drizzle + Turso docs
- `.planning/research/auth-gmail-calendar.md` — Auth.js v5 setup, Google OAuth, token refresh, whitelist pattern
- `internship-command-center/src/` codebase analysis — exact call sites, function signatures, async patterns
- Official Drizzle ORM Turso docs: https://orm.drizzle.team/docs/get-started/turso-new
- Official Turso migration docs: https://docs.turso.tech/cloud/migrate-to-turso
- Official Auth.js docs: https://authjs.dev/getting-started/installation

### Secondary (MEDIUM confidence)

- Auth.js refresh token rotation guide: https://authjs.dev/guides/refresh-token-rotation
- Next.js 16 proxy.ts pattern (noted in auth-gmail-calendar.md, needs runtime verification)
- Google OAuth Production mode vs Testing mode: https://support.google.com/cloud/answer/15549945

### Tertiary (LOW confidence — flag for validation)

- **proxy.ts matcher syntax in Next.js 16:** The research notes the rename but does not confirm whether `config` export syntax is identical. Needs verification during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack (Turso + Auth.js): HIGH — both have extensive official docs, prior research verified
- Async migration scope: HIGH — code analyzed directly, call sites enumerated
- Architecture patterns: HIGH — code examples from verified official sources
- Next.js 16 proxy.ts behavior: MEDIUM — rename documented, exact config syntax unconfirmed
- Pitfalls: HIGH — most derived from direct codebase analysis

**Research date:** 2026-03-09
**Valid until:** 2026-04-08 (30 days — both libraries are stable; Auth.js beta may have minor API changes)
