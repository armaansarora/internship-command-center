# R12.10 Mock Topology — Stub Supabase Server Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Tasks have hard sequential dependencies (stub-server → helper → config → scenarios), so serial execution.

**Goal:** Replace `page.route()` browser-only mock topology with a Node-side stub Supabase server on `:3001` so both Chromium AND Next.js dev-server server-side fetches converge on a single deterministic mock state. Closes B1 on R12.10.

**Architecture:** A single `http.createServer` instance listens on `:3001` and answers `/auth/v1/*`, `/rest/v1/*`, and `/__test__/*` admin routes. Per-scenario state (fixtures, RPC stubs, declarative overrides, counters, observed writes) is held in module state keyed by `activeScenarioId`. Playwright `globalSetup` boots the stub before the suite, `globalTeardown` shuts it down, and `webServer.env` rewrites `NEXT_PUBLIC_SUPABASE_URL` to `http://localhost:3001` so server-side Supabase SDK calls hit the same origin as browser-origin fetches.

**Tech Stack:** Node `http`, Vitest (unit), Playwright (e2e), TypeScript strict, no new runtime deps.

**Reference:** `docs/plans/2026-04-24-mock-topology-stub-server-design.md` (architecture rationale).

**Non-negotiables (re-asserted from partner brief):**
- NEVER touch the real Supabase project (`jzrsrruugcajohvvmevg`). Pre-commit grep proof.
- Each scenario runs in fresh active state (full fixture+counter swap on `/__test__/install`).
- A scenario surfacing a NEW real regression (different from the 3 partner closed at 98d3c47) → blocker, not weakened assertion.
- 36/36 scenarios must pass before `tower accept R12`.

---

## Task 1: Stub-server core handler logic (pure, unit-testable)

**Files:**
- Create: `tests/e2e/helpers/stub-server.ts` (handlers + state — no listener yet)
- Create: `tests/e2e/helpers/__tests__/stub-server.unit.test.ts`

**Step 1: Write failing tests for the pure request→response shape**

