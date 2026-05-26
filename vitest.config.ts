import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "scripts/**/*.test.ts",
      "tests/codebase/**/*.test.ts",
      "tests/e2e/helpers/**/*.unit.test.ts",
    ],
    exclude: ["node_modules", ".next", "dist", "tests/e2e/**/*.spec.ts"],
    clearMocks: true,
    restoreMocks: true,
    // Prevent test env bleed.
    unstubEnvs: true,
    unstubGlobals: true,
    // Sequential file execution prevents Keychain race conditions in tests
    // that share the same macOS Keychain service names (bot-setup + bot.integration).
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
