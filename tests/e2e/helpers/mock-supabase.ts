import type { Page, Route } from "@playwright/test";

export type FixtureTables = Record<string, Array<Record<string, unknown>>>;
export type FixtureRpc = Record<string, unknown>;

export interface MockOptions {
  tables?: FixtureTables;
  rpc?: FixtureRpc;
  allowWrites?: boolean;
  authedUser?: { id: string; email: string } | null;
}

export interface HandlerRequest {
  method: string;
  url: string;
  body?: string;
}

export interface HandlerResponse {
  status: number;
  body: string;
  contentType: string;
}

/**
 * Pure-function fixture handler — unit-testable without a Playwright
 * context. installSupabaseMock() below wires this into page.route() for
 * browser scenarios. Keeping the handler separate lets us unit-test the
 * mock logic with vitest and assert responses without spinning a browser.
 */
export function buildFixtureHandler(options: MockOptions) {
  return function handler(req: HandlerRequest): HandlerResponse {
    const url = new URL(req.url, "https://stub.local");
    const path = url.pathname;

    if (path === "/auth/v1/user" || path === "/auth/v1/session") {
      if (options.authedUser) {
        return json(200, {
          data: { user: options.authedUser },
          error: null,
        });
      }
      return json(401, {
        data: { user: null },
        error: { message: "unauthorized" },
      });
    }

    if (path.startsWith("/rest/v1/rpc/")) {
      const rpcName = path.substring("/rest/v1/rpc/".length);
      if (options.rpc && rpcName in options.rpc) {
        return json(200, options.rpc[rpcName]);
      }
      return json(404, { error: `rpc ${rpcName} not mocked` });
    }

    if (path.startsWith("/rest/v1/")) {
      const table = path.substring("/rest/v1/".length).split("?")[0];
      if (req.method === "GET" || req.method === "HEAD") {
        const rows = options.tables?.[table] ?? [];
        return json(200, rows);
      }
      if (!options.allowWrites) {
        return json(500, { error: `unexpected write to ${table}` });
      }
      return json(201, { ok: true });
    }

    return json(404, { error: `unhandled path: ${path}` });
  };
}

function json(status: number, body: unknown): HandlerResponse {
  return {
    status,
    body: JSON.stringify(body),
    contentType: "application/json",
  };
}

/**
 * Install the fixture handler onto a Playwright page. Intercepts the real
 * Supabase project URL and any local-dev analogue. Fails the test on
 * unmocked requests (partner constraint b — no prod DB contact).
 */
export async function installSupabaseMock(
  page: Page,
  options: MockOptions,
): Promise<void> {
  const handler = buildFixtureHandler(options);
  const supabasePattern = /\.supabase\.co\/(auth|rest|realtime)\//;

  await page.route(supabasePattern, async (route: Route) => {
    const request = route.request();
    const res = handler({
      method: request.method(),
      url: request.url(),
      body: request.postData() ?? undefined,
    });
    await route.fulfill({
      status: res.status,
      body: res.body,
      contentType: res.contentType,
    });
  });
}
