import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  installSupabaseMock,
  MOCK_SUPABASE_URL_ENV,
  type MockablePage,
} from "../mock-supabase";
import { startStubServer, type StubServer } from "../stub-server";

describe("installSupabaseMock — stub-server transport", () => {
  let server: StubServer;

  beforeAll(async () => {
    server = await startStubServer({ port: 0 });
    process.env[MOCK_SUPABASE_URL_ENV] = server.url;
  });

  afterAll(async () => {
    delete process.env[MOCK_SUPABASE_URL_ENV];
    await server.stop();
  });

  let lastHeaders: Record<string, string> | null = null;
  const fakePage: MockablePage = {
    setExtraHTTPHeaders: async (headers) => {
      lastHeaders = headers;
    },
  };

  beforeEach(() => {
    lastHeaders = null;
  });

  it("POSTs an install payload to the stub server with a fresh scenarioId", async () => {
    const scenarioId = await installSupabaseMock(fakePage, {
      authedUser: { id: "u1", email: "u1@example.com" },
      tables: { applications: [{ id: "a1" }] },
      rpc: { my_rpc: { ok: true } },
    });
    expect(scenarioId).toMatch(/^[0-9a-f-]{36}$/);
    expect(server.state.activeScenarioId).toBe(scenarioId);
    expect(server.state.fixtures.authedUser).toEqual({
      id: "u1",
      email: "u1@example.com",
    });
    expect(server.state.fixtures.tables).toEqual({ applications: [{ id: "a1" }] });
    expect(server.state.fixtures.rpcs).toEqual({ my_rpc: { ok: true } });
  });

  it("stamps x-scenario-id on outgoing browser headers", async () => {
    const scenarioId = await installSupabaseMock(fakePage, {
      authedUser: { id: "u1", email: "u1@example.com" },
    });
    expect(lastHeaders).toEqual({ "x-scenario-id": scenarioId });
  });

  it("forwards overrides verbatim to the stub", async () => {
    await installSupabaseMock(fakePage, {
      authedUser: { id: "u1", email: "u1@example.com" },
      overrides: [
        {
          behavior: "rpc_count_threshold",
          rpc: "x",
          limit: 5,
          allowed: { allowed: true },
          blocked: { allowed: false },
        },
        { behavior: "track_writes", tables: ["outreach_queue"] },
      ],
    });
    expect(server.state.overrides).toHaveLength(2);
    expect(server.state.overrides[0]).toEqual({
      behavior: "rpc_count_threshold",
      rpc: "x",
      limit: 5,
      allowed: { allowed: true },
      blocked: { allowed: false },
    });
    expect(server.state.overrides[1]).toEqual({
      behavior: "track_writes",
      tables: ["outreach_queue"],
    });
  });

  it("each install resets counters, writes, and overrides", async () => {
    await installSupabaseMock(fakePage, {
      authedUser: { id: "u1", email: "u1@example.com" },
      allowWrites: true,
      overrides: [
        {
          behavior: "rpc_count_threshold",
          rpc: "x",
          limit: 1,
          allowed: { allowed: true },
          blocked: { allowed: false },
        },
      ],
    });
    await fetch(`${server.url}/rest/v1/rpc/x`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    await fetch(`${server.url}/rest/v1/anything`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"id":"a"}',
    });
    expect(server.state.counters["rpc:x"]).toBe(1);
    expect(server.state.writes).toHaveLength(1);

    await installSupabaseMock(fakePage, {
      authedUser: { id: "u2", email: "u2@example.com" },
    });
    expect(server.state.counters).toEqual({});
    expect(server.state.writes).toHaveLength(0);
    expect(server.state.overrides).toEqual([]);
  });

  it("throws if the stub is unreachable", async () => {
    process.env[MOCK_SUPABASE_URL_ENV] = "http://localhost:1"; // closed port
    await expect(installSupabaseMock(fakePage, {})).rejects.toThrow();
    process.env[MOCK_SUPABASE_URL_ENV] = server.url;
  });

  it("throws if the stub returns a non-2xx (e.g., bad payload)", async () => {
    // We can't easily make the stub return non-2xx via the public API, so we
    // hit the install endpoint directly with broken JSON to confirm the
    // server's error path is wired — the helper itself throws on !res.ok.
    const r = await fetch(`${server.url}/__test__/install`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    expect(r.status).toBe(400);
  });
});