```ts
// tests/e2e/helpers/__tests__/stub-server.unit.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createStubState, handleStubRequest } from "../stub-server";

describe("stub-server pure handler", () => {
  let state = createStubState();
  beforeEach(() => {
    state = createStubState();
  });

  it("404s when no scenario installed", () => {
    const res = handleStubRequest(state, {
      method: "GET",
      url: "/auth/v1/user",
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(401);
  });

  it("/__test__/install activates a scenario", () => {
    const res = handleStubRequest(state, {
      method: "POST",
      url: "/__test__/install",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: {},
        rpc: {},
      }),
    });
    expect(res.status).toBe(200);
    expect(state.activeScenarioId).toBe("s1");
    expect(state.fixtures.authedUser).toEqual({ id: "u1", email: "u1@example.com" });
  });

  it("/auth/v1/user returns the authedUser after install", () => {
    handleStubRequest(state, {
      method: "POST",
      url: "/__test__/install",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: {},
        rpc: {},
      }),
    });
    const res = handleStubRequest(state, {
      method: "GET",
      url: "/auth/v1/user",
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.user.id).toBe("u1");
  });

  it("REST GET on a table returns fixture rows", () => {
    handleStubRequest(state, {
      method: "POST",
      url: "/__test__/install",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: { applications: [{ id: "a1", title: "Job" }] },
        rpc: {},
      }),
    });
    const res = handleStubRequest(state, {
      method: "GET",
      url: "/rest/v1/applications?select=*",
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual([{ id: "a1", title: "Job" }]);
  });

  it("REST RPC returns the configured rpc value", () => {
    handleStubRequest(state, {
      method: "POST",
      url: "/__test__/install",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: {},
        rpc: { my_rpc: { ok: true, n: 1 } },
      }),
    });
    const res = handleStubRequest(state, {
      method: "POST",
      url: "/rest/v1/rpc/my_rpc",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true, n: 1 });
  });

  it("REST writes rejected when allowWrites=false", () => {
    handleStubRequest(state, {
      method: "POST",
      url: "/__test__/install",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: {},
        rpc: {},
        allowWrites: false,
      }),
    });
    const res = handleStubRequest(state, {
      method: "POST",
      url: "/rest/v1/applications",
      headers: { "content-type": "application/json" },
      body: '{"id":"a1"}',
    });
    expect(res.status).toBe(500);
  });

  it("REST writes accepted when allowWrites=true and tracked", () => {
    handleStubRequest(state, {
      method: "POST",
      url: "/__test__/install",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: {},
        rpc: {},
        allowWrites: true,
      }),
    });
    const res = handleStubRequest(state, {
      method: "POST",
      url: "/rest/v1/applications",
      headers: { "content-type": "application/json" },
      body: '{"id":"a1"}',
    });
    expect(res.status).toBe(201);
    expect(state.writes).toEqual([
      { table: "applications", method: "POST", body: '{"id":"a1"}' },
    ]);
  });

  describe("override: rpc_count_threshold", () => {
    it("returns allowed shape under threshold, blocked shape after", () => {
      handleStubRequest(state, {
        method: "POST",
        url: "/__test__/install",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenarioId: "s1",
          authedUser: { id: "u1", email: "u1@example.com" },
          tables: {},
          rpc: {},
          overrides: [
            {
              behavior: "rpc_count_threshold",
              rpc: "bump_match_rate_limit",
              limit: 2,
              allowed: { allowed: true },
              blocked: { allowed: false },
            },
          ],
        }),
      });
      const r1 = handleStubRequest(state, { method: "POST", url: "/rest/v1/rpc/bump_match_rate_limit", headers: {}, body: "{}" });
      const r2 = handleStubRequest(state, { method: "POST", url: "/rest/v1/rpc/bump_match_rate_limit", headers: {}, body: "{}" });
      const r3 = handleStubRequest(state, { method: "POST", url: "/rest/v1/rpc/bump_match_rate_limit", headers: {}, body: "{}" });
      expect(JSON.parse(r1.body)).toEqual({ allowed: true, count: 1 });
      expect(JSON.parse(r2.body)).toEqual({ allowed: true, count: 2 });
      expect(JSON.parse(r3.body)).toEqual({ allowed: false, count: 3 });
    });
  });

  describe("override: rpc_error_status", () => {
    it("returns the configured status + body", () => {
      handleStubRequest(state, {
        method: "POST",
        url: "/__test__/install",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenarioId: "s1",
          authedUser: { id: "u1", email: "u1@example.com" },
          tables: {},
          rpc: {},
          overrides: [
            {
              behavior: "rpc_error_status",
              rpc: "bump_match_rate_limit",
              status: 500,
              body: { code: "P0001", message: "rpc error" },
            },
          ],
        }),
      });
      const r = handleStubRequest(state, {
        method: "POST",
        url: "/rest/v1/rpc/bump_match_rate_limit",
        headers: {},
        body: "{}",
      });
      expect(r.status).toBe(500);
      expect(JSON.parse(r.body)).toEqual({ code: "P0001", message: "rpc error" });
    });
  });

  describe("override: rpc_abort", () => {
    it("emits a sentinel that the listener interprets as a socket destroy", () => {
      handleStubRequest(state, {
        method: "POST",
        url: "/__test__/install",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenarioId: "s1",
          authedUser: { id: "u1", email: "u1@example.com" },
          tables: {},
          rpc: {},
          overrides: [{ behavior: "rpc_abort", rpc: "bump_match_rate_limit" }],
        }),
      });
      const r = handleStubRequest(state, {
        method: "POST",
        url: "/rest/v1/rpc/bump_match_rate_limit",
        headers: {},
        body: "{}",
      });
      expect(r.abort).toBe(true);
    });
  });

  describe("override: table_filter_branch", () => {
    it("returns onMatch when query filter matches, onNoMatch otherwise", () => {
      const aliceRows = [{ id: "A1", user_id: "alice" }];
      const unionRows = [{ id: "A1", user_id: "alice" }, { id: "B1", user_id: "bob" }];
      handleStubRequest(state, {
        method: "POST",
        url: "/__test__/install",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenarioId: "s1",
          authedUser: { id: "alice", email: "alice@e.com" },
          tables: {},
          rpc: {},
          overrides: [
            {
              behavior: "table_filter_branch",
              table: "match_candidate_index",
              filterParam: "user_id",
              filterValue: "eq.alice",
              onMatch: aliceRows,
              onNoMatch: unionRows,
            },
          ],
        }),
      });
      const filtered = handleStubRequest(state, {
        method: "GET",
        url: "/rest/v1/match_candidate_index?user_id=eq.alice&select=*",
        headers: {},
        body: undefined,
      });
      const unfiltered = handleStubRequest(state, {
        method: "GET",
        url: "/rest/v1/match_candidate_index?select=*",
        headers: {},
        body: undefined,
      });
      expect(JSON.parse(filtered.body)).toEqual(aliceRows);
      expect(JSON.parse(unfiltered.body)).toEqual(unionRows);
    });
  });

  describe("override: track_writes", () => {
    it("records writes to specified tables (passive — does not change response)", () => {
      handleStubRequest(state, {
        method: "POST",
        url: "/__test__/install",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenarioId: "s1",
          authedUser: { id: "u1", email: "u1@example.com" },
          tables: {},
          rpc: {},
          allowWrites: true,
          overrides: [{ behavior: "track_writes", tables: ["outreach_queue"] }],
        }),
      });
      handleStubRequest(state, {
        method: "POST",
        url: "/rest/v1/outreach_queue",
        headers: { "content-type": "application/json" },
        body: '{"id":"oq1"}',
      });
      handleStubRequest(state, {
        method: "PATCH",
        url: "/rest/v1/outreach_queue?id=eq.oq1",
        headers: { "content-type": "application/json" },
        body: '{"status":"sent"}',
      });
      const r = handleStubRequest(state, {
        method: "GET",
        url: "/__test__/writes",
        headers: {},
        body: undefined,
      });
      const writes = JSON.parse(r.body);
      expect(writes).toHaveLength(2);
      expect(writes[0].table).toBe("outreach_queue");
      expect(writes[1].method).toBe("PATCH");
    });
  });

  it("install resets fixtures, counters, and writes", () => {
    handleStubRequest(state, {
      method: "POST",
      url: "/__test__/install",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: { t1: [{ a: 1 }] },
        rpc: {},
        allowWrites: true,
      }),
    });
    handleStubRequest(state, {
      method: "POST",
      url: "/rest/v1/t1",
      headers: {},
      body: "{}",
    });
    expect(state.writes).toHaveLength(1);

    handleStubRequest(state, {
      method: "POST",
      url: "/__test__/install",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "s2",
        authedUser: { id: "u2", email: "u2@example.com" },
        tables: { t1: [] },
        rpc: {},
      }),
    });
    expect(state.activeScenarioId).toBe("s2");
    expect(state.writes).toHaveLength(0);
    expect(state.counters).toEqual({});
  });
});
```

