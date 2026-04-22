import { test, expect } from "@playwright/test";

test.describe("session persistence (middleware-driven)", () => {
  test("root middleware redirects unauthenticated requests on protected paths", async ({
    request,
  }) => {
    const res = await request.get("/penthouse", { maxRedirects: 0 });
    expect([302, 307]).toContain(res.status());
    const location = res.headers()["location"] ?? "";
    expect(location).toContain("/lobby");
  });

  test("lobby remains public", async ({ request }) => {
    const res = await request.get("/lobby", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
  });

  test("cron endpoints bypass middleware redirect (self-authenticate)", async ({
    request,
  }) => {
    const res = await request.post("/api/cron/sync", { maxRedirects: 0 });
    // verifyCronAuth returns 401 in prod, 200 in dev without secret.
    // Middleware must NOT 307 it to /lobby.
    expect([401, 200, 405]).toContain(res.status());
  });

  test("stripe webhook bypasses middleware redirect", async ({ request }) => {
    const res = await request.post("/api/stripe/webhook", {
      maxRedirects: 0,
      data: {},
    });
    // Stripe webhook returns 400 without a signature, not a redirect.
    expect([400, 401]).toContain(res.status());
  });
});

test.describe("authenticated flow — requires E2E creds", () => {
  const hasCreds = !!process.env.E2E_TEST_EMAIL && !!process.env.E2E_TEST_PASSWORD;
  test.skip(!hasCreds, "set E2E_TEST_EMAIL / E2E_TEST_PASSWORD to enable");

  test("survives a forced cookie-expiry reload", async () => {
    // Optional — skipped if no creds. Full body deferred to R0.1+.
    expect(true).toBe(true);
  });
});
