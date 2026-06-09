import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { glob } from "glob";
import {
  DRIZZLE_INSTANTIATION,
  DRIZZLE_VALUE_IMPORT,
  DRIZZLE_RUNTIME_CALL,
  SERVER_SURFACE,
} from "@/db/__guards__/drizzle-runtime-pattern";

/**
 * no-runtime-drizzle — structural guard for CLAUDE.md gotcha #1.
 *
 * Vercel serverless cannot reach the IPv6-only DB at :5432; the app runtime
 * must use the Supabase REST client, never Drizzle's `db`. drizzle.config.ts
 * itself documents that the runtime does NOT use Drizzle (schema/migrations
 * only). This proof test fails the build if a runtime Drizzle instantiation,
 * value-import of `db`, or server-side `db.<query>()` call appears.
 *
 * Zero violations today — this is regression prevention. Patterns live in
 * src/db/__guards__/drizzle-runtime-pattern.ts (shared with the .claude hook).
 */

const ROOT = resolve(__dirname, "../../..");
// Excluded by directory prefix (schema, migrations, manual helpers, db tests, guards)…
const EXCLUDE_DIR = ["src/db/"];
// …and by filename (tests, type decls, the drizzle config, generated types).
const EXCLUDE_FILE = /(?:\.(?:test|spec|d)\.tsx?$)|(?:\.proof\.test\.tsx?$)|(?:(?:^|\/)drizzle\.config\.ts$)|(?:database\.types\.ts$)/;

// Adding a path here is a perf/IPv6-regression review event (CLAUDE.md gotcha #1).
const ALLOWED = new Set<string>([]);

function scan(): string[] {
  const files = glob.sync("src/**/*.{ts,tsx}", { cwd: ROOT, nodir: true });
  const violations: string[] = [];
  for (const rel of files) {
    if (EXCLUDE_DIR.some((d) => rel.startsWith(d))) continue;
    if (EXCLUDE_FILE.test(rel)) continue;
    if (ALLOWED.has(rel)) continue;
    const src = readFileSync(resolve(ROOT, rel), "utf8");
    if (DRIZZLE_INSTANTIATION.test(src)) violations.push(`${rel}: runtime drizzle(...) instantiation`);
    if (DRIZZLE_VALUE_IMPORT.test(src)) violations.push(`${rel}: value-import of db from a drizzle/pg module`);
    if (SERVER_SURFACE.test(rel) && DRIZZLE_RUNTIME_CALL.test(src))
      violations.push(`${rel}: server-side db.<query>() call`);
  }
  return violations;
}

describe("no-runtime-drizzle (CLAUDE.md gotcha #1)", () => {
  it("has zero runtime Drizzle usage in application source", () => {
    const violations = scan();
    expect(
      violations,
      `IPv6 prod-breaker (CLAUDE.md gotcha #1): Vercel cannot reach db.jzrsr...:5432. ` +
        `Use the Supabase REST client (createClient from @/lib/supabase/server) instead.\n${violations.join("\n")}`,
    ).toEqual([]);
  });

  it("regex C is scoped to server surfaces (ArtLab `db` delta vars stay green)", () => {
    // Locks the SERVER_SURFACE scoping fix: a non-DB `db` variable must not trip regex C.
    const artlabDelta = "const db = a.b - b.b; // blue-channel delta, not a DB call";
    expect(DRIZZLE_RUNTIME_CALL.test(artlabDelta)).toBe(false);
    expect(SERVER_SURFACE.test("src/lib/artlab/coherence/hashes.ts")).toBe(false);
    // And a real server-side violation IS caught:
    expect(SERVER_SURFACE.test("src/app/api/foo/route.ts")).toBe(true);
    expect(DRIZZLE_RUNTIME_CALL.test("await db.select().from(x)")).toBe(true);
  });

  it("import type of schema rows stays green (only value imports are violations)", () => {
    expect(DRIZZLE_VALUE_IMPORT.test('import type { Application } from "@/db/schema";')).toBe(false);
    expect(DRIZZLE_VALUE_IMPORT.test('import { db } from "@/lib/db/client";')).toBe(true);
  });
});