**Step 2: Run tests, verify they fail**

Run: `npx vitest run tests/e2e/helpers/__tests__/stub-server.unit.test.ts`
Expected: import error / module not found.

**Step 3: Implement `tests/e2e/helpers/stub-server.ts`**

Implements `createStubState()`, `handleStubRequest(state, req)`, full pure logic. Listener (Step 6) layers on top.

Key types & functions:
- `StubRequest = { method, url, headers, body }`
- `StubResponse = { status, body, contentType, abort?: true }`
- `StubOverride` discriminated union for the 5 behaviors
- `StubState` mutable record
- `handleStubRequest(state, req): StubResponse`

Auth path (`/auth/v1/user|session`): returns `state.fixtures.authedUser` when set, else 401.

REST RPC path (`/rest/v1/rpc/<name>`): override interpretation runs first. Order: rpc_abort → rpc_error_status → rpc_count_threshold → fallback to `state.fixtures.rpc[name]`. The `rpc_count_threshold` returns `{ ...allowedOrBlocked, count }` so call-count is observable to the rate-limit caller.

REST table path (`/rest/v1/<table>?...`): override interpretation runs first (`table_filter_branch`). For GET/HEAD without override → return fixture rows. For non-GET writes: appended to `state.writes`, returns 201 if `allowWrites`, else 500.

Admin paths (`/__test__/*`):
- `POST /__test__/install` — atomic swap: parse JSON body, set `activeScenarioId`, replace `fixtures` and `overrides`, reset `counters`, reset `writes`. Returns 200.
- `GET /__test__/writes` — returns `state.writes` as JSON.
- `GET /__test__/health` — returns 200 OK for liveness.

**Step 4: Run tests, verify they pass**

