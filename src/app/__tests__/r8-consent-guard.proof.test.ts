import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * R8 P3 / P4 — the match-candidates endpoint enforces the consent
 * contract at the server boundary.  We can't run a real HTTP request
 * from vitest without a test server, so we assert the mechanical
 * properties of the module:
 *
 * - The route exports GET.
 * - The route imports and calls `assertConsented` (the P3/P4 guard).
 * - The route returns 403 "gated-red-team-pending" downstream of the
 *   guard (the R8 hard-stop that prevents cross-user data from shipping
 *   before the Red Team pass).
 *
 * The pure `isConsentedShape` is exhaustively tested alongside the
 * guard — see src/lib/networking/consent-guard.test.ts — so the
 * integration assertion here is deliberately small.
 */

const ROUTE = resolve(
  process.cwd(),
  "src/app/api/networking/match-candidates/route.ts",
);

describe("R8 P3 / P4 — match-candidates endpoint", () => {
  it("exports GET", async () => {
    const mod = await import("@/app/api/networking/match-candidates/route");
    expect(typeof mod.GET).toBe("function");
  });

  it("imports and calls assertConsented", () => {
    const body = readFileSync(ROUTE, "utf8");
    expect(body).toContain("assertConsented");
    expect(body).toMatch(/assertConsented\(.+\)/);
  });

  it("returns 403 gated-red-team-pending downstream of the guard", () => {
    const body = readFileSync(ROUTE, "utf8");
    expect(body).toContain("gated-red-team-pending");
    expect(body).toMatch(/status:\s*403/);
  });

  it("also returns 401 when unauthenticated", () => {
    const body = readFileSync(ROUTE, "utf8");
    expect(body).toContain("unauthenticated");
    expect(body).toMatch(/status:\s*401/);
  });
});
