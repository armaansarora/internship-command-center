/**
 * Browser-side helper for installing a Supabase mock — backed by the
 * Node-side stub server (tests/e2e/helpers/stub-server.ts) booted in
 * Playwright globalSetup. Each call generates a fresh scenarioId, POSTs the
 * fixture bundle to the stub's /__test__/install endpoint, and stamps the
 * scenarioId onto the page's outbound HTTP headers so the same active
 * scenario covers both browser-origin AND Next.js dev-server server-side
 * fetches.
 *
 * See docs/plans/2026-04-24-mock-topology-stub-server-design.md for why this
 * shape replaced the legacy page.route()-only flow.
 */

import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import type { StubOverride } from "./stub-server";

export type FixtureTables = Record<string, Array<Record<string, unknown>>>;
export type FixtureRpc = Record<string, unknown>;

export interface MockOptions {
  tables?: FixtureTables;
  rpc?: FixtureRpc;
  allowWrites?: boolean;
  authedUser?: { id: string; email: string } | null;
  /**
   * Declarative behaviors interpreted by the stub server at request time.
   * Use these for stateful overlays that the legacy page.route() flow
   * expressed as closures — see stub-server.ts StubOverride for the
   * full DSL.
   */
  overrides?: StubOverride[];
}

/**
 * Env var read at runtime — globalSetup sets this to the stub's actual URL
 * (port may differ between unit tests and the live e2e suite). Falls back to
 * the canonical e2e port :3001 so scripts that bypass globalSetup still work.
 */
export const MOCK_SUPABASE_URL_ENV = "STUB_SUPABASE_URL";

function stubBaseUrl(): string {
  return process.env[MOCK_SUPABASE_URL_ENV] ?? "http://localhost:3001";
}

/**
 * Minimal Page shape — install no longer needs Playwright methods, but we
 * keep the parameter for API compat with the legacy page.route() flow.
 * Pass the real Page or any object — it's unused.
 */
export type MockablePage = Pick<Page, never>;

/**
 * Install a Supabase fixture for the current Playwright test. Returns the
 * scenarioId so the caller can read /__test__/writes for assertions on
 * observed mutations.
 *
 * Behavioral guarantees:
 *  - The stub's active scenarioId is swapped to a fresh value, ensuring no
 *    cross-test bleed.
 *  - Counters and observed writes are reset before this call returns.
 *
 * Note: a previous version of this helper called page.setExtraHTTPHeaders
 * to stamp `x-scenario-id` for diagnostic visibility. That broke CORS
 * preflight on font CDN fetches (browsers reject Access-Control-Allow-
 * Headers when a custom header is present in the preflight request).
 * The header was diagnostic-only — the stub's source of truth is its
 * own activeScenarioId — so we dropped it.
 */
export async function installSupabaseMock(
  _page: MockablePage,
  options: MockOptions = {},
): Promise<string> {
  const scenarioId = randomUUID();

  const payload = {
    scenarioId,
    authedUser: options.authedUser ?? null,
    tables: options.tables ?? {},
    rpc: options.rpc ?? {},
    allowWrites: options.allowWrites ?? false,
    overrides: options.overrides ?? [],
  };

  const res = await fetch(`${stubBaseUrl()}/__test__/install`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`stub install failed: ${res.status} ${text}`);
  }

  return scenarioId;
}

// Re-export StubOverride so scenario authors can import everything from the
// helper module without reaching into stub-server directly.
export type { StubOverride } from "./stub-server";
