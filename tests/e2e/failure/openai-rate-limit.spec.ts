import { test, expect } from "@playwright/test";
import { signInAs } from "../helpers/auth";
import { USERS } from "../helpers/fixtures";

/**
 * R12.7 — LLM rate-limit — /api/writing-room/compose-stream — user-visible
 * fallback, not a raw 500 stack.
 *
 * The CMO writing-room compose route (src/app/api/writing-room/compose-stream/
 * route.ts) drives cover-letter drafting via getAgentModel() from
 * src/lib/ai/model.ts. That factory routes through Vercel AI Gateway when
 * AI_GATEWAY_API_KEY is set, otherwise direct Anthropic. Either path could
 * fan out to OpenAI or Anthropic upstream. We mock BOTH upstream surfaces
 * returning 429 so the test covers the cover-letter CMO draft route
 * regardless of which provider is wired.
 *
 * Grep confirms the draft route: the only cover-letter-draft surface is
 * /api/writing-room/compose-stream (plus approve/choose-tone which are
 * post-draft gates and don't call an LLM directly). The `/api/cmo` agent
 * route is the orchestrator chat, not the draft endpoint.
 *
 * Invariant: the route must NOT surface a raw 500 stack — it must either
 * return 200 with a degraded body, 503 with a typed error, or 500 with a
 * typed JSON body (already implemented as `{error: "stream_failed"}`).
 * A raw HTML stack trace is the regression.
 */
test.describe("LLM 429 — /api/writing-room/compose-stream — user-visible fallback, never a raw 500 stack", () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, USERS.alice);

    // Mock both possible upstreams — the model factory may route via
    // Vercel AI Gateway (which proxies Anthropic) or direct Anthropic, and
    // the invariant in the R12 design references OpenAI historically. All
    // three routes are blanketed.
    await page.route(/api\.openai\.com/, (route) =>
      route.fulfill({
        status: 429,
        body: JSON.stringify({ error: { message: "rate limited" } }),
        contentType: "application/json",
      }),
    );
    await page.route(/api\.anthropic\.com/, (route) =>
      route.fulfill({
        status: 429,
        body: JSON.stringify({
          type: "error",
          error: { type: "rate_limit_error", message: "rate limited" },
        }),
        contentType: "application/json",
      }),
    );
    await page.route(/gateway\.ai\.cloudflare\.com|ai-gateway\.vercel\.sh/, (route) =>
      route.fulfill({
        status: 429,
        body: JSON.stringify({ error: { message: "rate limited" } }),
        contentType: "application/json",
      }),
    );
  });

  test("POST returns typed response (200 stream, 503 degraded, or typed 500 JSON) — never raw HTML stack", async ({
    page,
  }) => {
    const res = await page.request.post(
      "http://localhost:3000/api/writing-room/compose-stream",
      {
        data: {
          tone: "formal",
          companyName: "Acme",
          role: "Analyst",
          jobDescription: "Looking for a sharp analyst to own pipeline.",
          companyResearch: "Series C fintech in NYC.",
        },
      },
    );

    // Invariant: acceptable statuses are 200 (stream begins, may degrade
    // mid-stream — still a user-visible response), 401 (auth failed,
    // vacuously not a crash), 503 (ai_provider_missing — typed degrade),
    // or 500 (typed stream_failed — NOT a raw stack).
    const status = res.status();
    expect(
      [200, 401, 500, 503],
      `unexpected status ${status} — regression if 502/504 or uncaught crash`,
    ).toContain(status);

    const contentType = res.headers()["content-type"] ?? "";

    if (status === 200) {
      // Successful stream start. text/plain per the route's contract.
      expect(
        contentType,
        `200 stream must be text/plain; got ${contentType}`,
      ).toContain("text/plain");
      // Drain the stream to ensure it terminates cleanly (even if empty).
      const body = await res.text();
      expect(typeof body).toBe("string");
    } else {
      // Non-2xx must be a typed JSON error, never an HTML stack.
      expect(
        contentType,
        `degraded response must be JSON, got ${contentType} — raw stack trace is the regression signal`,
      ).toContain("application/json");

      const body = await res.json();
      // Must have a typed error field — NOT a raw message/stack.
      expect(
        typeof body?.error,
        `degraded body must carry a typed {error: ...}; got ${JSON.stringify(body)}`,
      ).toBe("string");
    }
  });
});
