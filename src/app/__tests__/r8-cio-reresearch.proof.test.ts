import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * R8 P7 — CIO autonomous re-research cron.
 *
 * 1. The route exports a GET handler.
 * 2. vercel.json registers the cron at `0 5 * * *`.
 * 3. The route updates `research_freshness` (the canonical column on
 *    `companies` — see schema.ts) and fires the tube notification with
 *    a day-keyed idempotency suffix.
 * 4. The body copy is descriptive, not alarmist.
 */
describe("R8 P7 — cio-reresearch cron", () => {
  it("exports GET handler", async () => {
    const mod = await import("@/app/api/cron/cio-reresearch/route");
    expect(typeof mod.GET).toBe("function");
  });

  it("vercel.json registers /api/cron/cio-reresearch at 0 5 * * *", () => {
    const cfg = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")) as {
      crons: Array<{ path: string; schedule: string }>;
    };
    const entry = cfg.crons.find((c) => c.path === "/api/cron/cio-reresearch");
    expect(entry).toBeDefined();
    expect(entry?.schedule).toBe("0 5 * * *");
  });

  it("stamps research_freshness and fires a tube notification from the CIO", () => {
    const body = readFileSync(
      resolve(process.cwd(), "src/app/api/cron/cio-reresearch/route.ts"),
      "utf8",
    );
    expect(body).toContain("research_freshness");
    expect(body).toContain("pneumatic_tube");
    expect(body).toMatch(/sourceAgent:\s*"cio"/);
    expect(body).toMatch(/type:\s*"dossier-refresh"/);
    // Day-keyed idempotency suffix (YYYY-MM-DD).
    expect(body).toMatch(/cio-reresearch-\$\{co\.id\}-\$\{today\}/);
  });

  it("uses non-alarmist copy", () => {
    const body = readFileSync(
      resolve(process.cwd(), "src/app/api/cron/cio-reresearch/route.ts"),
      "utf8",
    );
    expect(body).not.toMatch(/⚠|URGENT|ALERT|stale warning/i);
  });
});