Run: `npx vitest run tests/e2e/helpers/__tests__/stub-server.unit.test.ts`
Expected: all green.

**Step 5: Commit**

```bash
git add tests/e2e/helpers/stub-server.ts tests/e2e/helpers/__tests__/stub-server.unit.test.ts
git commit -m "[R12/12.10] feat(stub-server): pure request handler + override DSL"
```

---

## Task 2: Stub-server HTTP listener (thin wrapper)

**Files:**
- Modify: `tests/e2e/helpers/stub-server.ts` (append listener factory)
- Create: `tests/e2e/helpers/__tests__/stub-server.listener.test.ts`

**Step 1: Write failing integration test**

```ts
// tests/e2e/helpers/__tests__/stub-server.listener.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startStubServer, type StubServer } from "../stub-server";

describe("stub-server HTTP listener", () => {
  let server: StubServer;
  beforeAll(async () => {
    server = await startStubServer({ port: 0 }); // 0 = ephemeral
  });
  afterAll(async () => {
    await server.stop();
  });

  it("returns 401 on /auth/v1/user before install", async () => {
    const r = await fetch(`${server.url}/auth/v1/user`);
    expect(r.status).toBe(401);
  });

  it("install + auth + table fetch round-trip", async () => {
    const install = await fetch(`${server.url}/__test__/install`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: { t: [{ id: "t1" }] },
        rpc: {},
      }),
    });
    expect(install.status).toBe(200);

    const u = await fetch(`${server.url}/auth/v1/user`);
    expect(u.status).toBe(200);
    expect((await u.json()).data.user.id).toBe("u1");

    const t = await fetch(`${server.url}/rest/v1/t?select=*`);
    expect(await t.json()).toEqual([{ id: "t1" }]);
  });

  it("rpc_abort destroys the socket", async () => {
    await fetch(`${server.url}/__test__/install`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "s2",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: {},
        rpc: {},
        overrides: [{ behavior: "rpc_abort", rpc: "boom" }],
      }),
    });
    await expect(
      fetch(`${server.url}/rest/v1/rpc/boom`, { method: "POST", body: "{}" }),
    ).rejects.toThrow();
  });
});
```

**Step 2: Run tests, verify they fail**

Run: `npx vitest run tests/e2e/helpers/__tests__/stub-server.listener.test.ts`
Expected: `startStubServer` not exported.

**Step 3: Implement listener factory**

Append to `stub-server.ts`:

```ts
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

export interface StubServer {
  url: string;
  port: number;
  stop: () => Promise<void>;
  state: StubState;
}

export async function startStubServer(opts: { port?: number } = {}): Promise<StubServer> {
  const state = createStubState();
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const stubReq = {
        method: req.method ?? "GET",
        url: req.url ?? "/",
        headers: req.headers as Record<string, string>,
        body: body || undefined,
      };
      const r = handleStubRequest(state, stubReq);
      if (r.abort) {
        req.socket.destroy();
        return;
      }
      res.writeHead(r.status, { "content-type": r.contentType });
      res.end(r.body);
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(opts.port ?? 0, () => {
      const addr = server.address();
      if (typeof addr !== "object" || addr === null) {
        reject(new Error("listener address null"));
        return;
      }
      resolve({
        url: `http://localhost:${addr.port}`,
        port: addr.port,
        stop: () => new Promise<void>((r2) => server.close(() => r2())),
        state,
      });
    });
  });
}
```

**Step 4: Run tests, verify they pass**

Run: `npx vitest run tests/e2e/helpers/__tests__/stub-server.listener.test.ts`
Expected: all green.

**Step 5: Commit**

```bash
git add tests/e2e/helpers/stub-server.ts tests/e2e/helpers/__tests__/stub-server.listener.test.ts
git commit -m "[R12/12.10] feat(stub-server): http listener + abort support"
```

---

## Task 3: Migrate `mock-supabase.ts` helper to stub-server transport

**Files:**
- Modify: `tests/e2e/helpers/mock-supabase.ts`
- Modify: `tests/e2e/helpers/__tests__/mock-supabase.unit.test.ts`

**Step 1: Update mock-supabase unit tests for new shape**

Replace the existing tests that assert `buildFixtureHandler` shape with tests that assert `installSupabaseMock` POSTs the right install payload to the stub. Use a tiny in-process stub via `startStubServer({ port: 0 })`.

```ts
// tests/e2e/helpers/__tests__/mock-supabase.unit.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { installSupabaseMock, MOCK_SUPABASE_URL_ENV } from "../mock-supabase";
import { startStubServer, type StubServer } from "../stub-server";

