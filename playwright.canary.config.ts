import { defineConfig } from "@playwright/test";

/**
 * Playwright config for the off-platform synthetic canary.
 *
 * Runs ONLY the specs under `tests/canary/` against real production
 * (https://www.interntower.com). Has nothing to do with the regular
 * e2e suite under `tests/e2e/` — that suite spins up a stub Supabase
 * server on :3001 and a local Next.js dev server. The canary does
 * neither.
 *
 * Used exclusively by `.github/workflows/canary.yml`. Local
 * developers never need to run this.
 */
export default defineConfig({
  testDir: "./tests/canary",
  testMatch: /.*\.spec\.ts$/,
  // Per-test timeout — the production app is fast, but cold-start of
  // a serverless function plus chromium navigation latency can easily
  // burn 10–20 seconds on a bad day. 60s gives us comfortable headroom
  // before flagging a true outage.
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry per test inside the spec itself; we'd rather not page
  // anyone on a transient network blip.
  retries: 1,
  workers: 1,
  reporter: process.env.CI
    ? [["github"], ["list"]]
    : [["list"]],
  use: {
    baseURL: process.env.CANARY_BASE_URL ?? "https://www.interntower.com",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  // No webServer — we hit real production.
});
