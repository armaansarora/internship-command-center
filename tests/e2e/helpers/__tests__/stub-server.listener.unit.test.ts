import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startStubServer, type StubServer } from "../stub-server";

describe("stub-server HTTP listener", () => {
  let server: StubServer;

  beforeAll(async () => {
    server = await startStubServer({ port: 0 });
  });

  afterAll(async () => {
    await server.stop();
  });

  it("responds to /__test__/health", async () => {
    const r = await fetch(`${server.url}/__test__/health`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });

  it("returns 401 on /auth/v1/user before any install", async () => {
    // Re-install nothing — fresh state across describes is not guaranteed,
    // but a fresh StubState's authedUser is null. To prove this without
    // inter-test pollution, install a scenario with authedUser=null.
    await fetch(`${server.url}/__test__/install`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "noauth",
        authedUser: null,
        tables: {},
        rpc: {},
      }),
    });
    const r = await fetch(`${server.url}/auth/v1/user`);
    expect(r.status).toBe(401);
  });

  it("install + auth + table + rpc round-trip", async () => {
    const install = await fetch(`${server.url}/__test__/install`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "round-trip",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: { applications: [{ id: "a1" }] },
        rpc: { my_rpc: { ok: true } },
      }),
    });
    expect(install.status).toBe(200);

    const u = await fetch(`${server.url}/auth/v1/user`);
    expect(u.status).toBe(200);
    expect((await u.json()).data.user.id).toBe("u1");

    const t = await fetch(`${server.url}/rest/v1/applications?select=*`);
    expect(await t.json()).toEqual([{ id: "a1" }]);

    const rpc = await fetch(`${server.url}/rest/v1/rpc/my_rpc`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(await rpc.json()).toEqual({ ok: true });
  });

  it("rpc_abort destroys the socket so fetch rejects", async () => {
    await fetch(`${server.url}/__test__/install`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "abort",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: {},
        rpc: {},
        overrides: [{ behavior: "rpc_abort", rpc: "boom" }],
      }),
    });
    await expect(
      fetch(`${server.url}/rest/v1/rpc/boom`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    ).rejects.toThrow();
  });

  it("track_writes is observable via /__test__/writes", async () => {
    await fetch(`${server.url}/__test__/install`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "writes",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: {},
        rpc: {},
        allowWrites: true,
      }),
    });
    await fetch(`${server.url}/rest/v1/outreach_queue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"id":"q1"}',
    });
    const writesRes = await fetch(`${server.url}/__test__/writes`);
    const writes = await writesRes.json();
    expect(writes).toHaveLength(1);
    expect(writes[0].table).toBe("outreach_queue");
  });

  it("rpc_count_threshold counts across listener calls", async () => {
    await fetch(`${server.url}/__test__/install`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scenarioId: "counter",
        authedUser: { id: "u1", email: "u1@example.com" },
        tables: {},
        rpc: {},
        overrides: [
          {
            behavior: "rpc_count_threshold",
            rpc: "limited",
            limit: 2,
            allowed: { allowed: true },
            blocked: { allowed: false },
          },
        ],
      }),
    });
    const responses = await Promise.all(
      [1, 2, 3].map(() =>
        fetch(`${server.url}/rest/v1/rpc/limited`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        }).then((r) => r.json()),
      ),
    );
    // Promise.all means parallel; we don't know which call hits 1/2/3, but
    // we know one is `allowed: false` and the count distribution is 1,2,3.
    const counts = responses.map((r) => r.count).sort((a, b) => a - b);
    expect(counts).toEqual([1, 2, 3]);
    const allowedFlags = responses
      .sort((a, b) => a.count - b.count)
      .map((r) => r.allowed);
    expect(allowedFlags).toEqual([true, true, false]);
  });
});
