import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { computeWarmth } from "@/lib/contacts/warmth";

/**
 * R8 P6 — warmth decay cron + CNO cold-alert.
 *
 *  1. The pure `computeWarmth` crosses the cold threshold (warmth ≤ 30)
 *     between 34 days (above) and 36 days (below). That's the boundary
 *     the cron detects and turns into a single idempotent tube alert.
 *  2. The cron route exports a `GET` handler.
 *  3. `vercel.json` registers the cron at `0 4 * * *`.
 *  4. The route body stamps a source_entity_id with a week-bucket suffix
 *     (`w{N}`), which is the mechanical idempotency guard.
 */
describe("R8 P6 — warmth decay crosses cold threshold at ~35 days", () => {
  const now = new Date("2026-04-23T12:00:00Z");
  it("still above threshold at 34 days", () => {
    const last = new Date(now.getTime() - 34 * 86_400_000);
    expect(computeWarmth(last, now)).toBeGreaterThan(30);
  });
  it("below threshold at 36 days", () => {
    const last = new Date(now.getTime() - 36 * 86_400_000);
    expect(computeWarmth(last, now)).toBeLessThan(30);
  });
});

describe("R8 P6 — cron route wired", () => {
  it("exports GET handler", async () => {
    const mod = await import("@/app/api/cron/warmth-decay/route");
    expect(typeof mod.GET).toBe("function");
  });

  it("uses the R7 tube channel on the cold-alert notification", () => {
    const body = readFileSync(
      resolve(process.cwd(), "src/app/api/cron/warmth-decay/route.ts"),
      "utf8",
    );
    expect(body).toContain("pneumatic_tube");
    expect(body).toMatch(/sourceAgent:\s*"cno"/);
    expect(body).toMatch(/type:\s*"contact-cooling"/);
    // Week-bucketed idempotency — second run inside the same week must
    // collapse to an existing notification row (insert is a no-op via
    // createNotification's unique composite).
    expect(body).toMatch(/source[Ee]ntityId:[^,]*w\$\{weekBucket\}/);
  });

  it("does NOT use any red warning glyph in the body copy", () => {
    const body = readFileSync(
      resolve(process.cwd(), "src/app/api/cron/warmth-decay/route.ts"),
      "utf8",
    );
    expect(body).not.toMatch(/⚠|❗|🔴|ALERT|URGENT/);
  });
});

describe("R8 P6 — vercel.json registration", () => {
  it("/api/cron/warmth-decay is scheduled", () => {
    const cfg = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")) as {
      crons: Array<{ path: string; schedule: string }>;
    };
    const entry = cfg.crons.find((c) => c.path === "/api/cron/warmth-decay");
    expect(entry).toBeDefined();
    expect(entry?.schedule).toBe("0 4 * * *");
  });
});
