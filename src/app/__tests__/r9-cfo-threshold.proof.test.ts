import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * R9.7 — CFO weekly threshold cron + pneumatic-tube delivery.
 *
 * Partner constraint (verbatim, autopilot.yml):
 *   "CFO threshold triggers reuse the R8 warmth-decay cron pattern --
 *    don't redesign. When conversion rate drops >5% week-over-week,
 *    CFO auto-composes an analysis note and fires a pneumatic tube
 *    notification (reusing R7's tube delivery infrastructure).
 *    Do NOT build a new delivery system."
 *
 * These assertions enforce that:
 *   1. The route exists and exports a GET handler (R8 pattern).
 *   2. Auth is gated by verifyCronRequest.
 *   3. Delivery rides the R7 tube channel (pneumatic_tube), NOT a new
 *      system.
 *   4. The notification is bucketed by ISO week so re-runs inside the
 *      same week collapse to a single tube alert (mechanical idempotency).
 *   5. Attribution is sourceAgent: "cfo" so the tube renders the right
 *      character envelope.
 *   6. vercel.json registers the cron at Mondays 09:00 UTC.
 *   7. maxDuration is 300 (matches warmth-decay headroom).
 */

const ROOT = process.cwd();
const ROUTE_PATH = "src/app/api/cron/cfo-threshold/route.ts";

function readSource(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), "utf8");
}

describe("R9.7 — CFO threshold cron route is wired", () => {
  it("exports a GET handler", async () => {
    const mod = await import("@/app/api/cron/cfo-threshold/route");
    expect(typeof mod.GET).toBe("function");
  });

  it("guards the handler with verifyCronRequest (Bearer / x-vercel-cron)", () => {
    const body = readSource(ROUTE_PATH);
    expect(body).toContain("verifyCronRequest");
  });

  it("delivers via the R7 pneumatic tube channel (no new delivery system)", () => {
    const body = readSource(ROUTE_PATH);
    expect(body).toMatch(/channels:\s*\[\s*["']pneumatic_tube["']\s*\]/);
  });

  it("idempotent source_entity_id is bucketed by ISO week", () => {
    const body = readSource(ROUTE_PATH);
    // Must include the cfo-threshold prefix and a ${weekBucket}/w{N}
    // suffix so re-runs inside the same week collapse.
    expect(body).toContain("cfo-threshold-");
    expect(body).toMatch(/w\$\{/);
  });

  it("attributes the notification to sourceAgent: cfo", () => {
    const body = readSource(ROUTE_PATH);
    expect(body).toMatch(/sourceAgent:\s*["']cfo["']/);
  });

  it("declares maxDuration = 300 (matches warmth-decay headroom)", () => {
    const body = readSource(ROUTE_PATH);
    expect(body).toMatch(/export\s+const\s+maxDuration\s*=\s*300/);
  });
});

describe("R9.7 — vercel.json registration", () => {
  it("registers /api/cron/cfo-threshold in the crons array", () => {
    const cfg = JSON.parse(
      readFileSync(resolve(ROOT, "vercel.json"), "utf8"),
    ) as {
      crons: Array<{ path: string; schedule: string }>;
    };
    const entry = cfg.crons.find((c) => c.path === "/api/cron/cfo-threshold");
    expect(entry).toBeDefined();
    expect(entry?.schedule).toBe("0 9 * * 1");
  });

  it("schedule fires on Monday (day-of-week == 1)", () => {
    const cfg = JSON.parse(
      readFileSync(resolve(ROOT, "vercel.json"), "utf8"),
    ) as {
      crons: Array<{ path: string; schedule: string }>;
    };
    const entry = cfg.crons.find((c) => c.path === "/api/cron/cfo-threshold");
    expect(entry).toBeDefined();
    // DOM=*, Month=*, DOW=1 — the trailing fields fix the day-of-week.
    expect(entry?.schedule).toMatch(/\*\s+\*\s+1$/);
  });
});
