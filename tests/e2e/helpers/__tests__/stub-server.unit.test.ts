import { describe, it, expect, beforeEach } from "vitest";
import { createStubState, handleStubRequest, type StubState } from "../stub-server";

function install(state: StubState, payload: Record<string, unknown>): void {
  handleStubRequest(state, {
    method: "POST",
    url: "/__test__/install",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("stub-server pure handler", () => {
  let state = createStubState();
  beforeEach(() => {
    state = createStubState();
  });

  it("/auth/v1/user returns 401 before any scenario installed", () => {
    const res = handleStubRequest(state, {
      method: "GET",
      url: "/auth/v1/user",
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(401);
  });

  it("/__test__/install activates a scenario and stores fixtures", () => {
    const res = handleStubRequest(state, {
      method: "POST",
      url: "/__test__/install",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: { applications: [{ id: "a1" }] },
        rpc: { my_rpc: { ok: true } },
      }),
    });
    expect(res.status).toBe(200);
    expect(state.activeScenarioId).toBe("s1");
    expect(state.fixtures.authedUser).toEqual({ id: "u1", email: "u1@example.com" });
    expect(state.fixtures.tables).toEqual({ applications: [{ id: "a1" }] });
  });

  it("/__test__/install rejects invalid JSON body with 400", () => {
    const res = handleStubRequest(state, {
      method: "POST",
      url: "/__test__/install",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });

  it("/auth/v1/user returns the authedUser at response root after install", () => {
    install(state, {
      scenarioId: "s1",
      authedUser: { id: "u1", email: "u1@example.com" },
      tables: {},
      rpc: {},
    });
    const res = handleStubRequest(state, {
      method: "GET",
      url: "/auth/v1/user",
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(200);
    // Supabase auth-js _userResponse expects user fields at root (or
    // nested under .user). Returning at the root matches GoTrue's
    // upstream contract.
    const body = JSON.parse(res.body) as { id: string; email: string };
    expect(body.id).toBe("u1");
    expect(body.email).toBe("u1@example.com");
  });

  it("/auth/v1/session returns the authedUser like /user", () => {
    install(state, {
      scenarioId: "s1",
      authedUser: { id: "u1", email: "u1@example.com" },
      tables: {},
      rpc: {},
    });
    const res = handleStubRequest(state, {
      method: "GET",
      url: "/auth/v1/session",
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(200);
  });

  it("/auth/v1/token returns a session-shaped body when authedUser is set", () => {
    install(state, {
      scenarioId: "s1",
      authedUser: { id: "u1", email: "u1@example.com" },
      tables: {},
      rpc: {},
    });
    const res = handleStubRequest(state, {
      method: "POST",
      url: "/auth/v1/token?grant_type=refresh_token",
      headers: { "content-type": "application/json" },
      body: '{"refresh_token":"r"}',
    });
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as { user: { id: string }; access_token: string };
    expect(body.user.id).toBe("u1");
    expect(body.access_token).toBeTruthy();
  });

  it("REST GET on a known table returns fixture rows", () => {
    install(state, {
      scenarioId: "s1",
      authedUser: { id: "u1", email: "u1@example.com" },
      tables: { applications: [{ id: "a1", title: "Job" }] },
      rpc: {},
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

  it("REST GET on an unknown table returns []", () => {
    install(state, {
      scenarioId: "s1",
      authedUser: { id: "u1", email: "u1@example.com" },
      tables: {},
      rpc: {},
    });
    const res = handleStubRequest(state, {
      method: "GET",
      url: "/rest/v1/never_seen_table?select=*",
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
  });

  it("REST RPC returns the configured rpc value", () => {
    install(state, {
      scenarioId: "s1",
      authedUser: { id: "u1", email: "u1@example.com" },
      tables: {},
      rpc: { my_rpc: { ok: true, n: 1 } },
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

  it("REST RPC returns 404 when not mocked", () => {
    install(state, {
      scenarioId: "s1",
      authedUser: { id: "u1", email: "u1@example.com" },
      tables: {},
      rpc: {},
    });
    const res = handleStubRequest(state, {
      method: "POST",
      url: "/rest/v1/rpc/never_mocked",
      headers: {},
      body: "{}",
    });
    expect(res.status).toBe(404);
  });

  it("REST writes rejected when allowWrites=false", () => {
    install(state, {
      scenarioId: "s1",
      authedUser: { id: "u1", email: "u1@example.com" },
      tables: {},
      rpc: {},
      allowWrites: false,
    });
    const res = handleStubRequest(state, {
      method: "POST",
      url: "/rest/v1/applications",
      headers: { "content-type": "application/json" },
      body: '{"id":"a1"}',
    });
    expect(res.status).toBe(500);
  });

  it("REST writes accepted and tracked when allowWrites=true", () => {
    install(state, {
      scenarioId: "s1",
      authedUser: { id: "u1", email: "u1@example.com" },
      tables: {},
      rpc: {},
      allowWrites: true,
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

  it("REST PATCH/DELETE counted as writes", () => {
    install(state, {
      scenarioId: "s1",
      authedUser: { id: "u1", email: "u1@example.com" },
      tables: {},
      rpc: {},
      allowWrites: true,
    });
    handleStubRequest(state, {
      method: "PATCH",
      url: "/rest/v1/applications?id=eq.a1",
      headers: {},
      body: '{"status":"sent"}',
    });
    handleStubRequest(state, {
      method: "DELETE",
      url: "/rest/v1/applications?id=eq.a1",
      headers: {},
      body: undefined,
    });
    expect(state.writes.map((w) => w.method)).toEqual(["PATCH", "DELETE"]);
  });

  it("/__test__/health returns 200", () => {
    const res = handleStubRequest(state, {
      method: "GET",
      url: "/__test__/health",
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(200);
  });

  it("/__test__/writes returns observed writes", () => {
    install(state, {
      scenarioId: "s1",
      authedUser: { id: "u1", email: "u1@example.com" },
      tables: {},
      rpc: {},
      allowWrites: true,
    });
    handleStubRequest(state, {
      method: "POST",
      url: "/rest/v1/outreach_queue",
      headers: {},
      body: '{"id":"q1"}',
    });
    const res = handleStubRequest(state, {
      method: "GET",
      url: "/__test__/writes",
      headers: {},
      body: undefined,
    });
    expect(res.status).toBe(200);
    const writes = JSON.parse(res.body) as Array<{ table: string }>;
    expect(writes).toHaveLength(1);
    expect(writes[0].table).toBe("outreach_queue");
  });

  describe("override: rpc_count_threshold", () => {
    it("returns allowed shape under threshold, blocked shape after", () => {
      install(state, {
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
      });
      const r1 = handleStubRequest(state, {
        method: "POST",
        url: "/rest/v1/rpc/bump_match_rate_limit",
        headers: {},
        body: "{}",
      });
      const r2 = handleStubRequest(state, {
        method: "POST",
        url: "/rest/v1/rpc/bump_match_rate_limit",
        headers: {},
        body: "{}",
      });
      const r3 = handleStubRequest(state, {
        method: "POST",
        url: "/rest/v1/rpc/bump_match_rate_limit",
        headers: {},
        body: "{}",
      });
      expect(JSON.parse(r1.body)).toEqual({ allowed: true, count: 1 });
      expect(JSON.parse(r2.body)).toEqual({ allowed: true, count: 2 });
      expect(JSON.parse(r3.body)).toEqual({ allowed: false, count: 3 });
    });

    it("does not affect unrelated RPCs", () => {
      install(state, {
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: {},
        rpc: { other_rpc: { fine: true } },
        overrides: [
          {
            behavior: "rpc_count_threshold",
            rpc: "bump_match_rate_limit",
            limit: 2,
            allowed: { allowed: true },
            blocked: { allowed: false },
          },
        ],
      });
      const res = handleStubRequest(state, {
        method: "POST",
        url: "/rest/v1/rpc/other_rpc",
        headers: {},
        body: "{}",
      });
      expect(JSON.parse(res.body)).toEqual({ fine: true });
    });
  });

  describe("override: rpc_error_status", () => {
    it("returns the configured status + body", () => {
      install(state, {
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
    it("emits an abort sentinel for the listener to interpret", () => {
      install(state, {
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: {},
        rpc: {},
        overrides: [{ behavior: "rpc_abort", rpc: "bump_match_rate_limit" }],
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
      const unionRows = [
        { id: "A1", user_id: "alice" },
        { id: "B1", user_id: "bob" },
      ];
      install(state, {
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

    it("non-GET writes to filtered table fall through to write tracking", () => {
      install(state, {
        scenarioId: "s1",
        authedUser: { id: "alice", email: "alice@e.com" },
        tables: {},
        rpc: {},
        allowWrites: true,
        overrides: [
          {
            behavior: "table_filter_branch",
            table: "match_candidate_index",
            filterParam: "user_id",
            filterValue: "eq.alice",
            onMatch: [],
            onNoMatch: [],
          },
        ],
      });
      const r = handleStubRequest(state, {
        method: "POST",
        url: "/rest/v1/match_candidate_index",
        headers: {},
        body: '{"id":"x"}',
      });
      expect(r.status).toBe(201);
      expect(state.writes).toHaveLength(1);
    });
  });

  describe("override: intermittent_failure", () => {
    it("fails every Nth REST request, fixture response on the others", () => {
      install(state, {
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: { applications: [{ id: "a1" }] },
        rpc: {},
        overrides: [
          {
            behavior: "intermittent_failure",
            everyNth: 2,
            status: 503,
            body: { message: "service unavailable" },
          },
        ],
      });
      const r1 = handleStubRequest(state, {
        method: "GET",
        url: "/rest/v1/applications",
        headers: {},
        body: undefined,
      });
      const r2 = handleStubRequest(state, {
        method: "GET",
        url: "/rest/v1/applications",
        headers: {},
        body: undefined,
      });
      const r3 = handleStubRequest(state, {
        method: "GET",
        url: "/rest/v1/applications",
        headers: {},
        body: undefined,
      });
      const r4 = handleStubRequest(state, {
        method: "GET",
        url: "/rest/v1/applications",
        headers: {},
        body: undefined,
      });
      expect(r1.status).toBe(200);
      expect(r2.status).toBe(503);
      expect(r3.status).toBe(200);
      expect(r4.status).toBe(503);
    });

    it("counts RPC and REST calls together", () => {
      install(state, {
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: { applications: [] },
        rpc: { something: { ok: true } },
        overrides: [
          {
            behavior: "intermittent_failure",
            everyNth: 2,
            status: 503,
            body: { message: "down" },
          },
        ],
      });
      const r1 = handleStubRequest(state, {
        method: "GET",
        url: "/rest/v1/applications",
        headers: {},
        body: undefined,
      });
      const r2 = handleStubRequest(state, {
        method: "POST",
        url: "/rest/v1/rpc/something",
        headers: {},
        body: "{}",
      });
      expect(r1.status).toBe(200);
      expect(r2.status).toBe(503);
    });

    it("does not affect /auth/v1/* or /__test__/*", () => {
      install(state, {
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: {},
        rpc: {},
        overrides: [
          {
            behavior: "intermittent_failure",
            everyNth: 1,
            status: 503,
            body: { down: true },
          },
        ],
      });
      const auth = handleStubRequest(state, {
        method: "GET",
        url: "/auth/v1/user",
        headers: {},
        body: undefined,
      });
      const health = handleStubRequest(state, {
        method: "GET",
        url: "/__test__/health",
        headers: {},
        body: undefined,
      });
      expect(auth.status).toBe(200);
      expect(health.status).toBe(200);
    });
  });

  describe("override: writes_become_rows", () => {
    it("parsed POST body becomes a row visible on subsequent GET", () => {
      install(state, {
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: { outreach_queue: [] },
        rpc: {},
        allowWrites: true,
        overrides: [{ behavior: "writes_become_rows", table: "outreach_queue" }],
      });
      const post = handleStubRequest(state, {
        method: "POST",
        url: "/rest/v1/outreach_queue",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user_id: "u1",
          contact_id: "c1",
          type: "reference_request",
          metadata: { offer_id: "o1" },
        }),
      });
      expect(post.status).toBe(201);
      const inserted = JSON.parse(post.body) as Array<Record<string, unknown>>;
      expect(inserted).toHaveLength(1);
      expect(inserted[0].user_id).toBe("u1");
      expect(typeof inserted[0].created_at).toBe("string");
      expect(typeof inserted[0].id).toBe("string");

      const get = handleStubRequest(state, {
        method: "GET",
        url: "/rest/v1/outreach_queue?user_id=eq.u1&contact_id=eq.c1",
        headers: {},
        body: undefined,
      });
      const rows = JSON.parse(get.body) as Array<Record<string, unknown>>;
      expect(rows).toHaveLength(1);
      expect(rows[0].metadata).toEqual({ offer_id: "o1" });
    });

    it("preserves existing created_at when present in body", () => {
      install(state, {
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: {},
        rpc: {},
        allowWrites: true,
        overrides: [{ behavior: "writes_become_rows", table: "x" }],
      });
      const post = handleStubRequest(state, {
        method: "POST",
        url: "/rest/v1/x",
        headers: {},
        body: JSON.stringify({ id: "fixed", created_at: "2026-01-01T00:00:00Z" }),
      });
      const inserted = JSON.parse(post.body) as Array<Record<string, unknown>>;
      expect(inserted[0].id).toBe("fixed");
      expect(inserted[0].created_at).toBe("2026-01-01T00:00:00Z");
    });
  });

  describe("override: track_writes", () => {
    it("records writes to specified tables (passive — does not change response)", () => {
      install(state, {
        scenarioId: "s1",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: {},
        rpc: {},
        allowWrites: true,
        overrides: [{ behavior: "track_writes", tables: ["outreach_queue"] }],
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
      const writes = JSON.parse(r.body) as Array<{ table: string; method: string }>;
      expect(writes).toHaveLength(2);
      expect(writes[0].table).toBe("outreach_queue");
      expect(writes[1].method).toBe("PATCH");
    });
  });

  it("install resets fixtures, counters, and writes", () => {
    install(state, {
      scenarioId: "s1",
      authedUser: { id: "u1", email: "u1@example.com" },
      tables: { t1: [{ a: 1 }] },
      rpc: {},
      allowWrites: true,
      overrides: [
        {
          behavior: "rpc_count_threshold",
          rpc: "bump_match_rate_limit",
          limit: 1,
          allowed: { allowed: true },
          blocked: { allowed: false },
        },
      ],
    });
    handleStubRequest(state, {
      method: "POST",
      url: "/rest/v1/t1",
      headers: {},
      body: "{}",
    });
    handleStubRequest(state, {
      method: "POST",
      url: "/rest/v1/rpc/bump_match_rate_limit",
      headers: {},
      body: "{}",
    });
    expect(state.writes).toHaveLength(1);
    expect(state.counters["rpc:bump_match_rate_limit"]).toBe(1);

    install(state, {
      scenarioId: "s2",
      authedUser: { id: "u2", email: "u2@example.com" },
      tables: { t1: [] },
      rpc: {},
    });
    expect(state.activeScenarioId).toBe("s2");
    expect(state.writes).toHaveLength(0);
    expect(state.counters).toEqual({});
    expect(state.overrides).toHaveLength(0);
  });
});