describe("installSupabaseMock", () => {
  let server: StubServer;
  beforeAll(async () => {
    server = await startStubServer({ port: 0 });
    process.env[MOCK_SUPABASE_URL_ENV] = server.url;
  });
  afterAll(async () => {
    delete process.env[MOCK_SUPABASE_URL_ENV];
    await server.stop();
  });

  it("POSTs an install payload to the stub server", async () => {
    const fakePage = {
      setExtraHTTPHeaders: async (_h: Record<string, string>) => {},
    };
    await installSupabaseMock(fakePage as never, {
      authedUser: { id: "u1", email: "u1@example.com" },
      tables: { t: [{ id: "t1" }] },
      rpc: { my_rpc: { ok: true } },
    });
    expect(server.state.activeScenarioId).toBeTruthy();
    expect(server.state.fixtures.authedUser).toEqual({
      id: "u1",
      email: "u1@example.com",
    });
    expect(server.state.fixtures.tables).toEqual({ t: [{ id: "t1" }] });
  });

  it("forwards overrides verbatim", async () => {
    const fakePage = {
      setExtraHTTPHeaders: async (_h: Record<string, string>) => {},
    };
    await installSupabaseMock(fakePage as never, {
      authedUser: { id: "u1", email: "u1@example.com" },
      tables: {},
      rpc: {},
      overrides: [
        { behavior: "rpc_count_threshold", rpc: "x", limit: 5, allowed: {}, blocked: {} },
      ],
    });
    expect(server.state.overrides).toHaveLength(1);
    expect(server.state.overrides[0].behavior).toBe("rpc_count_threshold");
  });
});
```

**Step 2: Run tests, verify they fail (helper not yet rewritten)**

Run: `npx vitest run tests/e2e/helpers/__tests__/mock-supabase.unit.test.ts`
Expected: API mismatch.

**Step 3: Rewrite `mock-supabase.ts`**

```ts
import type { Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import type { StubOverride } from "./stub-server";

export type FixtureTables = Record<string, Array<Record<string, unknown>>>;
export type FixtureRpc = Record<string, unknown>;

export interface MockOptions {
  tables?: FixtureTables;
  rpc?: FixtureRpc;
  allowWrites?: boolean;
  authedUser?: { id: string; email: string } | null;
  overrides?: StubOverride[];
}

export const MOCK_SUPABASE_URL_ENV = "STUB_SUPABASE_URL";

function stubBaseUrl(): string {
  return process.env[MOCK_SUPABASE_URL_ENV] ?? "http://localhost:3001";
}

export async function installSupabaseMock(
  page: Pick<Page, "setExtraHTTPHeaders">,
  options: MockOptions,
): Promise<string> {
  const scenarioId = randomUUID();
  await page.setExtraHTTPHeaders({ "x-scenario-id": scenarioId });
  const res = await fetch(`${stubBaseUrl()}/__test__/install`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId, ...options }),
  });
  if (!res.ok) {
    throw new Error(`stub install failed: ${res.status} ${await res.text()}`);
  }
  return scenarioId;
}
```

Re-export `StubOverride` types from this file so scenario authors import everything from one helper.

**Step 4: Run tests, verify they pass**

Run: `npx vitest run tests/e2e/helpers/__tests__/mock-supabase.unit.test.ts`
Expected: all green.

**Step 5: Commit**

```bash
git add tests/e2e/helpers/mock-supabase.ts tests/e2e/helpers/__tests__/mock-supabase.unit.test.ts
git commit -m "[R12/12.10] refactor(mock-supabase): pivot helper to stub-server transport"
```

---

## Task 4: Wire Playwright globalSetup + globalTeardown + webServer env

**Files:**
- Create: `tests/e2e/global-setup.ts`
- Create: `tests/e2e/global-teardown.ts`
- Modify: `playwright.config.ts`

**Step 1: Implement global setup that boots the stub on a known port**

```ts
// tests/e2e/global-setup.ts
import { startStubServer, type StubServer } from "./helpers/stub-server";

