/**
 * Stub Supabase server — Node-side process listening on `:3001` (or an
 * ephemeral port in unit tests). Replaces the legacy `page.route()`-based
 * mock so both browser-origin fetches AND Next.js dev-server server-side
 * fetches converge on a single source of truth.
 *
 * Architecture rationale: see docs/plans/2026-04-24-mock-topology-stub-server-design.md.
 *
 * The pure handler (`handleStubRequest`) is decoupled from the HTTP listener
 * (`startStubServer`) so the request/response logic is unit-testable in
 * isolation; the listener is a thin wrapper that streams body, calls the
 * pure handler, and writes the response (or destroys the socket on the
 * `rpc_abort` sentinel).
 */

import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

// ─── Types ───────────────────────────────────────────────────────────────

export type FixtureTables = Record<string, Array<Record<string, unknown>>>;
export type FixtureRpc = Record<string, unknown>;

export interface AuthedUser {
  id: string;
  email: string;
}

/**
 * Declarative override DSL — the request handler interprets these at request
 * time. Callbacks would be cleaner but can't survive an HTTP boundary, so the
 * scenarios pass shape descriptions instead. Coverage matches every overlay
 * pattern the existing 36 scenarios use.
 */
export type StubOverride =
  | {
      behavior: "rpc_count_threshold";
      rpc: string;
      limit: number;
      allowed: Record<string, unknown>;
      blocked: Record<string, unknown>;
    }
  | {
      behavior: "rpc_error_status";
      rpc: string;
      status: number;
      body: unknown;
    }
  | {
      behavior: "rpc_abort";
      rpc: string;
    }
  | {
      behavior: "table_filter_branch";
      table: string;
      filterParam: string;
      filterValue: string;
      onMatch: Array<Record<string, unknown>>;
      onNoMatch: Array<Record<string, unknown>>;
    }
  | {
      behavior: "track_writes";
      tables: string[];
    }
  | {
      behavior: "intermittent_failure";
      // Failure injection applied to REST + RPC requests (excludes auth and
      // /__test__). Returns the configured failure response on every Nth call
      // (1-indexed). Useful for graceful-degradation scenarios.
      everyNth: number;
      status: number;
      body: unknown;
    };

export interface StubFixtures {
  authedUser: AuthedUser | null;
  tables: FixtureTables;
  rpcs: FixtureRpc;
  allowWrites: boolean;
}

export interface StubWrite {
  table: string;
  method: string;
  body: string;
}

export interface StubState {
  activeScenarioId: string | null;
  fixtures: StubFixtures;
  overrides: StubOverride[];
  counters: Record<string, number>;
  writes: StubWrite[];
}

export interface StubRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body: string | undefined;
}

export interface StubResponse {
  status: number;
  body: string;
  contentType: string;
  abort?: true;
}

// ─── State factory ───────────────────────────────────────────────────────

export function createStubState(): StubState {
  return {
    activeScenarioId: null,
    fixtures: {
      authedUser: null,
      tables: {},
      rpcs: {},
      allowWrites: false,
    },
    overrides: [],
    counters: {},
    writes: [],
  };
}

// ─── Pure request handler ────────────────────────────────────────────────

interface InstallPayload {
  scenarioId: string;
  authedUser?: AuthedUser | null;
  tables?: FixtureTables;
  rpc?: FixtureRpc;
  allowWrites?: boolean;
  overrides?: StubOverride[];
}

export function handleStubRequest(state: StubState, req: StubRequest): StubResponse {
  const url = new URL(req.url, "http://stub.local");
  const path = url.pathname;

  if (path.startsWith("/__test__/")) {
    return handleAdmin(state, req, path);
  }

  if (path.startsWith("/auth/v1/")) {
    return handleAuth(state, path);
  }

  if (path.startsWith("/rest/v1/rpc/")) {
    const intermittent = checkIntermittentFailure(state);
    if (intermittent) return intermittent;
    const rpcName = path.substring("/rest/v1/rpc/".length);
    return handleRpc(state, rpcName);
  }

  if (path.startsWith("/rest/v1/")) {
    const intermittent = checkIntermittentFailure(state);
    if (intermittent) return intermittent;
    const table = path.substring("/rest/v1/".length).split("?")[0];
    return handleRest(state, req, url, table);
  }

  return json(404, { error: `unhandled path: ${path}` });
}

