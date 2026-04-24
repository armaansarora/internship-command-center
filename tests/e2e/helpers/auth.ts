import type { BrowserContext, Page } from "@playwright/test";
import { installSupabaseMock, type MockOptions } from "./mock-supabase";

export interface E2EUser {
  id: string;
  email: string;
}

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Lax" | "Strict" | "None";
}

/**
 * Build deterministic synthetic auth cookies. The value is NOT a real
 * Supabase JWT — it's a base64url-encoded stub our mock handler can unpack
 * in principle, though in practice we intercept the upstream auth/v1/user
 * call so the cookie value is opaque to our test path and only needs to
 * exist for @supabase/ssr to proceed with downstream REST calls.
 */
export function buildAuthCookies(user: E2EUser): Cookie[] {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ sub: user.id, email: user.email, exp: 9999999999 }),
  ).toString("base64url");
  const signature = "stub-signature";
  const accessToken = `${header}.${payload}.${signature}`;
  const refreshToken = `refresh-${user.id}`;

  const base = {
    domain: "localhost",
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax" as const,
  };

  return [
    { name: "sb-access-token", value: accessToken, ...base },
    { name: "sb-refresh-token", value: refreshToken, ...base },
  ];
}

/**
 * Sign a Playwright page in as a seeded user — installs the Supabase fetch
 * mock first so the very first auth/v1/user call returns the user, then
 * drops synthetic auth cookies into the browser context.
 */
export async function signInAs(
  page: Page,
  user: E2EUser,
  mockOptions: Omit<MockOptions, "authedUser"> = {},
): Promise<void> {
  await installSupabaseMock(page, { ...mockOptions, authedUser: user });
  const context: BrowserContext = page.context();
  // Playwright's addCookies requires either `url` OR `domain`+`path`, never
  // both. We use `url` so each cookie gets scoped to the running origin
  // regardless of the webServer port.
  await context.addCookies(
    buildAuthCookies(user).map(({ domain: _domain, path: _path, ...rest }) => ({
      ...rest,
      url: "http://localhost:3000",
    })),
  );
}
