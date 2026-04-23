import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TargetProfileSchema } from "@/lib/agents/cro/target-profile";
import { gatherCandidatesFromSources } from "./discovery";

describe("discovery — gatherCandidatesFromSources", () => {
  const origEnv = { ...process.env };
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "key";
    Object.assign(process.env, { NODE_ENV: "development" });
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k];
    }
    Object.assign(process.env, origEnv);
    globalThis.fetch = origFetch;
    vi.restoreAllMocks();
  });

  it("seedOnly returns seed jobs + no external fetches", async () => {
    const target = TargetProfileSchema.parse({
      roles: ["Software Engineer"],
      geos: ["New York"],
      companies: ["Stripe"],
    });

    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const result = await gatherCandidatesFromSources(target, {
      seedOnly: true,
      now: new Date("2026-04-22T00:00:00Z"),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.jobs.length).toBeGreaterThanOrEqual(20);
    expect(result.warnings).toEqual([]);
    expect(result.jobs.every((j) => j.sourceName === "seed")).toBe(true);
  });

  it("merges external + seed; dedupes by sourceId", async () => {
    const target = TargetProfileSchema.parse({
      roles: ["Software Engineer"],
      geos: ["Remote"],
      companies: ["stripe"],
    });

    globalThis.fetch = vi.fn().mockImplementation(async (input: string) => {
      if (input.includes("greenhouse")) {
        return new Response(
          JSON.stringify({
            jobs: [
              {
                id: 999,
                title: "Payments SWE",
                absolute_url: "https://stripe.com/jobs/999",
                content:
                  "Stripe Payments SWE working on the payment lifecycle end-to-end.",
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response("[]", { status: 200 });
    }) as unknown as typeof fetch;

    const result = await gatherCandidatesFromSources(target, {
      now: new Date("2026-04-22T00:00:00Z"),
    });
    expect(
      result.jobs.some((j) => j.sourceId === "greenhouse:stripe:999")
    ).toBe(true);
    expect(result.jobs.length).toBeGreaterThan(20); // seeds + 1 greenhouse
    const ids = result.jobs.map((j) => j.sourceId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("surfaces warnings from failing external sources but still returns seeds", async () => {
    const target = TargetProfileSchema.parse({
      roles: ["Software Engineer"],
      geos: ["Remote"],
      companies: ["brokenco"],
    });
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("down", { status: 503 })
    ) as unknown as typeof fetch;

    const result = await gatherCandidatesFromSources(target);
    expect(result.jobs.length).toBeGreaterThanOrEqual(20); // seeds still returned
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("companyBoardsOverride bypasses profile.companies", async () => {
    const target = TargetProfileSchema.parse({
      roles: ["Engineer"],
      geos: ["Remote"],
      companies: [],
    });
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response("[]", { status: 200 })
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await gatherCandidatesFromSources(target, {
      companyBoardsOverride: ["custom-board-xyz"],
    });

    const urls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("custom-board-xyz"))).toBe(true);
  });
});