// ─── Admin path (/__test__/*) ────────────────────────────────────────────

function handleAdmin(state: StubState, req: StubRequest, path: string): StubResponse {
  if (path === "/__test__/health" && req.method === "GET") {
    return json(200, { ok: true });
  }

  if (path === "/__test__/install" && req.method === "POST") {
    let payload: InstallPayload;
    try {
      payload = JSON.parse(req.body ?? "{}") as InstallPayload;
    } catch {
      return json(400, { error: "invalid JSON" });
    }
    if (!payload.scenarioId || typeof payload.scenarioId !== "string") {
      return json(400, { error: "scenarioId required" });
    }
    state.activeScenarioId = payload.scenarioId;
    state.fixtures = {
      authedUser: payload.authedUser ?? null,
      tables: payload.tables ?? {},
      rpcs: payload.rpc ?? {},
      allowWrites: payload.allowWrites ?? false,
    };
    state.overrides = payload.overrides ?? [];
    state.counters = {};
    state.writes = [];
    return json(200, { ok: true, scenarioId: payload.scenarioId });
  }

  if (path === "/__test__/writes" && req.method === "GET") {
    return json(200, state.writes);
  }

  if (path === "/__test__/state" && req.method === "GET") {
    // Diagnostic only — exposes the full mutable state for debugging.
    return json(200, {
      activeScenarioId: state.activeScenarioId,
      counters: state.counters,
      writeCount: state.writes.length,
      overrideCount: state.overrides.length,
    });
  }

  return json(404, { error: `unhandled admin path: ${path}` });
}

// ─── Auth path (/auth/v1/*) ──────────────────────────────────────────────

function handleAuth(state: StubState, path: string): StubResponse {
  const user = state.fixtures.authedUser;
  if (path === "/auth/v1/user" || path === "/auth/v1/session") {
    if (user) {
      return json(200, { data: { user }, error: null });
    }
    return json(401, { data: { user: null }, error: { message: "unauthorized" } });
  }
  if (path === "/auth/v1/token" || path.startsWith("/auth/v1/token")) {
    if (user) {
      // Supabase v6 SDK refresh-token response shape: top-level access_token,
      // refresh_token, user.
      return json(200, {
        access_token: "stub-access-token",
        refresh_token: "stub-refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: 9999999999,
        user,
      });
    }
    return json(401, { error: "no_user" });
  }
  if (path === "/auth/v1/logout") {
    return json(204, {});
  }
  return json(200, { data: null, error: null });
}

// ─── REST RPC (/rest/v1/rpc/<name>) ──────────────────────────────────────

function handleRpc(state: StubState, rpcName: string): StubResponse {
  for (const override of state.overrides) {
    if (override.behavior === "rpc_abort" && override.rpc === rpcName) {
      return { status: 0, body: "", contentType: "application/json", abort: true };
    }
    if (override.behavior === "rpc_error_status" && override.rpc === rpcName) {
      return {
        status: override.status,
        body: JSON.stringify(override.body),
        contentType: "application/json",
      };
    }
    if (override.behavior === "rpc_count_threshold" && override.rpc === rpcName) {
      const key = `rpc:${rpcName}`;
      state.counters[key] = (state.counters[key] ?? 0) + 1;
      const count = state.counters[key];
      const shape = count <= override.limit ? override.allowed : override.blocked;
      return json(200, { ...shape, count });
    }
  }
  if (rpcName in state.fixtures.rpcs) {
    return json(200, state.fixtures.rpcs[rpcName]);
  }
  return json(404, { error: `rpc ${rpcName} not mocked` });
}

