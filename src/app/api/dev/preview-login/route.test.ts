import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/dev/preview-login", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("404s unless explicit local preview auth is enabled", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:3001");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(
      new Request("http://localhost/api/dev/preview-login?next=/penthouse"),
    );

    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("installs the preview scenario, sets a local auth cookie, and redirects safely", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TOWER_DEV_PREVIEW_AUTH", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:3001");
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(
      new Request("http://localhost/api/dev/preview-login?next=/war-room?panel=briefing"),
    );

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost/war-room?panel=briefing",
    );
    expect(res.headers.get("set-cookie")).toContain(
      "sb-localhost-auth-token=",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/__test__/install",
      expect.objectContaining({ method: "POST" }),
    );
    const calls = fetchMock.mock.calls as unknown as Array<
      [string, RequestInit]
    >;
    const init = calls[0]?.[1];
    if (!init) throw new Error("Missing preview fixture install request");
    const body = JSON.parse(String(init.body)) as {
      scenarioId: string;
      tables: { notifications: Array<{ type: string }> };
    };
    expect(body.scenarioId).toBe("manual-tower-preview");
    expect(body.tables.notifications[0]?.type).toBe("interview");
  });

  it("returns 503 when the local stub cannot install the fixture", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TOWER_DEV_PREVIEW_AUTH", "1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:3001");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );

    const res = await GET(
      new Request("http://localhost/api/dev/preview-login?next=/penthouse"),
    );
    const body = await res.json() as { error: string };

    expect(res.status).toBe(503);
    expect(body.error).toBe("preview_stub_unavailable");
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
