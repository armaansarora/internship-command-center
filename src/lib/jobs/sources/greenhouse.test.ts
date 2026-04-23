import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchGreenhouseBoard, parseGreenhouseJob } from "./greenhouse";

describe("greenhouse adapter", () => {
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

  describe("parseGreenhouseJob", () => {
    it("returns null for missing id/title/url", () => {
      expect(parseGreenhouseJob({}, "stripe")).toBeNull();
      expect(
        parseGreenhouseJob({ id: 1, title: "Eng" }, "stripe")
      ).toBeNull();
    });

    it("returns null if description is too short", () => {
      expect(
        parseGreenhouseJob(
          {
            id: 1,
            title: "Intern",
            absolute_url: "https://example.com",
            content: "hi",
          },
          "stripe"
        )
      ).toBeNull();
    });

    it("strips HTML, collapses whitespace, caps description length", () => {
      const parsed = parseGreenhouseJob(
        {
          id: 42,
          title: " Software Engineer Intern ",
          absolute_url: "https://stripe.com/listing/42",
          content:
            "<script>evil()</script><p>Stripe <b>is</b>&nbsp;hiring</p>  <ul><li>Ruby</li><li>Go</li></ul> ".repeat(
              1200
            ),
          updated_at: "2026-04-01T00:00:00Z",
          location: { name: " New York " },
          departments: [{ name: " Payments " }],
        },
        "stripe"
      );
      expect(parsed).not.toBeNull();
      expect(parsed!.sourceName).toBe("greenhouse");
      expect(parsed!.sourceId).toBe("greenhouse:stripe:42");
      expect(parsed!.role).toBe("Software Engineer Intern");
      expect(parsed!.location).toBe("New York");
      expect(parsed!.department).toBe("Payments");
      expect(parsed!.description).not.toContain("<");
      expect(parsed!.description).not.toContain("evil()");
      expect(parsed!.description.length).toBeLessThanOrEqual(8_000);
    });
  });

  describe("fetchGreenhouseBoard", () => {
    it("fetches and parses jobs from a board", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            jobs: [
              {
                id: 1,
                title: "Engineer",
                absolute_url: "https://x.com/1",
                content: "Long enough description for the parser to accept it.",
                location: { name: "SF" },
              },
              {
                id: 2,
                title: "Bad",
                absolute_url: "https://x.com/2",
                content: "no",
              },
              {
                id: 3,
                title: "Analyst",
                absolute_url: "https://x.com/3",
                content: "A valid long-enough description for the analyst role.",
                location: { name: "NY" },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      const result = await fetchGreenhouseBoard("acme");
      expect(result.source).toBe("greenhouse");
      expect(result.jobs.length).toBe(2);
      expect(result.jobs[0].role).toBe("Engineer");
      expect(result.jobs[1].role).toBe("Analyst");
      expect(result.warnings).toEqual([]);
    });

    it("honors the limit option", async () => {
      const rows = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        title: `Role ${i + 1}`,
        absolute_url: `https://x.com/${i + 1}`,
        content: "Long enough description for the parser to accept it.",
      }));
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ jobs: rows }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      ) as unknown as typeof fetch;

      const result = await fetchGreenhouseBoard("acme", { limit: 2 });
      expect(result.jobs.length).toBe(2);
    });

    it("surfaces a warning on non-OK HTTP", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response("not found", { status: 404 })
      ) as unknown as typeof fetch;

      const result = await fetchGreenhouseBoard("missing");
      expect(result.jobs).toEqual([]);
      expect(result.warnings[0]).toContain("HTTP 404");
    });

    it("surfaces a warning on fetch throw", async () => {
      globalThis.fetch = vi
        .fn()
        .mockRejectedValue(new Error("timeout")) as unknown as typeof fetch;

      const result = await fetchGreenhouseBoard("acme");
      expect(result.jobs).toEqual([]);
      expect(result.warnings[0]).toContain("timeout");
    });
  });
});