declare global {
  var __STUB_SERVER__: StubServer | undefined;
}

export default async function globalSetup(): Promise<void> {
  const port = 3001;
  const server = await startStubServer({ port });
  globalThis.__STUB_SERVER__ = server;
  process.env.STUB_SUPABASE_URL = server.url;
  // eslint-disable-next-line no-console
  console.log(`[stub-server] listening on ${server.url}`);
}
```

```ts
// tests/e2e/global-teardown.ts
export default async function globalTeardown(): Promise<void> {
  const server = globalThis.__STUB_SERVER__;
  if (server) {
    await server.stop();
    // eslint-disable-next-line no-console
    console.log(`[stub-server] stopped`);
  }
}
```

**Step 2: Wire into `playwright.config.ts`**

Modifications:
- Add `globalSetup: "./tests/e2e/global-setup.ts"` and `globalTeardown: "./tests/e2e/global-teardown.ts"`.
- Update `webServer.env.NEXT_PUBLIC_SUPABASE_URL` from `https://jzrsrruugcajohvvmevg.supabase.co` to `http://localhost:3001`.
- Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set to a deterministic stub like `"sb_publishable_stub_for_e2e_local"`.

```ts
// playwright.config.ts (full file after edit)
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts$/,
  timeout: 30_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]]
    : [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "http://localhost:3001",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_stub_for_e2e_local",
          NEXT_PUBLIC_APP_URL:
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          SUPABASE_SERVICE_ROLE_KEY:
            process.env.SUPABASE_SERVICE_ROLE_KEY ??
            "service_role_stub_for_e2e",
        },
      },
});
```

**Step 3: Smoke test — boot harness and confirm stub starts**

