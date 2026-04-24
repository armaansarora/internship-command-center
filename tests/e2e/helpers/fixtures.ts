import { readFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_ROOT = join(process.cwd(), "tests/e2e/fixtures");

export function loadFixture<T = unknown>(relativePath: string): T {
  const full = join(FIXTURE_ROOT, relativePath);
  return JSON.parse(readFileSync(full, "utf8")) as T;
}

export const USERS = {
  alice: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "alice@example.com",
  },
  bob: {
    id: "00000000-0000-0000-0000-000000000002",
    email: "bob@example.com",
  },
} as const;

/**
 * Deterministic ISO timestamps used across fixtures. Never `Date.now()` —
 * partner constraint (c). Any fixture that needs a "now" reference should
 * import one of these and hardcode relative deltas.
 */
export const TIMES = {
  anchor: "2026-04-01T00:00:00Z",
  oneHourLater: "2026-04-01T01:00:00Z",
  oneDayLater: "2026-04-02T00:00:00Z",
  oneWeekLater: "2026-04-08T00:00:00Z",
} as const;
