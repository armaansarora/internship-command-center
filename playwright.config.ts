import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts$/,
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // R12.10 — single worker required: the stub Supabase server holds a
  // single activeScenarioId at a time. Multiple workers running in
  // parallel would race on installSupabaseMock and produce flaky cross-
  // scenario pollution. CI already pins to 1; this also pins local runs.
  workers: 1,
  reporter: process.env.CI
    ? [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]]
    : [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          // R12.10 — Both browser and Next.js server-side Supabase SDK calls
          // converge on the stub server booted by globalSetup. NEVER point
          // this at the real project — see partner constraint (b).
          NEXT_PUBLIC_SUPABASE_URL: "http://localhost:3001",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_stub_for_e2e_local",
          NEXT_PUBLIC_APP_URL:
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          SUPABASE_SERVICE_ROLE_KEY:
            process.env.SUPABASE_SERVICE_ROLE_KEY ??
            "service_role_stub_for_e2e",
        },
      },
});
