// scripts/artlab-legacy-import-audit.test.ts
import { describe, expect, it } from "vitest";
import { auditLegacyImports } from "./artlab-legacy-import-audit";

describe("legacy import audit", () => {
  it("returns empty when no src/lib/artlab/** code imports creative-production", async () => {
    const result = await auditLegacyImports({ rootDir: "src/lib/artlab" });
    expect(result.violations).toEqual([]);
  });
});