Run a single trivial scenario (we'll choose `tests/e2e/security/cross-user-match-leak.spec.ts` which is structurally simplest) to confirm:
- `[stub-server] listening on http://localhost:3001` logs
- The dev server starts without env-validation crashing (Supabase URL `http://localhost:3001` is valid)
- The test runs end-to-end

Run: `npx playwright test tests/e2e/security/cross-user-match-leak.spec.ts --reporter=list`
Expected: dev server starts, stub-server log appears, test runs (may pass or fail — we're only checking topology now).

**Step 4: Commit**

```bash
git add tests/e2e/global-setup.ts tests/e2e/global-teardown.ts playwright.config.ts
git commit -m "[R12/12.10] feat(playwright): globalSetup + env rewrite to stub :3001"
```

---

## Task 5: Migrate the 4 scenarios with `page.route()` overlays

**Files:**
- Modify: `tests/e2e/abuse/match-candidates-flood.spec.ts`
- Modify: `tests/e2e/abuse/ref-request-flood.spec.ts`
- Modify: `tests/e2e/carryover/r11-cross-user-rls-runtime.spec.ts`
- Modify: `tests/e2e/carryover/r11-rate-limit-e2e.spec.ts`

**Step 1: `match-candidates-flood.spec.ts` — replace counter overlay with `rpc_count_threshold` override**

Drop the manual `page.route()` block. Pass overrides to `signInAs`:

```ts
await signInAs(page, USERS.alice, {
  tables: { ... },
  rpc: {},
  allowWrites: true,
  overrides: [
    {
      behavior: "rpc_count_threshold",
      rpc: "bump_match_rate_limit",
      limit: 20,
      allowed: { allowed: true },
      blocked: { allowed: false },
    },
  ],
});
```

**Step 2: `ref-request-flood.spec.ts` — replace write tracker with `track_writes`**

Drop the `page.route()` write tracker. Use `track_writes` override and read the result via stub admin endpoint:

```ts
await signInAs(page, USERS.alice, {
  tables: { ... },
  allowWrites: true,
  overrides: [{ behavior: "track_writes", tables: ["outreach_queue"] }],
});

// inside the test, after the flood, fetch the writes log:
const writesRes = await page.request.get("http://localhost:3001/__test__/writes");
const writes = await writesRes.json();
```

**However — re-read the partner B1 mitigation note:** the cooldown SHIPPED at 98d3c47. This scenario was originally a regression-candidate test (binding "no 429 ever"). Now that the cooldown EXISTS, the assertion needs to flip: the SECOND POST onward should return 429. Update the assertion accordingly. **This is not weakening — it's flipping to bind the now-shipped invariant.** Confirm by checking `src/app/api/contacts/[id]/reference-request/route.ts` for the cooldown logic before flipping.

**Step 3: `r11-cross-user-rls-runtime.spec.ts` — replace RLS overlay with `table_filter_branch`**

```ts
await signInAs(page, USERS.alice, {
  tables: {
    user_profiles: [...],
    match_candidate_index: [], // overridden by table_filter_branch below
  },
  rpc: { bump_match_rate_limit: { allowed: true, count: 1 } },
  allowWrites: true,
  overrides: [
    {
      behavior: "table_filter_branch",
      table: "match_candidate_index",
      filterParam: "user_id",
      filterValue: `eq.${USERS.alice.id}`,
      onMatch: aliceCandidates,
      onNoMatch: [...aliceCandidates, ...bobCandidates],
    },
  ],
});
```

**Step 4: `r11-rate-limit-e2e.spec.ts` — three describes, three overrides**

For describe #1 (over-threshold): same as match-candidates-flood pattern, but the `allowed`/`blocked` shapes need to also include `count` so the RPC return shape matches what `checkAndBumpRateLimit` expects. Stub interpreter already adds `count` to the shape.

For describe #2 (RPC error): use `rpc_error_status` with `status: 500` and the PostgREST-shaped error body.

For describe #3 (RPC abort): use `rpc_abort`.

**Step 5: Smoke test the migrated 4 scenarios**

Run: `npx playwright test tests/e2e/abuse/ tests/e2e/carryover/ --reporter=list`
Expected: all 4 migrated scenarios run (may surface real regressions in the rate-limit ones — those are blockers, not assertion weakening).

**Step 6: Commit**

```bash
git add tests/e2e/abuse/ tests/e2e/carryover/
git commit -m "[R12/12.10] refactor(e2e): migrate 4 page.route overlays to stub-server overrides"
```

---

## Task 6: Update ref-request-flood scenario for shipped cooldown

**Files:**
- Modify: `tests/e2e/abuse/ref-request-flood.spec.ts` (assertion flip only)

**Step 1: Confirm cooldown logic in src**

Re-read `src/app/api/contacts/[id]/reference-request/route.ts`. Identify cooldown window (per partner brief: 6h per-contact-offer pair, typed 429 cooldown_active). Confirm exact response shape.

**Step 2: Flip assertions**

Replace the "expect every status to NOT be 429" with "expect first POST to be 200/201, subsequent POSTs to be 429 with `cooldown_active` body". Update the comment block to reflect the now-shipped state. Remove the "blocker" sidecar comment.

**Step 3: Run scenario**

Run: `npx playwright test tests/e2e/abuse/ref-request-flood.spec.ts --reporter=list`
Expected: green.

**Step 4: Commit**

```bash
git add tests/e2e/abuse/ref-request-flood.spec.ts
git commit -m "[R12/12.10] test(ref-request-flood): flip to bind shipped 6h cooldown invariant"
```

---

## Task 7: Run full e2e suite — diagnose & resolve any remaining failures

**Files:** none (diagnostic step)

**Step 1: Acquire R12.10 lock**

```bash
npm run t start R12.10
```

(May already be acquired from prior session — `tower start` is idempotent; if it errors, use `tower undo` to clear stale state.)

**Step 2: Run full suite**

Run: `npm run test:e2e`
Expected: 36/36 green. Failures triaged below.

**Step 3: Triage**

For each failure:
- If failure is a NEW real regression (different from the 3 partner closed) → `npm run t block R12.10 "<reason>"`. Do not weaken.
- If failure is a topology issue not yet caught (e.g., stub server missing a route shape) → fix stub-server, recommit.
- If failure is a scenario-level bug (wrong fixture, wrong selector) → fix scenario, recommit.
- If failure is a flake (intermittent) → run 3× to isolate; if persistent, treat as real failure.

**Step 4: Commit any fixes**

Per-fix commits with `[R12/12.10] fix(e2e): <what>` subjects.

---

## Task 8: Verify gates — must all be green before tower accept

**Files:** none

**Step 1: tsc**

Run: `npx tsc --noEmit`
Expected: clean.

**Step 2: vitest unit suite**

Run: `npm test`
Expected: all green (1662 from prior session + new stub-server tests).

**Step 3: lint**

Run: `npm run lint`
Expected: ≤ 4 warnings (baseline from prior session). No errors.

**Step 4: build**

Run: `npm run build`
Expected: clean Next build.

**Step 5: e2e re-run (final confirmation)**

Run: `npm run test:e2e`
Expected: 36/36 green.

**Step 6: real-Supabase-ref scan**

Run: `grep -r "jzrsrruugcajohvvmevg" tests/`
Expected: zero matches.

If anything fails, fix and recommit. No `tower accept` until everything green.

---

## Task 9: Close R12.10, accept R12, handoff

**Files:** none

**Step 1: Mark R12.10 done**

```bash
npm run t done R12.10
```

This records the HEAD sha into the ledger. The B1 blocker should be resolved as part of this — ledger may need a `tower unblock` if the command exists, otherwise the `acceptance` gate will check whether all blockers are resolved.

**Step 2: Verify R12 acceptance**

```bash
npm run t accept R12
```

Husky gate runs the full verify (tasks complete + blockers empty + drift clean + tests + tsc + build + lint). MUST succeed without `--force`. If it refuses, do NOT pass `--force` — investigate the failing check, fix, recommit, retry.

**Step 3: Final handoff**

```bash
cat <<'EOF' | npm run t handoff -- --stdin
{
  "contextUsedPct": <actual>,
  "decisions": [
    {"text": "stub-server :3001 + globalSetup", "why": "least invasive way to make both browser and Next server-side fetches converge on one mock state"},
    {"text": "declarative override DSL (not callbacks)", "why": "callbacks can't survive HTTP boundary; DSL covers all 5 overlay patterns the 36 scenarios use"}
  ],
  "surprises": [...whatever surfaced...],
  "filesInPlay": [
    "tests/e2e/helpers/stub-server.ts",
    "tests/e2e/helpers/mock-supabase.ts",
    "tests/e2e/helpers/__tests__/stub-server.unit.test.ts",
    "tests/e2e/helpers/__tests__/stub-server.listener.test.ts",
    "tests/e2e/helpers/__tests__/mock-supabase.unit.test.ts",
    "tests/e2e/global-setup.ts",
    "tests/e2e/global-teardown.ts",
    "playwright.config.ts",
    "tests/e2e/abuse/match-candidates-flood.spec.ts",
    "tests/e2e/abuse/ref-request-flood.spec.ts",
    "tests/e2e/carryover/r11-cross-user-rls-runtime.spec.ts",
    "tests/e2e/carryover/r11-rate-limit-e2e.spec.ts"
  ],
  "next": ["partner Red Team R12 if desired", "branch protection: required-check on hardening-e2e workflow on main"],
  "contextNotes": "R12 accept landed; mock topology fixed; 36/36 e2e green; 3 src regressions partner-closed at 98d3c47 still verified"
}
EOF
```

**Step 4: Set autopilot to paused (R12 complete)**

The `tower accept` command auto-advances `.tower/autopilot.yml` per CLAUDE.md §8. If no further phases are scoped, autopilot pauses naturally. If R12-only scope is still set, autopilot.yml will mark `paused: true` after acceptance.

**Step 5: Push to origin**

Per autopilot rules (§8: "Always push to origin. No menu."):

```bash
git push origin main
```

---

## Failure-mode contingency plan

If, mid-execution, the suite reveals a NEW real regression (not one of the 3 partner closed):
1. Don't weaken the assertion.
2. `npm run t block R12.10 "<one-line reason>"` 
3. If the regression is small enough to fix WITHIN the autopilot self-resolve scope (no business decisions, no schema changes, no destructive ops): fix it as a separate commit `[R12/12.10] fix(<area>): <what>` and retry.
4. If it requires partner judgment (escalation criteria from §8): handoff with the blocker open, exit cleanly. Partner picks up next session.

If the stub server itself surfaces an unanticipated request shape (e.g., a Supabase SDK call we didn't model):
1. Add the route to `handleStubRequest` with the minimum shape that satisfies the SDK contract.
2. Add a unit test for the new route shape.
3. Recommit and retry the suite.

If `tower accept R12` refuses:
- Read the verify output, fix the failing check, recommit, retry. Never `--force`.
