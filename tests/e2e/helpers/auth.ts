import type { BrowserContext, Page } from "@playwright/test";
import { installSupabaseMock, type MockOptions } from "./mock-supabase";

export interface E2EUser {
  id: string;
  email: string;
}

/**
 * Cookie shape Supabase SSR (`@supabase/ssr` 0.7+) expects when reading
 * a session from a Next.js Server Component / route handler:
 *
 *   - Name: `sb-<projectRef>-auth-token`. With `NEXT_PUBLIC_SUPABASE_URL`
 *     pointing at `http://localhost:3001`, projectRef is the first label
 *     of the hostname → `localhost` → cookie name is
 *     `sb-localhost-auth-token`.
 *
 *   - Value: a `base64-` prefix followed by a base64url-encoded JSON
 *     session: `{ access_token, refresh_token, expires_at, expires_in,
 *     token_type: "bearer", user: {...} }`.
 *
 * The access_token is a JWT, but the stub server doesn't verify the
 * signature — it just returns the configured authedUser on /auth/v1/user
 * regardless of the bearer. The cookie's only job here is to exist in a
 * shape Supabase SSR will accept and forward.
 */
const STORAGE_KEY = "sb-localhost-auth-token";

interface SessionPayload {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: "bearer";
  user: { id: string; email: string };
}

function base64urlEncode(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

function buildSessionPayload(user: E2EUser): SessionPayload {
  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64urlEncode(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: "authenticated",
      aud: "authenticated",
      iss: "stub-supabase",
      exp: 9999999999,
      iat: 0,
    }),
  );
  const signature = "stub-signature";
  return {
    access_token: `${header}.${payload}.${signature}`,
    refresh_token: `refresh-${user.id}`,
    expires_at: 9999999999,
    expires_in: 3600,
    token_type: "bearer",
    user: { id: user.id, email: user.email },
  };
}

export interface Cookie {
  name: string;
  value: string;
  url: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Lax" | "Strict" | "None";
}

/**
 * Build a single SSR-shaped auth cookie that Supabase's storage adapter
 * will accept. Returned in Playwright's url-scoped form so it works with
 * any local origin.
 */
export function buildAuthCookies(user: E2EUser): Cookie[] {
  const sessionJson = JSON.stringify(buildSessionPayload(user));
  const value = `base64-${base64urlEncode(sessionJson)}`;
  return [
    {
      name: STORAGE_KEY,
      value,
      url: "http://localhost:3000",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ];
}

/**
 * Sign a Playwright page in as a seeded user — installs the Supabase fetch
 * mock first so the very first auth/v1/user call returns the user, then
 * drops the SSR-shaped session cookie into the browser context.
 */
export async function signInAs(
  page: Page,
  user: E2EUser,
  mockOptions: Omit<MockOptions, "authedUser"> = {},
): Promise<void> {
  await installSupabaseMock(page, { ...mockOptions, authedUser: user });
  const context: BrowserContext = page.context();
  await context.addCookies(buildAuthCookies(user));
}