// ─── REST table (/rest/v1/<table>?...) ───────────────────────────────────

function handleRest(
  state: StubState,
  req: StubRequest,
  url: URL,
  table: string,
): StubResponse {
  const isRead = req.method === "GET" || req.method === "HEAD";

  if (isRead) {
    for (const override of state.overrides) {
      if (override.behavior === "table_filter_branch" && override.table === table) {
        const got = url.searchParams.get(override.filterParam) ?? "";
        const rows = got === override.filterValue ? override.onMatch : override.onNoMatch;
        return json(200, rows);
      }
    }
    const rows = state.fixtures.tables[table] ?? [];
    return json(200, rows);
  }

  // Non-GET = write — track and gate on allowWrites.
  // track_writes overrides are passive (always record) but writes are also
  // recorded by default. Single record per request.
  state.writes.push({
    table,
    method: req.method,
    body: req.body ?? "",
  });
  if (!state.fixtures.allowWrites) {
    return json(500, { error: `unexpected write to ${table}` });
  }
  return json(201, { ok: true });
}

/**
 * Walk the override list looking for an `intermittent_failure` behavior.
 * Increments a shared REST-call counter on every match and returns the
 * configured failure response on every Nth call. The counter is per-scenario
 * (reset on /__test__/install) and counts both REST and RPC requests.
 */
function checkIntermittentFailure(state: StubState): StubResponse | null {
  for (const override of state.overrides) {
    if (override.behavior !== "intermittent_failure") continue;
    const key = "intermittent:rest_call_count";
    state.counters[key] = (state.counters[key] ?? 0) + 1;
    const count = state.counters[key];
    if (count % override.everyNth === 0) {
      return {
        status: override.status,
        body: JSON.stringify(override.body),
        contentType: "application/json",
      };
    }
  }
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function json(status: number, body: unknown): StubResponse {
  return {
    status,
    body: JSON.stringify(body),
    contentType: "application/json",
  };
}

// ─── HTTP listener ───────────────────────────────────────────────────────

export interface StubServer {
  url: string;
  port: number;
  state: StubState;
  stop: () => Promise<void>;
}

export interface StartOptions {
  port?: number;
}

export async function startStubServer(opts: StartOptions = {}): Promise<StubServer> {
  const state = createStubState();
  const server: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on("end", () => {
      const body = chunks.length > 0 ? Buffer.concat(chunks).toString("utf8") : undefined;
      const stubReq: StubRequest = {
        method: req.method ?? "GET",
        url: req.url ?? "/",
        headers: req.headers as Record<string, string | string[] | undefined>,
        body,
      };
      const r = handleStubRequest(state, stubReq);
      if (r.abort === true) {
        req.socket.destroy();
        return;
      }
      res.writeHead(r.status, { "content-type": r.contentType });
      res.end(r.body);
    });
    req.on("error", () => {
      // Client closed connection mid-request — nothing to do.
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    // Listen on the dual-stack wildcard (no host). Node binds IPv6 by
    // default, which accepts IPv4 connections via v4-mapped addresses on
    // macOS/Linux. Listening only on 127.0.0.1 caused fetch() from
    // Playwright's test runner to hang because Node's undici resolves
    // `localhost` to `::1` first and got ECONNREFUSED before retrying v4.
    server.listen(opts.port ?? 0, () => {
      const addr = server.address();
      if (typeof addr !== "object" || addr === null) {
        reject(new Error("listener address is not an inet address"));
        return;
      }
      resolve({
        url: `http://localhost:${addr.port}`,
        port: addr.port,
        state,
        stop: () =>
          new Promise<void>((r2) => {
            server.close(() => r2());
            // Close existing keep-alive connections so close() doesn't hang.
            server.closeAllConnections?.();
          }),
      });
    });
  });
}
