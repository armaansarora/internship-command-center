import { describe, it, expect } from "vitest";
import { buildFixtureHandler } from "../mock-supabase";

describe("buildFixtureHandler", () => {
  it("returns configured rows for matching table select", () => {
    const handler = buildFixtureHandler({
      tables: {
        applications: [{ id: "app-1", user_id: "u-alice" }],
      },
    });
    const res = handler({
      method: "GET",
      url: "/rest/v1/applications?select=*",
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual([
      { id: "app-1", user_id: "u-alice" },
    ]);
  });

  it("returns empty array when table configured but empty", () => {
    const handler = buildFixtureHandler({ tables: { applications: [] } });
    const res = handler({
      method: "GET",
      url: "/rest/v1/applications?select=*",
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
  });

  it("rejects unexpected write with 500 by default", () => {
    const handler = buildFixtureHandler({ tables: {} });
    const res = handler({
      method: "POST",
      url: "/rest/v1/applications",
      body: "{}",
    });
    expect(res.status).toBe(500);
    expect(res.body).toContain("unexpected write");
  });

  it("allows writes when allowWrites=true", () => {
    const handler = buildFixtureHandler({ tables: {}, allowWrites: true });
    const res = handler({
      method: "POST",
      url: "/rest/v1/applications",
      body: '{"id":"new"}',
    });
    expect(res.status).toBe(201);
  });

  it("returns mocked RPC response", () => {
    const handler = buildFixtureHandler({
      rpc: {
        bump_match_rate_limit: {
          count: 1,
          window_start: "2026-04-01T00:00:00Z",
        },
      },
    });
    const res = handler({
      method: "POST",
      url: "/rest/v1/rpc/bump_match_rate_limit",
      body: "{}",
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      count: 1,
      window_start: "2026-04-01T00:00:00Z",
    });
  });

  it("returns 404 for unmocked RPC", () => {
    const handler = buildFixtureHandler({ rpc: {} });
    const res = handler({
      method: "POST",
      url: "/rest/v1/rpc/unknown_rpc",
      body: "{}",
    });
    expect(res.status).toBe(404);
  });

  it("returns authedUser when configured", () => {
    const handler = buildFixtureHandler({
      authedUser: { id: "u-1", email: "alice@example.com" },
    });
    const res = handler({ method: "GET", url: "/auth/v1/user" });
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.user.id).toBe("u-1");
  });

  it("returns 401 on /auth/v1/user when authedUser null", () => {
    const handler = buildFixtureHandler({ authedUser: null });
    const res = handler({ method: "GET", url: "/auth/v1/user" });
    expect(res.status).toBe(401);
  });

  it("returns 404 for unhandled path", () => {
    const handler = buildFixtureHandler({});
    const res = handler({ method: "GET", url: "/somewhere/else" });
    expect(res.status).toBe(404);
    expect(res.body).toContain("unhandled path");
  });
});
