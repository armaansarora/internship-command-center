import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchLeverAccount, parseLeverPosting } from "./lever";

describe("lever adapter", () => {
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

  describe("parseLeverPosting", () => {
    it("returns null for missing required fields", () => {
      expect(parseLeverPosting({}, "acme")).toBeNull();
      expect(
        parseLeverPosting(
          { id: "1", text: "Engineer" } as Parameters<typeof parseLeverPosting>[0],
          "acme"
        )
      ).toBeNull();
    });

    it("prefers descriptionPlain over HTML description", () => {
      const parsed = parseLeverPosting(
        {
          id: "abc",
          text: "Staff Engineer",
          hostedUrl: "https://jobs.lever.co/acme/abc",
          descriptionPlain: "Plain text description of sufficient length.",
          description: "<p>Should not win over plain</p>",
          createdAt: 1_700_000_000_000,
          categories: { team: "Platform", location: "Remote" },
        },
        "acme"
      );
      expect(parsed).not.toBeNull();
      expect(parsed!.description).toBe(
        "Plain text description of sufficient length."
      );
      expect(parsed!.department).toBe("Platform");
      expect(parsed!.location).toBe("Remote");
      expect(parsed!.sourceId).toBe("lever:acme:abc");
    });

    it("converts numeric createdAt to ISO", () => {
      const parsed = parseLeverPosting(
        {
          id: "1",
          text: "Eng",
          hostedUrl: "https://x.com/1",
          descriptionPlain: "Long enough plaintext description.",
          createdAt: 1_700_000_000_000,
        },
        "acme"
      );
      expect(parsed!.postedAt).toBe(
        new Date(1_700_000_000_000).toISOString()
      );
    });
  });

  describe("fetchLeverAccount", () => {
    it("parses a list response and drops malformed rows", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: "a",
              text: "Engineer",
              hostedUrl: "https://x.com/a",
              descriptionPlain: "Long enough plaintext description one.",
            },
            { id: "b" },
            {
              id: "c",
              text: "Designer",
              hostedUrl: "https://x.com/c",
              descriptionPlain: "Long enough plaintext description two.",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      ) as unknown as typeof fetch;

      const result = await fetchLeverAccount("acme");
      expect(result.jobs.length).toBe(2);
      expect(result.jobs[0].role).toBe("Engineer");
      expect(result.jobs[1].role).toBe("Designer");
    });

    it("emits a warning on non-OK HTTP", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response("rate limited", { status: 429 })
      ) as unknown as typeof fetch;

      const result = await fetchLeverAccount("acme");
      expect(result.jobs).toEqual([]);
      expect(result.warnings[0]).toContain("HTTP 429");
    });
  });
});
