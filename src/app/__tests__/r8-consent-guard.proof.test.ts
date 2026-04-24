import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * R8 P3 / P4 (updated by R11.8) — the match-candidates endpoint enforces
 * the consent contract at the server boundary.  We can't run a real HTTP
 * request from vitest without a test server, so we assert the mechanical
 * properties of the module:
 *
 * - The route exports GET.
 * - The route imports and calls `assertConsented` (the P3/P4 guard).
 * - The route applies a rate-limit gate (`checkAndBumpRateLimit`) after
 *   the consent guard and returns 429 when blocked (R11.7 invariant).
 * - The route returns 401 when unauthenticated.
 *
 * R11.8 replaced the original "gated-red-team-pending" 403 hard-stop with
 * the real match flow, so the old canary is gone.  The remaining gates
 * (consent, version, rate-limit, audit log) are covered by
 * `src/app/api/networking/match-candidates/__tests__/route.test.ts`.
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

  it("applies the rate-limit gate after the consent guard (R11.7)", () => {
    const body = readFileSync(ROUTE, "utf8");
    expect(body).toContain("checkAndBumpRateLimit");
    expect(body).toMatch(/status:\s*429/);
    expect(body).toContain("rate-limited");
  });

  it("also returns 401 when unauthenticated", () => {
    const body = readFileSync(ROUTE, "utf8");
    expect(body).toContain("unauthenticated");
    expect(body).toMatch(/status:\s*401/);
  });
});
